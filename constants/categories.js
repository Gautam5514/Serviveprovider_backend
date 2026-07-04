// Single source of truth for service categories across the platform.
// The customer app (icons/labels), the Service model, the Booking model and the
// admin create/update validation all reference this list so a service can never
// be created with a category that bookings would later reject.
const SERVICE_CATEGORIES = ["ac", "cooler", "fan", "tv", "fridge", "electrical", "appliance", "cleaning", "other"];

// Common free-form / legacy spellings mapped onto a canonical category, so an
// admin typing "Electric Wire" or "Refrigerator" still lands on a valid slug.
const CATEGORY_ALIASES = {
  "electric": "electrical",
  "electric-wire": "electrical",
  "electrical-wire": "electrical",
  "electric-wiring": "electrical",
  "wiring": "electrical",
  "electrician": "electrical",
  "refrigerator": "fridge",
  "freeze": "fridge",
  "television": "tv",
  "air-conditioner": "ac",
  "air-conditioning": "ac",
  "air-cooler": "cooler",
  "appliances": "appliance",
  "clean": "cleaning",
  "cleaner": "cleaning",
  "home-cleaning": "cleaning",
  "deep-cleaning": "cleaning",
  "bathroom-cleaning": "cleaning",
  "bathroom-clean": "cleaning",
  "kitchen-cleaning": "cleaning",
  "sofa-cleaning": "cleaning",
  "others": "other",
  "misc": "other",
  "general": "other",
};

function canonicalCategory(slug) {
  if (!slug) return slug;
  const s = String(slug).toLowerCase();
  if (SERVICE_CATEGORIES.includes(s)) return s;
  return CATEGORY_ALIASES[s] || s;
}

module.exports = { SERVICE_CATEGORIES, CATEGORY_ALIASES, canonicalCategory };
