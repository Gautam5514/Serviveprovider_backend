const mongoose = require("mongoose");

const CONTACT_TOPICS = ["booking", "payment", "provider", "complaint", "feedback", "other"];
const CONTACT_STATUSES = ["new", "in_progress", "resolved"];

const TOPIC_LABELS = {
  booking: "Booking Support",
  payment: "Payment / Invoice",
  provider: "Become a Partner",
  complaint: "Service Complaint",
  feedback: "Feedback",
  other: "General Enquiry",
};

const ContactMessageSchema = new mongoose.Schema(
  {
    referenceNumber: { type: String, unique: true },

    name:    { type: String, required: true, trim: true, maxlength: 80 },
    email:   { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    phone:   { type: String, trim: true, maxlength: 20, default: "" },
    address: { type: String, trim: true, maxlength: 200, default: "" },

    topic:      { type: String, enum: CONTACT_TOPICS, default: "other" },
    bookingNumber: { type: String, trim: true, maxlength: 40, default: "" },
    message:    { type: String, required: true, trim: true, maxlength: 3000 },

    status:    { type: String, enum: CONTACT_STATUSES, default: "new" },
    adminNote: { type: String, trim: true, maxlength: 2000, default: "" },

    submitterIp: { type: String, select: false },
  },
  { timestamps: true }
);

ContactMessageSchema.pre("save", function (next) {
  if (!this.referenceNumber) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rnd = Math.floor(1000 + Math.random() * 9000);
    this.referenceNumber = `CT${ymd}${rnd}`;
  }
  next();
});

ContactMessageSchema.index({ status: 1, createdAt: -1 });
ContactMessageSchema.index({ email: 1, createdAt: -1 });

module.exports =
  mongoose.models.ContactMessage || mongoose.model("ContactMessage", ContactMessageSchema);
module.exports.CONTACT_TOPICS = CONTACT_TOPICS;
module.exports.CONTACT_STATUSES = CONTACT_STATUSES;
module.exports.TOPIC_LABELS = TOPIC_LABELS;
