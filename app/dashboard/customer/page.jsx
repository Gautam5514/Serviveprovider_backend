"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { clearAuthSession, getDashboardPath, getStoredUser } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";
import { Search, Wrench, ShieldCheck, Clock, ArrowRight, Home, Calendar, LogOut } from "lucide-react";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const user = useMemo(() => getStoredUser(), []);
  const initials = (user?.fullName || "C").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "customer") {
      router.replace(getDashboardPath(user.role));
    }
  }, [router, user]);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f7f7f8] font-sans selection:bg-black selection:text-white pb-20">

      {/* ── Navbar ── */}
      <nav className="h-14 flex items-center justify-between px-5 md:px-12 bg-zinc-950 text-white sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2">
          <img 
            src="/logo-transparent.png" 
            alt="ServiceMarket" 
            className="w-6 h-6 object-contain brightness-0 invert" 
          />
          <span className="text-sm font-black tracking-tight">
            Service<span className="text-zinc-500 font-light">Market</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 hover:text-white transition-colors"><NotificationBell /></span>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
            {initials}
          </div>
          <button onClick={handleLogout} className="text-[10px] font-bold tracking-widest uppercase text-red-400 hover:text-red-300 transition-colors hidden sm:block">
            Logout
          </button>
        </div>
      </nav>

      {/* ── Dark Hero Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white pb-16">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",backgroundSize:"32px 32px"}} />
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative px-6 md:px-12 py-16 max-w-5xl mx-auto text-center">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-emerald-400 mb-3">Customer Portal</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
            Welcome back, {user.fullName?.split(" ")[0]}
          </h1>
          <p className="text-base text-zinc-400 max-w-xl mx-auto mb-8">
            Browse verified top-tier service providers, compare rates transparently, and book the right expert for your home instantly.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/provider" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 text-zinc-950 px-8 py-4 rounded-full text-xs font-black tracking-widest uppercase hover:bg-emerald-400 hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Search size={14} strokeWidth={2.5} /> Browse Providers
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="px-6 md:px-12 -mt-8 max-w-5xl mx-auto relative z-10">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[
            { title: "Verified Experts", desc: "Every provider undergoes strict KYC & skill checks.", icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-50" },
            { title: "Instant Booking", desc: "No waiting. Confirm your job and get real-time tracking.", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
            { title: "Premium Service", desc: "Top-rated professionals equipped with their own tools.", icon: Wrench, color: "text-violet-500", bg: "bg-violet-50" },
          ].map((feature, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm hover:border-zinc-300 hover:shadow-md transition-all duration-300 group">
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon size={20} className={feature.color} />
              </div>
              <h3 className="text-base font-black text-zinc-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-zinc-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-zinc-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-1">Your Bookings</p>
            <p className="text-xl font-black text-zinc-900 mb-2">Track Active Services</p>
            <p className="text-sm text-zinc-500">View upcoming scheduled jobs and track provider location.</p>
          </div>
          <Link href="/bookings" className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-black hover:shadow-lg transition-all duration-300 group whitespace-nowrap">
            View Bookings <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 sm:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          <Link href="/" className="flex flex-col items-center gap-1 flex-1 py-2 text-zinc-400 hover:text-black transition-colors">
            <Home size={19} strokeWidth={1.8} />
            <span className="text-[9px] font-bold tracking-wide">Home</span>
          </Link>
          <Link href="/services/ac" className="flex flex-col items-center gap-1 flex-1 py-2 text-zinc-400 hover:text-black transition-colors">
            <Search size={19} strokeWidth={1.8} />
            <span className="text-[9px] font-bold tracking-wide">Browse</span>
          </Link>
          <Link href="/bookings" className="flex flex-col items-center gap-1 flex-1 py-2 text-zinc-400 hover:text-black transition-colors">
            <Calendar size={19} strokeWidth={1.8} />
            <span className="text-[9px] font-bold tracking-wide">Bookings</span>
          </Link>
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 flex-1 py-2 text-red-400 hover:text-red-500 transition-colors">
            <LogOut size={19} strokeWidth={1.8} />
            <span className="text-[9px] font-bold tracking-wide">Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
