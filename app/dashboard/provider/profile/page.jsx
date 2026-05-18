"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { refreshLocation } from "@/lib/location";
import {
  Lock, User, Wrench, FileText, Calendar, Landmark,
  Briefcase, Scale, Star, CheckCircle2, Clock, AlertCircle,
  ShieldCheck, Hammer, Zap, Settings2, BadgeCheck, CreditCard,
  Activity, ChevronRight, Loader2, MapPin, Navigation,
} from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────
const DAYS        = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_LABEL   = { mon:"Mon", tue:"Tue", wed:"Wed", thu:"Thu", fri:"Fri", sat:"Sat", sun:"Sun" };
const CATEGORIES  = ["ac","cooler","fan","tv","electrical","appliance"];
const SKILL_LEVELS= ["beginner","intermediate","expert"];
const CATEGORY_KEYWORDS = {
  ac: ["ac", "a/c", "air conditioner", "air conditioning", "hvac"],
  cooler: ["cooler", "air cooler"],
  fan: ["fan", "ceiling fan", "table fan", "exhaust"],
  tv: ["tv", "television", "led", "display"],
  electrical: ["electric", "electrical", "wiring", "switch", "socket", "mcb"],
  appliance: ["appliance", "fridge", "refrigerator", "washing", "geyser", "microwave"],
};

const DOC_LABELS  = {
  aadhaar:"Aadhaar Card", pan:"PAN Card", selfie:"Live Selfie",
  address_proof:"Address Proof", police_certificate:"Police Certificate",
  skill_certificate:"Skill Certificate", work_photo:"Work Photo",
  experience_letter:"Experience Letter", job_id_card:"Job ID Card",
  cancelled_cheque:"Cancelled Cheque",
};

const STATUS_CONFIG = {
  approved:                 { bg:"bg-emerald-50", text:"text-emerald-700", border:"border-emerald-200", label:"Approved"         },
  background_check_pending: { bg:"bg-violet-50",  text:"text-violet-700",  border:"border-violet-200",  label:"Under Review"     },
  kyc_submitted:            { bg:"bg-blue-50",    text:"text-blue-700",    border:"border-blue-200",    label:"KYC Submitted"    },
  kyc_verified:             { bg:"bg-blue-50",    text:"text-blue-700",    border:"border-blue-200",    label:"KYC Verified"     },
  profile_complete:         { bg:"bg-sky-50",     text:"text-sky-700",     border:"border-sky-200",     label:"Profile Complete" },
  pending_profile:          { bg:"bg-amber-50",   text:"text-amber-700",   border:"border-amber-200",   label:"Pending Profile"  },
  rejected:                 { bg:"bg-red-50",     text:"text-red-700",     border:"border-red-200",     label:"Rejected"         },
  suspended:                { bg:"bg-orange-50",  text:"text-orange-700",  border:"border-orange-200",  label:"Suspended"        },
};

const DOC_STATUS_CONFIG = {
  verified:     { bg:"bg-emerald-50", text:"text-emerald-700", label:"Verified"     },
  uploaded:     { bg:"bg-blue-50",    text:"text-blue-700",    label:"Uploaded"     },
  under_review: { bg:"bg-amber-50",   text:"text-amber-700",   label:"Under Review" },
  rejected:     { bg:"bg-red-50",     text:"text-red-700",     label:"Rejected"     },
  expired:      { bg:"bg-orange-50",  text:"text-orange-700",  label:"Expired"      },
};

const emptyService = () => ({
  category:"ac", serviceName:"", experienceYears:1, skillLevel:"intermediate",
  hasOwnTools:false, canProvideInstallationAndRepair:false,
  previousCompany:"", canHandleEmergency:false,
});

// ─── small atoms ─────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function getDisplayCategories(service) {
  const categories = new Set(service.category ? [service.category] : []);
  const searchable = `${service.serviceName || ""} ${service.previousCompany || ""}`.toLowerCase();

  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    if (keywords.some((keyword) => searchable.includes(keyword))) categories.add(category);
  });

  return [...categories];
}

// View-mode field
function VField({ label, value, mono, children }) {
  return (
    <div>
      <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-zinc-400 mb-1.5">{label}</p>
      {children ?? (
        <p className={`text-sm font-semibold text-zinc-900 leading-snug ${mono ? "font-mono tracking-wide" : ""}`}>
          {value ?? <span className="text-zinc-300 font-normal italic text-xs">Not set</span>}
        </p>
      )}
    </div>
  );
}

