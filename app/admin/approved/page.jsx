"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function AdminApprovedProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [search,    setSearch]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get("/admin/providers/approved");
      if (data.success) setProviders(data.providers || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = providers.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.userId?.fullName?.toLowerCase().includes(q) ||
      p.userId?.email?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q)
    );
  });

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="p-8 md:p-16 font-sans">
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="w-16 h-16 bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-black mb-2">Cannot reach backend</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Make sure the backend is running on <code className="bg-zinc-100 px-1.5 py-0.5 text-xs font-mono">localhost:5050</code>.
        </p>
        <button onClick={load} className="inline-flex items-center gap-2 bg-black text-white px-6 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry
        </button>
      </div>
    </div>
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-8 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="h-8 bg-zinc-200 rounded w-48 animate-pulse mb-8" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 h-24 animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8 md:p-12 font-sans selection:bg-black selection:text-white">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-200 pb-6 mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-1">Admin Panel</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black">Active Providers.</h1>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {providers.length} Active
            </span>
            <button onClick={load} className="p-2 border border-zinc-200 hover:border-black text-zinc-400 hover:text-black transition-colors" title="Refresh">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        {providers.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, or city..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 focus:border-black focus:outline-none text-sm bg-white text-black placeholder:text-zinc-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {search && (
              <p className="text-xs text-zinc-400 mt-2">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-zinc-300 bg-white">
            <svg className="w-10 h-10 text-zinc-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-zinc-400 font-bold tracking-widest uppercase text-xs mb-1">
              {search ? "No results found" : "No active providers yet"}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-3 text-xs font-bold text-black underline underline-offset-2">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((provider) => {
              const services = provider.services || [];
              const uniqueCats = [...new Set(services.map(s => s.category))];
              const avgExp = services.length
                ? (services.reduce((sum, s) => sum + (s.experienceYears || 0), 0) / services.length).toFixed(1)
                : null;

              return (
                <div key={provider._id} className="bg-white border border-zinc-200 hover:border-emerald-300 transition-all duration-200 group">
                  <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">

                    {/* Emerald active stripe */}
                    <div className="hidden md:block w-1 self-stretch rounded-full bg-emerald-500 flex-shrink-0" />

                    {/* Avatar */}
                    <div className="w-10 h-10 bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-extrabold text-zinc-700 flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all">
                      {provider.userId?.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="text-base font-bold tracking-tight text-black">{provider.userId?.fullName || "Unknown"}</h2>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                        {provider.userId?.emailVerified && (
                          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 bg-zinc-100 border border-zinc-200 px-2 py-0.5">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>{provider.userId?.email}</span>
                        {provider.city && <span>📍 {provider.city}</span>}
                        {provider.userId?.phone && <span>📞 {provider.userId.phone}</span>}
                        {provider.onboardingCompletedAt && (
                          <span className="text-zinc-400">
                            Approved {new Date(provider.onboardingCompletedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {uniqueCats.map(cat => (
                          <span key={cat} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-widest border border-zinc-200">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden lg:flex gap-4 flex-shrink-0">
                      {[
                        { label: "Services",    value: services.length       },
                        { label: "Avg Exp",     value: avgExp ? `${avgExp}y` : "—" },
                        { label: "Rating",      value: provider.rating?.toFixed(1) || "—" },
                        { label: "Jobs",        value: provider.totalJobsCompleted || 0 },
                      ].map(s => (
                        <div key={s.label} className="text-center min-w-[52px]">
                          <p className="text-base font-extrabold text-black">{s.value}</p>
                          <p className="text-[9px] font-bold tracking-widest uppercase text-zinc-400">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      <Link href={`/admin/providers/${provider._id}`}>
                        <button className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 bg-white text-xs font-bold tracking-widest uppercase text-zinc-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all group-hover:shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
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
