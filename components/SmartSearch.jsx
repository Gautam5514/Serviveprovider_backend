"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import {
  AlertCircle,
  BriefcaseBusiness,
  ClipboardCheck,
  CreditCard,
  History,
  MousePointer2,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

// ─── Role config ───────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  customer: {
    label:       "Smart Search",
    placeholder: "Search services, bookings, status, city…",
    endpoint:    "/search",
    chips:       ["AC repair", "Fan install", "completed", "today"],
  },
  provider: {
    label:       "Provider Search",
    placeholder: "Search orders, customers, status, payment…",
    endpoint:    "/search",
    chips:       ["completed", "in progress", "cash", "today"],
  },
  admin: {
    label:       "Admin Search",
    placeholder: "Search users, providers, bookings, dates…",
    endpoint:    "/search",
    chips:       ["pending", "approved", "today", "cash"],
  },
  public: {
    label:       "Service Search",
    placeholder: "AC repair, fridge, fan, electrician…",
    endpoint:    "/search/public",
    chips:       ["AC repair", "Fridge repair", "Fan install", "TV mounting"],
  },
};

// ─── Result type icon map ──────────────────────────────────────────────────────

const TYPE_ICON = {
  service:          Wrench,
  booking:          BriefcaseBusiness,
  provider:         ShieldCheck,
  provider_service: ClipboardCheck,
  customer:         UserRound,
  admin:            UserRound,
  user:             UserRound,
  payment:          CreditCard,
};

// ─── Recent search history (localStorage) ─────────────────────────────────────

