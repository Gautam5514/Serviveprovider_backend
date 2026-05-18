"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { getStoredUser, clearAuthSession } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";
import SmartSearch from "@/components/SmartSearch";
import { LayoutDashboard, Users, CheckCircle2, LogOut, Wrench, Tag } from "lucide-react";

const navItems = [
  { name: "Dashboard",    href: "/admin",           icon: LayoutDashboard },
  { name: "Applications", href: "/admin/providers", icon: Users },
  { name: "Approved",     href: "/admin/approved",  icon: CheckCircle2 },
  { name: "Services",     href: "/admin/services",  icon: Wrench },
  { name: "Coupons",      href: "/admin/coupons",   icon: Tag },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } }, []);
  const initials = (user?.fullName || "A").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  useEffect(() => {
    const id = setTimeout(() => {
      setIsClient(true);
      const u = getStoredUser();
      if (!u || u.role !== "admin") {
        router.replace("/login");
      }
    }, 0);
    return () => clearTimeout(id);
  }, [router]);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  if (!isClient) return null;

  return (
    <div className="flex h-screen bg-[#f7f7f8] text-black font-sans selection:bg-black selection:text-white">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-zinc-950 flex flex-col hidden md:flex z-20 flex-shrink-0">
        
        {/* Brand header */}
        <div className="h-16 flex items-center px-5 border-b border-white/[0.06] flex-shrink-0 gap-2.5">
          <img 
            src="/logo-transparent.png" 
            alt="ServiceMarket" 
            className="w-7 h-7 object-contain brightness-0 invert" 
          />
          <span className="text-sm font-black tracking-tight text-white">
            Service<span className="text-zinc-500 font-light">Market</span>
            <span className="ml-2 text-[8px] font-bold tracking-[0.2em] uppercase bg-white/10 text-white/70 px-1.5 py-0.5 rounded">Admin</span>
          </span>
        </div>

        {/* Admin avatar pill */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.fullName || "Administrator"}</p>
              <p className="text-[9px] font-bold tracking-widest uppercase text-indigo-400">Superuser</p>
            </div>
          </div>
        </div>
        
        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-150 ${
                  isActive 
                    ? "bg-white text-black shadow-sm" 
                    : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                }`}>
                <item.icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.06]">
          <button onClick={handleLogout} 
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[11px] font-bold text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150">
            <LogOut size={15} strokeWidth={1.8} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative min-w-0">
        <div className="hidden md:flex sticky top-0 z-30 h-16 items-center gap-4 border-b border-zinc-200 bg-white/95 px-6 backdrop-blur-sm">
          <div className="shrink-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">Admin control</p>
            <p className="text-sm font-black text-zinc-950 whitespace-nowrap">Customers · Providers · Revenue</p>
          </div>
          <SmartSearch role="admin" compact className="flex-1" />
          {/* Right: bell + divider + avatar + logout */}
          <div className="flex items-center gap-3 shrink-0">
            <NotificationBell variant="light" />
            <div className="w-px h-5 bg-zinc-200" />
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="text-[10px] font-bold tracking-widest uppercase text-red-500 hover:text-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden bg-zinc-950 px-4 py-3 sticky top-0 z-30 space-y-3">
          <div className="h-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src="/logo-transparent.png" 
                alt="ServiceMarket" 
                className="w-6 h-6 object-contain brightness-0 invert" 
              />
              <span className="text-sm font-black text-white tracking-tight">
                Service<span className="text-zinc-500 font-light">Market</span>
                <span className="ml-2 text-[8px] font-bold tracking-[0.2em] uppercase bg-white/10 text-white/70 px-1.5 py-0.5 rounded">Admin</span>
              </span>
            </div>
            <span className="text-zinc-400"><NotificationBell /></span>
          </div>
          <SmartSearch role="admin" />
        </div>

        <div className="pb-16 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-white/[0.06]">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-colors ${
                  isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                <item.icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
                <span className="text-[9px] font-bold tracking-wide">{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={19} strokeWidth={1.8} />
            <span className="text-[9px] font-bold tracking-wide">Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
