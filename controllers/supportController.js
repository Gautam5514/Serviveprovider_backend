const SupportTicket  = require("../models/SupportTicket");
const SupportMessage = require("../models/SupportMessage");
const User            = require("../models/User");
const Booking         = require("../models/Booking");
const Provider        = require("../models/Provider");
const AppError        = require("../utils/AppError");
const catchAsync      = require("../utils/catchAsync");
const { emitToUser, emitToRole } = require("../socket");

const CATEGORY_LABELS = {
  booking_issue:       "Booking Issue",
  payment_issue:       "Payment Issue",
  provider_complaint:  "Provider Complaint",
  customer_issue:      "Customer Issue",
  app_bug:             "App Bug / Error",
  general:             "General Enquiry",
};

// Which categories a given role is allowed to file — keeps the ticket
// meaningful (a provider can't file a "Provider Complaint" against themself).
const CATEGORIES_BY_ROLE = {
  customer: ["booking_issue", "payment_issue", "provider_complaint", "app_bug", "general"],
  provider: ["booking_issue", "payment_issue", "customer_issue",     "app_bug", "general"],
};

// ─── Resolve + verify booking ownership for the requesting user ─────────────
async function assertOwnedBooking(bookingId, user) {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) throw new AppError("Booking not found.", 404);

  if (user.role === "customer") {
    if (booking.customerId.toString() !== user._id.toString())
      throw new AppError("This booking does not belong to you.", 403);
  } else {
    const provider = await Provider.findOne({ userId: user._id }).select("_id").lean();
    if (!provider || !booking.providerId || booking.providerId.toString() !== provider._id.toString())
      throw new AppError("This booking does not belong to you.", 403);
  }
  return booking;
}

const BOOKING_PREVIEW_FIELDS = "bookingNumber serviceName status scheduledDate paymentStatus pricing.totalAmount";

// ─── POST /api/support ────────────────────────────────────────────────────────
// Customer or provider creates a new ticket + sends the opening message.
const createTicket = catchAsync(async (req, res) => {
  const { category, message, bookingId } = req.body;

  if (!["customer", "provider"].includes(req.user.role))
    throw new AppError("Only customers and providers can raise support tickets.", 403);

  const allowedCategories = CATEGORIES_BY_ROLE[req.user.role];
  if (!category || !allowedCategories.includes(category))
    throw new AppError("Please select a valid support category.", 400);
  if (!message || message.trim().length < 10)
    throw new AppError("Please describe your issue (minimum 10 characters).", 400);

  let booking = null;
  if (bookingId) booking = await assertOwnedBooking(bookingId, req.user);

  const user = await User.findById(req.user._id).select("fullName").lean();

  // Auto-generate subject from first 80 chars of message
  const subject = message.trim().slice(0, 80) + (message.trim().length > 80 ? "…" : "");

  const ticket = await SupportTicket.create({
    userId:            req.user._id,
    userRole:          req.user.role,
    bookingId:         booking?._id || null,
    category,
    subject,
    status:            "open",
    unreadByAdmin:     1,
  });

  const msg = await SupportMessage.create({
    ticketId:   ticket._id,
    senderId:   req.user._id,
    senderRole: req.user.role,
    senderName: user?.fullName || (req.user.role === "provider" ? "Partner" : "Customer"),
    text:       message.trim(),
  });

  await SupportTicket.findByIdAndUpdate(ticket._id, { lastMessageAt: new Date() });

  // Notify all connected admins in real time
  emitToRole("admin", "support:ticket:created", {
    ticketId:      ticket._id,
    ticketNumber:  ticket.ticketNumber,
    category:      CATEGORY_LABELS[category],
    subject:       ticket.subject,
    userName:      user?.fullName || (req.user.role === "provider" ? "Partner" : "Customer"),
    userRole:      req.user.role,
    bookingNumber: booking?.bookingNumber || null,
    createdAt:     ticket.createdAt,
  });

  res.status(201).json({ success: true, ticket, message: msg });
});

// ─── GET /api/support ─────────────────────────────────────────────────────────
// Customer/provider lists all their own tickets with last message preview.
const getMyTickets = catchAsync(async (req, res) => {
  const tickets = await SupportTicket.find({ userId: req.user._id })
    .populate("bookingId", BOOKING_PREVIEW_FIELDS)
    .sort({ lastMessageAt: -1 })
    .lean();

  // Get last message preview for each ticket
  const ids = tickets.map(t => t._id);
  const previews = await SupportMessage.aggregate([
    { $match: { ticketId: { $in: ids } } },
    { $sort:  { createdAt: -1 } },
    { $group: {
        _id:        "$ticketId",
        text:       { $first: "$text" },
        senderRole: { $first: "$senderRole" },
        createdAt:  { $first: "$createdAt" },
    }},
  ]);

  const previewMap = Object.fromEntries(previews.map(p => [p._id.toString(), p]));

  res.json({
    success: true,
    tickets: tickets.map(t => ({
      ...t,
      lastMessage:   previewMap[t._id.toString()] || null,
      categoryLabel: CATEGORY_LABELS[t.category] || t.category,
      unreadByMe:    t.unreadByRequester,
    })),
  });
});

