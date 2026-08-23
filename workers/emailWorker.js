const { Worker } = require("bullmq");
const { createRedisConnection } = require("../config/redis");
const { EMAIL_QUEUE_NAME } = require("../queues/emailQueue");
const emailService = require("../utils/emailService");

// Kept low — shared SMTP providers (Gmail included) throttle/blacklist senders
// that open too many connections at once, so this stays well under that
// rather than maximising local throughput.
const CONCURRENCY = Number(process.env.EMAIL_WORKER_CONCURRENCY) || 3;

// Whitelist of email-sending functions a job is allowed to invoke. job.name
// must be one of these keys — this is what keeps a queued job payload inert
// data (a name + args) rather than something that could execute arbitrary code.
const SENDERS = {
  sendOTPEmail: emailService.sendOTPEmail,
  sendProviderDecisionEmail: emailService.sendProviderDecisionEmail,
  sendBookingConfirmedEmail: emailService.sendBookingConfirmedEmail,
  sendNewJobEmail: emailService.sendNewJobEmail,
  sendJobAcceptedEmail: emailService.sendJobAcceptedEmail,
  sendJobCompletedEmail: emailService.sendJobCompletedEmail,
  sendContactConfirmationEmail: emailService.sendContactConfirmationEmail,
};

let worker = null;

function startEmailWorker() {
  if (worker) return worker;

  worker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job) => {
      const send = SENDERS[job.name];
      if (!send) {
        throw new Error(`No email sender registered for job "${job.name}"`);
      }
      return send(...(job.data.args || []));
    },
    {
      connection: createRedisConnection("email-worker"),
      concurrency: CONCURRENCY,
    }
  );

  worker.on("failed", (job, err) => {
    const attemptsMade = job?.attemptsMade ?? "?";
    const attemptsMax = job?.opts?.attempts ?? "?";
    console.error(
      `[EmailWorker] job ${job?.id} (${job?.name}) FAILED attempt ${attemptsMade}/${attemptsMax}: ${err.message}`
    );
  });

  worker.on("error", (err) => {
    console.error(`[EmailWorker] worker connection error: ${err.message}`);
  });

  console.log(`[EmailWorker] started — concurrency=${CONCURRENCY}, queue="${EMAIL_QUEUE_NAME}"`);
  return worker;
}

async function stopEmailWorker() {
  if (!worker) return;
  console.log("[EmailWorker] shutting down — waiting for in-flight jobs to finish...");
  await worker.close();
  worker = null;
}

module.exports = { startEmailWorker, stopEmailWorker };
