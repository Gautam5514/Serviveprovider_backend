const IORedis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error(
    "REDIS_URL is not set. Add it to your .env file — it now backs the order-notification queue and the Socket.IO adapter."
  );
}

// BullMQ (Queue/Worker/QueueEvents) and the Socket.IO Redis adapter each need
// their own dedicated ioredis connection — a single client can't be shared
// across blocking (BRPOPLPUSH-style) and pub/sub usage. `maxRetriesPerRequest:
// null` is required by BullMQ so a slow/stalled Redis doesn't cause commands
// to error out instead of queueing behind reconnect.
function createRedisConnection(label) {
  const client = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(attempt) {
      const delayMs = Math.min(attempt * 500, 10000);
      console.warn(`[Redis:${label}] disconnected — reconnect attempt ${attempt} in ${delayMs}ms`);
      return delayMs;
    },
  });

  client.on("error", (err) => {
    // ioredis keeps retrying via retryStrategy above — this is visibility,
    // not fatal. Never crash the process on a transient Redis error.
    console.error(`[Redis:${label}] connection error: ${err.message}`);
  });
  client.on("connect", () => console.log(`[Redis:${label}] connected`));
  client.on("close", () => console.warn(`[Redis:${label}] connection closed`));

  return client;
}

module.exports = { createRedisConnection, REDIS_URL };