// ─── GET /api/support/admin ───────────────────────────────────────────────────
// Admin views all tickets, optionally filtered by status and/or requester role.
const getAdminTickets = catchAsync(async (req, res) => {
  const { status, role } = req.query;
  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (role && ["customer", "provider"].includes(role)) filter.userRole = role;

  const tickets = await SupportTicket.find(filter)
    .populate("userId", "fullName email phone")
    .populate("bookingId", BOOKING_PREVIEW_FIELDS)
    .sort({ lastMessageAt: -1 })
    .limit(200)
    .lean();

  // Last message preview
  const ids = tickets.map(t => t._id);
  const previews = await SupportMessage.aggregate([
    { $match: { ticketId: { $in: ids } } },
    { $sort:  { createdAt: -1 } },
    { $group: {
        _id:        "$ticketId",
        text:       { $first: "$text" },
        senderRole: { $first: "$senderRole" },
        createdAt:  { $first: "$createdAt" },
    }},
  ]);

  const previewMap = Object.fromEntries(previews.map(p => [p._id.toString(), p]));

  res.json({
    success: true,
    tickets: tickets.map(t => ({
      ...t,
      lastMessage:   previewMap[t._id.toString()] || null,
      categoryLabel: CATEGORY_LABELS[t.category] || t.category,
    })),
  });
});

// ─── GET /api/support/:id ─────────────────────────────────────────────────────
// Load ticket + all messages. Marks as read for the caller.
const getTicket = catchAsync(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate("userId", "fullName email phone")
    .populate("bookingId", BOOKING_PREVIEW_FIELDS)
    .lean();

  if (!ticket) throw new AppError("Support ticket not found.", 404);

  const userId   = req.user._id.toString();
  const isOwner  = ticket.userId._id.toString() === userId;
  const isAdmin  = req.user.role === "admin";
  if (!isOwner && !isAdmin) throw new AppError("Access denied.", 403);

  const messages = await SupportMessage.find({ ticketId: ticket._id })
    .sort({ createdAt: 1 })
    .lean();

  // Mark as read
  const unreadReset = isAdmin ? { unreadByAdmin: 0 } : { unreadByRequester: 0 };
  await SupportTicket.findByIdAndUpdate(ticket._id, unreadReset);

  res.json({
    success: true,
    ticket:  { ...ticket, categoryLabel: CATEGORY_LABELS[ticket.category] || ticket.category },
    messages,
  });
});

// ─── POST /api/support/:id/message ────────────────────────────────────────────
// Send a message in an existing ticket.
const sendMessage = catchAsync(async (req, res) => {
  const { text } = req.body;
  if (!text?.trim() || text.trim().length < 1)
    throw new AppError("Message cannot be empty.", 400);
  if (text.trim().length > 2000)
    throw new AppError("Message is too long (max 2000 characters).", 400);

  const ticket = await SupportTicket.findById(req.params.id)
    .populate("userId", "_id fullName")
    .lean();

  if (!ticket) throw new AppError("Support ticket not found.", 404);

  const userId  = req.user._id.toString();
  const isOwner = ticket.userId._id.toString() === userId;
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) throw new AppError("Access denied.", 403);
  if (["resolved", "closed"].includes(ticket.status))
    throw new AppError("This ticket is already closed. Create a new ticket if you need further help.", 400);

  const user       = await User.findById(req.user._id).select("fullName").lean();
  const senderRole = isAdmin ? "admin" : ticket.userRole;

  const msg = await SupportMessage.create({
    ticketId:   ticket._id,
    senderId:   req.user._id,
    senderRole,
    senderName: user?.fullName || senderRole,
    text:       text.trim(),
  });

  // Update ticket meta
  const ticketUpdate = { lastMessageAt: new Date() };
  if (isAdmin) {
    ticketUpdate.status            = "in_progress";
    ticketUpdate.unreadByRequester = (ticket.unreadByRequester || 0) + 1;
  } else {
    ticketUpdate.unreadByAdmin     = (ticket.unreadByAdmin || 0) + 1;
  }
  await SupportTicket.findByIdAndUpdate(ticket._id, ticketUpdate);

  const payload = {
    ticketId: ticket._id,
    message:  {
      _id:        msg._id,
      senderRole,
      senderName: user?.fullName || senderRole,
      text:       text.trim(),
      createdAt:  msg.createdAt,
    },
  };

  // Real-time: send to the requester and to all admins
  emitToUser(ticket.userId._id.toString(), "support:message:new", payload);
  emitToRole("admin", "support:message:new", payload);

  res.status(201).json({ success: true, message: msg });
});

// ─── PUT /api/support/:id/status ─────────────────────────────────────────────
// Admin resolves or closes a ticket.
const updateTicketStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  if (!["resolved", "closed", "open", "in_progress"].includes(status))
    throw new AppError("Invalid status value.", 400);

  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate("userId", "_id fullName");

  if (!ticket) throw new AppError("Ticket not found.", 404);

  // Notify the requester that their ticket status changed
  emitToUser(ticket.userId._id.toString(), "support:ticket:status", {
    ticketId:     ticket._id,
    ticketNumber: ticket.ticketNumber,
    status,
  });

  res.json({ success: true, ticket });
});

module.exports = {
  createTicket,
  getMyTickets,
  getAdminTickets,
  getTicket,
  sendMessage,
  updateTicketStatus,
};
