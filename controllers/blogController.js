const BlogPost = require("../models/BlogPost");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const SEED_POSTS = require("../constants/blogSeed");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(title) {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function uniqueSlug(title, excludeId = null) {
  const base = slugify(title) || "post";
  let slug = base;
  let n = 2;
  // Append -2, -3… until the slug is free.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await BlogPost.findOne(
      excludeId ? { slug, _id: { $ne: excludeId } } : { slug }
    ).select("_id");
    if (!clash) return slug;
    slug = `${base}-${n++}`;
  }
}

// Rough read time from content length (~200 words/minute).
function estimateReadMinutes(content = "") {
  const words = String(content).split(/\s+/).filter(Boolean).length;
  return Math.min(60, Math.max(2, Math.round(words / 200)));
}

async function seedIfEmpty() {
  for (const p of SEED_POSTS) {
    await BlogPost.findOneAndUpdate(
      { slug: p.slug },
      {
        $set: {
          ...p,
          isSeed: true,
          isPublished: true,
          readMinutes: p.readMinutes || estimateReadMinutes(p.content),
        },
      },
      { upsert: true, new: true }
    );
  }
}

// ─── Public ───────────────────────────────────────────────────────────────────

// GET /api/blog — published posts, newest first (?category= filters)
const getPublishedPosts = catchAsync(async (req, res) => {
  await seedIfEmpty();
  const filter = { isPublished: true };
  if (req.query.category) filter.category = req.query.category;

  const posts = await BlogPost.find(filter)
    .select("-content -__v -isSeed")
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(60)
    .lean();

  res.json({ success: true, posts });
});

// GET /api/blog/:slug — one published post + related from the same category
const getPostBySlug = catchAsync(async (req, res) => {
  await seedIfEmpty();
  const post = await BlogPost.findOne({ slug: req.params.slug, isPublished: true })
    .select("-__v -isSeed")
    .lean();
  if (!post) throw new AppError("Post not found.", 404);

  const related = await BlogPost.find({
    isPublished: true,
    _id: { $ne: post._id },
    category: post.category,
  })
    .select("title slug excerpt coverImage category readMinutes createdAt author")
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  res.json({ success: true, post, related });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// GET /api/blog/admin/all
const getAllPosts = catchAsync(async (_req, res) => {
  await seedIfEmpty();
  const posts = await BlogPost.find().select("-__v").sort({ createdAt: -1 }).lean();
  res.json({ success: true, posts });
});

// POST /api/blog/admin
const createPost = catchAsync(async (req, res) => {
  const { title, category, excerpt, content, coverImage, tags, isPublished, isFeatured, authorName } = req.body;

  if (!title?.trim()) throw new AppError("Post title is required.", 400);
  if (!excerpt?.trim()) throw new AppError("A short excerpt is required.", 400);
  if (!content?.trim()) throw new AppError("Post content is required.", 400);

  const post = await BlogPost.create({
    title: title.trim(),
    slug: await uniqueSlug(title),
    category,
    excerpt: excerpt.trim(),
    content: content.trim(),
    coverImage: coverImage?.trim() || undefined,
    tags: Array.isArray(tags)
      ? tags
      : String(tags || "").split(",").map((t) => t.trim()).filter(Boolean),
    author: authorName?.trim() ? { name: authorName.trim() } : undefined,
    readMinutes: estimateReadMinutes(content),
    isPublished: isPublished !== false,
    isFeatured: Boolean(isFeatured),
  });

  res.status(201).json({ success: true, post });
});

// PUT /api/blog/admin/:id
const updatePost = catchAsync(async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) throw new AppError("Post not found.", 404);

  const { title, category, excerpt, content, coverImage, tags, isPublished, isFeatured, authorName } = req.body;

  if (title !== undefined && title.trim() !== post.title) {
    post.title = title.trim();
    post.slug = await uniqueSlug(title, post._id);
  }
  if (category !== undefined) post.category = category;
  if (excerpt !== undefined) post.excerpt = String(excerpt).trim();
  if (content !== undefined) {
    post.content = String(content).trim();
    post.readMinutes = estimateReadMinutes(post.content);
  }
  if (coverImage !== undefined) post.coverImage = String(coverImage).trim() || "/images/default_service.png";
  if (tags !== undefined)
    post.tags = Array.isArray(tags)
      ? tags
      : String(tags).split(",").map((t) => t.trim()).filter(Boolean);
  if (authorName !== undefined && String(authorName).trim())
    post.author = { ...post.author, name: String(authorName).trim() };
  if (isPublished !== undefined) post.isPublished = Boolean(isPublished);
  if (isFeatured !== undefined) post.isFeatured = Boolean(isFeatured);

  await post.save();
  res.json({ success: true, post });
});

// DELETE /api/blog/admin/:id
const deletePost = catchAsync(async (req, res) => {
  const post = await BlogPost.findByIdAndDelete(req.params.id);
  if (!post) throw new AppError("Post not found.", 404);
  res.json({ success: true });
});

module.exports = {
  getPublishedPosts,
  getPostBySlug,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
};
