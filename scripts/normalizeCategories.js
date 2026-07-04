// One-off migration: snap any service whose category drifted off the canonical
// taxonomy (e.g. "electric-wire") back onto a valid category so bookings stop
// failing the enum validation.  Run:  node scripts/normalizeCategories.js
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db"); // uses the correct dbName ("acmarketplace")
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const { SERVICE_CATEGORIES, canonicalCategory } = require("../constants/categories");

(async () => {
  await connectDB();
  console.log(`Connected to DB "${mongoose.connection.name}". Checking service categories…`);

  let fixed = 0;
  const unmapped = [];
  for (const s of await Service.find({})) {
    const canon = canonicalCategory(s.category);
    if (canon === s.category) continue;
    if (SERVICE_CATEGORIES.includes(canon)) {
      console.log(`  ${s.name}: "${s.category}" -> "${canon}"`);
      await Service.updateOne({ _id: s._id }, { $set: { category: canon } });
      fixed++;
    } else {
      unmapped.push(`${s.name} ("${s.category}")`);
    }
  }

  // Fix any historical bookings carrying a drifted category too.
  let bookingsFixed = 0;
  for (const b of await Booking.find({ serviceCategory: { $nin: SERVICE_CATEGORIES } })) {
    const canon = canonicalCategory(b.serviceCategory);
    if (SERVICE_CATEGORIES.includes(canon)) {
      await Booking.updateOne({ _id: b._id }, { $set: { serviceCategory: canon } });
      bookingsFixed++;
    }
  }

  console.log(`Done. Services fixed: ${fixed}, bookings fixed: ${bookingsFixed}.`);
  if (unmapped.length) console.warn("Needs manual review (no alias):", unmapped.join(", "));
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
