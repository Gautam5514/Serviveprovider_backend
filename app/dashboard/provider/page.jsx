"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import {
  BellRing, BriefcaseBusiness, CheckCircle2, Star,
  ArrowRight, Zap, TrendingUp, Clock, ClipboardList,
} from "lucide-react";

function isActiveJob(status) {
  return ["accepted", "provider_on_way", "in_progress"].includes(status);
}

const STEP_LABELS = ["Profile", "Services", "KYC", "Work", "Bank", "Schedule", "Agreement"];

export default function ProviderDashboardHome() {
  const [provider, setProvider]         = useState(null);
  const [jobs, setJobs]                 = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [poolMessage, setPoolMessage]   = useState("");
  const [loading, setLoading]           = useState(true);
  const user = useMemo(() => getStoredUser(), []);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const [profileRes, jobsRes, poolRes] = await Promise.all([
          api.get(`/providers/me?userId=${user.id}`),
          api.get("/bookings/provider/jobs"),
          api.get("/bookings/provider/available"),
        ]);
        if (profileRes.data.success) setProvider(profileRes.data.provider);
        if (jobsRes.data.success)    setJobs(jobsRes.data.jobs || []);
        if (poolRes.data.success) {
          setAvailableJobs(poolRes.data.jobs || []);
          setPoolMessage(poolRes.data.message || "");
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const activeJobs    = jobs.filter(j => isActiveJob(j.status));
  const completedJobs = jobs.filter(j => j.status === "completed");
  const isApproved    = provider?.onboardingStatus === "approved";
  const onboardStep   = provider?.onboardingStep || 0;

  const statCards = [
    {
      label: "Active Jobs",
      value: activeJobs.length,
      icon: BriefcaseBusiness,
      color: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-100",
      sub: "currently assigned",
    },
    {
      label: "Open Nearby",
      value: availableJobs.length,
      icon: BellRing,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      hot: availableJobs.length > 0,
      sub: "in your area",
    },
    {
      label: "Completed",
      value: completedJobs.length || provider?.totalJobsCompleted || 0,
      icon: CheckCircle2,
      color: "text-violet-500",
      bg: "bg-violet-50",
      border: "border-violet-100",
      sub: "total jobs done",
    },
    {
      label: "Rating",
      value: provider?.rating ? provider.rating.toFixed(1) : "New",
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-50",
      border: "border-amber-100",
      sub: `${provider?.totalReviews || 0} review${provider?.totalReviews !== 1 ? "s" : ""}`,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-16 font-sans selection:bg-black selection:text-white">

      {/* ── Dark hero header ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",backgroundSize:"32px 32px"}} />
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-none px-6 md:px-12 py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-500 mb-2">Command Center</p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                Welcome back,<br className="md:hidden" /> {user?.fullName?.split(" ")[0] || "Professional"}.
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {isApproved ? (
                <span className="inline-flex items-center gap-2 bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 px-4 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 bg-amber-900/30 border border-amber-700/40 text-amber-300 px-4 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full">
                  <Clock size={10} />
                  Pending Approval
                </span>
              )}
            </div>
          </div>

          {/* Onboarding bar */}
          {!isApproved && (
            <div className="mt-8 pt-6 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                  Onboarding Progress
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  onboardStep >= 7 ? "bg-emerald-900/40 border-emerald-700/50 text-emerald-300" : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}>
                  {onboardStep >= 7 ? "Complete" : `Step ${onboardStep} of 7`}
                </span>
              </div>
              <div className="flex gap-1.5 mb-1">
                {STEP_LABELS.map((label, i) => {
                  const done = onboardStep > i;
                  return (
                    <div key={i} className="flex-1" title={label}>
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${done ? "bg-emerald-400" : "bg-zinc-700"}`} />
                      <p className="text-[8px] text-zinc-600 mt-1 text-center hidden md:block truncate">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 py-8 space-y-6">

        {/* Live job broadcast banner */}
        {availableJobs.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-zinc-900 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-4 relative">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <BellRing size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-1">Live Job Broadcast</p>
                <h2 className="text-xl font-black tracking-tight">
                  {availableJobs.length} nearby job{availableJobs.length > 1 ? "s" : ""} waiting
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">First to confirm gets the order — act fast</p>
              </div>
            </div>
            <Link href="/dashboard/provider/orders?view=pool"
              className="relative flex items-center gap-2 bg-white text-black px-5 py-2.5 text-[10px] font-bold tracking-widests uppercase rounded-full hover:bg-zinc-100 transition-colors whitespace-nowrap">
              Open Job Pool <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* Pool message (no jobs) */}
        {availableJobs.length === 0 && poolMessage && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-sm font-semibold flex items-start gap-3">
            <Zap size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            {poolMessage}
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg, border, hot, sub }) => (
            <div key={label} className={`relative bg-white rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${hot ? "border-emerald-200 shadow-sm shadow-emerald-100" : "border-zinc-100"}`}>
              {hot && <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400" />}
              <div className="p-5">
                <div className={`w-10 h-10 ${bg} ${border} border rounded-xl flex items-center justify-center mb-4`}>
                  <Icon size={18} className={color} strokeWidth={1.8} />
                </div>
                <p className={`text-3xl font-black tracking-tight mb-0.5 ${hot ? "text-emerald-600" : "text-zinc-900"}`}>{value}</p>
                <p className="text-[9px] font-bold tracking-widest uppercase text-zinc-400">{label}</p>
                <p className="text-[10px] text-zinc-300 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard/provider/orders"
            className="group flex items-center justify-between bg-white border border-zinc-100 rounded-2xl p-5 hover:border-zinc-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-zinc-900 transition-colors">
                <ClipboardList size={18} className="text-zinc-500 group-hover:text-white transition-colors" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">Active Orders</p>
                <p className="text-xs text-zinc-400">Manage your assigned jobs</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-zinc-300 group-hover:text-zinc-700 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link href="/dashboard/provider/profile"
            className="group flex items-center justify-between bg-white border border-zinc-100 rounded-2xl p-5 hover:border-zinc-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-zinc-900 transition-colors">
                <TrendingUp size={18} className="text-zinc-500 group-hover:text-white transition-colors" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">My Profile</p>
                <p className="text-xs text-zinc-400">Edit services, availability & more</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-zinc-300 group-hover:text-zinc-700 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Incomplete onboarding CTA */}
        {onboardStep < 7 && !isApproved && (
          <div className="relative overflow-hidden bg-zinc-900 rounded-2xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <div className="relative">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-2">Action Required</p>
              <h2 className="text-xl font-black text-white tracking-tight mb-1.5">Complete your onboarding</h2>
              <p className="text-sm text-zinc-400 max-w-md">
                Your profile is not visible to customers. Finish setup to start receiving service requests.
              </p>
            </div>
            <Link href="/provider/onboarding"
              className="relative flex items-center gap-2 bg-white text-black px-6 py-3 text-[10px] font-bold tracking-widest uppercase rounded-full hover:bg-zinc-100 transition-colors whitespace-nowrap flex-shrink-0">
              Resume Setup <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
