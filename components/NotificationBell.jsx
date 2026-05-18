"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell, BellRing, CalendarCheck, CheckCheck, CheckCircle2,
  FileText, Navigation, RefreshCw, Users, Wrench, X, Zap,
  UserCheck, Volume2, VolumeX,
} from "lucide-react";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { getSocket } from "@/lib/socket";

// ── Notification tone (Web Audio API — no file needed) ─────────────────────
function playTone() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const schedule = (freq, startAt, dur, vol = 0.22) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(vol, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
      osc.start(startAt);
      osc.stop(startAt + dur);
    };

    const t = ctx.currentTime;
    schedule(1047, t,        0.28); // C6 — first ding
    schedule(784,  t + 0.18, 0.38); // G5 — second dong

    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch {
    // Silent fail — unsupported browser or no user-gesture context
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Per-type icon + colour config
const TYPE_CFG = {
  booking_created:      { Icon: CalendarCheck, bg: "bg-blue-500/20",    ring: "ring-blue-500/25",    icon: "text-blue-300"    },
  new_job_available:    { Icon: Zap,           bg: "bg-emerald-500/20", ring: "ring-emerald-500/25", icon: "text-emerald-300" },
  job_claimed:          { Icon: UserCheck,     bg: "bg-cyan-500/20",    ring: "ring-cyan-500/25",    icon: "text-cyan-300"    },
  provider_on_way:      { Icon: Navigation,    bg: "bg-violet-500/20",  ring: "ring-violet-500/25",  icon: "text-violet-300"  },
  job_started:          { Icon: Wrench,        bg: "bg-orange-500/20",  ring: "ring-orange-500/25",  icon: "text-orange-300"  },
  job_completed:        { Icon: CheckCircle2,  bg: "bg-emerald-500/20", ring: "ring-emerald-500/25", icon: "text-emerald-300" },
  invoice_ready:        { Icon: FileText,      bg: "bg-amber-500/20",   ring: "ring-amber-500/25",   icon: "text-amber-300"   },
  new_provider_onboard: { Icon: Users,         bg: "bg-indigo-500/20",  ring: "ring-indigo-500/25",  icon: "text-indigo-300"  },
};
const FALLBACK_CFG = { Icon: Bell, bg: "bg-zinc-500/20", ring: "ring-zinc-500/25", icon: "text-zinc-400" };

const PANEL_SHADOW = [
  "0 0 0 1px rgba(255,255,255,0.08)",
  "0 0 0 4px rgba(0,0,0,0.2)",
  "0 32px 80px -8px rgba(0,0,0,0.75)",
  "inset 0 1px 0 rgba(255,255,255,0.09)",
  "inset 0 -1px 0 rgba(0,0,0,0.3)",
].join(", ");

// Mute preference stored in localStorage
const MUTE_KEY = "notif_muted";
const isMuted  = () => { try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; } };
const setMuted = (v) => { try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch {} };

// ── Component ──────────────────────────────────────────────────────────────

/**
 * @param {"left"|"right"} align    Panel direction relative to button.
 *   "left"  → panel opens rightward (use when bell is at narrow-panel edge, e.g. was sidebar).
 *   "right" → panel opens leftward  (use when bell is at far-right of screen — default).
 *
 * @param {"dark"|"light"} variant  Bell button colour scheme.
 *   "dark"  → white tones, for dark navbars (mobile headers, booking detail nav).
 *   "light" → dark tones, for white/light topbars (provider & admin desktop topbar).
 */
