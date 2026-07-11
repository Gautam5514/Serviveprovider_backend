const ContactMessage = require("../models/ContactMessage");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { sendContactConfirmationEmail } = require("../utils/emailService");
const { emitToRole } = require("../socket");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Regex helper — safe user-typed search terms ─────────────────────────────
function escapeRegex(v = "") {
  return String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MESSAGES_PAGE_SIZE_DEFAULT = 25;
const MESSAGES_PAGE_SIZE_MAX = 100;

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

// GET /api/contact/admin — all messages, newest first (?status=, ?search=, ?page=, ?limit=)
// Server-side paginated + searched so the list stays correct (and fast) no
// matter how many messages pile up — nothing silently falls off past a fixed
// cap the way an in-memory client-side filter would.
const getAllMessages = catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    MESSAGES_PAGE_SIZE_MAX,
    Math.max(1, parseInt(req.query.limit, 10) || MESSAGES_PAGE_SIZE_DEFAULT)
  );
  const search = String(req.query.search || "").trim().slice(0, 120);
  const status = req.query.status;

  let searchFilter = {};
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    searchFilter = { $or: [{ name: re }, { email: re }, { referenceNumber: re }, { message: re }] };
  }

  const statusFilter =
    status && status !== "all" && ContactMessage.CONTACT_STATUSES.includes(status)
      ? { status }
      : {};

  const finalFilter = { ...searchFilter, ...statusFilter };

  const [messages, total, statusAgg, unseenCount] = await Promise.all([
    ContactMessage.find(finalFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ContactMessage.countDocuments(finalFilter),
    // Status breakdown respects the search term but not the status filter
    // itself, so switching tabs never changes what the *other* tabs show.
    ContactMessage.aggregate([
      { $match: searchFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    ContactMessage.countDocuments({ ...searchFilter, adminViewed: { $ne: true } }),
  ]);

  const counts = { all: 0, new: 0, in_progress: 0, resolved: 0 };
  for (const s of statusAgg) {
    counts[s._id] = s.count;
    counts.all += s.count;
  }

  res.json({
    success: true,
    messages,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    counts,
    unseenCount,
  });
});

// PUT /api/contact/admin/:id/view
// Opening one message's detail is what "reads" it — clears the sidebar badge
// for just this message, not the whole list.
const markMessageViewed = catchAsync(async (req, res) => {
  const message = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { adminViewed: true },
    { new: true }
  );
  if (!message) throw new AppError("Message not found.", 404);
  res.json({ success: true, message });
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
  markMessageViewed,
  updateStatus,
  updateNote,
  deleteMessage,
};
