const mongoose = require("mongoose");

const BLOG_CATEGORIES = [
  "AC & Cooling",
  "Appliances",
  "Electrical",
  "Maintenance Tips",
  "Buying Guides",
];

const BlogPostSchema = new mongoose.Schema(
  {
    title:   { type: String, required: true, trim: true, maxlength: 120 },
    slug:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    category:{ type: String, enum: BLOG_CATEGORIES, default: "Maintenance Tips" },

    excerpt: { type: String, required: true, trim: true, maxlength: 300 },
    // Markdown-lite: "## " headings, "- " lists, "> " quotes, **bold** inline.
    content: { type: String, required: true },

    coverImage: { type: String, trim: true, default: "/images/default_service.png" },
    author: {
      name: { type: String, trim: true, default: "EliteCrew Team" },
      role: { type: String, trim: true, default: "Home Services Experts" },
    },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    readMinutes: { type: Number, min: 1, max: 60, default: 4 },

    isPublished: { type: Boolean, default: true },
    isFeatured:  { type: Boolean, default: false },
    isSeed:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

BlogPostSchema.index({ isPublished: 1, category: 1, createdAt: -1 });

module.exports = mongoose.models.BlogPost || mongoose.model("BlogPost", BlogPostSchema);
module.exports.BLOG_CATEGORIES = BLOG_CATEGORIES;
