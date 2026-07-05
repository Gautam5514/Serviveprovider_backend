const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getPublishedPosts,
  getPostBySlug,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
} = require("../controllers/blogController");

// Admin — static paths kept before the public /:slug route
router.get("/admin/all", protect, adminOnly, getAllPosts);
router.post("/admin", protect, adminOnly, createPost);
router.put("/admin/:id", protect, adminOnly, updatePost);
router.delete("/admin/:id", protect, adminOnly, deletePost);

// Public
router.get("/", getPublishedPosts);
router.get("/:slug", getPostBySlug);

module.exports = router;
