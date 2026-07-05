const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  submitContactMessage,
  getAllMessages,
  updateStatus,
  updateNote,
  deleteMessage,
} = require("../controllers/contactController");

// Admin — static paths kept before public routes
router.get("/admin", protect, adminOnly, getAllMessages);
router.put("/admin/:id/status", protect, adminOnly, updateStatus);
router.put("/admin/:id/note", protect, adminOnly, updateNote);
router.delete("/admin/:id", protect, adminOnly, deleteMessage);

// Public
router.post("/", submitContactMessage);

module.exports = router;