export default function NotificationBell({ align = "right", variant = "dark" }) {
  const wrapRef = useRef(null);

  const [user,    setUser]    = useState(null);
  const [open,    setOpen]    = useState(false);
  const [items,   setItems]   = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const [pulse,   setPulse]   = useState(false);
  const [muted,   setMutedState] = useState(false);

  // Read mute pref on mount
  useEffect(() => { setMutedState(isMuted()); }, []);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!getStoredUser()) return;
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get("/notifications");
      if (data.success) {
        setItems(data.notifications || []);
        setUnread(data.unreadCount || 0);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setUser(getStoredUser()), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id    = setInterval(load, 30000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [load]);

  useEffect(() => { if (open) load(); }, [open, load]);

  // ── Socket push ────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (n) => {
      setItems((prev) => [n, ...prev.filter((x) => x._id !== n._id)].slice(0, 50));
      setUnread((c) => c + 1);
      setPulse(true);
      setTimeout(() => setPulse(false), 2500);
      if (!isMuted()) playTone();
    };
    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, []);

  // ── Close on outside click / Escape ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey     = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown",     onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown",     onKey);
    };
  }, [open]);

  // ── Actions ────────────────────────────────────────────────────────────
  const markAllRead = async () => {
    await api.put("/notifications/read-all").catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
  };

  const handleClick = async (notification) => {
    if (!notification.readAt) {
      api.put(`/notifications/${notification._id}/read`).catch(() => {});
      setItems((prev) =>
        prev.map((n) => n._id === notification._id ? { ...n, readAt: new Date().toISOString() } : n)
      );
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
  };

  const dismiss = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const target = items.find((n) => n._id === id);
    setItems((prev) => prev.filter((n) => n._id !== id));
    if (target && !target.readAt) setUnread((c) => Math.max(0, c - 1));
    api.delete(`/notifications/${id}`).catch(() => {});
  };

  const hrefFor = (n) => {
    const bookingId = n.bookingId?._id || n.bookingId;
    if (n.type === "new_job_available")    return "/dashboard/provider/orders?view=pool";
    if (n.type === "new_provider_onboard") return `/admin/providers/${n.data?.providerId || ""}`;
    if (!bookingId) return null;
    if (user?.role === "provider") return `/dashboard/provider/orders/${bookingId}`;
    return `/bookings/${bookingId}`;
  };

  const badge = unread > 99 ? "99+" : unread > 9 ? "9+" : String(unread);

  // ── Button styles per variant ──────────────────────────────────────────
  const btnIdle = variant === "light"
    ? "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-900/8"
    : "text-zinc-400 hover:text-white hover:bg-white/10";

  const btnOpen = variant === "light"
    ? "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-300/70 shadow-sm"
    : "bg-white/15 text-white ring-1 ring-white/20 shadow-lg shadow-black/20";

  const badgeBorder = variant === "light" ? "border-white" : "border-zinc-950";

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} className="relative flex-shrink-0">

      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${open ? btnOpen : btnIdle}`}
      >
        <Bell size={17} strokeWidth={1.8} className={pulse ? "bell-wiggle" : ""} />
        {unread > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-[3px] flex items-center justify-center rounded-full text-[8px] font-black text-white leading-none bg-emerald-500 border-[1.5px] ${badgeBorder} shadow-lg shadow-emerald-500/50`}>
            {badge}
          </span>
        )}
      </button>

      {/* Glass panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={`absolute top-full mt-2.5 z-[200] rounded-2xl overflow-hidden w-80 sm:w-96 ${align === "left" ? "left-0" : "right-0"}`}
          style={{
            maxWidth: "calc(100vw - 1rem)",
            background: "linear-gradient(160deg, rgba(22,22,26,0.97) 0%, rgba(9,9,12,0.98) 100%)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            boxShadow: PANEL_SHADOW,
          }}
        >

          {/* Header */}
          <div
            className="px-4 pt-4 pb-3.5 flex items-start justify-between"
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(16,185,129,0.15)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                <BellRing size={13} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[9px] font-black tracking-[0.22em] uppercase text-zinc-500 mb-0.5">Activity Feed</p>
                <p className="text-[13px] font-black text-white leading-tight">
                  {unread > 0
                    ? <><span className="text-emerald-400">{unread}</span>&nbsp;{unread === 1 ? "new update" : "new updates"}</>
                    : "All caught up"
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 mt-0.5">
              {/* Mute toggle */}
              <button
                type="button"
                onClick={toggleMute}
                title={muted ? "Unmute notifications" : "Mute notifications"}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 hover:bg-white/10"
              >
                {muted
                  ? <VolumeX size={13} className="text-red-400" />
                  : <Volume2 size={13} className="text-zinc-500 hover:text-zinc-200" />
                }
              </button>

              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  title="Mark all as read"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-150"
                >
                  <CheckCheck size={11} strokeWidth={2.5} />
                  All read
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-white/10 transition-all duration-150"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: "24rem", scrollbarWidth: "none" }}>

            {/* Loading skeletons */}
            {loading && items.length === 0 && (
              <div>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="w-9 h-9 rounded-xl bg-white/5 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-2.5 bg-white/5 rounded-full animate-pulse w-2/3" />
                      <div className="h-2 bg-white/5 rounded-full animate-pulse" />
                      <div className="h-2 bg-white/5 rounded-full animate-pulse w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <Bell size={20} className="text-red-400" strokeWidth={1.5} />
                </div>
                <p className="text-[13px] font-black text-white mb-1">Failed to load</p>
                <p className="text-[11px] text-zinc-500 mb-5 leading-relaxed">Check your connection and try again.</p>
                <button type="button" onClick={load}
                  className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-zinc-200 hover:text-white px-4 py-2 rounded-full transition-all"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <RefreshCw size={10} /> Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <Bell size={26} className="text-zinc-600" strokeWidth={1.2} />
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  </div>
                </div>
                <p className="text-[13px] font-black text-white mb-1.5">You&apos;re all caught up!</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[200px]">
                  New notifications will appear here when your bookings update.
                </p>
              </div>
            )}

            {/* Notification rows */}
            {!error && items.map((n) => {
              const cfg    = TYPE_CFG[n.type] || FALLBACK_CFG;
              const href   = hrefFor(n);
              const isUnread = !n.readAt;

              const row = (
                <div
                  className={`group relative flex items-start gap-3 px-4 py-3.5 transition-colors duration-150 cursor-pointer
                    ${isUnread ? "bg-emerald-500/[0.04]" : ""} hover:bg-white/[0.04]`}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  {/* Unread left accent */}
                  {isUnread && (
                    <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-emerald-500" />
                  )}

                  {/* Type icon */}
                  <div
                    className={`w-9 h-9 rounded-xl ${cfg.bg} ring-1 ${cfg.ring} flex items-center justify-center shrink-0 mt-0.5`}
                    style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}
                  >
                    <cfg.Icon size={16} className={cfg.icon} strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className={`text-[13px] font-bold leading-snug ${isUnread ? "text-white" : "text-zinc-300"}`}>
                        {n.title}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => dismiss(e, n._id)}
                        aria-label="Dismiss notification"
                        className="notif-dismiss mt-0.5 w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <X size={11} />
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2 mb-1.5">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] font-bold tracking-wide uppercase text-zinc-600">
                        {timeAgo(n.createdAt)}
                      </span>
                      {isUnread && (
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black tracking-widest uppercase text-emerald-600">New</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );

              return href ? (
                <Link key={n._id} href={href} onClick={() => handleClick(n)}>{row}</Link>
              ) : (
                <div key={n._id} role="button" tabIndex={0}
                  onClick={() => handleClick(n)}
                  onKeyDown={(e) => e.key === "Enter" && handleClick(n)}>
                  {row}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}
          >
            <p className="text-[9px] font-bold tracking-widest uppercase text-zinc-700">
              {items.length} notification{items.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3">
              {muted && (
                <span className="text-[9px] font-bold tracking-widest uppercase text-red-600/70 flex items-center gap-1">
                  <VolumeX size={9} /> Sound off
                </span>
              )}
              {loading && items.length > 0 && (
                <div className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase text-zinc-700">
                  <RefreshCw size={9} className="animate-spin" /> Updating…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
