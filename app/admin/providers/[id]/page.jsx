"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { getDashboardPath, getStoredUser } from "@/lib/auth";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending_profile:          { bg: "bg-zinc-100",   text: "text-zinc-600",    border: "border-zinc-200",    dot: "bg-zinc-400",    label: "Pending Profile"   },
  profile_complete:         { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",     dot: "bg-sky-500",     label: "Profile Complete"  },
  kyc_submitted:            { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500",   label: "KYC Submitted"     },
  kyc_verified:             { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500",    label: "KYC Verified"      },
  skill_review_pending:     { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500",   label: "Skill Review"      },
  background_check_pending: { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500",  label: "BGV Pending"       },
  approved:                 { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Approved"          },
  rejected:                 { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500",     label: "Rejected"          },
  suspended:                { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-500",  label: "Suspended"         },
  blocked:                  { bg: "bg-red-100",    text: "text-red-800",     border: "border-red-300",     dot: "bg-red-700",     label: "Blocked"           },
};

const DOC_STATUS_CONFIG = {
  uploaded:     { bg: "bg-zinc-100",    text: "text-zinc-600",    label: "Uploaded"     },
  under_review: { bg: "bg-amber-100",   text: "text-amber-800",   label: "Under Review" },
  verified:     { bg: "bg-emerald-100", text: "text-emerald-800", label: "Verified"      },
  rejected:     { bg: "bg-red-100",     text: "text-red-800",     label: "Rejected"      },
  expired:      { bg: "bg-orange-100",  text: "text-orange-800",  label: "Expired"       },
};

const DOC_LABELS = {
  aadhaar:            "Aadhaar Card",
  pan:                "PAN Card",
  selfie:             "Live Selfie",
  address_proof:      "Address Proof",
  police_certificate: "Police Verification",
  skill_certificate:  "Skill Certificate",
  work_photo:         "Work Photo",
  experience_letter:  "Experience Letter",
  job_id_card:        "Job ID Card",
  cancelled_cheque:   "Cancelled Cheque",
};

const MVP_DOCS = ["aadhaar", "pan", "selfie"];

const DAYS_LABEL = { mon:"Mon", tue:"Tue", wed:"Wed", thu:"Thu", fri:"Fri", sat:"Sat", sun:"Sun" };

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.pending_profile;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function Section({ title, icon, accent, children }) {
  return (
    <div className="bg-white border border-zinc-200 overflow-hidden">
      <div className={`flex items-center gap-2.5 px-6 py-4 border-b border-zinc-100 ${accent || ""}`}>
        {icon && <span className="text-base">{icon}</span>}
        <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-500">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, value, mono, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1">{label}</p>
      <p className={`text-sm font-semibold text-zinc-900 ${mono ? "font-mono" : ""}`}>
        {value ?? <span className="text-zinc-300 font-normal italic">—</span>}
      </p>
    </div>
  );
}

function Check({ ok, label }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded border ${ok ? "bg-emerald-50 border-emerald-200" : "bg-zinc-50 border-zinc-200"}`}>
      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${ok ? "bg-emerald-500 text-white" : "bg-zinc-200 text-zinc-400"}`}>
        {ok ? "✓" : "·"}
      </span>
      <span className={`text-xs font-semibold ${ok ? "text-emerald-800" : "text-zinc-500"}`}>{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProviderReviewPage({ params }) {
  const { id } = use(params);
  const router  = useRouter();

  const [provider,      setProvider]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirming,    setConfirming]    = useState(null); // "approved" | "rejected" | "suspended" | "blocked"
  const [remarks,       setRemarks]       = useState("");
  const [toast,         setToast]         = useState(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user)                   { router.replace("/login");                     return; }
    if (user.role !== "admin")   { router.replace(getDashboardPath(user.role));  return; }

    api.get(`/admin/providers/${id}`)
      .then(({ data }) => { if (data.success) setProvider(data.provider); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id, router]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = async (status) => {
    setActionLoading(true);
    try {
      const { data } = await api.put(`/admin/providers/${id}/verify`, { status, remarks: remarks || undefined });
      if (data.success) {
        showToast(
          status === "approved"
            ? "Provider approved — confirmation email sent ✓"
            : status === "rejected"
            ? "Application rejected — notification email sent"
            : "Status updated successfully",
          status === "approved"
        );
        setProvider(prev => ({ ...prev, onboardingStatus: status, isActive: status === "approved" }));
        setConfirming(null);
        setRemarks("");
      }
    } catch {
      showToast("Failed to update status", false);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="space-y-3 w-full max-w-2xl px-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 h-24 animate-pulse" />
        ))}
      </div>
    </div>
  );

  if (!provider) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <p className="text-zinc-500 font-medium">Provider not found.</p>
    </div>
  );

  const p = provider;
  const u = provider.userId || {};
  const docs        = provider.documents   || [];
  const bank        = provider.bankDetails  || null;
  const avail       = provider.availability || null;
  const agreement   = provider.agreement    || null;
  const workProofs  = provider.workProofs   || [];
  const st          = STATUS_CONFIG[p.onboardingStatus] || STATUS_CONFIG.pending_profile;

  const uploadedDocTypes = docs.map(d => d.docType);
  const missingMvp       = MVP_DOCS.filter(d => !uploadedDocTypes.includes(d));

  const maskAccount = (num) => {
    if (!num) return "—";
    return "× × × × " + num.slice(-4);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-black selection:text-white pb-32">

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3.5 text-xs font-bold tracking-widest uppercase shadow-lg border transition-all ${toast.ok ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Back ──────────────────────────────────────────────────────────── */}
        <Link href="/admin/providers" className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors mb-8 group">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Applications
        </Link>

        {/* ── Hero header ───────────────────────────────────────────────────── */}
        <div className="bg-white border border-zinc-200 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-5">
              {/* Avatar initials */}
              <div className="w-16 h-16 bg-black text-white flex items-center justify-center text-xl font-extrabold flex-shrink-0">
                {u.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-black mb-2">{u.fullName || "—"}</h1>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <StatusBadge status={p.onboardingStatus} />
                  {u.emailVerified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1">
                      ✓ Email Verified
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-zinc-500 bg-zinc-100 border border-zinc-200 px-2.5 py-1">
                    Step {p.onboardingStep || 1} / 7
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 border ${p.jobTier === "priority" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-100 text-zinc-500 border-zinc-200"}`}>
                    {p.jobTier?.replace("_", " ")} tier
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-500">
                  <span>{u.email}</span>
                  <span>{u.phone}</span>
                  {p.city && <span>{p.city}, {p.serviceArea}</span>}
                  {u.createdAt && <span className="text-zinc-400">Registered {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 flex-shrink-0">
              {[
                { label: "Services",   value: p.services?.length || 0 },
                { label: "Documents",  value: docs.length },
                { label: "Rating",     value: p.rating?.toFixed(1) || "—" },
              ].map(stat => (
                <div key={stat.label} className="text-center border border-zinc-200 px-5 py-3 min-w-[72px]">
                  <p className="text-2xl font-extrabold text-black">{stat.value}</p>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Grid sections ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Profile */}
          <Section title="Basic Profile" icon="👤">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Field label="Date of Birth"    value={p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null} />
              <Field label="Gender"           value={p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : null} />
              <Field label="City"             value={p.city} />
              <Field label="Service Area"     value={p.serviceArea} />
              <Field label="Working Radius"   value={p.workingRadiusKm ? `${p.workingRadiusKm} km` : null} />
              <Field label="Alternate Phone"  value={p.alternatePhone} />
              <Field label="Emergency Contact" value={p.emergencyContact} />
              <Field label="Languages"        value={p.languages?.length ? p.languages.join(", ") : null} />
              {p.about && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1">About</p>
                  <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 border border-zinc-200 p-3">{p.about}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Services & Skills */}
          <Section title="Services & Skills" icon="🔧">
            {p.services?.length > 0 ? (
              <div className="space-y-3">
                {p.services.map((svc, i) => (
                  <div key={i} className="border border-zinc-200 p-4 bg-zinc-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-black text-sm">{svc.serviceName}</p>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mt-0.5">{svc.category}</p>
                      </div>
                      <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 border ${
                        svc.skillLevel === "expert"       ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        svc.skillLevel === "intermediate" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                            "bg-zinc-100 text-zinc-500 border-zinc-200"
                      }`}>
                        {svc.skillLevel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span>{svc.experienceYears} yr{svc.experienceYears !== 1 ? "s" : ""} experience</span>
                      {svc.previousCompany && <span>Prev: {svc.previousCompany}</span>}
                      {svc.hasOwnTools && <span className="text-emerald-600 font-semibold">✓ Has own tools</span>}
                      {svc.canHandleEmergency && <span className="text-amber-600 font-semibold">⚡ Handles emergencies</span>}
                      {svc.canProvideInstallationAndRepair && <span className="text-blue-600 font-semibold">✓ Install + Repair</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">No services listed yet.</p>
            )}
          </Section>
        </div>

        {/* KYC Documents — full width */}
        <div className="mb-4">
          <Section title="KYC Documents" icon="📋" accent={missingMvp.length > 0 ? "bg-amber-50" : ""}>
            {missingMvp.length > 0 && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                <span className="text-sm">⚠</span>
                Missing required documents: {missingMvp.map(d => DOC_LABELS[d]).join(", ")}
              </div>
            )}

            {docs.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">No documents uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {docs.map((doc) => {
                  const dsCfg = DOC_STATUS_CONFIG[doc.status] || DOC_STATUS_CONFIG.uploaded;
                  return (
                    <div key={doc._id} className="border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-black">{DOC_LABELS[doc.docType] || doc.docType}</p>
                          {doc.docNumberMasked && (
                            <p className="text-xs text-zinc-400 font-mono mt-0.5">{doc.docNumberMasked}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 border ${dsCfg.bg} ${dsCfg.text} border-transparent`}>
                          {dsCfg.label}
                        </span>
                      </div>
                      {doc.expiryDate && (
                        <p className="text-[10px] text-zinc-400 mb-2">
                          Expiry: {new Date(doc.expiryDate).toLocaleDateString("en-IN")}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          doc.requiredLevel === "mvp" ? "text-red-500" :
                          doc.requiredLevel === "recommended" ? "text-amber-500" : "text-zinc-400"
                        }`}>
                          {doc.requiredLevel === "mvp" ? "Required" :
                           doc.requiredLevel === "recommended" ? "Recommended" : "Optional"}
                        </span>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-black hover:underline underline-offset-2"
                        >
                          View File
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                      {doc.adminRemarks && (
                        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-1">
                          {doc.adminRemarks}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Bank Details */}
          <Section title="Bank Details" icon="🏦">
            {bank ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <Field label="Account Holder"  value={bank.accountHolderName} />
                  <Field label="Account Number"  value={maskAccount(bank.accountNumber)} mono />
                  <Field label="IFSC Code"       value={bank.ifscCode} mono />
                  <Field label="UPI ID"          value={bank.upiId} />
                </div>
                <div className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border rounded ${bank.pennyDropVerified ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-zinc-100 border-zinc-200 text-zinc-500"}`}>
                  <span>{bank.pennyDropVerified ? "✓" : "·"}</span>
                  {bank.pennyDropVerified ? "Penny drop verified" : "Penny drop not verified"}
                  {bank.pennyDropVerifiedAt && (
                    <span className="ml-auto text-zinc-400 font-normal">{new Date(bank.pennyDropVerifiedAt).toLocaleDateString("en-IN")}</span>
                  )}
                </div>
                {bank.cancelledChequeUrl && (
                  <a href={bank.cancelledChequeUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-black tracking-widest uppercase hover:underline underline-offset-2">
                    View Cancelled Cheque ↗
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">Bank details not submitted yet.</p>
            )}
          </Section>

          {/* Availability */}
          <Section title="Availability" icon="📅">
            {avail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Work Type"    value={avail.workingType?.replace("_", " ")} />
                  <Field label="Travel Radius" value={avail.travelRadiusKm ? `${avail.travelRadiusKm} km` : null} />
                  <Field label="Working Hours" value={avail.workingHoursFrom && avail.workingHoursTo ? `${avail.workingHoursFrom} – ${avail.workingHoursTo}` : null} />
                  <Field label="Vehicle"      value={avail.hasOwnVehicle ? (avail.vehicleType || "Yes") : "No"} />
                </div>
                {avail.availableDays?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-2">Available Days</p>
                    <div className="flex gap-1 flex-wrap">
                      {["mon","tue","wed","thu","fri","sat","sun"].map(day => (
                        <span key={day} className={`px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase border ${
                          avail.availableDays.includes(day)
                            ? "bg-black text-white border-black"
                            : "bg-zinc-100 text-zinc-300 border-zinc-200"
                        }`}>
                          {DAYS_LABEL[day]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {avail.acceptsUrgentJobs && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5">
                    ⚡ Accepts urgent jobs
                  </span>
                )}
                {avail.preferredLocations?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1">Preferred Locations</p>
                    <p className="text-sm text-zinc-600">{avail.preferredLocations.join(", ")}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">Availability not set yet.</p>
            )}
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Agreement */}
          <Section title="Legal Agreement" icon="📝">
            {agreement ? (
              <div className="space-y-2">
                <Check ok={agreement.termsAccepted}              label="Terms & Conditions accepted" />
                <Check ok={agreement.codeOfConductAccepted}      label="Code of Conduct accepted" />
                <Check ok={agreement.customerSafetyAccepted}     label="Customer Safety Policy accepted" />
                <Check ok={agreement.noDirectPaymentRuleAccepted} label="No direct payment rule accepted" />
                <Check ok={agreement.commissionPolicyAccepted}   label="Commission Policy accepted" />
                <Check ok={agreement.dataPrivacyConsent}         label="Data Privacy consent given" />
                <Check ok={agreement.bgvConsent}                 label="Background verification consent given" />
                {agreement.acceptedAt && (
                  <p className="text-[10px] text-zinc-400 pt-2 border-t border-zinc-100 mt-2">
                    Signed on {new Date(agreement.acceptedAt).toLocaleString("en-IN")}
                    {agreement.acceptedFromIp && ` · IP: ${agreement.acceptedFromIp}`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">Agreement not signed yet.</p>
            )}
          </Section>

          {/* System Checks */}
          <Section title="Review Checklist" icon="✅">
            <div className="space-y-2">
              <Check ok={!!u.emailVerified}                                    label="Email verified" />
              <Check ok={!!p.dateOfBirth && !!p.city && !!p.serviceArea}       label="Basic profile complete" />
              <Check ok={(p.services?.length || 0) > 0}                        label="At least 1 service listed" />
              <Check ok={missingMvp.length === 0}                              label="All required KYC docs uploaded" />
              <Check ok={!!bank}                                                label="Bank details submitted" />
              <Check ok={!!avail}                                               label="Availability schedule set" />
              <Check ok={!!agreement}                                           label="Legal agreement signed" />
              <Check ok={!!agreement?.bgvConsent}                              label="BGV consent given" />
            </div>
            {workProofs.length > 0 && (
              <div className="mt-5 pt-4 border-t border-zinc-100">
                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-2">Work Proofs ({workProofs.length})</p>
                <div className="flex flex-wrap gap-2">
                  {workProofs.map((wp, i) => (
                    <a key={i} href={wp.fileUrl || wp.photoUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-bold uppercase tracking-widest text-black bg-zinc-100 border border-zinc-200 px-2.5 py-1 hover:bg-black hover:text-white transition-colors">
                      Proof {i + 1} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ── Action Bar ──────────────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] md:left-64">
          <div className="max-w-6xl mx-auto px-6 py-4">

            {/* Confirm panel */}
            {confirming && (
              <div className={`mb-4 p-4 border rounded-sm ${
                confirming === "approved"  ? "bg-emerald-50 border-emerald-200" :
                confirming === "rejected"  ? "bg-red-50 border-red-200" :
                confirming === "suspended" ? "bg-orange-50 border-orange-200" :
                                             "bg-zinc-100 border-zinc-300"
              }`}>
                <p className={`text-xs font-bold tracking-widest uppercase mb-3 ${
                  confirming === "approved"  ? "text-emerald-700" :
                  confirming === "rejected"  ? "text-red-700" :
                  confirming === "suspended" ? "text-orange-700" : "text-zinc-700"
                }`}>
                  {confirming === "approved"  ? "✓ Confirm Approval — an email will be sent to the provider" :
                   confirming === "rejected"  ? "✗ Confirm Rejection — please add a reason (optional)" :
                   confirming === "suspended" ? "⚠ Confirm Suspension — please add a reason" :
                                               "⛔ Confirm Block"}
                </p>
                {confirming !== "approved" && (
                  <textarea
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder={confirming === "rejected" ? "Reason for rejection (optional but recommended)..." : "Reason for suspension..."}
                    rows={2}
                    className="w-full text-sm border border-zinc-300 bg-white px-3 py-2 focus:outline-none focus:border-black resize-none mb-3"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(confirming)}
                    disabled={actionLoading}
                    className={`px-5 py-2 text-xs font-bold tracking-widest uppercase text-white disabled:opacity-50 ${
                      confirming === "approved"  ? "bg-emerald-600 hover:bg-emerald-700" :
                      confirming === "rejected"  ? "bg-red-600 hover:bg-red-700" :
                      confirming === "suspended" ? "bg-orange-600 hover:bg-orange-700" : "bg-zinc-900 hover:bg-black"
                    } transition-colors`}
                  >
                    {actionLoading ? "Processing…" : `Confirm ${confirming.charAt(0).toUpperCase() + confirming.slice(1)}`}
                  </button>
                  <button
                    onClick={() => { setConfirming(null); setRemarks(""); }}
                    className="px-5 py-2 text-xs font-bold tracking-widest uppercase border border-zinc-300 text-zinc-600 hover:border-black hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!confirming && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                  <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">
                    Current: <span className="text-black">{st.label}</span>
                  </span>
                </div>

                <div className="flex gap-2">
                  {p.onboardingStatus === "approved" ? (
                    <>
                      <button
                        onClick={() => setConfirming("suspended")}
                        className="px-5 py-2.5 text-xs font-bold tracking-widest uppercase bg-orange-50 text-orange-700 border border-orange-300 hover:bg-orange-100 transition-colors"
                      >
                        Suspend
                      </button>
                      <button
                        onClick={() => setConfirming("blocked")}
                        className="px-5 py-2.5 text-xs font-bold tracking-widest uppercase bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 transition-colors"
                      >
                        Block
                      </button>
                    </>
                  ) : ["rejected", "suspended", "blocked"].includes(p.onboardingStatus) ? (
                    <button
                      onClick={() => setConfirming("approved")}
                      className="px-6 py-2.5 text-xs font-bold tracking-widest uppercase bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      ✓ Approve
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirming("rejected")}
                        className="px-5 py-2.5 text-xs font-bold tracking-widest uppercase bg-white text-red-600 border border-red-300 hover:bg-red-50 transition-colors"
                      >
                        ✗ Reject
                      </button>
                      <button
                        onClick={() => setConfirming("approved")}
                        className="px-6 py-2.5 text-xs font-bold tracking-widest uppercase bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        ✓ Approve Provider
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
