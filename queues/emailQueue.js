const { Queue, QueueEvents } = require("bullmq");
const { createRedisConnection } = require("../config/redis");

const EMAIL_QUEUE_NAME = "email-events";

const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection("email-queue"),
  defaultJobOptions: {
    // SMTP hiccups (Gmail throttling, a momentary timeout) are usually short —
    // 4 tries with backoff (5s, 10s, 20s, 40s ≈ 75s total) covers that without
    // making a permanently-bad address retry for minutes.
    attempts: 4,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 500, age: 24 * 3600 },
    removeOnFail: { count: 2000 },
  },
});

emailQueue.on("error", (err) => {
  console.error(`[EmailQueue] queue-level error: ${err.message}`);
});

const emailQueueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection("email-queue-events"),
});

emailQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`[EmailQueue] job ${jobId} exhausted all retries and FAILED permanently: ${failedReason}`);
});

/**
 * Enqueue a call to one of the named senders in utils/emailService.js.
 * `jobName` must match a key in workers/emailWorker.js's SENDERS whitelist —
 * job payloads never carry executable code, only the sender name + plain args.
 *
 * `args` must be JSON-serialiseable (BullMQ stores job data as JSON in Redis).
 * Mongoose documents survive this via their own toJSON(), but pass plain
 * objects explicitly where you have them to avoid surprises.
 *
 * Falls back to running `fallbackFn` inline if Redis is unreachable, same
 * safety net as enqueueMatchProviders in orderQueue.js.
 */
async function enqueueEmail(jobName, args, fallbackFn) {
  try {
    await emailQueue.add(jobName, { args });
  } catch (err) {
    console.error(`[EmailQueue] enqueue failed for "${jobName}" — falling back to inline send: ${err.message}`);
    if (typeof fallbackFn === "function") {
      try {
        await fallbackFn();
      } catch (fallbackErr) {
        console.error(`[EmailQueue] inline fallback ALSO failed for "${jobName}":`, fallbackErr);
      }
    }
  }
}

module.exports = { emailQueue, emailQueueEvents, enqueueEmail, EMAIL_QUEUE_NAME };
