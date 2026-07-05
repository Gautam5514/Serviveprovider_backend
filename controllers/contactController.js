const ContactMessage = require("../models/ContactMessage");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { sendContactConfirmationEmail } = require("../utils/emailService");
const { emitToRole } = require("../socket");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── POST /api/contact ────────────────────────────────────────────────────────
// Public — anyone can submit the Contact Us form, logged in or not.
const submitContactMessage = catchAsync(async (req, res) => {
  const { name, email, phone, address, topic, bookingNumber, message } = req.body;

  if (!name?.trim()) throw new AppError("Your name is required.", 400);
  if (!email?.trim() || !EMAIL_RE.test(email.trim()))
    throw new AppError("A valid email address is required.", 400);
  if (!message?.trim() || message.trim().length < 10)
    throw new AppError("Please describe your query (minimum 10 characters).", 400);
  if (message.trim().length > 3000)
    throw new AppError("Message is too long (max 3000 characters).", 400);

  const ticket = await ContactMessage.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || "",
    address: address?.trim() || "",
    topic: ContactMessage.CONTACT_TOPICS.includes(topic) ? topic : "other",
    bookingNumber: bookingNumber?.trim() || "",
    message: message.trim(),
    submitterIp: req.ip,
  });

  // Notify connected admins in real time — same pattern as support tickets.
  emitToRole("admin", "contact:message:new", {
    id: ticket._id,
    referenceNumber: ticket.referenceNumber,
    name: ticket.name,
    topic: ticket.topic,
    createdAt: ticket.createdAt,
  });

  // Best-effort confirmation email — never fail the submission over SMTP issues.
  sendContactConfirmationEmail(ticket.email, ticket.name, ticket.referenceNumber, ticket.topic).catch(
    (err) => console.error("Contact confirmation email failed:", err.message)
  );

  res.status(201).json({ success: true, referenceNumber: ticket.referenceNumber });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// GET /api/contact/admin — all messages, newest first (?status= filters)
const getAllMessages = catchAsync(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status && status !== "all") filter.status = status;

  const messages = await ContactMessage.find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  res.json({ success: true, messages });
});

// PUT /api/contact/admin/:id/status
const updateStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  if (!ContactMessage.CONTACT_STATUSES.includes(status))
    throw new AppError("Invalid status value.", 400);

  const ticket = await ContactMessage.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!ticket) throw new AppError("Message not found.", 404);
  res.json({ success: true, ticket });
});

// PUT /api/contact/admin/:id/note — internal admin note, not visible to the sender
const updateNote = catchAsync(async (req, res) => {
  const { adminNote } = req.body;
  const ticket = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { adminNote: String(adminNote || "").slice(0, 2000) },
    { new: true }
  );
  if (!ticket) throw new AppError("Message not found.", 404);
  res.json({ success: true, ticket });
});

// DELETE /api/contact/admin/:id
const deleteMessage = catchAsync(async (req, res) => {
  const ticket = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!ticket) throw new AppError("Message not found.", 404);
  res.json({ success: true });
});

module.exports = {
  submitContactMessage,
  getAllMessages,
  updateStatus,
  updateNote,
  deleteMessage,
};
