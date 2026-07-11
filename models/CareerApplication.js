const mongoose = require("mongoose");

const APPLICATION_STATUSES = ["new", "shortlisted", "rejected", "hired"];

const CareerApplicationSchema = new mongoose.Schema(
  {
    career: { type: mongoose.Schema.Types.ObjectId, ref: "Career", required: true },

    name:      { type: String, required: true, trim: true, maxlength: 80 },
    email:     { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    phone:     { type: String, required: true, trim: true, maxlength: 20 },
    portfolio: { type: String, trim: true, maxlength: 300, default: "" }, // LinkedIn / GitHub / portfolio URL
    resumeUrl: { type: String, trim: true, maxlength: 300, default: "" },
    coverNote: { type: String, trim: true, maxlength: 2000, default: "" },

    status: { type: String, enum: APPLICATION_STATUSES, default: "new" },

    // Has an admin opened the Job Applicants list since this came in?
    // Powers the sidebar badge, independent of the hiring status above.
    adminViewed: { type: Boolean, default: false },

    submitterIp: { type: String, select: false },
  },
  { timestamps: true }
);

// One application per email per job
CareerApplicationSchema.index({ career: 1, email: 1 }, { unique: true });
CareerApplicationSchema.index({ career: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.CareerApplication ||
  mongoose.model("CareerApplication", CareerApplicationSchema);
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
