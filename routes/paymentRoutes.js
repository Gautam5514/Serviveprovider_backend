const express = require("express");
const router  = express.Router();
const { protect, customerOnly } = require("../middleware/auth");
const { createOrder, verifyPayment, getConfig } = require("../controllers/paymentController");

// Whether online payments are enabled + the public key (safe to expose).
router.get("/config", getConfig);

// Create an order for a booking, then confirm the completed checkout.
router.post("/order",  protect, customerOnly, createOrder);
router.post("/verify", protect, customerOnly, verifyPayment);

module.exports = router;
