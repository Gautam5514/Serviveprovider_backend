const crypto           = require("crypto");
const Booking          = require("../models/Booking");
const Provider         = require("../models/Provider");
const ProviderRating   = require("../models/ProviderRating");
const User             = require("../models/User");
const Coupon           = require("../models/Coupon");
const Service          = require("../models/Service");
const ProviderAvailability = require("../models/ProviderAvailability");
const { SERVICE_CATEGORIES, canonicalCategory } = require("../constants/categories");
const {
  sendJobCompletedEmail,
} = require("../utils/emailService");
const { generateInvoicePdf } = require("../utils/invoicePdf");
const { createNotification, notifyMany } = require("../utils/notificationService");
const { emitToUser } = require("../socket");

const DAY_MAP = ["sun","mon","tue","wed","thu","fri","sat"];

function generateOTP() {
  // crypto-random — Math.random() is predictable and not safe for a verification code
  return crypto.randomInt(1000, 10000).toString();
}

// The completion OTP is the customer's doorstep secret. A provider must never
// receive it in any API response, or they could "start" a job without actually
// being with the customer.
function stripOtp(bookingDoc) {
  if (!bookingDoc) return bookingDoc;
  const obj = typeof bookingDoc.toObject === "function" ? bookingDoc.toObject() : { ...bookingDoc };
  delete obj.completionOtp;
  return obj;
}

function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
}

const SERVICE_CATEGORY_KEYWORDS = {
  ac: ["ac", "a/c", "air conditioner", "air conditioning", "hvac"],
  cooler: ["cooler", "air cooler"],
  fan: ["fan", "ceiling fan", "table fan", "exhaust"],
  tv: ["tv", "television", "led", "display"],
  fridge: ["fridge", "refrigerator", "freezer"],
  electrical: ["electric", "electrical", "wiring", "switch", "socket", "mcb"],
  appliance: ["appliance", "fridge", "refrigerator", "washing", "geyser", "microwave"],
  cleaning: ["clean", "cleaning", "bathroom", "kitchen", "sofa", "housekeeping"],
  plumbing: ["plumb", "plumber", "pipe", "tap", "mixer", "flush", "drain", "leak", "water tank"],
  carpentry: ["carpenter", "carpentry", "wood", "furniture", "door", "lock", "curtain rod"],
  "pest-control": ["pest", "cockroach", "termite", "bed bug", "mosquito", "insect"],
  painting: ["paint", "painting", "painter", "wall", "dampness", "texture"],
  laundry: ["laundry", "cloth", "clothes", "dry clean", "ironing", "shoe cleaning", "curtain"],
  "car-wash": ["car wash", "vehicle wash", "car cleaning", "car detailing", "bike wash"],
  beauty: ["beauty", "salon", "facial", "manicure", "pedicure", "waxing", "haircut"],
  grooming: ["grooming", "barber", "haircut", "beard", "massage"],
  moving: ["moving", "shifting", "packer", "mover", "furniture moving"],
  gardening: ["garden", "gardening", "plant", "lawn", "mowing"],
  // "other" is a catch-all — providers match it only by explicitly listing the
  // category on their profile, never via keyword inference.
  other: [],
};

function getProviderServiceCategories(provider) {
  const categories = new Set();

  for (const service of provider?.services || []) {
    if (service.category) categories.add(service.category);

    const searchable = normalizeText([
      service.serviceName,
      service.previousCompany,
    ].filter(Boolean).join(" "));

    for (const [category, keywords] of Object.entries(SERVICE_CATEGORY_KEYWORDS)) {
      if (keywords.some((keyword) => searchable.includes(keyword))) {
        categories.add(category);
      }
    }
  }

  return [...categories];
}

function providerCanServeCategory(provider, category) {
  return getProviderServiceCategories(provider).includes(category);
}