const HISTORY_KEY = "sm_recent_searches";
const MAX_HISTORY = 5;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function pushHistory(q) {
  if (!q || q.length < 2) return;
  const next = [q, ...loadHistory().filter(h => h !== q)].slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
}
function wipeHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Converts "provider_service" → "Provider Service"
function formatType(type = "") {
  return type
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SmartSearch({ role: roleProp, compact = false, className = "" }) {
  const router   = useRouter();
  const boxRef   = useRef(null);
  const inputRef = useRef(null);
  // Holds the AbortController for the current in-flight request.
  const abortRef = useRef(null);

  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
  const [open,      setOpen]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [hasError,  setHasError]  = useState(false);   // distinct from "no results"
  const [activeIdx, setActiveIdx] = useState(-1);       // -1 = nothing highlighted
  const [history,   setHistory]   = useState([]);

  const role = useMemo(
    () => roleProp || getStoredUser()?.role || "public",
    [roleProp],
  );
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.public;

  // ── Load history from localStorage once on mount ──────────────────────────
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // ── Abort in-flight request on component unmount ──────────────────────────
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  // ── Debounced search with AbortController ─────────────────────────────────
  useEffect(() => {
    const trimmed = query.trim();

    // Below minimum — cancel any pending work and clear state.
    if (trimmed.length < 2) {
      abortRef.current?.abort();
      abortRef.current = null;
      setResults([]);
      setLoading(false);
      setHasError(false);
      return;
    }

    let stale = false;

    const timer = setTimeout(async () => {
      // Cancel previous request before firing a new one.
      abortRef.current?.abort();
      const controller   = new AbortController();
      abortRef.current   = controller;

      setLoading(true);
      setHasError(false);

      try {
        const { data } = await api.get(cfg.endpoint, {
          params: { q: trimmed },
          signal: controller.signal,
        });

        if (!stale) {
          setResults(data.results || []);
          setActiveIdx(-1);
        }
      } catch (err) {
        if (stale) return;
        // Aborted requests are not errors — just ignore them silently.
        if (
          err.name     === "CanceledError" ||
          err.name     === "AbortError"    ||
          err.code     === "ERR_CANCELED"
        ) return;

        setResults([]);
        setHasError(true);
      } finally {
        if (!stale) setLoading(false);
      }
    }, 220);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, cfg.endpoint]);

  // ── Choose a result ───────────────────────────────────────────────────────
  const choose = useCallback((item) => {
    pushHistory(query.trim());
    setHistory(loadHistory());
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIdx(-1);
    if (item?.href) router.push(item.href);
  }, [query, router]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const onKeyDown = useCallback((e) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) {
        choose(results[activeIdx]);
      } else if (query.trim().length >= 2) {
        pushHistory(query.trim());
        setHistory(loadHistory());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }, [open, results, activeIdx, query, choose]);

  // ── Chip / history click ──────────────────────────────────────────────────
  const applyChip = (text) => {
    setQuery(text);
    setOpen(true);
    setActiveIdx(-1);
    inputRef.current?.focus();
  };

  const onClearHistory = (e) => {
    e.stopPropagation();
    wipeHistory();
    setHistory([]);
  };

  // ── Derived display flags ─────────────────────────────────────────────────
  const hasQuery    = query.trim().length >= 2;
  const showChips   = !hasQuery && cfg.chips.length > 0;
  const showHistory = !hasQuery && history.length > 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={boxRef}
      className={`relative ${compact ? "w-full max-w-xl" : "w-full max-w-3xl"} ${className}`}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      {/* ── Search pill ──────────────────────────────────────────────────── */}
      <div className="relative rounded-full bg-gradient-to-b from-zinc-700 via-zinc-950 to-black p-[2px] shadow-[0_12px_28px_rgba(0,0,0,0.22),inset_0_2px_4px_rgba(255,255,255,0.18)]">
        <div className="relative rounded-full bg-white shadow-[inset_0_2px_5px_rgba(0,0,0,0.16)]">

          {/* Search icon button */}
          <div className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-950 text-white shadow-[0_4px_12px_rgba(0,0,0,0.35)] md:h-11 md:w-11">
            <Search size={compact ? 19 : 22} strokeWidth={2.8} />
          </div>

          <input
            ref={inputRef}
            role="searchbox"
            aria-label={cfg.label}
            aria-autocomplete="list"
            aria-controls="sm-results"
            aria-activedescendant={activeIdx >= 0 ? `sm-result-${activeIdx}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActiveIdx(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={cfg.placeholder}
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-full bg-transparent pl-14 pr-14 text-sm font-black text-zinc-900 outline-none placeholder:text-zinc-400 md:h-14 md:pl-16 md:pr-16 md:text-base"
          />

          {/* Clear (×) or cursor icon on the right */}
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setResults([]);
                setHasError(false);
                setActiveIdx(-1);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            >
              <X size={18} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Open search"
              onClick={() => { setOpen(true); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rotate-[-18deg] text-zinc-500 drop-shadow-[0_4px_2px_rgba(0,0,0,0.25)] hover:text-black transition-colors"
            >
              <MousePointer2 size={compact ? 27 : 31} fill="currentColor" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {/* ── Dropdown panel ───────────────────────────────────────────────── */}
      {open && (
        <div
          id="sm-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">
                {cfg.label}
              </p>
              {hasQuery && !loading && !hasError && results.length > 0 && (
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Quick-access chips (shown when query is empty) */}
            {showChips && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {cfg.chips.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => applyChip(chip)}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:border-black hover:text-black transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div className="max-h-96 overflow-y-auto overscroll-contain">

            {/* ── Skeleton rows while loading ──────────────────────────── */}
            {loading && (
              <div className="p-2 space-y-0.5">
                {[70, 55, 80].map((w, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div
                        className="h-3 bg-zinc-100 animate-pulse rounded-full"
                        style={{ width: `${w}%` }}
                      />
                      <div
                        className="h-2.5 bg-zinc-100 animate-pulse rounded-full"
                        style={{ width: `${w - 20}%` }}
                      />
                    </div>
                    <div className="w-14 h-4 bg-zinc-100 animate-pulse rounded-full shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {/* ── API error state ───────────────────────────────────────── */}
            {!loading && hasError && (
              <div className="px-4 py-10 text-center">
                <AlertCircle size={26} className="text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-black text-zinc-900 mb-1">Search unavailable</p>
                <p className="text-xs font-medium text-zinc-400 max-w-[220px] mx-auto">
                  Could not reach the server. Check your connection and try again.
                </p>
              </div>
            )}

            {/* ── No results ────────────────────────────────────────────── */}
            {!loading && !hasError && hasQuery && results.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Sparkles size={26} className="text-zinc-200 mx-auto mb-3" />
                <p className="text-sm font-black text-zinc-900 mb-1">
                  No results for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs font-medium text-zinc-400 max-w-[240px] mx-auto leading-relaxed">
                  Try a service name, booking number, city, or status like
                  &ldquo;completed&rdquo;, &ldquo;today&rdquo;, &ldquo;cash&rdquo;.
                </p>
              </div>
            )}

            {/* ── Recent search history ─────────────────────────────────── */}
            {!loading && !hasError && !hasQuery && showHistory && (
              <div>
                <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    <History size={10} /> Recent
                  </p>
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="p-2">
                  {history.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => applyChip(h)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-50 transition-colors text-left"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-400">
                        <History size={13} />
                      </span>
                      <span className="text-sm font-semibold text-zinc-700 truncate">{h}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Results list ──────────────────────────────────────────── */}
            {!loading && !hasError && results.map((item, idx) => {
              const Icon     = TYPE_ICON[item.type] || Search;
              const isActive = idx === activeIdx;

              const inner = (
                <div
                  id={`sm-result-${idx}`}
                  role="option"
                  aria-selected={isActive}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                    isActive
                      ? "bg-zinc-950 text-white"
                      : "hover:bg-zinc-50 text-zinc-900"
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    isActive
                      ? "border-white/10 bg-white/10 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-500"
                  }`}>
                    <Icon size={15} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{item.label}</span>
                    {item.meta && (
                      <span className={`mt-0.5 block truncate text-xs font-semibold ${
                        isActive ? "text-white/55" : "text-zinc-400"
                      }`}>
                        {item.meta}
                      </span>
                    )}
                  </span>

                  <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest ${
                    isActive ? "bg-white/10 text-white/70" : "bg-zinc-100 text-zinc-400"
                  }`}>
                    {formatType(item.type)}
                  </span>
                </div>
              );

              return item.href ? (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  onClick={() => choose(item)}
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={`${item.type}-${item.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => choose(item)}
                  onKeyDown={e => e.key === "Enter" && choose(item)}
                >
                  {inner}
                </div>
              );
            })}
          </div>

          {/* ── Footer: keyboard hints + position counter ─────────────── */}
          {hasQuery && !loading && results.length > 0 && (
            <div className="border-t border-zinc-100 px-4 py-2 flex items-center gap-3">
              <span className="text-[9px] font-bold tracking-widest uppercase text-zinc-400">
                ↑↓ navigate · Enter select · Esc close
              </span>
              {activeIdx >= 0 && (
                <span className="ml-auto text-[9px] font-bold text-zinc-500">
                  {activeIdx + 1} / {results.length}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
