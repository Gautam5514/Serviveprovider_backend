const express = require("express");
const router  = express.Router();
const {
  explorePlace, placesAutocomplete, placeDetails, reverseGeocode,
} = require("../controllers/placesController");

// Public — powers the "Serving the nation" city explorer on the landing page.
router.get("/explore", explorePlace);

// Google Places / Geocoding proxy — keeps the API key server-side for the web
// address picker (autocomplete search, place lookup, pin -> address).
router.get("/autocomplete", placesAutocomplete);
router.get("/details",      placeDetails);
router.get("/reverse",      reverseGeocode);

module.exports = router;