function getProviderCoords(provider) {
  const coords = provider?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function getBookingCoords(booking) {
  const lat = Number(booking?.address?.lat);
  const lng = Number(booking?.address?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function distanceKm(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function providerRadiusKm(provider, availability) {
  return Number(availability?.travelRadiusKm || provider?.workingRadiusKm || 10);
}

function textLocationMatches(provider, availability, booking) {
  const city = normalizeText(provider.city);
  const serviceArea = normalizeText(provider.serviceArea);
  const preferred = (availability?.preferredLocations || []).map(normalizeText);
  const bookingCity = normalizeText(booking.address?.city);
  const bookingText = normalizeText(booking.address?.text);

  if (city && bookingCity && (bookingCity.includes(city) || city.includes(bookingCity))) return true;
  if (serviceArea && bookingText.includes(serviceArea)) return true;
  return preferred.some((loc) => loc && (bookingText.includes(loc) || bookingCity.includes(loc)));
}

function jobMatchesProviderLocation(provider, availability, booking) {
  const textMatches = textLocationMatches(provider, availability, booking);
  const p = getProviderCoords(provider);
  const b = getBookingCoords(booking);
  if (p && b) {
    const km = distanceKm(p, b);
    return {
      matches: km <= providerRadiusKm(provider, availability) || textMatches,
      distanceKm: km,
    };
  }
  return { matches: textMatches, distanceKm: null };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

// One query for every provider's availability, exposed as an O(1) lookup map.
// Replaces the previous per-provider findOne inside the matching loops (N+1).
async function getAvailabilityMap(providerIds) {
  const docs = await ProviderAvailability.find({ providerId: { $in: providerIds } }).lean();
  return new Map(docs.map((doc) => [doc.providerId.toString(), doc]));
}

// Find the best available provider for a booking
async function autoAssignProvider(serviceCategory, scheduledDate, address = {}, scheduledTimeSlot = null) {
  const dayOfWeek = DAY_MAP[new Date(scheduledDate).getDay()];

  const providers = await Provider.find({
    isActive: true,
    onboardingStatus: "approved",
  }).sort({ rating: -1, totalJobsCompleted: -1 });

  const availabilityMap = await getAvailabilityMap(providers.map((p) => p._id));
  const bookingLike = { address, scheduledTimeSlot };
  const candidates = [];

  for (const p of providers) {
    if (!providerCanServeCategory(p, serviceCategory)) continue;

    const av = availabilityMap.get(p._id.toString());
    if (av && av.availableDays.includes(dayOfWeek)) {
      const locationMatch = jobMatchesProviderLocation(p, av, bookingLike);
      if (!locationMatch.matches) continue;
      candidates.push({ provider: p, distanceKm: locationMatch.distanceKm });
    }
  }

  candidates.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm !== null) return -1;
    if (b.distanceKm !== null) return 1;
    return (b.provider.rating || 0) - (a.provider.rating || 0);
  });

  // Check slot conflicts only for the ranked candidates, best-first, so we
  // stop at the first free provider instead of querying for every provider.
  for (const { provider } of candidates) {
    const conflict = await Booking.findOne({
      providerId: provider._id,
      scheduledDate: new Date(scheduledDate),
      ...(scheduledTimeSlot && { scheduledTimeSlot }),
      status: { $in: ["pending", "accepted", "provider_on_way", "in_progress"] },
    }).lean();
    if (!conflict) return provider;
  }

  return null;
}

async function getMatchingProvidersForBooking(booking) {
  const dayOfWeek = DAY_MAP[new Date(booking.scheduledDate).getDay()];
  const providers = await Provider.find({
    isActive: true,
    onboardingStatus: "approved",
  }).select("userId services city serviceArea location workingRadiusKm");

  const availabilityMap = await getAvailabilityMap(providers.map((p) => p._id));

  const matches = [];
  for (const provider of providers) {
    if (!providerCanServeCategory(provider, booking.serviceCategory)) continue;

    const availability = availabilityMap.get(provider._id.toString());
    if (!availability?.availableDays?.includes(dayOfWeek)) continue;

    const locationMatch = jobMatchesProviderLocation(provider, availability, booking);
    if (!locationMatch.matches) continue;

    matches.push({ provider, distanceKm: locationMatch.distanceKm });
  }

  return matches.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm !== null) return -1;
    if (b.distanceKm !== null) return 1;
    return 0;
  });
}

