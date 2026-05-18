"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { Users, AlertTriangle, CheckCircle2, TrendingUp, Calendar, RefreshCw, Star, Activity, ClipboardList } from "lucide-react";

const STATUS_CONFIG = {
  pending_profile:          { dot: "bg-zinc-400",    label: "Pending Profile"  },
  profile_complete:         { dot: "bg-sky-500",     label: "Profile Complete" },
  kyc_submitted:            { dot: "bg-amber-500",   label: "KYC Submitted"    },
  kyc_verified:             { dot: "bg-blue-500",    label: "KYC Verified"     },
  skill_review_pending:     { dot: "bg-amber-500",   label: "Skill Review"     },
  background_check_pending: { dot: "bg-violet-500",  label: "BGV Pending"      },
  approved:                 { dot: "bg-emerald-500", label: "Approved"         },
  rejected:                 { dot: "bg-red-500",     label: "Rejected"         },
  suspended:                { dot: "bg-orange-500",  label: "Suspended"        },
  blocked:                  { dot: "bg-red-700",     label: "Blocked"          },
};

function fmt(n) { return (n || 0).toLocaleString("en-IN"); }
function fmtCurrency(n) { return `₹${(n || 0).toLocaleString("en-IN")}`; }

function BarChart({ data, height = 100 }) {
  if (!data || data.length === 0) return <p className="text-xs text-zinc-400 italic">No data yet</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group">
          <div
            className="w-full bg-zinc-200 rounded-t-sm transition-all duration-300 group-hover:bg-zinc-900 relative"
            style={{ height: `${Math.max(4, (d.value / max) * height)}px` }}
            title={`${d.label}: ${d.value}`}
          />
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardHome() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [recent,  setRecent]  = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [analyticsRes, pendingRes] = await Promise.all([
        api.get("/admin/analytics"),
        api.get("/admin/providers/pending"),
      ]);
      setData(analyticsRes.data);

      const pending = pendingRes.data.providers || [];
      setRecent(
        [...pending]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl border border-red-100 shadow-sm text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-black text-zinc-900 mb-2">Cannot reach backend</h2>
        <p className="text-sm text-zinc-500 mb-6">Ensure the server is running on <code className="bg-zinc-100 text-black px-1.5 py-0.5 rounded text-xs font-mono">localhost:5050</code>.</p>
        <button onClick={load} className="flex items-center justify-center gap-2 w-full bg-zinc-900 text-white px-5 py-3 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-black transition-colors">
          <RefreshCw size={14} /> Retry Connection
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">Loading metrics…</p>
      </div>
    </div>
  );

  const { stats, dailyCounts, categoryRevenue, topProviders } = data;

  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split("T")[0];
    const found = dailyCounts?.find(x => x._id === key);
    return { label: key, value: found?.count || 0 };
  });

  const xLabels = chartData.filter((_, i) => i % 6 === 0 || i === 29).map(d => ({
    label: new Date(d.label).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    idx:   chartData.indexOf(d),
  }));

  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-16 font-sans selection:bg-black selection:text-white">
      
      {/* ── Dark Hero Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white pb-12">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",backgroundSize:"32px 32px"}} />
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-500 mb-2">Central Operations</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">Admin Dashboard.</h1>
            <p className="text-sm text-zinc-400 mt-2">Platform analytics, provider applications, and revenue tracking.</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all whitespace-nowrap">
            <RefreshCw size={12} /> Refresh Data
          </button>
        </div>
      </div>

      <div className="px-6 md:px-12 -mt-8 max-w-7xl mx-auto space-y-6 relative z-10">

        {/* ── Priority Alerts ── */}
        {stats.providers.pending > 0 && (
          <div className="bg-white rounded-2xl border-2 border-amber-300 p-5 md:p-6 shadow-lg shadow-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <div>
                <p className="text-base font-black text-amber-900">Provider Applications Pending</p>
                <p className="text-sm text-amber-700">{stats.providers.pending} professional{stats.providers.pending !== 1 ? "s" : ""} awaiting onboarding review and approval.</p>
              </div>
            </div>
            <Link href="/admin/providers" className="w-full sm:w-auto text-center bg-amber-500 text-white px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-amber-600 transition-colors whitespace-nowrap">
              Review Now
            </Link>
          </div>
        )}

        {/* ── Primary Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue",     value: fmtCurrency(stats.revenue.total),    sub: "All time completed",      icon: TrendingUp,   color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "Bookings Today",    value: fmt(stats.bookings.today),           sub: "Placed today",            icon: Calendar,     color: "text-blue-500",    bg: "bg-blue-50",    border: "border-blue-100"    },
            { label: "Total Customers",   value: fmt(stats.users.customers),          sub: `+${stats.users.signupsMonth} this month`, icon: Users,        color: "text-violet-500",  bg: "bg-violet-50",  border: "border-violet-100"  },
            { label: "Needs Assignment",  value: fmt(stats.bookings.pendingUnassigned), sub: "Unclaimed bookings",    icon: Activity,     color: "text-amber-500",   bg: "bg-amber-50",   border: "border-amber-100", highlight: stats.bookings.pendingUnassigned > 0 },
          ].map((c, i) => (
            <div key={i} className={`relative bg-white rounded-2xl border ${c.highlight ? "border-amber-300 shadow-sm shadow-amber-100" : "border-zinc-100"} p-5 overflow-hidden group hover:border-zinc-300 transition-colors`}>
              {c.highlight && <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400" />}
              <div className={`w-10 h-10 ${c.bg} ${c.border} border rounded-xl flex items-center justify-center mb-4`}>
                <c.icon size={18} className={c.color} strokeWidth={2} />
              </div>
              <p className="text-2xl md:text-3xl font-black text-zinc-900 mb-0.5 tracking-tight">{c.value}</p>
              <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">{c.label}</p>
              <p className="text-[10px] text-zinc-400 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Quick Nav Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/providers" className="group relative overflow-hidden bg-zinc-900 rounded-2xl p-6 md:p-8 flex items-center justify-between transition-transform hover:-translate-y-0.5">
            <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-amber-500/20 blur-2xl rounded-full" />
            <div className="relative z-10">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-1">Queue Management</p>
              <p className="text-xl font-black text-white mb-1">Review Applications</p>
              <p className="text-sm text-zinc-400">{fmt(stats.providers.pending)} pending approvals</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white text-zinc-400 transition-colors relative z-10">
              <ClipboardList size={20} />
            </div>
          </Link>

          <Link href="/admin/approved" className="group relative overflow-hidden bg-white border border-zinc-200 rounded-2xl p-6 md:p-8 flex items-center justify-between transition-transform hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm">
            <div className="relative z-10">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-1">Active Roster</p>
              <p className="text-xl font-black text-zinc-900 mb-1">Manage Providers</p>
              <p className="text-sm text-zinc-500">{fmt(stats.providers.approved)} active professionals</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 text-zinc-400 transition-colors relative z-10">
              <CheckCircle2 size={20} />
            </div>
          </Link>
        </div>

        {/* ── Charts Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Booking Volume Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-1">Booking Volume</p>
                <p className="text-base font-black text-zinc-900">Last 30 Days</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-zinc-900">{fmt(stats.bookings.total)}</p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Total</p>
              </div>
            </div>
            <div className="pt-2">
              <BarChart data={chartData} height={120} />
              <div className="flex justify-between mt-3 px-1 border-t border-zinc-100 pt-2">
                {xLabels.map(x => (
                  <span key={x.idx} className="text-[9px] font-medium text-zinc-400">{x.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-1">Revenue Stream</p>
            <p className="text-base font-black text-zinc-900 mb-6">By Category</p>
            
            {(categoryRevenue || []).length === 0 ? (
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-zinc-100 rounded-xl">
                <p className="text-xs text-zinc-400 font-medium">No completed bookings yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categoryRevenue.slice(0, 5).map(c => {
                  const maxRev = categoryRevenue[0]?.revenue || 1;
                  const pct = Math.round((c.revenue / maxRev) * 100);
                  return (
                    <div key={c._id} className="group">
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs font-bold text-zinc-700 capitalize group-hover:text-black transition-colors">{c._id}</span>
                        <span className="text-xs font-black text-zinc-900">{fmtCurrency(c.revenue)}</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-zinc-800 h-1.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Lists Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Top Providers */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500">Top Providers</p>
              <Link href="/admin/approved" className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors">View Directory →</Link>
            </div>
            <div className="flex-1">
              {(topProviders || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">No active providers yet</div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {topProviders.map((p, i) => (
                    <Link key={p._id} href={`/admin/providers/${p._id}`} className="flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors group">
                      <span className="text-[10px] font-black text-zinc-300 w-4 text-center">{i + 1}</span>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-sm">
                        {(p.userId?.fullName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900 truncate group-hover:text-black">{p.userId?.fullName || "Unknown"}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 truncate flex items-center gap-1.5">
                          {p.city} <span className="text-zinc-300">•</span> <Star size={10} className="text-amber-400 fill-amber-400" /> {p.rating?.toFixed(1) || "New"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-emerald-600">{p.totalJobsCompleted}</p>
                        <p className="text-[9px] font-bold tracking-widest uppercase text-zinc-400 mt-0.5">Jobs</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500">Recent Applications</p>
              <Link href="/admin/providers" className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors">View Queue →</Link>
            </div>
            <div className="flex-1">
              {recent.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">No pending applications</div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {recent.map(p => {
                    const s = STATUS_CONFIG[p.onboardingStatus] || STATUS_CONFIG.pending_profile;
                    return (
                      <Link key={p._id} href={`/admin/providers/${p._id}`} className="flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-black text-zinc-500 flex-shrink-0 group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-all">
                          {(p.userId?.fullName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 truncate group-hover:text-black">{p.userId?.fullName || "Unknown"}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{p.userId?.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 bg-white border border-zinc-100 px-2.5 py-1.5 rounded-full shadow-sm">
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          <span className="text-[9px] font-bold tracking-widest uppercase text-zinc-600 hidden sm:inline">{s.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
