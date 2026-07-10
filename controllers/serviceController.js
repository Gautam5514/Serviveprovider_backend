const Service = require("../models/Service");
const { SERVICE_CATEGORIES, canonicalCategory } = require("../constants/categories");

function unsplashImage(query) {
  return `https://source.unsplash.com/1200x800/?${encodeURIComponent(query)}`;
}

// Seed default services on GET. Existing admin-created/edited services are not
// overwritten; this only inserts missing default slugs into older databases.
const DEFAULT_SERVICES = [
  // AC
  { name: "AC Repair", slug: "ac-repair", category: "ac", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 75, isPopular: true, sortOrder: 1, images: ["/uploads/ac_repair.png"], whatIsIncluded: ["Full diagnosis", "Basic repair", "Gas pressure check", "Test run"] },
  { name: "AC Installation", slug: "ac-installation", category: "ac", basePrice: 999, priceUnit: "per_visit", estimatedDurationMinutes: 150, isPopular: true, sortOrder: 2, images: ["/uploads/ac_installation.png"], whatIsIncluded: ["Wall mounting", "Copper piping", "Electrical connection", "Test run & demo"] },
  { name: "AC Deep Cleaning", slug: "ac-deep-cleaning", category: "ac", basePrice: 799, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 3, images: ["/uploads/ac_deep_cleaning.png"], whatIsIncluded: ["Filter cleaning", "Coil cleaning", "Drain pipe flush", "Anti-bacterial spray"] },
  { name: "AC Gas Refilling", slug: "ac-gas-refilling", category: "ac", basePrice: 1299, priceUnit: "per_visit", estimatedDurationMinutes: 60, sortOrder: 4, images: ["/uploads/ac_gas_refilling.png"], whatIsIncluded: ["Gas level check", "Leak detection", "Refrigerant refill", "Pressure test"] },
  { name: "AC Uninstallation", slug: "ac-uninstallation", category: "ac", basePrice: 399, priceUnit: "per_visit", estimatedDurationMinutes: 60, sortOrder: 5, images: ["/uploads/ac_uninstallation.png"], whatIsIncluded: ["Safe dismounting", "Gas recovery", "Pipe capping"] },
  // Cooler
  { name: "Cooler Repair", slug: "cooler-repair", category: "cooler", basePrice: 349, priceUnit: "per_visit", estimatedDurationMinutes: 60, isPopular: true, sortOrder: 1, images: ["/uploads/cooler_repair.png"], whatIsIncluded: ["Motor & pump check", "Pad inspection", "Electrical check", "Basic repair"] },
  { name: "Cooler Full Service", slug: "cooler-service", category: "cooler", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 2, images: ["/uploads/cooler_service.png"], whatIsIncluded: ["Full cleaning", "Pad replacement", "Water pump overhaul", "Lubrication"] },
  { name: "Cooler Installation", slug: "cooler-installation", category: "cooler", basePrice: 599, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 3, images: ["/uploads/cooler_installation.png"], whatIsIncluded: ["Placement & mounting", "Water connection", "Electrical setup", "Test run"] },
  // Fan
  { name: "Fan Repair", slug: "fan-repair", category: "fan", basePrice: 199, priceUnit: "per_visit", estimatedDurationMinutes: 45, isPopular: true, sortOrder: 1, images: ["/uploads/fan_repair.png"], whatIsIncluded: ["Diagnosis", "Capacitor check", "Winding inspection", "Basic repair"] },
  { name: "Fan Installation", slug: "fan-installation", category: "fan", basePrice: 299, priceUnit: "per_visit", estimatedDurationMinutes: 45, sortOrder: 2, images: ["/uploads/fan_installation.png"], whatIsIncluded: ["Ceiling/wall mounting", "Electrical connection", "Blade balancing", "Test run"] },
  { name: "Fan Servicing", slug: "fan-servicing", category: "fan", basePrice: 149, priceUnit: "per_visit", estimatedDurationMinutes: 30, sortOrder: 3, images: ["/uploads/fan_servicing.png"], whatIsIncluded: ["Full cleaning", "Blade balancing", "Bearing lubrication"] },
  // TV
  { name: "TV Repair", slug: "tv-repair", category: "tv", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 90, isPopular: true, sortOrder: 1, images: ["/uploads/tv_repair.png"], whatIsIncluded: ["Full diagnosis", "Board inspection", "Basic component repair", "Test"] },
  { name: "TV Wall Mounting", slug: "tv-wall-mounting", category: "tv", basePrice: 599, priceUnit: "per_visit", estimatedDurationMinutes: 60, sortOrder: 2, images: ["/uploads/tv_wall_mounting.png"], whatIsIncluded: ["Bracket installation", "Cable management", "Level alignment", "Safety check"] },
  // Fridge
  { name: "Fridge Repair", slug: "fridge-repair", category: "fridge", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 90, isPopular: true, sortOrder: 1, images: ["/uploads/fridge_repair.png"], whatIsIncluded: ["Cooling diagnosis", "Compressor check", "Thermostat inspection", "Basic repair"] },
  { name: "Fridge Gas Refill", slug: "fridge-gas-refill", category: "fridge", basePrice: 1199, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 2, images: ["/uploads/fridge_gas_refill.png"], whatIsIncluded: ["Leak check", "Gas refill", "Pressure testing", "Cooling test"] },
  // Electrical
  { name: "Electrical Work", slug: "electrical-work", category: "electrical", basePrice: 299, priceUnit: "per_visit", estimatedDurationMinutes: 60, isPopular: true, sortOrder: 1, images: ["/uploads/electrical_work.png"], whatIsIncluded: ["Switch/socket repair", "Wiring check", "MCB/fuse work", "Safety inspection"] },
  { name: "Wiring & Cabling", slug: "wiring-cabling", category: "electrical", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 2, images: ["/uploads/wiring_cabling.png"], whatIsIncluded: ["New wiring", "Cable routing", "Junction box", "Testing"] },
  // Appliance
  { name: "Appliance Repair", slug: "appliance-repair", category: "appliance", basePrice: 399, priceUnit: "per_visit", estimatedDurationMinutes: 90, isPopular: true, sortOrder: 1, images: ["/uploads/appliance_repair.png"], whatIsIncluded: ["Diagnosis", "Component check", "Basic repair", "Test run"] },
  { name: "Washing Machine Repair", slug: "washing-machine-repair", category: "appliance", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 2, images: ["/uploads/washing_machine_repair.png"], whatIsIncluded: ["Motor check", "Drum inspection", "Belt & pump check", "Test run"] },
  { name: "Geyser Repair", slug: "geyser-repair", category: "appliance", basePrice: 399, priceUnit: "per_visit", estimatedDurationMinutes: 75, sortOrder: 3, images: ["/uploads/appliance_repair.png"], whatIsIncluded: ["Heating check", "Thermostat inspection", "Leak check", "Safety test"] },
  { name: "Microwave Repair", slug: "microwave-repair", category: "appliance", basePrice: 449, priceUnit: "per_visit", estimatedDurationMinutes: 75, sortOrder: 4, images: ["/uploads/appliance_repair.png"], whatIsIncluded: ["Diagnosis", "Fuse and magnetron check", "Door sensor check", "Test run"] },
  { name: "RO Water Purifier Service", slug: "ro-water-purifier-service", category: "appliance", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 60, isPopular: true, sortOrder: 5, images: ["/uploads/appliance_repair.png"], whatIsIncluded: ["Filter inspection", "Tank cleaning", "Leak check", "TDS check"] },

  // Cleaning
  { name: "Bathroom Deep Cleaning", slug: "bathroom-deep-cleaning", category: "cleaning", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 90, isPopular: true, sortOrder: 1, images: ["/uploads/cleaning.png"], whatIsIncluded: ["Toilet and basin cleaning", "Tile scrubbing", "Hard-water stain removal", "Floor sanitisation"] },
  { name: "Kitchen Deep Cleaning", slug: "kitchen-deep-cleaning", category: "cleaning", basePrice: 799, priceUnit: "per_visit", estimatedDurationMinutes: 120, isPopular: true, sortOrder: 2, images: ["/uploads/cleaning.png"], whatIsIncluded: ["Countertop degreasing", "Sink and tile cleaning", "Cabinet exterior wipe", "Floor cleaning"] },
  { name: "Full Home Deep Cleaning", slug: "full-home-deep-cleaning", category: "cleaning", basePrice: 2499, priceUnit: "per_visit", estimatedDurationMinutes: 360, isPopular: true, sortOrder: 3, images: ["/uploads/cleaning.png"], whatIsIncluded: ["Room dusting", "Bathroom cleaning", "Kitchen cleaning", "Floor scrubbing"] },
  { name: "Sofa Shampoo Cleaning", slug: "sofa-shampoo-cleaning", category: "cleaning", basePrice: 699, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 4, images: ["/uploads/cleaning.png"], whatIsIncluded: ["Vacuuming", "Shampoo treatment", "Spot cleaning", "Drying guidance"] },
  { name: "Carpet Cleaning", slug: "carpet-cleaning", category: "cleaning", basePrice: 599, priceUnit: "per_visit", estimatedDurationMinutes: 75, sortOrder: 5, images: ["/uploads/cleaning.png"], whatIsIncluded: ["Dust removal", "Shampoo cleaning", "Stain treatment", "Odour control"] },
  { name: "Mattress Cleaning", slug: "mattress-cleaning", category: "cleaning", basePrice: 599, priceUnit: "per_visit", estimatedDurationMinutes: 75, sortOrder: 6, images: ["/uploads/cleaning.png"], whatIsIncluded: ["Vacuuming", "Fabric shampoo", "Dust mite treatment", "Drying guidance"] },
  { name: "Balcony Cleaning", slug: "balcony-cleaning", category: "cleaning", basePrice: 399, priceUnit: "per_visit", estimatedDurationMinutes: 60, sortOrder: 7, images: ["/uploads/cleaning.png"], whatIsIncluded: ["Floor scrubbing", "Railing wipe", "Cobweb removal", "Drain clean-up"] },
  { name: "Move-in Move-out Cleaning", slug: "move-in-move-out-cleaning", category: "cleaning", basePrice: 2999, priceUnit: "per_visit", estimatedDurationMinutes: 420, sortOrder: 8, images: ["/uploads/cleaning.png"], whatIsIncluded: ["Whole-home dusting", "Kitchen and bathroom deep clean", "Cabinet wipe", "Floor scrubbing"] },
  { name: "Regular Housekeeping", slug: "regular-housekeeping", category: "cleaning", basePrice: 299, priceUnit: "per_hour", estimatedDurationMinutes: 120, sortOrder: 9, images: ["/uploads/cleaning.png"], whatIsIncluded: ["Dusting", "Sweeping and mopping", "Utensil support", "Room tidying"] },
  { name: "Window and Glass Cleaning", slug: "window-glass-cleaning", category: "cleaning", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 10, images: ["/uploads/cleaning.png"], whatIsIncluded: ["Interior glass wipe", "Frame cleaning", "Grill dusting", "Streak-free finish"] },

  // Plumbing
  { name: "Tap and Mixer Repair", slug: "tap-mixer-repair", category: "plumbing", basePrice: 249, priceUnit: "per_visit", estimatedDurationMinutes: 45, isPopular: true, sortOrder: 1, images: ["/uploads/plumbing.png"], whatIsIncluded: ["Leak diagnosis", "Washer check", "Mixer inspection", "Basic repair"] },
  { name: "Toilet Flush Repair", slug: "toilet-flush-repair", category: "plumbing", basePrice: 299, priceUnit: "per_visit", estimatedDurationMinutes: 60, sortOrder: 2, images: ["/uploads/plumbing.png"], whatIsIncluded: ["Flush tank check", "Valve repair", "Leak check", "Function test"] },
  { name: "Drain Unclogging", slug: "drain-unclogging", category: "plumbing", basePrice: 399, priceUnit: "per_visit", estimatedDurationMinutes: 75, sortOrder: 3, images: ["/uploads/plumbing.png"], whatIsIncluded: ["Blockage inspection", "Drain clearing", "Odour check", "Flow test"] },
  { name: "Water Tank Cleaning", slug: "water-tank-cleaning", category: "plumbing", basePrice: 899, priceUnit: "per_visit", estimatedDurationMinutes: 120, sortOrder: 4, images: ["/uploads/plumbing.png"], whatIsIncluded: ["Tank draining", "Sludge removal", "Scrubbing", "Disinfection"] },
  { name: "Pipe Leakage Repair", slug: "pipe-leakage-repair", category: "plumbing", basePrice: 449, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 5, images: ["/uploads/plumbing.png"], whatIsIncluded: ["Leak tracing", "Joint sealing", "Pipe section check", "Water flow test"] },

  // Carpentry
  { name: "Door Lock Installation", slug: "door-lock-installation", category: "carpentry", basePrice: 349, priceUnit: "per_visit", estimatedDurationMinutes: 60, isPopular: true, sortOrder: 1, images: ["/uploads/carpentry.png"], whatIsIncluded: ["Lock fitting", "Alignment check", "Screw tightening", "Key test"] },
  { name: "Furniture Assembly", slug: "furniture-assembly", category: "carpentry", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 120, sortOrder: 2, images: ["/uploads/carpentry.png"], whatIsIncluded: ["Parts inspection", "Assembly", "Alignment", "Final tightening"] },
  { name: "Bed Repair", slug: "bed-repair", category: "carpentry", basePrice: 399, priceUnit: "per_visit", estimatedDurationMinutes: 75, sortOrder: 3, images: ["/uploads/carpentry.png"], whatIsIncluded: ["Frame inspection", "Joint tightening", "Minor repair", "Stability check"] },
  { name: "Curtain Rod Installation", slug: "curtain-rod-installation", category: "carpentry", basePrice: 299, priceUnit: "per_visit", estimatedDurationMinutes: 60, sortOrder: 4, images: ["/uploads/carpentry.png"], whatIsIncluded: ["Wall drilling", "Bracket fitting", "Rod alignment", "Load check"] },
  { name: "Modular Furniture Repair", slug: "modular-furniture-repair", category: "carpentry", basePrice: 599, priceUnit: "per_visit", estimatedDurationMinutes: 120, sortOrder: 5, images: ["/uploads/carpentry.png"], whatIsIncluded: ["Hinge check", "Drawer channel repair", "Door alignment", "Basic hardware fix"] },

  // Pest Control
  { name: "Cockroach Pest Control", slug: "cockroach-pest-control", category: "pest-control", basePrice: 799, priceUnit: "per_visit", estimatedDurationMinutes: 90, isPopular: true, sortOrder: 1, images: ["/uploads/pest_control.png"], whatIsIncluded: ["Gel treatment", "Kitchen hotspots", "Bathroom hotspots", "Safety guidance"] },
  { name: "Termite Treatment", slug: "termite-treatment", category: "pest-control", basePrice: 1499, priceUnit: "per_visit", estimatedDurationMinutes: 180, sortOrder: 2, images: ["/uploads/pest_control.png"], whatIsIncluded: ["Termite inspection", "Chemical treatment", "Woodwork focus", "Prevention tips"] },
  { name: "Bed Bug Treatment", slug: "bed-bug-treatment", category: "pest-control", basePrice: 1299, priceUnit: "per_visit", estimatedDurationMinutes: 150, sortOrder: 3, images: ["/uploads/pest_control.png"], whatIsIncluded: ["Bed and sofa inspection", "Spray treatment", "Crack treatment", "Follow-up guidance"] },
  { name: "Mosquito Control", slug: "mosquito-control", category: "pest-control", basePrice: 699, priceUnit: "per_visit", estimatedDurationMinutes: 75, sortOrder: 4, images: ["/uploads/pest_control.png"], whatIsIncluded: ["Breeding spot check", "Spray treatment", "Drain focus", "Prevention guidance"] },

  // Painting
  { name: "Single Wall Painting", slug: "single-wall-painting", category: "painting", basePrice: 999, priceUnit: "per_visit", estimatedDurationMinutes: 240, isPopular: true, sortOrder: 1, images: ["/uploads/painting.png"], whatIsIncluded: ["Surface prep", "Primer check", "Two coats", "Basic cleanup"] },
  { name: "Room Painting", slug: "room-painting", category: "painting", basePrice: 2999, priceUnit: "per_visit", estimatedDurationMinutes: 480, sortOrder: 2, images: ["/uploads/painting.png"], whatIsIncluded: ["Wall preparation", "Putty touch-up", "Painting", "Basic cleanup"] },
  { name: "Wall Dampness Repair", slug: "wall-dampness-repair", category: "painting", basePrice: 1499, priceUnit: "per_visit", estimatedDurationMinutes: 240, sortOrder: 3, images: ["/uploads/painting.png"], whatIsIncluded: ["Dampness inspection", "Scraping", "Patch treatment", "Primer application"] },
  { name: "Texture Wall Painting", slug: "texture-wall-painting", category: "painting", basePrice: 2499, priceUnit: "per_visit", estimatedDurationMinutes: 360, sortOrder: 4, images: ["/uploads/painting.png"], whatIsIncluded: ["Design consultation", "Surface prep", "Texture coat", "Finish check"] },

  // Laundry
  { name: "Cloth Wash and Fold", slug: "cloth-wash-fold", category: "laundry", basePrice: 199, priceUnit: "per_visit", estimatedDurationMinutes: 60, isPopular: true, sortOrder: 1, images: ["/uploads/laundry.png"], whatIsIncluded: ["Pickup coordination", "Machine wash", "Drying", "Folded return"] },
  { name: "Dry Cleaning", slug: "dry-cleaning", category: "laundry", basePrice: 299, priceUnit: "per_visit", estimatedDurationMinutes: 60, sortOrder: 2, images: ["/uploads/laundry.png"], whatIsIncluded: ["Pickup coordination", "Fabric check", "Dry clean processing", "Packed return"] },
  { name: "Steam Ironing", slug: "steam-ironing", category: "laundry", basePrice: 149, priceUnit: "per_visit", estimatedDurationMinutes: 60, sortOrder: 3, images: ["/uploads/laundry.png"], whatIsIncluded: ["Garment count check", "Steam ironing", "Folding or hanger packing", "Delivery handoff"] },
  { name: "Shoe Cleaning", slug: "shoe-cleaning", category: "laundry", basePrice: 249, priceUnit: "per_visit", estimatedDurationMinutes: 60, sortOrder: 4, images: ["/uploads/laundry.png"], whatIsIncluded: ["Dust removal", "Sole cleaning", "Upper cleaning", "Drying guidance"] },
  { name: "Curtain Laundry", slug: "curtain-laundry", category: "laundry", basePrice: 399, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 5, images: ["/uploads/laundry.png"], whatIsIncluded: ["Curtain pickup", "Wash or dry-clean check", "Processing", "Packed return"] },

  // Car Wash
  { name: "Car Exterior Wash", slug: "car-exterior-wash", category: "car-wash", basePrice: 299, priceUnit: "per_visit", estimatedDurationMinutes: 45, isPopular: true, sortOrder: 1, images: ["/uploads/car_wash.png"], whatIsIncluded: ["Foam wash", "Body rinse", "Tyre cleaning", "Microfiber wipe"] },
  { name: "Car Interior Cleaning", slug: "car-interior-cleaning", category: "car-wash", basePrice: 599, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 2, images: ["/uploads/car_wash.png"], whatIsIncluded: ["Vacuuming", "Dashboard wipe", "Mat cleaning", "Door pad cleaning"] },
  { name: "Car Deep Cleaning", slug: "car-deep-cleaning", category: "car-wash", basePrice: 1199, priceUnit: "per_visit", estimatedDurationMinutes: 150, sortOrder: 3, images: ["/uploads/car_wash.png"], whatIsIncluded: ["Exterior wash", "Interior vacuum", "Seat cleaning", "Dashboard polish"] },
  { name: "Bike Wash", slug: "bike-wash", category: "car-wash", basePrice: 149, priceUnit: "per_visit", estimatedDurationMinutes: 35, sortOrder: 4, images: ["/uploads/car_wash.png"], whatIsIncluded: ["Foam wash", "Rinse", "Chain area wipe", "Microfiber dry"] },

  // Beauty and grooming
  { name: "Women Haircut at Home", slug: "women-haircut-at-home", category: "beauty", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 75, isPopular: true, sortOrder: 1, images: ["/uploads/beauty.png"], whatIsIncluded: ["Style consultation", "Haircut", "Basic blow dry", "Clean-up"] },
  { name: "Facial Cleanup", slug: "facial-cleanup", category: "beauty", basePrice: 699, priceUnit: "per_visit", estimatedDurationMinutes: 75, sortOrder: 2, images: ["/uploads/beauty.png"], whatIsIncluded: ["Cleansing", "Scrub", "Massage", "Face pack"] },
  { name: "Manicure and Pedicure", slug: "manicure-pedicure", category: "beauty", basePrice: 799, priceUnit: "per_visit", estimatedDurationMinutes: 90, sortOrder: 3, images: ["/uploads/beauty.png"], whatIsIncluded: ["Nail shaping", "Cuticle care", "Massage", "Polish application"] },
  { name: "Waxing Service", slug: "waxing-service", category: "beauty", basePrice: 499, priceUnit: "per_visit", estimatedDurationMinutes: 75, sortOrder: 4, images: ["/uploads/beauty.png"], whatIsIncluded: ["Skin prep", "Waxing", "After-care wipe", "Hygiene disposal"] },
  { name: "Men Haircut at Home", slug: "men-haircut-at-home", category: "grooming", basePrice: 249, priceUnit: "per_visit", estimatedDurationMinutes: 45, isPopular: true, sortOrder: 1, images: ["/uploads/grooming.png"], whatIsIncluded: ["Haircut", "Neck cleanup", "Basic styling", "Clean-up"] },
  { name: "Beard Styling", slug: "beard-styling", category: "grooming", basePrice: 199, priceUnit: "per_visit", estimatedDurationMinutes: 30, sortOrder: 2, images: ["/uploads/grooming.png"], whatIsIncluded: ["Beard trim", "Line-up", "Moustache trim", "After-care wipe"] },
  { name: "Head Massage", slug: "head-massage", category: "grooming", basePrice: 399, priceUnit: "per_visit", estimatedDurationMinutes: 45, sortOrder: 3, images: ["/uploads/grooming.png"], whatIsIncluded: ["Oil application", "Head massage", "Neck focus", "Relaxation guidance"] },

  // Moving and gardening
  { name: "Packers and Movers Survey", slug: "packers-movers-survey", category: "moving", basePrice: 199, priceUnit: "per_visit", estimatedDurationMinutes: 45, sortOrder: 1, images: ["/uploads/moving.png"], whatIsIncluded: ["Inventory check", "Packing estimate", "Vehicle estimate", "Quote handoff"] },
  { name: "Home Shifting Help", slug: "home-shifting-help", category: "moving", basePrice: 1499, priceUnit: "per_visit", estimatedDurationMinutes: 240, isPopular: true, sortOrder: 2, images: ["/uploads/moving.png"], whatIsIncluded: ["Packing support", "Loading help", "Unloading help", "Basic placement"] },
  { name: "Furniture Moving Help", slug: "furniture-moving-help", category: "moving", basePrice: 799, priceUnit: "per_visit", estimatedDurationMinutes: 120, sortOrder: 3, images: ["/uploads/moving.png"], whatIsIncluded: ["Furniture lifting", "Room-to-room movement", "Basic dismantle support", "Placement"] },
  { name: "Garden Maintenance", slug: "garden-maintenance", category: "gardening", basePrice: 599, priceUnit: "per_visit", estimatedDurationMinutes: 120, sortOrder: 1, images: ["/uploads/gardening.png"], whatIsIncluded: ["Plant trimming", "Weeding", "Watering support", "Cleanup"] },
  { name: "Plant Care Visit", slug: "plant-care-visit", category: "gardening", basePrice: 299, priceUnit: "per_visit", estimatedDurationMinutes: 60, sortOrder: 2, images: ["/uploads/gardening.png"], whatIsIncluded: ["Plant health check", "Watering", "Pruning", "Care tips"] },
  { name: "Lawn Mowing", slug: "lawn-mowing", category: "gardening", basePrice: 699, priceUnit: "per_visit", estimatedDurationMinutes: 120, sortOrder: 3, images: ["/uploads/gardening.png"], whatIsIncluded: ["Grass cutting", "Edge trimming", "Waste collection", "Basic cleanup"] },
];