// ─── POST /api/bookings ───────────────────────────────────────────────────────
const createBooking = async (req, res) => {
  try {
    const customerId = req.user._id;
    const {
      serviceCategory, serviceName, serviceSlug,
      scheduledDate, scheduledTimeSlot,
      address, pricing, customerNote, paymentMethod,
    } = req.body;

    if (!serviceCategory || !serviceName || !scheduledDate || !scheduledTimeSlot || !address?.text || !pricing?.basePrice) {
      return res.status(400).json({ success: false, message: "Missing required booking fields" });
    }

    // Resolve the canonical category. Prefer the authoritative value from the
    // Service record (by slug) so a stale/old app cache can't send a category
    // the booking enum would reject; fall back to normalising what was sent.
    let category = canonicalCategory(serviceCategory);
    if (serviceSlug) {
      const svc = await Service.findOne({ slug: serviceSlug }).select("category").lean();
      if (svc?.category) category = canonicalCategory(svc.category);
    }
    if (!SERVICE_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `Unsupported service category "${serviceCategory}".` });
    }

    // Server-side price sanity bounds — the client computes the cart total, but
    // a crafted request could send a negative/absurd number. Carts can hold
    // multiple services and quantities, so we bound-check rather than match a
    // single catalog price exactly.
    const basePrice = Math.round(Number(pricing.basePrice));
    if (!Number.isFinite(basePrice) || basePrice < 49 || basePrice > 500000) {
      return res.status(400).json({ success: false, message: "Invalid booking amount." });
    }
    const platformFee = Math.round(basePrice * 0.1);       // 10% platform fee
    const tax         = Math.round((basePrice + platformFee) * 0.18); // 18% GST
    const totalAmount = basePrice + platformFee + tax;

    // New bookings enter the broadcast pool. Every matching provider can see it;
    // the first provider to claim it becomes the assigned technician.
    const provider = null;

    // Apply coupon discount if provided
    let discount = 0;
    let couponCode = null;
    if (req.body.couponCode) {
      // ATOMIC coupon redemption — find + increment in a single MongoDB operation.
      // Prevents two concurrent bookings from both passing the usedCount < maxUses
      // guard and over-redeeming the same limited coupon. The filter also enforces
      // minOrderValue and applicableCategories so the rules checked by
      // /coupons/validate cannot be bypassed by calling this endpoint directly.
      // `new: false` returns the doc as it was BEFORE the increment so the
      // original discountValue is used for the calculation below.
      const coupon = await Coupon.findOneAndUpdate(
        {
          code:          req.body.couponCode.toUpperCase().trim(),
          isActive:      true,
          expiresAt:     { $gt: new Date() },
          minOrderValue: { $lte: basePrice },
          $and: [
            { $or: [{ maxUses: null }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }] },
            { $or: [{ applicableCategories: { $size: 0 } }, { applicableCategories: category }] },
          ],
        },
        { $inc: { usedCount: 1 } },
        { new: false }
      );
      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: "This coupon is invalid, expired, or not applicable to this order.",
        });
      }
      discount   = coupon.discountType === "percent"
        ? Math.round((basePrice * coupon.discountValue) / 100)
        : coupon.discountValue;
      couponCode = coupon.code;
    }

    const finalTotal = Math.max(0, totalAmount - discount);

    let booking;
    try {
      booking = await Booking.create({
        customerId,
        providerId:      provider?._id || null,
        serviceCategory: category, serviceName, serviceSlug: serviceSlug || "",
        scheduledDate:   new Date(scheduledDate),
        scheduledTimeSlot,
        address,
        pricing:         { basePrice, platformFee, tax, discount, totalAmount: finalTotal },
        paymentStatus:   "unpaid",
        paymentMethod:   paymentMethod || "cash_on_delivery",
        completionOtp:   generateOTP(),
        customerNote:    customerNote || "",
        status:          "pending",
      });
    } catch (createError) {
      // Booking failed after the coupon was already redeemed — give the use back.
      if (couponCode) {
        Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: -1 } }).catch(console.error);
      }
      throw createError;
    }

    createNotification({
      recipientId: customerId,
      recipientRole: "customer",
      type: "booking_created",
      title: "Booking created",
      message: "Your request is live. Nearby verified providers are being notified now.",
      bookingId: booking._id,
    }).catch(console.error);

    getMatchingProvidersForBooking(booking)
      .then((matches) => notifyMany(matches.map(({ provider, distanceKm }) => ({
        recipientId: provider.userId,
        recipientRole: "provider",
        type: "new_job_available",
        title: "New job near you",
        message: `${booking.serviceName} is available in ${booking.address?.city || "your service area"}. Confirm first to claim it.`,
        bookingId: booking._id,
        data: {
          distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(1)),
          serviceCategory: booking.serviceCategory,
        },
      }))))
      .catch(console.error);

    res.status(201).json({
      success: true,
      message: "Booking created. We are notifying nearby providers.",
      booking,
      providerAssigned: false,
      couponApplied: couponCode,
      discount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/bookings/my ─────────────────────────────────────────────────────
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.user._id })
      .populate({
        path:     "providerId",
        select:   "city serviceArea services userId",
        populate: { path: "userId", select: "fullName phone" },
      })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: "providerId", populate: { path: "userId", select: "fullName phone" } })
      .populate("customerId", "fullName phone");

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const userId     = req.user._id.toString();
    const isCustomer = booking.customerId?._id?.toString() === userId || booking.customerId?.toString() === userId;
    const isProvider = booking.providerId?.userId?._id?.toString() === userId;
    const isAdmin    = req.user.role === "admin";

    // Open pool jobs (pending + unassigned) are broadcast to matching providers,
    // so any provider may VIEW one before claiming — with the customer's private
    // details withheld until they accept.
    const isPoolPreview = req.user.role === "provider" && !isProvider &&
      booking.status === "pending" && !booking.providerId;

    if (!isCustomer && !isProvider && !isAdmin && !isPoolPreview) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const data = booking.toObject();
    // Hide OTP from providers (only the customer sees it; the provider enters it).
    if (req.user.role === "provider") delete data.completionOtp;

    // Pool preview: mask PII until the job is claimed.
    if (isPoolPreview) {
      if (data.customerId) data.customerId = { _id: data.customerId._id, fullName: data.customerId.fullName };
      if (data.address) data.address = { city: data.address.city, pincode: data.address.pincode };
    }

    res.json({ success: true, booking: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/bookings/:id/invoice ────────────────────────────────────────────
const getBookingInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: "providerId", populate: { path: "userId", select: "fullName phone" } })
      .populate("customerId", "fullName phone");

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const userId     = req.user._id.toString();
    const isCustomer = booking.customerId?._id?.toString() === userId || booking.customerId?.toString() === userId;
    const isProvider = booking.providerId?.userId?._id?.toString() === userId;
    const isAdmin    = req.user.role === "admin";

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({ success: false, message: "Invoice is only available once the job is completed" });
    }

    const pdfBuffer = await generateInvoicePdf({
      booking,
      customerName:   booking.customerId?.fullName,
      providerName:   booking.providerId?.userId?.fullName,
      providerPhone:  booking.providerId?.userId?.phone,
    });

    res.set({
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="EliteCrew-Invoice-${booking.bookingNumber || booking._id}.pdf"`,
      "Content-Length":      pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/bookings/:id/cancel ─────────────────────────────────────────────
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const userId     = req.user._id.toString();
    const isCustomer = booking.customerId?.toString() === userId;
    const isAdmin    = req.user.role === "admin";

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (["completed","cancelled"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${booking.status} booking` });
    }

    // ATOMIC — the status guard in the filter means a cancel racing against a
    // provider's complete/start transition can't clobber the finished state.
    const cancelled = await Booking.findOneAndUpdate(
      { _id: booking._id, status: { $nin: ["completed", "cancelled"] } },
      {
        $set: {
          status:       "cancelled",
          cancelledBy:  isAdmin ? "admin" : "customer",
          cancelReason: req.body.reason || "",
          cancelledAt:  new Date(),
        },
      },
      { new: true }
    );
    if (!cancelled) {
      return res.status(409).json({ success: false, message: "This booking was just updated. Please refresh and try again." });
    }

    // Tell the assigned provider so they don't head to a cancelled job.
    if (cancelled.providerId) {
      Provider.findById(cancelled.providerId).select("userId").lean()
        .then((prov) => prov && createNotification({
          recipientId: prov.userId,
          recipientRole: "provider",
          type: "booking_cancelled",
          title: "Job cancelled",
          message: `${cancelled.serviceName} on ${new Date(cancelled.scheduledDate).toLocaleDateString("en-IN")} was cancelled by the ${isAdmin ? "admin" : "customer"}.`,
          bookingId: cancelled._id,
        }))
        .catch(console.error);
    }

    res.json({ success: true, message: "Booking cancelled", booking: cancelled });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/bookings/provider/jobs ─────────────────────────────────────────
