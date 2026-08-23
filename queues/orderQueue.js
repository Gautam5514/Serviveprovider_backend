const { Queue, QueueEvents } = require("bullmq");
const { createRedisConnection } = require("../config/redis");

const ORDER_QUEUE_NAME = "order-events";

const orderQueue = new Queue(ORDER_QUEUE_NAME, {
  connection: createRedisConnection("order-queue"),
  defaultJobOptions: {
    // Transient failures (Mongo blip, momentary Redis hiccup) get 5 tries with
    // exponential backoff (3s, 6s, 12s, 24s, 48s ≈ 93s total) before the job
    // is considered permanently failed and surfaced via the QueueEvents
    // "failed" listener below.
    attempts: 5,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    // Keep failed jobs around (visible via Redis / a Bull Board dashboard if
    // one is added later) instead of discarding them — they're the thing an
    // operator needs to see and manually reprocess.
    removeOnFail: { count: 5000 },
  },
});

orderQueue.on("error", (err) => {
  console.error(`[OrderQueue] queue-level error: ${err.message}`);
});

const orderQueueEvents = new QueueEvents(ORDER_QUEUE_NAME, {
  connection: createRedisConnection("order-queue-events"),
});

orderQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`[OrderQueue] job ${jobId} exhausted all retries and FAILED permanently: ${failedReason}`);
});

/**
 * Enqueue a "broadcast this booking to matching providers" job. Durable and
 * retried automatically by the worker.
 *
 * If Redis itself is unreachable, `orderQueue.add` throws — we catch that and
 * fall back to running `fallbackFn` (the old inline behaviour) so a queue
 * outage never silently drops a booking's provider broadcast. The tradeoff:
 * that one broadcast loses the retry/durability guarantee, but the customer
 * still gets matched providers notified.
 */
async function enqueueMatchProviders(bookingId, { excludeUserId = null } = {}, fallbackFn) {
  try {
    await orderQueue.add("match-providers", {
      bookingId: String(bookingId),
      excludeUserId: excludeUserId ? String(excludeUserId) : null,
    });
  } catch (err) {
    console.error(
      `[OrderQueue] enqueue failed for booking ${bookingId} — falling back to inline matching: ${err.message}`
    );
    if (typeof fallbackFn === "function") {
      try {
        await fallbackFn();
      } catch (fallbackErr) {
        console.error(`[OrderQueue] inline fallback ALSO failed for booking ${bookingId}:`, fallbackErr);
      }
    }
  }
}

module.exports = { orderQueue, orderQueueEvents, enqueueMatchProviders, ORDER_QUEUE_NAME };
