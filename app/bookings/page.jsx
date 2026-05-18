"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { CATEGORY_META, formatPrice } from "@/lib/services";
import SmartSearch from "@/components/SmartSearch";
import { Calendar, Clock, MapPin, Wrench, Home, Search, ArrowLeft } from "lucide-react";

const STATUS_CONFIG = {
  pending:          { label: "Finding Provider", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500"   },
  accepted:         { label: "Confirmed",         bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500"    },
  provider_on_way:  { label: "On The Way",        bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500 animate-pulse" },
  in_progress:      { label: "In Progress",       bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-500 animate-pulse" },
  completed:        { label: "Completed",         bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  cancelled:        { label: "Cancelled",         bg: "bg-zinc-100",   text: "text-zinc-500",    border: "border-zinc-200",    dot: "bg-zinc-400"    },
  disputed:         { label: "Disputed",          bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500"     },
};

const TABS = [
  { key: "all",      label: "All"        },
  { key: "active",   label: "Active"     },
  { key: "completed",label: "Completed"  },
  { key: "cancelled",label: "Cancelled"  },
];

function isActive(status) { return ["pending","accepted","provider_on_way","in_progress"].includes(status); }

export default function MyBookingsPage() {
  const router  = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [tab,      setTab]      = useState("all");

  const load = useCallback(async () => {
    const user = getStoredUser();
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "customer") { router.replace("/dashboard/provider"); return; }
    setLoading(true); setError(false);
    try {
      const { data } = await api.get("/bookings/my");
      if (data.success) setBookings(data.bookings || []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const visible = bookings.filter(b => {
    if (tab === "active")    return isActive(b.status);
    if (tab === "completed") return b.status === "completed";
    if (tab === "cancelled") return ["cancelled","disputed"].includes(b.status);
    return true;
  });

  const counts = {
    all:       bookings.length,
    active:    bookings.filter(b => isActive(b.status)).length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => ["cancelled","disputed"].includes(b.status)).length,
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-black selection:text-white pb-16 sm:pb-0">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-5 min-h-14 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-zinc-400 hover:text-black transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <img 
                src="/logo-transparent.png" 
                alt="ServiceMarket" 
                className="w-6 h-6 object-contain" 
              />
              <span className="text-base font-extrabold tracking-tight text-black">
                Service<span className="font-light text-zinc-500">Market</span>
              </span>
            </Link>
            <span className="hidden sm:inline text-zinc-200">|</span>
            <span className="hidden sm:block text-[10px] font-bold tracking-widest uppercase text-zinc-500">My Bookings</span>
          </div>
          <SmartSearch role="customer" compact className="sm:ml-auto w-full sm:flex-1" />
        </div>
      </nav>

      {/* Premium Header */}
      <div className="bg-zinc-950 text-white pb-14 pt-10 px-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-2">Order History</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">My Bookings</h1>
          </div>
          <Link href="/" className="inline-flex items-center justify-center bg-white text-black px-7 py-3.5 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-200 transition-colors shadow-xl">
            + Book Service
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 pb-16">
        
        {/* Floating Tabs */}
        <div className="-mt-7 relative z-20 mb-8">
          <div className="bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-sm flex overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all whitespace-nowrap ${tab === t.key ? "bg-black text-white shadow-md" : "text-zinc-500 hover:text-black hover:bg-zinc-50"}`}>
                {t.label}
                <span className={`px-2 py-0.5 rounded-full text-[9px] ${tab === t.key ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-center py-20 bg-white border border-red-100 rounded-2xl">
            <p className="text-red-500 font-bold tracking-widest uppercase text-xs mb-4">Failed to load bookings</p>
            <button onClick={load} className="bg-red-500 text-white px-6 py-2.5 text-[10px] font-bold tracking-widest uppercase hover:bg-red-600 transition-colors rounded-full">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_,i) => <div key={i} className="bg-white border border-zinc-200 rounded-2xl h-32 animate-pulse" />)}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-zinc-300 rounded-2xl">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
              <Calendar size={24} className="text-zinc-300" />
            </div>
            <p className="text-zinc-400 font-bold tracking-widest uppercase text-xs mb-4">No bookings found</p>
            <Link href="/" className="bg-black text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors shadow-md">Browse Services</Link>
          </div>
        )}

        {/* List */}
        {!loading && !error && visible.length > 0 && (
          <div className="space-y-4">
            {visible.map(b => {
              const st   = STATUS_CONFIG[b.status] || STATUS_CONFIG.cancelled;
              const meta = CATEGORY_META[b.serviceCategory];
              const scheduledDate = new Date(b.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              const slotLabel = b.scheduledTimeSlot
                ? new Date(`2000-01-01T${b.scheduledTimeSlot}`).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                : "";

              return (
                <Link key={b._id} href={`/bookings/${b._id}`} className="block group">
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 md:p-6 hover:border-black hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row gap-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-zinc-200 group-hover:bg-black transition-colors" />
                    
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-black group-hover:border-black transition-all duration-300 shadow-sm">
                      {meta ? <meta.icon size={22} className="text-zinc-400 group-hover:text-white transition-colors" /> : <Wrench size={22} className="text-zinc-400 group-hover:text-white transition-colors" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                        <p className="text-[9px] font-bold text-zinc-400 tracking-widest uppercase">{b.bookingNumber}</p>
                      </div>
                      <h3 className="font-extrabold text-black text-lg mb-2.5 truncate">{b.serviceName}</h3>
                      <div className="flex flex-wrap gap-y-2 gap-x-5">
                        <p className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
                          <Calendar size={13} className="text-zinc-400" /> {scheduledDate} {slotLabel && <><span className="text-zinc-300">·</span><Clock size={13} className="text-zinc-400" /> {slotLabel}</>}
                        </p>
                        <p className="text-xs font-semibold text-zinc-500 truncate flex items-center gap-1.5 max-w-[200px] md:max-w-xs">
                          <MapPin size={13} className="text-zinc-400 shrink-0" /> <span className="truncate">{b.address?.text}</span>
                        </p>
                      </div>
                    </div>

                    {/* Price + arrow */}
                    <div className="flex items-center justify-between md:flex-col md:items-end md:justify-center border-t border-zinc-100 md:border-0 pt-4 md:pt-0 mt-2 md:mt-0 shrink-0">
                      <p className="text-xl md:text-2xl font-black text-black">{formatPrice(b.pricing?.totalAmount || 0)}</p>
                      <div className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:border-black group-hover:text-white transition-all mt-2 hidden md:flex">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200">
        <div className="flex items-center justify-around h-16 px-2">
          <Link href="/" className="flex flex-col items-center gap-1 flex-1 py-2 text-zinc-400 hover:text-black transition-colors">
            <Home size={19} strokeWidth={1.8} />
            <span className="text-[9px] font-bold tracking-wide">Home</span>
          </Link>
          <Link href="/services/ac" className="flex flex-col items-center gap-1 flex-1 py-2 text-zinc-400 hover:text-black transition-colors">
            <Search size={19} strokeWidth={1.8} />
            <span className="text-[9px] font-bold tracking-wide">Browse</span>
          </Link>
          <Link href="/bookings" className="flex flex-col items-center gap-1 flex-1 py-2 text-black transition-colors">
            <Calendar size={19} strokeWidth={2.3} />
            <span className="text-[9px] font-bold tracking-wide">Bookings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