let defaultSeedPromise = null;

async function seedIfEmpty() {
  if (!defaultSeedPromise) {
    defaultSeedPromise = Promise.all(
      DEFAULT_SERVICES.map((service) => {
        // `images` is set via $set below (so it backfills onto older rows
        // that predate this field too) — it must be excluded from the
        // $setOnInsert object, since Mongo rejects an update that targets
        // the same path with two different operators at once.
        const { images, ...insertFields } = service;
        return Service.updateOne(
          { slug: service.slug },
          {
            $setOnInsert: insertFields,
            $set: { images },
          },
          { upsert: true, runValidators: true }
        );
      })
    ).catch((error) => {
      defaultSeedPromise = null;
      throw error;
    });
  }
  await defaultSeedPromise;
}

function makeSlug(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Slugify a free-form category, then snap common spellings onto a canonical
// category (e.g. "Electric Wire" → "electric-wire" → "electrical"). Returns ""
// only for blank input; an unknown slug is returned as-is so the caller can
// reject it with a helpful message.
function normalizeCategory(value = "") {
  const slug = makeSlug(value);
  return slug ? canonicalCategory(slug) : "";
}

// GET /api/services?category=ac
const getServices = async (req, res) => {
  try {
    await seedIfEmpty();
    const filter = { active: true };
    if (req.query.category) filter.category = req.query.category;
    const services = await Service.find(filter).sort({ isPopular: -1, sortOrder: 1 });
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/services/:slug
const getServiceBySlug = async (req, res) => {
  try {
    await seedIfEmpty();
    const service = await Service.findOne({ slug: req.params.slug, active: true });
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminServices = async (req, res) => {
  try {
    await seedIfEmpty();
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const services = await Service.find(filter).sort({ category: 1, sortOrder: 1, createdAt: -1 });
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminServiceCategories = async (_req, res) => {
  try {
    await seedIfEmpty();
    const categories = await Service.distinct("category");
    res.json({ success: true, categories: categories.filter(Boolean).sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAdminService = async (req, res) => {
  try {
    const {
      name,
      category,
      basePrice,
      priceUnit = "per_visit",
      estimatedDurationMinutes = 60,
      whatIsIncluded = [],
      description = "",
      isPopular = false,
      active = true,
      sortOrder = 0,
      images = [],
    } = req.body;

    const normalizedCategory = normalizeCategory(category);
    if (!name || !normalizedCategory || basePrice === undefined) {
      return res.status(400).json({ success: false, message: "Name, category, and base price are required." });
    }
    if (!SERVICE_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category "${category}". Allowed categories: ${SERVICE_CATEGORIES.join(", ")}.`,
      });
    }

    const baseSlug = makeSlug(req.body.slug || name);
    let slug = baseSlug;
    let suffix = 2;
    while (await Service.exists({ slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const service = await Service.create({
      name,
      slug,
      category: normalizedCategory,
      description,
      basePrice: Number(basePrice),
      priceUnit,
      estimatedDurationMinutes: Number(estimatedDurationMinutes) || 60,
      whatIsIncluded: Array.isArray(whatIsIncluded)
        ? whatIsIncluded.filter(Boolean)
        : String(whatIsIncluded).split("\n").map((item) => item.trim()).filter(Boolean),
      isPopular: Boolean(isPopular),
      active: Boolean(active),
      sortOrder: Number(sortOrder) || 0,
      images,
    });

    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAdminService = async (req, res) => {
  try {
    const allowed = [
      "name",
      "category",
      "description",
      "basePrice",
      "priceUnit",
      "estimatedDurationMinutes",
      "whatIsIncluded",
      "isPopular",
      "active",
      "sortOrder",
      "images",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.basePrice !== undefined) update.basePrice = Number(update.basePrice);
    if (update.estimatedDurationMinutes !== undefined) update.estimatedDurationMinutes = Number(update.estimatedDurationMinutes);
    if (update.sortOrder !== undefined) update.sortOrder = Number(update.sortOrder);
    if (update.whatIsIncluded !== undefined && !Array.isArray(update.whatIsIncluded)) {
      update.whatIsIncluded = String(update.whatIsIncluded).split("\n").map((item) => item.trim()).filter(Boolean);
    }
    if (update.category !== undefined) {
      update.category = normalizeCategory(update.category);
      if (!SERVICE_CATEGORIES.includes(update.category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category. Allowed categories: ${SERVICE_CATEGORIES.join(", ")}.`,
        });
      }
    }

    const service = await Service.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ success: false, message: "Service not found." });
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAdminService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found." });
    res.json({ success: true, message: "Service deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getServices,
  getServiceBySlug,
  seedIfEmpty,
  getAdminServices,
  getAdminServiceCategories,
  createAdminService,
  updateAdminService,
  deleteAdminService,
};
