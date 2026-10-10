#!/usr/bin/env node
"use strict";

/**
 * Upserts a fixed test provider account for manual/QA login testing on the
 * partner (professional) portal — bypasses OTP/email verification.
 *
 *   node backend/scripts/seedTestProvider.js
 *
 * Credentials can be overridden via env vars:
 *   TEST_PROVIDER_EMAIL, TEST_PROVIDER_PASSWORD, TEST_PROVIDER_PHONE, TEST_PROVIDER_NAME
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env"), override: true });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const EMAIL = (process.env.TEST_PROVIDER_EMAIL || "test.provider@elitecrewplace.dev")
  .trim()
  .toLowerCase();
const PASSWORD = process.env.TEST_PROVIDER_PASSWORD || "Test@1234";
const PHONE = process.env.TEST_PROVIDER_PHONE || "9999999999";
const NAME = process.env.TEST_PROVIDER_NAME || "Test Provider";

const run = async () => {
  // Matches config/db.js — the URI's own path segment is NOT the db actually used.
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "acmarketplace" });

  const hashedPassword = await bcrypt.hash(PASSWORD, 12);

  const user = await User.findOneAndUpdate(
    { email: EMAIL },
    {
      $set: {
        fullName: NAME,
        email: EMAIL,
        emailVerified: true,
        phone: PHONE,
        phoneVerified: true,
        password: hashedPassword,
        role: "provider",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  console.log("Test provider ready:");
  console.log(`  email:    ${user.email}`);
  console.log(`  password: ${PASSWORD}`);
  console.log(`  phone:    ${user.phone}`);
  console.log(`  role:     ${user.role}`);

  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  });
