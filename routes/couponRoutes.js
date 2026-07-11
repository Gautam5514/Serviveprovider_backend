const express = require("express");
const router  = express.Router();
const { protect, customerOnly } = require("../middleware/auth");
const { validateCoupon, getActiveCoupons } = require("../controllers/couponController");

router.get("/",         protect, customerOnly, getActiveCoupons);
router.post("/validate", protect, customerOnly, validateCoupon);

module.exports = router;
