const crypto     = require("crypto");
const Razorpay   = require("razorpay");
const Booking    = require("../models/Booking");
const AppError   = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// ─── Razorpay client ──────────────────────────────────────────────────────────
// Instantiated only when keys are present, so a missing config fails loudly with
// a 503 instead of crashing the process at require-time.
const KEY_ID     = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (KEY_ID && KEY_SECRET) {
  razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

function ensureConfigured(res) {
  if (razorpay) return true;
  res.status(503).json({ success: false, message: "Online payments are not available right now. Please choose cash on delivery." });
  return false;
}

// Constant-time signature comparison — avoids leaking timing info and never
// throws on mismatched lengths (timingSafeEqual would).
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ─── POST /api/payments/order ─────────────────────────────────────────────────
// Creates (or re-issues) a Razorpay order for a booking the caller owns.
// The amount is ALWAYS the server-computed booking total — never a client value —
// so a tampered request can't pay less than the booking is worth.
const createOrder = catchAsync(async (req, res) => {
  if (!ensureConfigured(res)) return;

  const { bookingId } = req.body;
  if (!bookingId) throw new AppError("bookingId is required.", 400);

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found.", 404);
  if (booking.customerId.toString() !== req.user._id.toString())
    throw new AppError("You can only pay for your own booking.", 403);
  if (booking.paymentStatus === "paid")
    throw new AppError("This booking is already paid.", 409);
  if (["cancelled", "disputed"].includes(booking.status))
    throw new AppError(`This booking is ${booking.status} and can't be paid.`, 400);

  const amountPaise = Math.round(Number(booking.pricing?.totalAmount || 0) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise < 100)
    throw new AppError("This booking has an invalid amount.", 400);

  const order = await razorpay.orders.create({
    amount:   amountPaise,
    currency: "INR",
    receipt:  booking.bookingNumber || String(booking._id),
    notes:    { bookingId: String(booking._id), customerId: String(req.user._id) },
  });

  // Remember the order + mark the intended method so verify can cross-check it.
  booking.razorpayOrderId = order.id;
  booking.paymentMethod   = "online";
  await booking.save();

  res.json({
    success: true,
    keyId:   KEY_ID,
    order:   { id: order.id, amount: order.amount, currency: order.currency },
    booking: { id: booking._id, number: booking.bookingNumber, total: booking.pricing?.totalAmount },
    prefill: { name: req.user.fullName || "", email: req.user.email || "", contact: req.user.phone || "" },
  });
});

// ─── POST /api/payments/verify ────────────────────────────────────────────────
// Confirms a completed checkout. Verifies the HMAC signature Razorpay returns,
// then marks the booking paid. Idempotent, ownership-checked, and pinned to the
// order we actually created for this booking.
const verifyPayment = catchAsync(async (req, res) => {
  if (!ensureConfigured(res)) return;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId)
    throw new AppError("Missing payment details. If money was deducted, it will be auto-refunded.", 400);

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found.", 404);
  if (booking.customerId.toString() !== req.user._id.toString())
    throw new AppError("Access denied.", 403);

  // Already confirmed (e.g. a retried verify or a duplicate tap) — return success.
  if (booking.paymentStatus === "paid")
    return res.json({ success: true, message: "Payment already confirmed.", booking });

  // The signed order must be the one we issued for THIS booking. Stops a valid
  // signature from a different (cheaper) order being replayed here.
  if (booking.razorpayOrderId && booking.razorpayOrderId !== razorpay_order_id)
    throw new AppError("Payment order mismatch. Please try paying again.", 400);

  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!safeEqual(expected, razorpay_signature))
    throw new AppError("We couldn't verify this payment. If money was deducted, it will be refunded within 5–7 days.", 400);

  booking.paymentStatus    = "paid";
  booking.paymentMethod    = "online";
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.paidAt           = new Date();
  await booking.save();

  res.json({ success: true, message: "Payment confirmed.", booking });
});

// ─── GET /api/payments/config ─────────────────────────────────────────────────
// Lets a client know whether online payments are available (and the public key)
// so it can hide the "Pay online" option when unconfigured.
const getConfig = (req, res) => {
  res.json({ success: true, enabled: !!razorpay, keyId: razorpay ? KEY_ID : null });
};

module.exports = { createOrder, verifyPayment, getConfig };
