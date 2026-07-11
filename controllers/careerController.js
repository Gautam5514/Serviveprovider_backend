const Career = require("../models/Career");
const CareerApplication = require("../models/CareerApplication");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { emitToRole } = require("../socket");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Split a textarea payload (string or array) into clean bullet lines.
function toLines(value) {
  const arr = Array.isArray(value) ? value : String(value || "").split("\n");
  return arr.map((l) => String(l).trim()).filter(Boolean).slice(0, 20);
}

// ─── Regex helper — safe user-typed search terms ─────────────────────────────
function escapeRegex(v = "") {
  return String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const APPLICATIONS_PAGE_SIZE_DEFAULT = 25;
const APPLICATIONS_PAGE_SIZE_MAX = 100;

// ─── GET /api/careers ─────────────────────────────────────────────────────────
// Public — open roles, newest first.
const getOpenCareers = catchAsync(async (_req, res) => {
  const careers = await Career.find({ isOpen: true })
    .select("-__v")
    .sort({ department: 1, createdAt: -1 })
    .lean();
  res.json({ success: true, careers });
});

// ─── GET /api/careers/:id ─────────────────────────────────────────────────────
// Public — one open role, for the dedicated job page.
const getCareerById = catchAsync(async (req, res) => {
  if (!req.params.id.match(/^[a-f\d]{24}$/i))
    throw new AppError("Job not found.", 404);
  const career = await Career.findById(req.params.id).select("-__v").lean();
  if (!career || !career.isOpen) throw new AppError("Job not found.", 404);
  res.json({ success: true, career });
});

// ─── POST /api/careers/:id/apply ──────────────────────────────────────────────
// Public — apply to an open role.
const applyToCareer = catchAsync(async (req, res) => {
  const { name, email, phone, portfolio, resumeUrl, coverNote } = req.body;

  if (!name?.trim()) throw new AppError("Your name is required.", 400);
  if (!email?.trim() || !EMAIL_RE.test(email.trim()))
    throw new AppError("A valid email address is required.", 400);
  if (!phone?.trim() || phone.trim().replace(/\D/g, "").length < 10)
    throw new AppError("A valid phone number is required.", 400);

  const career = await Career.findById(req.params.id);
  if (!career || !career.isOpen)
    throw new AppError("This role is no longer accepting applications.", 404);

  try {
    const application = await CareerApplication.create({
      career: career._id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      portfolio: portfolio?.trim() || "",
      resumeUrl: resumeUrl?.trim() || "",
      coverNote: coverNote?.trim() || "",
      submitterIp: req.ip,
    });

    emitToRole("admin", "career:application:new", {
      id: application._id,
      career: career._id,
      title: career.title,
      name: application.name,
      createdAt: application.createdAt,
    });

    res.status(201).json({ success: true, applicationId: application._id });
  } catch (err) {
    if (err.code === 11000)
      throw new AppError("You have already applied for this role with this email.", 409);
    throw err;
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// GET /api/careers/admin — all roles with application counts
const getAllCareers = catchAsync(async (_req, res) => {
  const [careers, counts] = await Promise.all([
    Career.find().sort({ createdAt: -1 }).lean(),
    CareerApplication.aggregate([
      { $group: { _id: "$career", total: { $sum: 1 } } },
    ]),
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.total]));
  res.json({
    success: true,
    careers: careers.map((c) => ({ ...c, applicationCount: countMap[String(c._id)] || 0 })),
  });
});

// POST /api/careers/admin
const createCareer = catchAsync(async (req, res) => {
  const { title, department, location, type, experience, salaryRange, summary } = req.body;

  if (!title?.trim()) throw new AppError("Job title is required.", 400);
  if (!location?.trim()) throw new AppError("Location is required.", 400);
  if (!summary?.trim()) throw new AppError("A short role summary is required.", 400);

  const career = await Career.create({
    title: title.trim(),
    department,
    location: location.trim(),
    type,
    experience: experience?.trim() || "",
    salaryRange: salaryRange?.trim() || "",
    summary: summary.trim(),
    responsibilities: toLines(req.body.responsibilities),
    requirements: toLines(req.body.requirements),
    isOpen: req.body.isOpen !== false,
  });

  res.status(201).json({ success: true, career });
});

// PUT /api/careers/admin/:id
const updateCareer = catchAsync(async (req, res) => {
  const career = await Career.findById(req.params.id);
  if (!career) throw new AppError("Job posting not found.", 404);

  const { title, department, location, type, experience, salaryRange, summary, isOpen } = req.body;

  if (title !== undefined) career.title = String(title).trim();
  if (department !== undefined) career.department = department;
  if (location !== undefined) career.location = String(location).trim();
  if (type !== undefined) career.type = type;
  if (experience !== undefined) career.experience = String(experience).trim();
  if (salaryRange !== undefined) career.salaryRange = String(salaryRange).trim();
  if (summary !== undefined) career.summary = String(summary).trim();
  if (req.body.responsibilities !== undefined)
    career.responsibilities = toLines(req.body.responsibilities);
  if (req.body.requirements !== undefined)
    career.requirements = toLines(req.body.requirements);
  if (isOpen !== undefined) career.isOpen = Boolean(isOpen);

  await career.save();
  res.json({ success: true, career });
});

// DELETE /api/careers/admin/:id — removes the role and its applications
const deleteCareer = catchAsync(async (req, res) => {
  const career = await Career.findByIdAndDelete(req.params.id);
  if (!career) throw new AppError("Job posting not found.", 404);
  await CareerApplication.deleteMany({ career: career._id });
  res.json({ success: true });
});

// GET /api/careers/admin/:id/applications
const getApplications = catchAsync(async (req, res) => {
  const applications = await CareerApplication.find({ career: req.params.id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, applications });
});

// GET /api/careers/admin/applications — inbox across all roles.
// Server-side paginated + searched so the list stays correct (and fast) no
// matter how many applications pile up — nothing silently falls off past a
// fixed cap the way an in-memory client-side filter would.
const getAllApplications = catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    APPLICATIONS_PAGE_SIZE_MAX,
    Math.max(1, parseInt(req.query.limit, 10) || APPLICATIONS_PAGE_SIZE_DEFAULT)
  );
  const search = String(req.query.search || "").trim().slice(0, 120);
  const status = req.query.status;

  // Search matches name/email directly, or the linked role's title — resolve
  // matching role ids first so it can be folded into one $or.
  let searchFilter = {};
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    const matchingCareers = await Career.find({ title: re }).select("_id").lean();
    searchFilter = {
      $or: [
        { name: re },
        { email: re },
        { career: { $in: matchingCareers.map((c) => c._id) } },
      ],
    };
  }

  const statusFilter =
    status && status !== "all" && CareerApplication.APPLICATION_STATUSES.includes(status)
      ? { status }
      : {};

  const finalFilter = { ...searchFilter, ...statusFilter };

  const [applications, total, statusAgg, unseenCount] = await Promise.all([
    CareerApplication.find(finalFilter)
      .populate("career", "title department location type")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CareerApplication.countDocuments(finalFilter),
    // Status breakdown respects the search term but not the status filter
    // itself, so switching tabs never changes what the *other* tabs show.
    CareerApplication.aggregate([
      { $match: searchFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    CareerApplication.countDocuments({ ...searchFilter, adminViewed: { $ne: true } }),
  ]);

  const counts = { all: 0, new: 0, shortlisted: 0, hired: 0, rejected: 0 };
  for (const s of statusAgg) {
    counts[s._id] = s.count;
    counts.all += s.count;
  }

  res.json({
    success: true,
    applications,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    counts,
    unseenCount,
  });
});

// PUT /api/careers/admin/applications/:id/view
// Opening one applicant's detail is what "reads" it — clears the sidebar
// badge for just this application, not the whole list.
const markApplicationViewed = catchAsync(async (req, res) => {
  const application = await CareerApplication.findByIdAndUpdate(
    req.params.id,
    { adminViewed: true },
    { new: true }
  );
  if (!application) throw new AppError("Application not found.", 404);
  res.json({ success: true, application });
});

// PUT /api/careers/admin/applications/:id/status
const updateApplicationStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  if (!CareerApplication.APPLICATION_STATUSES.includes(status))
    throw new AppError("Invalid application status.", 400);

  const application = await CareerApplication.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!application) throw new AppError("Application not found.", 404);
  res.json({ success: true, application });
});

module.exports = {
  getOpenCareers,
  getCareerById,
  applyToCareer,
  getAllCareers,
  createCareer,
  updateCareer,
  deleteCareer,
  getApplications,
  getAllApplications,
  markApplicationViewed,
  updateApplicationStatus,
};