const getProviderJobs = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) return res.status(404).json({ success: false, message: "Provider profile not found" });

    const { status } = req.query;
    const filter = { providerId: provider._id };
    if (status) filter.status = status;

    const jobs = await Booking.find(filter)
      .select("-completionOtp")
      .populate("customerId", "fullName phone")
      .populate("ratingId", "rating review tags createdAt")
      .sort({ scheduledDate: 1, createdAt: -1 })
      .lean();

    const ratings = await ProviderRating.find({
      providerId: provider._id,
      bookingId: { $in: jobs.map((job) => job._id) },
      isVisible: true,
      adminHidden: false,
    }).select("bookingId rating review tags createdAt").lean();

    const ratingByBooking = new Map(ratings.map((rating) => [rating.bookingId.toString(), rating]));
    const jobsWithRatings = jobs.map((job) => {
      const ratingDoc = job.ratingId || ratingByBooking.get(job._id.toString()) || null;
      return {
        ...job,
        ratingId: ratingDoc,
        rating: ratingDoc?.rating || null,
        review: ratingDoc?.review || "",
        ratingTags: ratingDoc?.tags || [],
      };
    });

    res.json({ success: true, jobs: jobsWithRatings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/bookings/:id/accept ─────────────────────────────────────────────
// Two cases are handled:
//
//   BROADCAST (providerId: null, status: "pending")
//     Any approved provider whose categories and location match can claim it.
//     Uses an atomic findOneAndUpdate so two simultaneous accepts cannot both
//     succeed — identical to the pickupJob logic.
//
//   PRE-ASSIGNED (providerId set, status: "pending")
//     Only the already-assigned provider can accept (legacy / admin-assign flow).
//     A simple findByIdAndUpdate is safe here because the booking belongs to
//     exactly one provider.
const acceptJob = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider)
      return res.status(404).json({ success: false, message: "Provider profile not found" });
    if (!provider.isActive || provider.onboardingStatus !== "approved")
      return res.status(403).json({ success: false, message: "Your profile must be approved to accept jobs." });

    const snap = await Booking.findById(req.params.id).lean();
    if (!snap)
      return res.status(404).json({ success: false, message: "Booking not found" });
    if (snap.status !== "pending")
      return res.status(400).json({ success: false, message: `Cannot accept a booking with status: ${snap.status}` });

    let booking;

    if (!snap.providerId) {
      // ── BROADCAST JOB ───────────────────────────────────────────────────────
      if (!providerCanServeCategory(provider, snap.serviceCategory)) {
        return res.status(403).json({
          success: false,
          message: "This job does not match your approved service categories.",
        });
      }
      const availability = await ProviderAvailability.findOne({ providerId: provider._id });
      const locationMatch = jobMatchesProviderLocation(provider, availability, snap);
      if (!locationMatch.matches) {
        return res.status(403).json({
          success: false,
          message: "This job is outside your service location or working radius.",
        });
      }

      // Atomic — only one provider's write can match this filter.
      booking = await Booking.findOneAndUpdate(
        { _id: req.params.id, status: "pending", providerId: null },
        { $set: { providerId: provider._id, status: "accepted" } },
        { new: true }
      );
      if (!booking) {
        return res.status(409).json({
          success: false,
          message: "This job was just claimed by another provider.",
        });
      }
    } else {
      // ── PRE-ASSIGNED JOB ────────────────────────────────────────────────────
      if (snap.providerId.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: "This job is not assigned to you" });
      }
      booking = await Booking.findByIdAndUpdate(
        req.params.id,
        { $set: { status: "accepted" } },
        { new: true }
      );
    }

    const providerUser = await User.findById(provider.userId).select("fullName").lean();
    createNotification({
      recipientId: booking.customerId,
      recipientRole: "customer",
      type: "job_claimed",
      title: "Your provider is ready",
      message: `${providerUser?.fullName || "Your technician"} confirmed your booking and will prepare for the visit.`,
      bookingId: booking._id,
    }).catch(console.error);

    res.json({ success: true, message: "Job accepted", booking: stripOtp(booking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/bookings/:id/reject ─────────────────────────────────────────────
const rejectJob = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) return res.status(404).json({ success: false, message: "Provider profile not found" });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.providerId?.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: "This job is not assigned to you" });
    }
    if (!["pending","accepted"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Cannot reject this booking" });
    }

    // Unassign provider and try to find another
    booking.providerId  = null;
    booking.status      = "pending";
    booking.cancelledBy = undefined;
    await booking.save();

    res.json({ success: true, message: "Job released back to nearby providers", booking: stripOtp(booking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/bookings/:id/provider-cancel ───────────────────────────────────
// A provider who accepted a job but can't do it releases it back to the pool.
// Allowed any time before completion. The job is re-broadcast to other nearby
// providers, the customer is told a new pro is being assigned, and the release
// is recorded against the provider's reliability (reasons + strike count).
const providerCancelJob = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) return res.status(404).json({ success: false, message: "Provider profile not found" });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.providerId?.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: "This job is not assigned to you" });
    }
    if (!["accepted", "provider_on_way", "in_progress"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot release a ${booking.status} job` });
    }

    const reason = (req.body.reason || "").trim();
    if (!reason) return res.status(400).json({ success: false, message: "A reason is required to release the job" });

    // Late releases (already en route / in progress) are worse for the customer.
    const stage = booking.status;
    const late  = ["provider_on_way", "in_progress"].includes(stage);

    // Record the strike on the provider's reliability history.
    provider.cancellationCount = (provider.cancellationCount || 0) + 1;
    provider.cancellations = provider.cancellations || [];
    provider.cancellations.push({ bookingId: booking._id, reason, stage, late, at: new Date() });
    await provider.save();

    // Release the booking back into the broadcast pool.
    const releasedByUserId = provider.userId;
    booking.providerId            = null;
    booking.status                = "pending";
    booking.completionOtpVerified = false;
    booking.cancelledBy           = undefined;
    await booking.save();

    // Tell the customer a replacement is being found — booking stays alive.
    createNotification({
      recipientId: booking.customerId,
      recipientRole: "customer",
      type: "provider_released",
      title: "Assigning a new professional",
      message: "Your earlier professional couldn't make it. We're matching you with another nearby pro now.",
      bookingId: booking._id,
    }).catch(console.error);

    // Re-broadcast to other matching providers (skip the one who just released).
    getMatchingProvidersForBooking(booking)
      .then((matches) => notifyMany(
        matches
          .filter(({ provider: p }) => p.userId?.toString() !== releasedByUserId?.toString())
          .map(({ provider: p, distanceKm }) => ({
            recipientId: p.userId,
            recipientRole: "provider",
            type: "new_job_available",
            title: "New job near you",
            message: `${booking.serviceName} is available in ${booking.address?.city || "your service area"}. Confirm first to claim it.`,
            bookingId: booking._id,
            data: {
              distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(1)),
              serviceCategory: booking.serviceCategory,
            },
          }))
      ))
      .catch(console.error);

    res.json({ success: true, message: "Job released. We're finding the customer another provider.", booking: stripOtp(booking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/bookings/:id/on-way ─────────────────────────────────────────────
const markOnWay = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    const booking  = await Booking.findById(req.params.id);
    if (!booking || booking.providerId?.toString() !== provider?._id?.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (booking.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Accept the job first" });
    }
    booking.status = "provider_on_way";
    await booking.save();
    createNotification({
      recipientId: booking.customerId,
      recipientRole: "customer",
      type: "provider_on_way",
      title: "Provider on the way",
      message: "Your technician has started heading to your location.",
      bookingId: booking._id,
    }).catch(console.error);
    res.json({ success: true, message: "Customer notified you are on the way", booking: stripOtp(booking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/bookings/:id/start ──────────────────────────────────────────────
// Provider arrives, customer gives OTP → provider enters it to start job
const startJob = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    const booking  = await Booking.findById(req.params.id);
    if (!booking || booking.providerId?.toString() !== provider?._id?.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (!["accepted","provider_on_way"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Invalid status to start job" });
    }

    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: "OTP is required" });
    // Cast before comparing — native clients send the OTP as a number, which
    // would never strictly equal the string stored on the booking.
    if (String(otp).trim() !== booking.completionOtp) {
      return res.status(400).json({ success: false, message: "Incorrect OTP. Please ask the customer to check their booking." });
    }

    booking.status = "in_progress";
    booking.completionOtpVerified = true;
    await booking.save();
    createNotification({
      recipientId: booking.customerId,
      recipientRole: "customer",
      type: "job_started",
      title: "Work started",
      message: "Your OTP was verified and the service is now in progress.",
      bookingId: booking._id,
    }).catch(console.error);
    res.json({ success: true, message: "OTP verified. Job started!", booking: stripOtp(booking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/bookings/:id/complete ──────────────────────────────────────────
const completeJob = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    const booking  = await Booking.findById(req.params.id);
    if (!booking || booking.providerId?.toString() !== provider?._id?.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (booking.status !== "in_progress") {
      return res.status(400).json({ success: false, message: "Start the job first by verifying the OTP" });
    }

    booking.status      = "completed";
    booking.completedAt = new Date();
    // For cash on delivery, mark as paid on completion
    if (booking.paymentMethod === "cash_on_delivery") {
      booking.paymentStatus = "paid";
    }
    await booking.save();

    // Update provider stats
    await Provider.findByIdAndUpdate(provider._id, { $inc: { totalJobsCompleted: 1 } });

    createNotification({
      recipientId: booking.customerId,
      recipientRole: "customer",
      type: "invoice_ready",
      title: "Invoice ready",
      message: "Your service is complete. The invoice is ready for your records.",
      bookingId: booking._id,
    }).catch(console.error);

    createNotification({
      recipientId: provider.userId,
      recipientRole: "provider",
      type: "job_completed",
      title: "Job completed",
      message: `${booking.serviceName} has been marked complete.`,
      bookingId: booking._id,
    }).catch(console.error);

    // Completion is the one lifecycle email we keep: it acts as a receipt/invoice record.
    const [customer, providerUser] = await Promise.all([
      User.findById(booking.customerId).select("fullName email"),
      User.findById(provider.userId).select("fullName phone"),
    ]);
    if (customer?.email) {
      sendJobCompletedEmail(customer.email, customer.fullName, booking, {
        providerName: providerUser?.fullName,
        providerPhone: providerUser?.phone,
      }).catch(console.error);
    }

    res.json({ success: true, message: "Job completed successfully!", booking: stripOtp(booking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/bookings (admin) ────────────────────────────────────────────────
const getAllBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("customerId", "fullName phone email")
        .populate({ path: "providerId", populate: { path: "userId", select: "fullName phone" } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Booking.countDocuments(filter),
    ]);
    res.json({ success: true, bookings, total, page: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/bookings/provider/available ─────────────────────────────────────
// Returns unassigned bookings in the provider's city + matching their service
// categories. Provider can "pick up" any of these.
const getAvailableJobs = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider)
      return res.status(404).json({ success: false, message: "Provider profile not found" });
    if (!provider.isActive || provider.onboardingStatus !== "approved")
      return res.json({ success: true, jobs: [], message: "Your profile must be approved to see available jobs." });

    const myCategories = getProviderServiceCategories(provider);
    if (myCategories.length === 0)
      return res.json({ success: true, jobs: [], message: "Add services to your profile to see matching jobs." });

    const availability = await ProviderAvailability.findOne({ providerId: provider._id });

    const jobs = await Booking.find({
      providerId: null,
      status:    "pending",
      serviceCategory: { $in: myCategories },
      scheduledDate: { $gte: startOfToday() }, // include today's bookings stored at midnight
    })
      .populate("customerId", "fullName")
      .sort({ scheduledDate: 1, createdAt: 1 })
      .limit(80);

    const matchedJobs = jobs
      .map((job) => {
        const match = jobMatchesProviderLocation(provider, availability, job);
        return { job, match };
      })
      .filter(({ match }) => match.matches)
      .sort((a, b) => {
        if (a.match.distanceKm !== null && b.match.distanceKm !== null) {
          return a.match.distanceKm - b.match.distanceKm;
        }
        if (a.match.distanceKm !== null) return -1;
        if (b.match.distanceKm !== null) return 1;
        return new Date(a.job.scheduledDate) - new Date(b.job.scheduledDate);
      })
      .slice(0, 20)
      .map(({ job, match }) => ({
        ...stripOtp(job),
        matchDistanceKm: match.distanceKm === null ? null : Number(match.distanceKm.toFixed(1)),
      }));

    const message = matchedJobs.length === 0 && jobs.length > 0
      ? "Open jobs exist for your services, but none matched your city, service area, or working radius. Update your current location or increase your radius."
      : "";

    res.json({ success: true, jobs: matchedJobs, message, matchedCategories: myCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/bookings/:id/pickup ─────────────────────────────────────────────
// Provider claims an unassigned booking from the job pool.
// ATOMIC: the final write uses findOneAndUpdate with { status:"pending",
// providerId:null } as the filter, so two simultaneous requests can never both
// succeed — MongoDB guarantees only one document matches and gets updated.
const pickupJob = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider)
      return res.status(404).json({ success: false, message: "Provider profile not found" });
    if (!provider.isActive || provider.onboardingStatus !== "approved")
      return res.status(403).json({ success: false, message: "Your profile must be approved to accept jobs." });

    // Read-only snapshot for validation — safe to do before the atomic write
    // because service-category and location checks don't change between read & write.
    const snap = await Booking.findById(req.params.id).lean();
    if (!snap)
      return res.status(404).json({ success: false, message: "Booking not found." });
    if (snap.status !== "pending")
      return res.status(400).json({ success: false, message: "This booking is no longer available." });
    if (snap.providerId)
      return res.status(409).json({ success: false, message: "This job was just claimed by another provider. Please check other available jobs." });

    if (!providerCanServeCategory(provider, snap.serviceCategory)) {
      return res.status(403).json({
        success: false,
        message: "This job does not match your approved service categories.",
      });
    }

    const availability = await ProviderAvailability.findOne({ providerId: provider._id });
    const locationMatch = jobMatchesProviderLocation(provider, availability, snap);
    if (!locationMatch.matches) {
      return res.status(403).json({
        success: false,
        message: "This job is outside your service location or working radius.",
      });
    }

    // ATOMIC CLAIM — only succeeds when no other provider has already set
    // providerId. If the filter misses (race condition), findOneAndUpdate
    // returns null and we surface the 409 immediately.
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, status: "pending", providerId: null },
      { $set: { providerId: provider._id, status: "accepted" } },
      { new: true }
    );

    if (!booking) {
      return res.status(409).json({
        success: false,
        message: "This job was just claimed by another provider. Please check other available jobs.",
      });
    }

    const providerUser = await User.findById(provider.userId).select("fullName").lean();
    createNotification({
      recipientId: booking.customerId,
      recipientRole: "customer",
      type: "job_claimed",
      title: "Your provider is ready",
      message: `${providerUser?.fullName || "Your technician"} confirmed your booking and will prepare for the visit.`,
      bookingId: booking._id,
    }).catch(console.error);

    createNotification({
      recipientId: provider.userId,
      recipientRole: "provider",
      type: "job_claimed",
      title: "Job confirmed",
      message: `${booking.serviceName} is now assigned to you.`,
      bookingId: booking._id,
    }).catch(console.error);

    res.json({ success: true, message: "Job picked up! It has been added to your active jobs.", booking: stripOtp(booking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/bookings/provider/earnings ──────────────────────────────────────
const getProviderEarnings = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id }).lean();
    if (!provider)
      return res.status(404).json({ success: false, message: "Provider profile not found." });

    const now          = new Date();
    const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - 6); startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allDone = await Booking.find({
      providerId: provider._id,
      status:     "completed",
    }).select("pricing completedAt serviceCategory scheduledDate").lean();

    const sum    = arr => arr.reduce((s, j) => s + (j.pricing?.totalAmount || 0), 0);
    const payout = arr => arr.reduce((s, j) => {
      const base = j.pricing?.basePrice || 0;
      const fee  = j.pricing?.platformFee || 0;
      const tax  = j.pricing?.tax || 0;
      return s + Math.max(0, base - fee - tax);
    }, 0);

    const thisWeek  = allDone.filter(j => j.completedAt && new Date(j.completedAt) >= startOfWeek);
    const thisMonth = allDone.filter(j => j.completedAt && new Date(j.completedAt) >= startOfMonth);

    // Revenue by category for this month
    const byCategory = thisMonth.reduce((acc, j) => {
      const cat = j.serviceCategory || "other";
      acc[cat] = (acc[cat] || 0) + (j.pricing?.totalAmount || 0);
      return acc;
    }, {});

    res.json({
      success: true,
      earnings: {
        total:          sum(allDone),
        thisMonth:      sum(thisMonth),
        thisWeek:       sum(thisWeek),
        myPayoutTotal:  payout(allDone),
        myPayoutMonth:  payout(thisMonth),
        jobCount:       allDone.length,
        jobsThisMonth:  thisMonth.length,
        jobsThisWeek:   thisWeek.length,
        byCategory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch earnings." });
  }
};

// ─── PUT /api/bookings/:id/location ──────────────────────────────────────────
// Provider sends their current GPS coordinates while on the way.
// Stores the last-known location on the booking and broadcasts via Socket.io
// to both the customer's room and the provider's own room.
const updateProviderLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ success: false, message: "Valid lat and lng coordinates are required." });
    }

    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) return res.status(404).json({ success: false, message: "Provider profile not found." });

    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
    if (booking.providerId?.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    if (!["accepted", "provider_on_way", "in_progress"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Location sharing is only active for in-progress bookings." });
    }

    // Calculate straight-line distance to customer's address
    let distKm = null;
    const cLat = booking.address?.lat;
    const cLng = booking.address?.lng;
    if (Number.isFinite(cLat) && Number.isFinite(cLng)) {
      distKm = Number(distanceKm({ lat: latNum, lng: lngNum }, { lat: cLat, lng: cLng }).toFixed(2));
    }

    // Persist last known location (fire-and-forget — don't block the response)
    Booking.findByIdAndUpdate(booking._id, {
      providerCurrentLocation: { lat: latNum, lng: lngNum, updatedAt: new Date() },
    }).catch(console.error);

    const payload = {
      bookingId:  booking._id,
      lat:        latNum,
      lng:        lngNum,
      distKm,
      timestamp:  new Date().toISOString(),
    };

    // Broadcast to customer so they see the provider moving on their map
    emitToUser(booking.customerId.toString(), "provider:location:update", payload);
    // Echo back to the provider's own room (they see their position on their map too)
    emitToUser(provider.userId.toString(), "provider:location:update", payload);

    res.json({ success: true, distKm });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update location." });
  }
};

// ─── PUT /api/bookings/:id/dispute ───────────────────────────────────────────
// Customer or provider raises a dispute on a booking.
const raiseDispute = async (req, res) => {
  try {
    const { reason, description } = req.body;
    if (!reason)
      return res.status(400).json({ success: false, message: "Dispute reason is required." });

    const booking = await Booking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found." });

    const userId     = req.user._id.toString();
    const isCustomer = booking.customerId?.toString() === userId;
    const isAdmin    = req.user.role === "admin";

    // Provider check
    const provider = await Provider.findOne({ userId: req.user._id }).lean();
    const isProvider = provider && booking.providerId?.toString() === provider._id.toString();

    if (!isCustomer && !isProvider && !isAdmin)
      return res.status(403).json({ success: false, message: "Access denied." });

    if (booking.status === "disputed")
      return res.status(400).json({ success: false, message: "A dispute has already been raised for this booking." });

    if (!["in_progress", "completed", "accepted", "provider_on_way"].includes(booking.status))
      return res.status(400).json({ success: false, message: `Cannot raise a dispute on a ${booking.status} booking.` });

    booking.status        = "disputed";
    booking.cancelReason  = `DISPUTE — ${reason}: ${description || ""}`.trim();
    booking.cancelledAt   = new Date();
    booking.cancelledBy   = isAdmin ? "admin" : isCustomer ? "customer" : "provider";
    await booking.save();

    // Notify admin
    createNotification({
      recipientRole: "admin",
      type:          "booking_created",
      title:         "Dispute raised",
      message:       `${req.user.fullName} raised a dispute on booking ${booking.bookingNumber}: ${reason}`,
      bookingId:     booking._id,
    }).catch(console.error);

    res.json({ success: true, message: "Dispute raised. Our support team will review within 24 hours.", booking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to raise dispute." });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  getBookingInvoice,
  cancelBooking,
  getProviderJobs,
  getAvailableJobs,
  pickupJob,
  acceptJob,
  rejectJob,
  providerCancelJob,
  markOnWay,
  startJob,
  completeJob,
  getAllBookings,
  updateProviderLocation,
  getProviderEarnings,
  raiseDispute,
};
