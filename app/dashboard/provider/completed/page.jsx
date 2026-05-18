"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { formatPrice } from "@/lib/services";
import {
  CheckCircle2, Star, CalendarClock, MapPin, UserRound,
  Wrench, TrendingUp, Award, Clock,
} from "lucide-react";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getJobRating(job) {
  return Number(job.rating || job.ratingId?.rating || 0);
}

export default function ProviderCompletedOrdersPage() {
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useMemo(() => getStoredUser(), []);

  useEffect(() => {
    if (!user) return;
    api.get("/bookings/provider/jobs")
      .then(({ data }) => {
        if (data.success) {
          setJobs((data.jobs || []).filter(j => j.status === "completed"));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const totalEarnings = jobs.reduce((sum, j) => sum + (j.pricing?.totalAmount || 0), 0);
  const ratedJobs     = jobs.filter(j => getJobRating(j) > 0);
  const avgRating     = ratedJobs.length
    ? (ratedJobs.reduce((s, j) => s + getJobRating(j), 0) / ratedJobs.length).toFixed(1)
    : null;

  const summaryCards = [
    { label: "Jobs Done",    value: jobs.length,                          icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Total Earned", value: formatPrice(totalEarnings),           icon: TrendingUp,   color: "text-blue-500",    bg: "bg-blue-50",    border: "border-blue-100"    },
    { label: "Avg Rating",   value: avgRating || "—",                     icon: Star,         color: "text-amber-500",   bg: "bg-amber-50",   border: "border-amber-100"   },
    { label: "Latest Job",   value: jobs.length ? fmtDate(jobs[0]?.completedAt || jobs[0]?.updatedAt) : "—",
      icon: Clock, color: "text-violet-500", bg: "bg-violet-50", border: "border-violet-100" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f8] font-sans selection:bg-black selection:text-white pb-12">

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",backgroundSize:"32px 32px"}} />
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative px-6 md:px-12 py-10">
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-500 mb-2">History</p>
          <h1 className="text-3xl font-black tracking-tight text-white">Completed Jobs</h1>
          <p className="text-zinc-400 text-sm mt-1">Your past service history, ratings & earnings.</p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`bg-white rounded-2xl border ${border} p-5`}>
              <div className={`w-10 h-10 ${bg} ${border} border rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={18} className={color} strokeWidth={1.8} />
              </div>
              <p className="text-2xl font-black text-zinc-900 mb-0.5">{loading ? "—" : value}</p>
              <p className="text-[9px] font-bold tracking-widest uppercase text-zinc-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-zinc-100 h-24 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-zinc-200">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-5">
              <Award size={28} className="text-zinc-300" />
            </div>
            <p className="text-zinc-400 font-bold tracking-widests uppercase text-xs mb-2">No history yet</p>
            <p className="text-zinc-300 text-sm text-center max-w-xs">
              Once you complete jobs and receive customer ratings, your history will appear here.
            </p>
          </div>
        )}

        {/* Job list */}
        {!loading && jobs.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-widests uppercase text-zinc-400">
              {jobs.length} completed job{jobs.length !== 1 ? "s" : ""}
            </p>
            {jobs.map(job => (
              <div key={job._id}
                className="group bg-white rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-sm transition-all duration-200 overflow-hidden">
                {/* Green top accent */}
                <div className="h-0.5 bg-emerald-400 w-full" />
                <div className="p-5 flex gap-4">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Wrench size={18} className="text-emerald-600" strokeWidth={1.8} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-bold text-zinc-900 text-sm">{job.serviceName}</span>
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-widests uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={9} /> Completed
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5 mb-0.5">
                      <CalendarClock size={11} /> {fmtDate(job.scheduledDate)}
                    </p>
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5 mb-0.5 truncate">
                      <MapPin size={11} /> {job.address?.city || job.address?.text || "—"}
                    </p>
                    {job.customerId?.fullName && (
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <UserRound size={11} /> {job.customerId.fullName}
                      </p>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex-shrink-0 flex flex-col items-end justify-between">
                    <div className="text-right">
                      <p className="text-base font-black text-zinc-900">{formatPrice(job.pricing?.totalAmount || 0)}</p>
                      <p className="text-[9px] text-zinc-300 mt-0.5">{job.bookingNumber}</p>
                    </div>
                    {getJobRating(job) > 0 ? (
                      <div className="flex items-center gap-1 mt-2" title={`${getJobRating(job)} star rating`}>
                        {[1,2,3,4,5].map(n => (
                          <svg key={n} className="w-3 h-3" viewBox="0 0 24 24"
                            fill={n <= getJobRating(job) ? "#f59e0b" : "none"}
                            stroke={n <= getJobRating(job) ? "#f59e0b" : "#d4d4d8"} strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                        <span className="ml-1 text-[10px] font-bold text-amber-600">{getJobRating(job).toFixed(1)}</span>
                      </div>
                    ) : (
                      <p className="mt-2 text-[9px] font-bold tracking-widest uppercase text-zinc-300">Not rated</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