// Edit-mode field
function EField({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[9px] font-bold tracking-[0.18em] uppercase text-zinc-400">{label}</label>
      {children}
      {hint && <p className="text-[9px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

// Underline input
const iCls = "w-full bg-transparent border-b border-zinc-200 pb-1.5 pt-0.5 text-sm font-medium text-black focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-300";
const selCls = iCls + " appearance-none cursor-pointer";

function Section({ title, icon: Icon, sectionKey, editing, onEdit, onCancel, locked, children }) {
  const isMe = editing === sectionKey;
  return (
    <div className={`relative bg-white transition-all duration-300 border-b border-zinc-100 ${
      isMe ? "shadow-[0_0_0_2px_#09090b] z-10" : "hover:bg-zinc-50/40"
    }`}>
      {/* Left accent bar — shows when active */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all duration-300 ${
        isMe ? "bg-zinc-900" : "bg-transparent"
      }`} />
      {/* Header */}
      <div className="flex items-center gap-3.5 px-8 py-5 border-b border-zinc-100">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
          isMe ? "bg-zinc-900" : "bg-zinc-100"
        }`}>
          {Icon && <Icon size={15} className={isMe ? "text-white" : "text-zinc-500"} strokeWidth={1.8} />}
        </div>
        <h2 className="text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-700 flex-1 select-none">{title}</h2>
        {locked && (
          <span className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase text-zinc-400 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-full">
            <Lock size={9} /> Locked
          </span>
        )}
        {!locked && !isMe && !editing && (
          <button onClick={() => onEdit(sectionKey)}
            className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-400 px-3 py-1.5 rounded-full transition-all group">
            <span className="group-hover:rotate-12 transition-transform duration-150"><PencilIcon /></span>
            Edit
          </button>
        )}
        {!locked && !isMe && editing && editing !== sectionKey && (
          <span className="text-[9px] font-bold tracking-widest uppercase text-zinc-300">Editing elsewhere</span>
        )}
        {isMe && (
          <button onClick={onCancel}
            className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 px-3 py-1.5 rounded-full transition-all">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        )}
      </div>
      <div className="px-8 py-6">{children}</div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function ProviderProfilePage() {
  const user = useMemo(() => getStoredUser(), []);

  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [locating,      setLocating]      = useState(false);
  const [editing,       setEditing]       = useState(null); // null | "profile" | "services" | "availability"
  const [toast,         setToast]         = useState(null);

  // Source-of-truth data
  const [userData,      setUserData]      = useState({});
  const [provider,      setProvider]      = useState({});
  const [documents,     setDocuments]     = useState([]);
  const [availability,  setAvailability]  = useState(null);
  const [bankDetails,   setBankDetails]   = useState(null);
  const [workProofs,      setWorkProofs]      = useState([]);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [reviews,         setReviews]         = useState([]);
  const [reviewsTotal,    setReviewsTotal]    = useState(0);
  const [starBreakdown,   setStarBreakdown]   = useState({});
  const [reviewsPage,     setReviewsPage]     = useState(1);
  const [reviewsLoading,  setReviewsLoading]  = useState(false);

  // Draft states (used only while editing, discarded on cancel)
  const [profileDraft,  setProfileDraft]  = useState({});
  const [servicesDraft, setServicesDraft] = useState([]);
  const [availDraft,    setAvailDraft]    = useState({});

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const loadReviews = useCallback((providerId, page) => {
    setReviewsLoading(true);
    api.get(`/ratings/provider/${providerId}?page=${page}&limit=5`)
      .then(({ data }) => {
        if (data.success) {
          setReviews(prev => page === 1 ? data.ratings : [...prev, ...data.ratings]);
          setReviewsTotal(data.total);
          setStarBreakdown(data.starBreakdown || {});
          setReviewsPage(page);
        }
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get("/providers/me")
      .then(({ data }) => {
        if (!data.success) return;
        const p = data.provider;
        setProvider(p);
        setUserData(p.userId || {});
        setDocuments(data.documents || []);
        setAvailability(data.availability || null);
        setBankDetails(data.bankDetails || null);
        setWorkProofs(data.workProofs || []);
        setAgreementSigned(!!data.agreementSigned);
        // Load reviews once we know the provider _id
        if (p._id) loadReviews(p._id, 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, loadReviews]);

  // ── edit helpers ─────────────────────────────────────────────────────────
  const startEdit = (section) => {
    if (section === "profile") {
      setProfileDraft({
        city:             provider.city             || "",
        serviceArea:      provider.serviceArea      || "",
        workingRadiusKm:  provider.workingRadiusKm  || 10,
        gender:           provider.gender           || "",
        alternatePhone:   provider.alternatePhone   || "",
        emergencyContact: provider.emergencyContact || "",
        languages:        (provider.languages || []).join(", "),
        about:            provider.about            || "",
        location:          provider.location?.coordinates?.length === 2
          ? {
              lng: provider.location.coordinates[0],
              lat: provider.location.coordinates[1],
              source: provider.locationSource || "manual",
            }
          : null,
      });
    }
    if (section === "services") {
      setServicesDraft((provider.services || []).map(s => ({ ...s })));
    }
    if (section === "availability") {
      const av = availability || {};
      setAvailDraft({
        workingType:      av.workingType      || "full_time",
        availableDays:    av.availableDays    || [],
        workingHoursFrom: av.workingHoursFrom || "09:00",
        workingHoursTo:   av.workingHoursTo   || "18:00",
        travelRadiusKm:   av.travelRadiusKm   || 10,
        acceptsUrgentJobs:av.acceptsUrgentJobs|| false,
        hasOwnVehicle:    av.hasOwnVehicle    || false,
        vehicleType:      av.vehicleType      || "",
        preferredLocations:(av.preferredLocations || []).join(", "),
      });
    }
    setEditing(section);
  };

  const cancelEdit = () => setEditing(null);

  // ── save handlers ─────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        ...profileDraft,
        workingRadiusKm: Number(profileDraft.workingRadiusKm),
        languages: profileDraft.languages
          ? profileDraft.languages.split(",").map(l => l.trim()).filter(Boolean)
          : [],
      };
      const { data } = await api.put("/providers/me", payload);
      if (data.success) {
        setProvider(data.provider);
        setEditing(null);
        showToast("Profile updated successfully");
      }
    } catch {
      showToast("Failed to save profile", false);
    } finally {
      setSaving(false);
    }
  };

  const updateProfileLocation = async () => {
    setLocating(true);
    try {
      const loc = await refreshLocation();
      setProfileDraft(d => ({
        ...d,
        city: d.city || loc.city || "",
        serviceArea: d.serviceArea || [loc.city, loc.state].filter(Boolean).join(", "),
        location: loc.lat && loc.lng
          ? { lat: loc.lat, lng: loc.lng, source: loc.source || "gps" }
          : null,
      }));
      showToast("Current location captured");
    } catch {
      showToast("Could not detect current location", false);
    } finally {
      setLocating(false);
    }
  };

  const saveServices = async () => {
    if (servicesDraft.length === 0) {
      showToast("At least one service is required", false);
      return;
    }
    setSaving(true);
    try {
      const payload = servicesDraft.map(s => ({
        ...s,
        experienceYears: Number(s.experienceYears),
      }));
      const { data } = await api.put("/providers/me/services", { services: payload });
      if (data.success) {
        setProvider(p => ({ ...p, services: data.services }));
        setEditing(null);
        showToast("Services updated successfully");
      }
    } catch {
      showToast("Failed to save services", false);
    } finally {
      setSaving(false);
    }
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const payload = {
        ...availDraft,
        travelRadiusKm: Number(availDraft.travelRadiusKm),
        preferredLocations: availDraft.preferredLocations
          ? availDraft.preferredLocations.split(",").map(l => l.trim()).filter(Boolean)
          : [],
      };
      const { data } = await api.put("/providers/me/availability", payload);
      if (data.success) {
        setAvailability(data.availability);
        setEditing(null);
        showToast("Availability updated successfully");
      }
    } catch {
      showToast("Failed to save availability", false);
    } finally {
      setSaving(false);
    }
  };

  // ── loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="space-y-3 text-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Loading profile…</p>
      </div>
    </div>
  );

  const st      = STATUS_CONFIG[provider.onboardingStatus] || STATUS_CONFIG.pending_profile;
  const initials= (userData.fullName || "P").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const av      = availability || {};

  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-24 font-sans selection:bg-black selection:text-white">

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-widest uppercase shadow-lg border transition-all ${toast.ok ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-700"}`}>
          {toast.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* ── Provider Identity Card ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
        {/* Decorative grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",backgroundSize:"32px 32px"}} />
        {/* Accent glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-blue-500/8 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 md:px-12 pt-10 pb-8">

          {/* ── Top row ── */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-white/10 flex items-center justify-center shadow-2xl">
                <span className="text-3xl font-black tracking-tight text-white select-none">{initials}</span>
              </div>
              {provider.isActive && (
                <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-emerald-400 border-2 border-zinc-900 rounded-full shadow-lg" title="Active" />
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                  {userData.fullName || "Provider"}
                </h1>
                {userData.emailVerified && (
                  <span title="Email Verified">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-sm mb-3 truncate">{userData.email}</p>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                  {st.label}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-zinc-600 bg-zinc-800/80 text-zinc-300">
                  <Star size={9} className="text-amber-400" fill="currentColor" />
                  {(provider.jobTier || "basic").replace(/_/g," ")} tier
                </span>
                {provider.isActive && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widests uppercase px-3 py-1.5 rounded-full border border-emerald-700/60 bg-emerald-900/40 text-emerald-300">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Active
                  </span>
                )}
              </div>

              {/* Service categories chips */}
              {provider.services?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[...new Set(provider.services.map(s => s.category))].map(cat => (
                    <span key={cat} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-400 capitalize">
                      {cat}
                    </span>
                  ))}
                  {provider.city && (
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-400">
                      <MapPin size={8} /> {provider.city}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Stats panel */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <div className="grid grid-cols-3 divide-x divide-white/10 bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                {[
                  { label: "Rating", value: provider.rating?.toFixed(1) || "—", sub: provider.totalReviews ? `${provider.totalReviews} reviews` : "No reviews", color: "text-amber-400" },
                  { label: "Jobs Done", value: provider.totalJobsCompleted || 0, sub: "completed", color: "text-emerald-400" },
                  { label: "Reviews", value: provider.totalReviews || 0, sub: "from customers", color: "text-blue-400" },
                ].map((s, i) => (
                  <div key={i} className="px-5 py-4 text-center">
                    <p className={`text-2xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] font-bold tracking-widest uppercase text-zinc-400 mt-0.5">{s.label}</p>
                    <p className="text-[9px] text-zinc-600 mt-0.5 hidden md:block">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Onboarding progress ── */}
          <div className="mt-8 pt-6 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                Onboarding Progress
              </span>
              <span className={`text-[10px] font-bold tracking-widests uppercase px-2.5 py-1 rounded-full border ${
                provider.onboardingStep >= 7 ? "bg-emerald-900/40 border-emerald-700/50 text-emerald-300" : "bg-zinc-800 border-zinc-700 text-zinc-400"
              }`}>
                {provider.onboardingStep >= 7 ? "Complete" : `Step ${provider.onboardingStep || 1} of 7`}
              </span>
            </div>
            <div className="flex gap-1.5">
              {["Profile","Services","KYC","Work","Bank","Schedule","Agreement"].map((label, i) => {
                const step = i + 1;
                const done = (provider.onboardingStep || 0) >= step;
                return (
                  <div key={step} className="flex-1 group relative" title={label}>
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${
                      done ? "bg-emerald-400" : "bg-zinc-700 group-hover:bg-zinc-600"
                    }`} />
                    <p className="text-[8px] text-zinc-600 mt-1 text-center hidden md:block truncate">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections ───────────────────────────────────────────────────────── */}
      <div className="mt-6 divide-y divide-zinc-100">

        {/* 1. Core Identity — locked */}
        <Section title="Core Identity" icon={Lock} sectionKey="identity" editing={editing} onEdit={startEdit} onCancel={cancelEdit} locked>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
            <VField label="Full Name"     value={userData.fullName} />
            <VField label="Email"         value={userData.email} />
            <VField label="Primary Phone" value={userData.phone} />
            <VField label="Date of Birth" value={provider.dateOfBirth ? new Date(provider.dateOfBirth).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) : null} />
            <VField label="Member Since"  value={userData.createdAt ? new Date(userData.createdAt).toLocaleDateString("en-IN",{month:"long",year:"numeric"}) : null} />
            <VField label="Email Verified">
              <span className={`inline-flex items-center gap-1 text-xs font-bold mt-1 ${userData.emailVerified ? "text-emerald-600" : "text-amber-600"}`}>
                {userData.emailVerified
                  ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> Verified</span>
                  : <span className="flex items-center gap-1 text-amber-600"><AlertCircle size={12} /> Not verified</span>
                }
              </span>
            </VField>
          </div>
        </Section>

        {/* 2. Basic Profile — editable */}
        <Section title="Basic Profile" icon={User} sectionKey="profile" editing={editing} onEdit={startEdit} onCancel={cancelEdit}>
          {editing === "profile" ? (
            /* ── edit mode ── */
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                <EField label="Base City *">
                  <input className={iCls} value={profileDraft.city} placeholder="Mumbai"
                    onChange={e => setProfileDraft(d => ({ ...d, city: e.target.value }))} />
                </EField>
                <EField label="Service Area *">
                  <input className={iCls} value={profileDraft.serviceArea} placeholder="Andheri, Bandra"
                    onChange={e => setProfileDraft(d => ({ ...d, serviceArea: e.target.value }))} />
                </EField>
                <EField label="Working Radius (km)">
                  <input type="number" min="1" max="100" className={iCls} value={profileDraft.workingRadiusKm}
                    onChange={e => setProfileDraft(d => ({ ...d, workingRadiusKm: e.target.value }))} />
                </EField>
                <div className="md:col-span-2 border border-zinc-200 bg-zinc-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                      <MapPin size={17} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-black">Live service location</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Update this when you move to a new area so nearby open jobs are matched correctly.
                      </p>
                      {profileDraft.location && (
                        <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 mt-2">
                          Coordinates ready from {profileDraft.location.source}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={updateProfileLocation}
                    disabled={locating}
                    className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                    {locating ? "Detecting" : "Use Current Location"}
                  </button>
                </div>
                <EField label="Gender">
                  <select className={selCls} value={profileDraft.gender}
                    onChange={e => setProfileDraft(d => ({ ...d, gender: e.target.value }))}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </EField>
                <EField label="Alternate Phone">
                  <input type="tel" className={iCls} value={profileDraft.alternatePhone} placeholder="+91 XXXXX XXXXX"
                    onChange={e => setProfileDraft(d => ({ ...d, alternatePhone: e.target.value }))} />
                </EField>
                <EField label="Emergency Contact">
                  <input className={iCls} value={profileDraft.emergencyContact} placeholder="Name or number"
                    onChange={e => setProfileDraft(d => ({ ...d, emergencyContact: e.target.value }))} />
                </EField>
                <EField label="Languages Spoken" hint="Comma separated — Hindi, English, Marathi">
                  <input className={iCls} value={profileDraft.languages} placeholder="Hindi, English"
                    onChange={e => setProfileDraft(d => ({ ...d, languages: e.target.value }))} />
                </EField>
              </div>
              <div className="mt-5">
                <EField label="About You" hint="Tell customers about your expertise (optional)">
                  <textarea rows={3} className="w-full bg-transparent border border-zinc-200 p-3 text-sm text-black focus:outline-none focus:border-black transition-colors resize-none mt-1"
                    value={profileDraft.about} placeholder="I have 5+ years of AC repair experience…"
                    onChange={e => setProfileDraft(d => ({ ...d, about: e.target.value }))} />
                </EField>
              </div>
              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-zinc-100">
                <button onClick={saveProfile} disabled={saving}
                  className="bg-black text-white px-6 py-2.5 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save Profile"}
                </button>
                <button onClick={cancelEdit} className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ── view mode ── */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              <VField label="City"              value={provider.city} />
              <VField label="Service Area"      value={provider.serviceArea} />
              <VField label="Working Radius"    value={provider.workingRadiusKm ? `${provider.workingRadiusKm} km` : null} />
              <VField label="Location Precision">
                {provider.location?.coordinates?.length === 2 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 mt-1">
                    <MapPin size={11} /> GPS ready
                  </span>
                ) : (
                  <span className="text-zinc-300 font-normal italic">City only</span>
                )}
              </VField>
              <VField label="Gender"            value={provider.gender ? provider.gender.charAt(0).toUpperCase() + provider.gender.slice(1) : null} />
              <VField label="Alternate Phone"   value={provider.alternatePhone} />
              <VField label="Emergency Contact" value={provider.emergencyContact} />
              <VField label="Languages"         value={provider.languages?.length ? provider.languages.join(", ") : null} />
              {provider.about && (
                <div className="col-span-2 md:col-span-3">
                  <VField label="About">
                    <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 border border-zinc-100 px-4 py-3 mt-1">
                      {provider.about}
                    </p>
                  </VField>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* 3. Services & Skills — editable */}
        <Section title="Services & Skills" icon={Wrench} sectionKey="services" editing={editing} onEdit={startEdit} onCancel={cancelEdit}>
          {editing === "services" ? (
            /* ── edit mode ── */
            <div>
              <div className="space-y-4">
                {servicesDraft.map((svc, i) => (
                  <div key={i} className="border border-zinc-200 p-5 bg-zinc-50/50 relative">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Service {i + 1}</span>
                      {servicesDraft.length > 1 && (
                        <button type="button" onClick={() => setServicesDraft(s => s.filter((_,idx) => idx !== i))}
                          className="text-[10px] font-bold tracking-widest uppercase text-red-500 hover:text-red-700 transition-colors">
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <EField label="Category *">
                        <select className={selCls} value={svc.category}
                          onChange={e => setServicesDraft(s => s.map((x,idx) => idx===i ? {...x, category:e.target.value} : x))}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                        </select>
                      </EField>
                      <EField label="Service Name *">
                        <input className={iCls} value={svc.serviceName} placeholder="e.g. AC Repair, Fan Installation"
                          onChange={e => setServicesDraft(s => s.map((x,idx) => idx===i ? {...x, serviceName:e.target.value} : x))} />
                      </EField>
                      <EField label="Experience (Years) *">
                        <input type="number" min="0" max="50" className={iCls} value={svc.experienceYears}
                          onChange={e => setServicesDraft(s => s.map((x,idx) => idx===i ? {...x, experienceYears:e.target.value} : x))} />
                      </EField>
                      <EField label="Skill Level *">
                        <select className={selCls} value={svc.skillLevel}
                          onChange={e => setServicesDraft(s => s.map((x,idx) => idx===i ? {...x, skillLevel:e.target.value} : x))}>
                          {SKILL_LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
                        </select>
                      </EField>
                      <EField label="Previous Company" hint="Optional">
                        <input className={iCls} value={svc.previousCompany || ""} placeholder="e.g. ABC Service Centre"
                          onChange={e => setServicesDraft(s => s.map((x,idx) => idx===i ? {...x, previousCompany:e.target.value} : x))} />
                      </EField>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                      {[
                        { field:"hasOwnTools",                    label:"Has own tools"              },
                        { field:"canProvideInstallationAndRepair", label:"Can install & repair"       },
                        { field:"canHandleEmergency",             label:"Handles emergency calls"    },
                      ].map(({ field, label }) => (
                        <label key={field} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!!svc[field]} className="w-4 h-4 accent-black"
                            onChange={e => setServicesDraft(s => s.map((x,idx) => idx===i ? {...x, [field]:e.target.checked} : x))} />
                          <span className="text-xs font-medium text-zinc-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setServicesDraft(s => [...s, emptyService()])}
                className="w-full mt-3 border border-dashed border-zinc-300 py-3 text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:border-black hover:text-black transition-colors">
                + Add Another Service
              </button>
              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-zinc-100">
                <button onClick={saveServices} disabled={saving}
                  className="bg-black text-white px-6 py-2.5 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save Services"}
                </button>
                <button onClick={cancelEdit} className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ── view mode ── */
            provider.services?.length > 0 ? (
              <div className="space-y-3">
                {provider.services.map((svc, i) => {
                  const lvlColor = svc.skillLevel === "expert"
                    ? "bg-violet-100 text-violet-700 border-violet-200"
                    : svc.skillLevel === "intermediate"
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200";
                  return (
                    <div key={i} className="group flex items-start gap-5 p-5 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm transition-all duration-200">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
                        <Wrench size={16} className="text-white" strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold tracking-widest uppercase text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{svc.category}</span>
                          <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${lvlColor}`}>{svc.skillLevel}</span>
                        </div>
                        <p className="text-sm font-bold text-zinc-900 mb-1 leading-snug">{svc.serviceName || "—"}</p>
                        <p className="text-xs text-zinc-400">{svc.experienceYears} yr{svc.experienceYears !== 1 ? "s" : ""} experience{svc.previousCompany ? ` · ${svc.previousCompany}` : ""}</p>
                        <div className="flex flex-wrap gap-2 mt-2.5">
                          {svc.hasOwnTools && <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-full"><Hammer size={9} /> Own tools</span>}
                          {svc.canHandleEmergency && <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full"><Zap size={9} /> Emergency</span>}
                          {svc.canProvideInstallationAndRepair && <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full"><Settings2 size={9} /> Install &amp; Repair</span>}
                          {getDisplayCategories(svc).map(cat => <span key={cat} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-zinc-200 text-zinc-400">{cat}</span>)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">No services added yet.</p>
            )
          )}
        </Section>

        {/* 4. KYC Documents — locked */}
        <Section title="KYC Documents" icon={FileText} sectionKey="kyc" editing={editing} onEdit={startEdit} onCancel={cancelEdit} locked>
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map(doc => {
                const ds = DOC_STATUS_CONFIG[doc.status] || { bg:"bg-zinc-50", text:"text-zinc-500", label: doc.status };
                const isVerified = doc.status === "verified";
                const isRejected = doc.status === "rejected";
                return (
                  <div key={doc._id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    isVerified ? "bg-emerald-50/60 border-emerald-100" :
                    isRejected ? "bg-red-50/60 border-red-100" :
                    "bg-zinc-50/50 border-zinc-100"
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isVerified ? "bg-emerald-100" : isRejected ? "bg-red-100" : "bg-white border border-zinc-200"
                    }`}>
                      <FileText size={15} className={isVerified ? "text-emerald-600" : isRejected ? "text-red-500" : "text-zinc-400"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900">{DOC_LABELS[doc.docType] || doc.docType}</p>
                      {doc.docNumberMasked && <p className="text-xs font-mono text-zinc-400 mt-0.5">{doc.docNumberMasked}</p>}
                      {doc.adminRemarks   && <p className="text-xs text-red-500 mt-0.5">{doc.adminRemarks}</p>}
                    </div>
                    <span className={`text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border flex-shrink-0 ${ds.bg} ${ds.text}`}>
                      {ds.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic">No documents uploaded. Complete onboarding Step 3.</p>
          )}
        </Section>

        {/* 5. Availability — editable */}
        <Section title="Availability & Schedule" icon={Calendar} sectionKey="availability" editing={editing} onEdit={startEdit} onCancel={cancelEdit}>
          {editing === "availability" ? (
            /* ── edit mode ── */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                <EField label="Working Type *">
                  <select className={selCls} value={availDraft.workingType}
                    onChange={e => setAvailDraft(d => ({ ...d, workingType: e.target.value }))}>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                  </select>
                </EField>
                <EField label="Travel Radius (km) *">
                  <input type="number" min="1" max="100" className={iCls} value={availDraft.travelRadiusKm}
                    onChange={e => setAvailDraft(d => ({ ...d, travelRadiusKm: e.target.value }))} />
                </EField>
                <EField label="Working Hours From">
                  <input type="time" className={iCls} value={availDraft.workingHoursFrom}
                    onChange={e => setAvailDraft(d => ({ ...d, workingHoursFrom: e.target.value }))} />
                </EField>
                <EField label="Working Hours To">
                  <input type="time" className={iCls} value={availDraft.workingHoursTo}
                    onChange={e => setAvailDraft(d => ({ ...d, workingHoursTo: e.target.value }))} />
                </EField>
              </div>

              <EField label="Available Days *">
                <div className="flex flex-wrap gap-2 mt-1">
                  {DAYS.map(day => (
                    <button key={day} type="button"
                      onClick={() => setAvailDraft(d => ({
                        ...d,
                        availableDays: d.availableDays.includes(day)
                          ? d.availableDays.filter(x => x !== day)
                          : [...d.availableDays, day],
                      }))}
                      className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase border transition-colors ${availDraft.availableDays.includes(day) ? "bg-black text-white border-black" : "bg-white text-zinc-500 border-zinc-300 hover:border-black hover:text-black"}`}>
                      {DAY_LABEL[day]}
                    </button>
                  ))}
                </div>
              </EField>

              <div className="flex flex-wrap gap-x-8 gap-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={availDraft.acceptsUrgentJobs} className="w-4 h-4 accent-black"
                    onChange={e => setAvailDraft(d => ({ ...d, acceptsUrgentJobs: e.target.checked }))} />
                  <span className="text-xs font-medium text-zinc-700">Accepts urgent / same-day jobs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={availDraft.hasOwnVehicle} className="w-4 h-4 accent-black"
                    onChange={e => setAvailDraft(d => ({ ...d, hasOwnVehicle: e.target.checked }))} />
                  <span className="text-xs font-medium text-zinc-700">Has own vehicle</span>
                </label>
              </div>

              {availDraft.hasOwnVehicle && (
                <EField label="Vehicle Type">
                  <select className={selCls} value={availDraft.vehicleType}
                    onChange={e => setAvailDraft(d => ({ ...d, vehicleType: e.target.value }))}>
                    <option value="">Select type</option>
                    {["bike","scooter","car","cycle","other"].map(v => (
                      <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>
                    ))}
                  </select>
                </EField>
              )}

              <EField label="Preferred Locations" hint="Comma separated — e.g. Andheri, Bandra, Juhu">
                <input className={iCls} value={availDraft.preferredLocations}
                  placeholder="Andheri, Bandra, Juhu"
                  onChange={e => setAvailDraft(d => ({ ...d, preferredLocations: e.target.value }))} />
              </EField>

              <div className="flex items-center gap-3 pt-5 border-t border-zinc-100">
                <button onClick={saveAvailability} disabled={saving}
                  className="bg-black text-white px-6 py-2.5 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save Availability"}
                </button>
                <button onClick={cancelEdit} className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ── view mode ── */
            availability ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
                  <VField label="Working Type"   value={av.workingType?.replace("_"," ")} />
                  <VField label="Hours"          value={av.workingHoursFrom && av.workingHoursTo ? `${av.workingHoursFrom} – ${av.workingHoursTo}` : null} />
                  <VField label="Travel Radius"  value={av.travelRadiusKm ? `${av.travelRadiusKm} km` : null} />
                  <VField label="Vehicle"        value={av.hasOwnVehicle ? (av.vehicleType || "Yes") : "No vehicle"} />
                </div>

                {av.availableDays?.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-zinc-400 mb-2.5">Available Days</p>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(day => (
                        <span key={day} className={`px-3.5 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-full border transition-colors ${
                          av.availableDays.includes(day)
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-zinc-100 text-zinc-300 border-zinc-100"
                        }`}>
                          {DAY_LABEL[day]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {av.acceptsUrgentJobs && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5">
                      <span className="flex items-center gap-1"><Zap size={11} /> Accepts urgent jobs</span>
                    </span>
                  )}
                  {av.preferredLocations?.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200 px-3 py-1.5">
                      <MapPin size={11} /> {av.preferredLocations.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">Availability not set. Complete onboarding Step 6.</p>
            )
          )}
        </Section>

        {/* 6. Bank Details — locked */}
        <Section title="Bank Details" icon={Landmark} sectionKey="bank" editing={editing} onEdit={startEdit} onCancel={cancelEdit} locked>
          {bankDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                <VField label="Account Holder"  value={bankDetails.accountHolderName} />
                <VField label="Account Number"  value={bankDetails.accountNumberMasked} mono />
                <VField label="IFSC Code"       value={bankDetails.ifscCode} mono />
                {bankDetails.upiId && <VField label="UPI ID" value={bankDetails.upiId} />}
                <VField label="Penny Drop">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold mt-1 ${bankDetails.pennyDropVerified ? "text-emerald-600" : "text-amber-600"}`}>
                    {bankDetails.pennyDropVerified
                      ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> Verified</span>
                      : <span className="flex items-center gap-1 text-amber-600"><Clock size={12} /> Pending</span>
                    }
                  </span>
                </VField>
              </div>
              <p className="text-[10px] text-zinc-400 border-t border-zinc-100 pt-3">
                To update bank details, contact support.
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic">No bank details added. Complete onboarding Step 5.</p>
          )}
        </Section>

        {/* 7. Work Portfolio — locked */}
        {workProofs.length > 0 && (
          <Section title="Work Portfolio" icon={Briefcase} sectionKey="portfolio" editing={editing} onEdit={startEdit} onCancel={cancelEdit} locked>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workProofs.map((proof, i) => (
                <div key={i} className="p-4 border border-zinc-100 bg-zinc-50/50">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">{proof.proofType?.replace(/_/g," ")}</p>
                  {proof.title       && <p className="font-semibold text-sm text-zinc-900 mt-1">{proof.title}</p>}
                  {proof.description && <p className="text-xs text-zinc-500 mt-0.5">{proof.description}</p>}
                  {proof.fileUrl     && (
                    <a href={proof.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-black mt-2 hover:underline underline-offset-2">
                      View File ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 8. Legal Agreement — locked */}
        <Section title="Legal Agreement" icon={Scale} sectionKey="agreement" editing={editing} onEdit={startEdit} onCancel={cancelEdit} locked>
          <div className={`flex items-center gap-4 p-4 border ${agreementSigned ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${agreementSigned ? "bg-emerald-100" : "bg-amber-100"}`}>
              {agreementSigned ? <ShieldCheck size={20} className="text-emerald-600" /> : <Clock size={20} className="text-amber-600" />}
            </div>
            <div>
              <p className={`font-bold text-sm ${agreementSigned ? "text-emerald-700" : "text-amber-700"}`}>
                {agreementSigned ? "All agreements signed" : "Agreements not yet signed"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {agreementSigned
                  ? "Terms, Code of Conduct, BGV Consent and Data Privacy — all accepted."
                  : "Complete onboarding Step 7 to sign the legal agreements."}
              </p>
            </div>
          </div>
        </Section>

        {/* 9. Reviews & Ratings */}
        <Section title="Reviews & Ratings" icon={Star} sectionKey="reviews" editing={editing} onEdit={startEdit} onCancel={cancelEdit} locked>
          {/* Summary row */}
          <div className="flex items-center gap-6 mb-6 pb-5 border-b border-zinc-100">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-black">{provider.rating?.toFixed(1) || "0.0"}</p>
              <div className="flex gap-0.5 justify-center mt-1">
                {[1,2,3,4,5].map(n => (
                  <svg key={n} className="w-4 h-4" viewBox="0 0 24 24"
                    fill={n <= Math.round(provider.rating || 0) ? "#000" : "none"} stroke="#000" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">{provider.totalReviews || 0} review{provider.totalReviews !== 1 ? "s" : ""}</p>
            </div>

            {/* Star breakdown bars */}
            {Object.keys(starBreakdown).length > 0 && (
              <div className="flex-1 space-y-1.5">
                {[5,4,3,2,1].map(star => {
                  const count = starBreakdown[star] || 0;
                  const pct   = reviewsTotal > 0 ? Math.round((count / reviewsTotal) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-zinc-400 w-3">{star}</span>
                      <div className="flex-1 bg-zinc-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-zinc-400 w-5 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Review cards */}
          {reviewsLoading && reviews.length === 0 ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-zinc-100 animate-pulse" />)}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-zinc-400 italic text-center py-4">No reviews yet. Complete your first job to start receiving ratings!</p>
          ) : (
            <>
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r._id} className="p-5 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {(r.customerId?.fullName || "C").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{r.customerId?.fullName || "Customer"}</p>
                          <p className="text-[10px] text-zinc-400">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <svg key={n} className="w-3.5 h-3.5" viewBox="0 0 24 24"
                            fill={n <= r.rating ? "#f59e0b" : "none"} stroke={n <= r.rating ? "#f59e0b" : "#d4d4d8"} strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    {r.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {r.tags.map(t => (
                          <span key={t} className="text-[9px] font-bold tracking-widest uppercase bg-zinc-100 text-zinc-500 border border-zinc-100 px-2 py-0.5 rounded-full">
                            {t.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.review && <p className="text-sm text-zinc-500 leading-relaxed italic">&ldquo;{r.review}&rdquo;</p>}
                  </div>
                ))}
              </div>

              {/* Load more */}
              {reviews.length < reviewsTotal && (
                <button
                  onClick={() => loadReviews(provider._id, reviewsPage + 1)}
                  disabled={reviewsLoading}
                  className="w-full mt-4 border border-zinc-200 text-zinc-500 py-2.5 text-[10px] font-bold tracking-widests uppercase hover:border-black hover:text-black transition-colors disabled:opacity-40"
                >
                  {reviewsLoading ? "Loading…" : `Load More (${reviewsTotal - reviews.length} remaining)`}
                </button>
              )}
            </>
          )}
        </Section>

      </div>
      {/* Bottom spacer */}
      <div className="h-16 bg-[#f7f7f8]" />
    </div>
  );
}
