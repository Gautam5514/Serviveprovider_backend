"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

const STATUS_CONFIG = {
  pending_profile:          { bg: "bg-zinc-100",    text: "text-zinc-500",    border: "border-zinc-200",    dot: "bg-zinc-400",    label: "Pending Profile"   },
  profile_complete:         { bg: "bg-sky-50",      text: "text-sky-700",     border: "border-sky-200",     dot: "bg-sky-500",     label: "Profile Complete"  },
  kyc_submitted:            { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500",   label: "KYC Submitted"     },
  kyc_verified:             { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500",    label: "KYC Verified"      },
  skill_review_pending:     { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500",   label: "Skill Review"      },
  background_check_pending: { bg: "bg-violet-50",   text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500",  label: "BGV Pending"       },
  approved:                 { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Approved"          },
  rejected:                 { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500",     label: "Rejected"          },
  suspended:                { bg: "bg-orange-50",   text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-500",  label: "Suspended"         },
  blocked:                  { bg: "bg-red-100",     text: "text-red-800",     border: "border-red-300",     dot: "bg-red-700",     label: "Blocked"           },
};

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.pending_profile;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

const TABS = [
  { key: "all",      label: "All"          },
  { key: "review",   label: "Needs Review" },
  { key: "approved", label: "Approved"     },
  { key: "rejected", label: "Rejected"     },
];

const REVIEW_STATUSES = ["kyc_submitted", "skill_review_pending", "background_check_pending", "profile_complete", "pending_profile"];

function filterProviders(providers, tab) {
  if (tab === "all")      return providers;
  if (tab === "review")   return providers.filter(p => REVIEW_STATUSES.includes(p.onboardingStatus));
  if (tab === "approved") return providers.filter(p => p.onboardingStatus === "approved");
  if (tab === "rejected") return providers.filter(p => ["rejected", "suspended", "blocked"].includes(p.onboardingStatus));
  return providers;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pendingRes, approvedRes] = await Promise.all([
          api.get("/admin/providers/pending"),
          api.get("/admin/providers/approved"),
        ]);
        const combined = [
          ...(pendingRes.data.providers  || []),
          ...(approvedRes.data.providers || []),
        ];
        // Deduplicate by _id
        const seen = new Set();
        const unique = combined.filter(p => {
          if (seen.has(p._id)) return false;
          seen.add(p._id);
          return true;
        });
        setProviders(unique);
      } catch (err) {
        console.error("Failed to fetch providers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const visible = filterProviders(providers, tab);

  const counts = {
    all:      providers.length,
    review:   providers.filter(p => REVIEW_STATUSES.includes(p.onboardingStatus)).length,
    approved: providers.filter(p => p.onboardingStatus === "approved").length,
    rejected: providers.filter(p => ["rejected", "suspended", "blocked"].includes(p.onboardingStatus)).length,
  };

  return (
    <div className="p-8 md:p-12 font-sans selection:bg-black selection:text-white">
      <div className="max-w-6xl mx-auto">

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-200 pb-6 mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-1">Admin Panel</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black">Provider Applications.</h1>
          </div>
          <p className="mt-3 md:mt-0 text-sm text-zinc-500 font-medium">
            {counts.review > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 text-xs font-bold tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {counts.review} need{counts.review === 1 ? "s" : ""} review
              </span>
            )}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 border-b border-zinc-200">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-all border-b-2 -mb-px ${
                tab === t.key
                  ? "border-black text-black"
                  : "border-transparent text-zinc-400 hover:text-zinc-700"
              }`}
            >
              {t.label}
              <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded font-bold ${
                tab === t.key ? "bg-black text-white" : "bg-zinc-100 text-zinc-500"
              }`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-zinc-200 p-6 animate-pulse">
                <div className="h-5 bg-zinc-100 rounded w-48 mb-3" />
                <div className="h-3 bg-zinc-100 rounded w-72" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-zinc-300 bg-white">
            <svg className="w-10 h-10 text-zinc-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-zinc-400 font-medium tracking-wide uppercase text-xs">No providers in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((provider) => {
              const st = STATUS_CONFIG[provider.onboardingStatus] || STATUS_CONFIG.pending_profile;
              const services = provider.services?.map(s => s.category) || [];
              const uniqueCats = [...new Set(services)];

              return (
                <div
                  key={provider._id}
                  className="bg-white border border-zinc-200 hover:border-zinc-400 transition-all duration-200 group"
                >
                  <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">

                    {/* Left: status stripe */}
                    <div className={`hidden md:block w-1 self-stretch rounded-full flex-shrink-0 ${st.dot}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h2 className="text-base font-bold tracking-tight text-black truncate">
                          {provider.userId?.fullName || "Unknown"}
                        </h2>
                        <StatusBadge status={provider.onboardingStatus} />
                        {provider.userId?.emailVerified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                            ✓ Verified
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {provider.userId?.email}
                        </span>
                        {provider.city && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {provider.city}
                          </span>
                        )}
                        {provider.userId?.createdAt && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(provider.userId.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>

                      {uniqueCats.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {uniqueCats.map(cat => (
                            <span key={cat} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-widest border border-zinc-200">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Step indicator */}
                    <div className="hidden lg:flex flex-col items-center gap-1 flex-shrink-0">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Step</p>
                      <div className="w-10 h-10 border-2 border-zinc-200 flex items-center justify-center">
                        <span className="text-lg font-extrabold text-black">{provider.onboardingStep || 1}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">of 7</p>
                    </div>

                    {/* Review button */}
                    <div className="flex-shrink-0">
                      <Link href={`/admin/providers/${provider._id}`}>
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors group-hover:shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Review
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
