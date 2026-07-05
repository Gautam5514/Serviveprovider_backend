const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getOpenCareers,
  getCareerById,
  applyToCareer,
  getAllCareers,
  createCareer,
  updateCareer,
  deleteCareer,
  getApplications,
  getAllApplications,
  updateApplicationStatus,
} = require("../controllers/careerController");

// Admin — static paths kept before public /:id routes
router.get("/admin", protect, adminOnly, getAllCareers);
router.post("/admin", protect, adminOnly, createCareer);
router.get("/admin/applications", protect, adminOnly, getAllApplications);
router.put("/admin/applications/:id/status", protect, adminOnly, updateApplicationStatus);
router.get("/admin/:id/applications", protect, adminOnly, getApplications);
router.put("/admin/:id", protect, adminOnly, updateCareer);
router.delete("/admin/:id", protect, adminOnly, deleteCareer);

// Public
router.get("/", getOpenCareers);
router.get("/:id", getCareerById);
router.post("/:id/apply", applyToCareer);

module.exports = router;
