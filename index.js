const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");

dotenv.config();

// ─── Environment validation — fail fast before any code runs ─────────────────
const REQUIRED_ENV = ["MONGODB_URI", "JWT_SECRET", "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "FRONTEND_URL", "REDIS_URL"];
const missingVars = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error(`\n[FATAL] Missing required environment variables: ${missingVars.join(", ")}`);
  console.error("Copy .env.example to .env and fill in all values.\n");
  process.exit(1);
}
if (
  process.env.JWT_SECRET.length < 32 ||
  process.env.JWT_SECRET === "your_super_secret_key" ||
  process.env.JWT_SECRET.startsWith("REPLACE_")
) {
  console.error("\n[FATAL] JWT_SECRET is too weak or is still the placeholder value.");
  console.error(
    'Generate one with: node -e "require(\'crypto\').randomBytes(64).toString(\'hex\')"'
  );
  console.error("Then set JWT_SECRET in your .env file.\n");
  process.exit(1);
}

const connectDB = require("./config/db");
const { initSocket } = require("./socket");
const { generalLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const { startOrderWorker, stopOrderWorker } = require("./workers/orderWorker");
const { orderQueue, orderQueueEvents } = require("./queues/orderQueue");
const { startEmailWorker, stopEmailWorker } = require("./workers/emailWorker");
const { emailQueue, emailQueueEvents } = require("./queues/emailQueue");

const app = express();
const server = http.createServer(app);

// ─── Trust proxy (required for correct IP behind load balancers) ──────────────
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

// ─── Security headers via Helmet ──────────────────────────────────────────────
app.use(
  helmet({
    // Allow uploaded images/PDFs to be fetched by the frontend
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Content-Security-Policy — tighten in production after testing
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? undefined   // helmet default CSP in production
        : false,      // disabled in dev to avoid blocking HMR/devtools
  })
);

// ─── CORS — read allowed origins from .env (supports multiple origins) ────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── Gzip responses — large JSON payloads (bookings, providers) shrink ~5-10x ─
app.use(compression());

// ─── General rate limiter (applied before body parsing to save CPU on floods) ─
app.use("/api/", generalLimiter);

// ─── Body parsing with hard size limits (blocks oversized JSON/form attacks) ──
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ─── NoSQL injection sanitization ────────────────────────────────────────────
// Strips keys starting with $ or containing . from req.body, req.params, req.query
app.use(mongoSanitize());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ success: true, message: "EliteCrewplace API is running." });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",          require("./routes/authRoutes"));
app.use("/api/providers",     require("./routes/providerRoutes"));
app.use("/api/admin",         require("./routes/adminRoutes"));
app.use("/api/upload",        require("./routes/uploadRoutes"));
app.use("/api/services",      require("./routes/serviceRoutes"));
app.use("/api/bookings",      require("./routes/bookingRoutes"));
app.use("/api/payments",      require("./routes/paymentRoutes"));
app.use("/api/ratings",       require("./routes/ratingRoutes"));
app.use("/api/addresses",     require("./routes/addressRoutes"));
app.use("/api/coupons",       require("./routes/couponRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/search",        require("./routes/searchRoutes"));
app.use("/api/stats",         require("./routes/statsRoutes"));
app.use("/api/support",        require("./routes/supportRoutes"));
app.use("/api/testimonials",   require("./routes/testimonialRoutes"));
app.use("/api/places",         require("./routes/placesRoutes"));
app.use("/api/careers",        require("./routes/careerRoutes"));
app.use("/api/blog",           require("./routes/blogRoutes"));
app.use("/api/contact",        require("./routes/contactRoutes"));

// ─── Static files (uploaded images / PDFs) ───────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── 404 — unmatched routes ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─── Global error handler (MUST be last middleware, needs all 4 args) ─────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;

// Listen immediately so Cloud Run health check passes before DB connects
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} — ${process.env.NODE_ENV || "development"} mode`);
  console.log(`[CORS] Allowed origins: ${allowedOrigins.join(", ")}`);
});

async function startServer() {
  try {
    await connectDB();
    initSocket(server, allowedOrigins);
    // Worker is started in-process alongside the API. BullMQ workers running
    // in multiple instances safely share one queue (jobs are locked
    // per-consumer), so as the API scales horizontally, job-processing
    // capacity scales with it automatically — no separate deployment needed
    // unless order volume later justifies splitting it out.
    startOrderWorker();
    startEmailWorker();
  } catch (error) {
    console.error("[FATAL] Failed to start server:", error.message);
    process.exit(1);
  }
}

// ─── Process-level safety nets ────────────────────────────────────────────────
// A rejected promise with no .catch() is almost always a missed edge case in
// one request handler — NOT proof the whole process is corrupted. Killing the
// entire server for it (as this used to do) drops every other user's
// in-flight request/socket connection too, so busier traffic (e.g. many
// concurrent support chats) turned one missed .catch() into a full outage.
// Log with full context and keep serving everyone else; only a genuinely
// synchronous crash (uncaughtException below) still exits, since that one
// really can leave process state corrupted.
process.on("unhandledRejection", (err) => {
  console.error("[UNHANDLED REJECTION] This is a bug — a promise rejected with no .catch(). Process is staying up:", err);
});

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err);
  process.exit(1);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────────
// On deploy/restart, let the worker finish whatever job it's mid-processing
// instead of killing it — an interrupted Mongo write mid-broadcast is exactly
// the kind of partial-failure state the idempotency guard in orderWorker.js
// exists to clean up after, but avoiding it here is cheap and faster to recover.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] ${signal} received — shutting down gracefully...`);
  try {
    await stopOrderWorker();
    await orderQueue.close();
    await orderQueueEvents.close();
    await stopEmailWorker();
    await emailQueue.close();
    await emailQueueEvents.close();
  } catch (err) {
    console.error("[Server] Error during queue/worker shutdown:", err.message);
  }
  server.close(() => {
    console.log("[Server] HTTP server closed.");
    process.exit(0);
  });
  // Force-exit if something (an open socket, a stuck connection) prevents
  // server.close() from ever calling back.
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();
