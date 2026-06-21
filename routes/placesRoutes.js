const express = require("express");
const router  = express.Router();
const { explorePlace } = require("../controllers/placesController");

// Public — powers the "Serving the nation" city explorer on the landing page.
router.get("/explore", explorePlace);

module.exports = router;
