const mongoose = require("mongoose");

const DEPARTMENTS = ["Engineering", "Design", "Operations", "Marketing", "Support", "Finance", "Other"];
const JOB_TYPES = ["full_time", "part_time", "contract", "internship"];

const CareerSchema = new mongoose.Schema(
  {
    title:      { type: String, required: true, trim: true, maxlength: 90 },
    department: { type: String, enum: DEPARTMENTS, default: "Other" },
    location:   { type: String, required: true, trim: true, maxlength: 80 },
    type:       { type: String, enum: JOB_TYPES, default: "full_time" },
    experience: { type: String, trim: true, maxlength: 40, default: "" },   // e.g. "2–4 years"
    salaryRange:{ type: String, trim: true, maxlength: 60, default: "" },   // e.g. "₹8–14 LPA"

    summary:          { type: String, required: true, trim: true, maxlength: 500 },
    responsibilities: [{ type: String, trim: true, maxlength: 200 }],
    requirements:     [{ type: String, trim: true, maxlength: 200 }],

    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CareerSchema.index({ isOpen: 1, department: 1, createdAt: -1 });

module.exports = mongoose.models.Career || mongoose.model("Career", CareerSchema);
module.exports.DEPARTMENTS = DEPARTMENTS;
module.exports.JOB_TYPES = JOB_TYPES;
