const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const { createRedisConnection } = require("../config/redis");
const { ORDER_QUEUE_NAME } = require("../queues/orderQueue");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const { notifyMany } = require("../utils/notificationService");
const { getMatchingProvidersForBooking } = require("../controllers/bookingController");

const CONCURRENCY = Number(process.env.ORDER_WORKER_CONCURRENCY) || 5;

let worker = null;

async function processMatchProviders(job) {
  const { bookingId, excludeUserId } = job.data;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    // Booking was deleted, or the id is stale — nothing to broadcast. Not a
    // retryable error, so we return normally instead of throwing.
    console.warn(`[OrderWorker] job ${job.id}: booking ${bookingId} no longer exists — skipping.`);
    return { skipped: "booking-not-found" };
  }
  if (booking.status !== "pending") {
    // Booking moved on (claimed, cancelled, etc.) between enqueue and this
    // job running — broadcasting "new job available" now would be stale/wrong.
    console.log(`[OrderWorker] job ${job.id}: booking ${bookingId} is now "${booking.status}" — skipping broadcast.`);
    return { skipped: `booking-status-${booking.status}` };
  }

  const matches = await getMatchingProvidersForBooking(booking);
  const candidates = excludeUserId
    ? matches.filter(({ provider }) => provider.userId?.toString() !== excludeUserId)
    : matches;

  if (!candidates.length) {
    console.warn(
      `[OrderWorker] job ${job.id}: no matching providers for booking ${bookingId} (${booking.serviceCategory}, ${booking.address?.city || "unknown city"}).`
    );
    return { matched: 0, notified: 0 };
  }

  // Idempotency guard: if THIS job is retried after a partial failure (e.g.
  // the notification insert partly succeeded before a connection drop), don't
  // re-notify providers already reached during an earlier attempt of the same
  // job. Scoped to job.id (not just bookingId+type) so a genuinely new
  // broadcast round — e.g. re-matching after a provider releases the job —
  // still reaches every provider again, including ones notified before.
  const already = await Notification.find({
    bookingId: booking._id,
    type: "new_job_available",
    "data.roundId": job.id,
  }).select("recipientId").lean();
  const alreadyNotified = new Set(already.map((n) => n.recipientId.toString()));
  const toNotify = candidates.filter(({ provider }) => !alreadyNotified.has(provider.userId?.toString()));

  const inserted = await notifyMany(
    toNotify.map(({ provider, distanceKm }) => ({
      recipientId: provider.userId,
      recipientRole: "provider",
      type: "new_job_available",
      title: "New job near you",
      message: `${booking.serviceName} is available in ${booking.address?.city || "your service area"}. Confirm first to claim it.`,
      bookingId: booking._id,
      data: {
        distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(1)),
        serviceCategory: booking.serviceCategory,
        roundId: job.id,
      },
    }))
  );

  return { matched: candidates.length, notified: inserted.length };
}

const PROCESSORS = {
  "match-providers": processMatchProviders,
};

function startOrderWorker() {
  if (worker) return worker;

  worker = new Worker(
    ORDER_QUEUE_NAME,
    async (job) => {
      // Guards the rare race where a job is picked up before startServer()'s
      // connectDB() has resolved — throwing here lets BullMQ's normal
      // retry/backoff handle it instead of every DB call failing raw.
      if (mongoose.connection.readyState !== 1) {
        throw new Error("Database not connected yet — will retry.");
      }
      const processor = PROCESSORS[job.name];
      if (!processor) {
        // Unknown job name is a programming error, not transient — but we
        // still let it go through the normal failed/retry path so it's
        // visible in the queue rather than silently swallowed.
        throw new Error(`No processor registered for job "${job.name}"`);
      }
      return processor(job);
    },
    {
      connection: createRedisConnection("order-worker"),
      concurrency: CONCURRENCY,
    }
  );

  worker.on("completed", (job, result) => {
    if (result?.skipped) {
      console.log(`[OrderWorker] job ${job.id} (${job.name}) skipped: ${result.skipped}`);
    }
  });

  worker.on("failed", (job, err) => {
    const attemptsMade = job?.attemptsMade ?? "?";
    const attemptsMax = job?.opts?.attempts ?? "?";
    console.error(
      `[OrderWorker] job ${job?.id} (${job?.name}) FAILED attempt ${attemptsMade}/${attemptsMax} ` +
      `for booking ${job?.data?.bookingId}: ${err.message}`
    );
  });

  worker.on("error", (err) => {
    // Connection-level errors (e.g. Redis dropped) — ioredis reconnects on
    // its own; this is visibility only, never fatal to the process.
    console.error(`[OrderWorker] worker connection error: ${err.message}`);
  });

  console.log(`[OrderWorker] started — concurrency=${CONCURRENCY}, queue="${ORDER_QUEUE_NAME}"`);
  return worker;
}

async function stopOrderWorker() {
  if (!worker) return;
  console.log("[OrderWorker] shutting down — waiting for in-flight jobs to finish...");
  await worker.close();
  worker = null;
}

module.exports = { startOrderWorker, stopOrderWorker };
