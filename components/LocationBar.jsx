"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapPin, Navigation, RefreshCw, ChevronDown,
  CheckCircle2, Loader2, AlertCircle, X, Search,
} from "lucide-react";
import {
  detectLocation, refreshLocation, saveLocation, getCachedLocation,
} from "@/lib/location";

const SOURCE_LABEL = {
  gps:      { text: "GPS",     cls: "text-emerald-600" },
  ip:       { text: "Approx.", cls: "text-amber-600"   },
  fallback: { text: "Default", cls: "text-zinc-400"    },
  manual:   { text: "Manual",  cls: "text-blue-600"    },
};

export default function LocationBar({ onLocationChange, compact = false }) {
  const [location, setLocation] = useState(null);
  const [status, setStatus]     = useState("idle");
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const cached = getCachedLocation();
    if (cached) { setLocation(cached); setStatus("done"); onLocationChange?.(cached); return; }
    setStatus("detecting");
    detectLocation().then((loc) => {
      setLocation(loc); setStatus("done"); onLocationChange?.(loc);
    }).catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80); }, [open]);

  const applyLocation = (loc) => {
    saveLocation(loc); setLocation(loc); setOpen(false); setQuery(""); onLocationChange?.(loc);
  };

  const handleRefresh = async () => {
    setRefreshing(true); setOpen(false);
    const loc = await refreshLocation();
    setLocation(loc); setRefreshing(false); onLocationChange?.(loc);
  };

  const handleManual = () => {
    if (!query.trim()) return;
    applyLocation({ city: query.trim(), state: "", lat: null, lng: null, source: "manual" });
  };

  const handleCitySelect = (city) => {
    applyLocation({ city, state: "", lat: null, lng: null, source: "manual" });
  };

  const srcInfo = location ? (SOURCE_LABEL[location.source] || SOURCE_LABEL.fallback) : null;

  /* ── Compact pill (navbar) */
  if (compact) {
    return (
      <div ref={panelRef} className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-black transition-colors group">
          {status === "detecting" || refreshing
            ? <Loader2 size={13} className="animate-spin text-zinc-400" />
            : <MapPin size={13} className="text-zinc-400 group-hover:text-black transition-colors" />}
          <span className="max-w-[100px] truncate">
            {status === "detecting" ? "Detecting…" : (location?.city || "Set location")}
          </span>
          <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && <Panel query={query} setQuery={setQuery} inputRef={inputRef} location={location}
          srcInfo={srcInfo} onManual={handleManual} onRefresh={handleRefresh} refreshing={refreshing}
          setOpen={setOpen} onCitySelect={handleCitySelect} dark={false} />}
      </div>
    );
  }

  /* ── Full banner (hero) */
  return (
    <div ref={panelRef} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)}
        className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200
          ${open ? "bg-white/15 border-white/40 shadow-lg" : "bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30"}`}>
        <div className="flex items-center gap-2">
          {status === "detecting" || refreshing ? (
            <Loader2 size={16} className="animate-spin text-white/60" />
          ) : status === "done" ? (
            <div className="relative">
              <MapPin size={16} className="text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-black" />
            </div>
          ) : (
            <AlertCircle size={16} className="text-amber-400" />
          )}
          <div className="text-left">
            <p className="text-[9px] font-bold tracking-widest uppercase text-white/50 leading-none mb-0.5">
              {status === "detecting" ? "Locating you" : "Delivering to"}
            </p>
            <p className="text-sm font-bold text-white leading-none">
              {status === "detecting" ? "Please wait…"
                : location ? `${location.city}${location.state ? `, ${location.state}` : ""}` : "Set location"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-1">
          {srcInfo && <span className={`text-[9px] font-bold tracking-wider ${srcInfo.cls} opacity-80`}>{srcInfo.text}</span>}
          <ChevronDown size={14} className={`text-white/60 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && <Panel query={query} setQuery={setQuery} inputRef={inputRef} location={location}
        srcInfo={srcInfo} onManual={handleManual} onRefresh={handleRefresh} refreshing={refreshing}
        setOpen={setOpen} onCitySelect={handleCitySelect} dark />}
    </div>
  );
}

/* ── Shared dropdown panel ── */
function Panel({ query, setQuery, inputRef, location, srcInfo,
  onManual, onRefresh, refreshing, setOpen, onCitySelect, dark }) {

  const POPULAR = ["Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Pune","Kolkata","Ahmedabad","Jaipur","Lucknow","Noida","Gurgaon"];
  const filtered = query.trim() ? POPULAR.filter(c => c.toLowerCase().includes(query.toLowerCase())) : POPULAR;

  const bg    = dark ? "bg-zinc-900 border-zinc-700" : "bg-white border-zinc-200";
  const div   = dark ? "border-zinc-700" : "border-zinc-100";
  const btn   = dark ? "hover:bg-zinc-700 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-400 hover:text-black";
  const txt   = dark ? "text-white" : "text-zinc-800";
  const sub   = dark ? "text-zinc-400" : "text-zinc-400";
  const field = dark ? "border-zinc-700 bg-zinc-800 focus-within:border-zinc-400 text-white placeholder:text-zinc-500" : "border-zinc-200 bg-zinc-50 focus-within:border-zinc-900 text-zinc-900 placeholder:text-zinc-400";
  const rowBtn = dark ? "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800" : "border-zinc-200 text-zinc-700 hover:border-zinc-900 hover:bg-zinc-50";
  const cityBtn = (selected) => selected
    ? (dark ? "bg-emerald-600 border-emerald-600 text-white" : "bg-black border-black text-white")
    : (dark ? "border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-white" : "border-zinc-200 text-zinc-600 hover:border-black hover:text-black");

  return (
    <div className={`absolute top-full left-0 mt-2 w-72 rounded-2xl shadow-2xl border z-50 overflow-hidden ${bg}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${div}`}>
        <div>
          <p className={`text-[10px] font-bold tracking-widest uppercase ${sub}`}>Your Location</p>
          {location && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 size={11} className="text-emerald-500" />
              <span className={`text-xs font-semibold ${txt}`}>
                {location.city}{location.state ? `, ${location.state}` : ""}
              </span>
              {srcInfo && <span className={`text-[9px] font-bold ${srcInfo.cls}`}>· {srcInfo.text}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onRefresh} disabled={refreshing} title="Re-detect" className={`p-1.5 rounded-lg transition-colors ${btn}`}>
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setOpen(false)} className={`p-1.5 rounded-lg transition-colors ${btn}`}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* GPS button */}
      <div className="px-4 pt-3 pb-2">
        <button onClick={onRefresh} disabled={refreshing}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${rowBtn}`}>
          <Navigation size={14} className="text-emerald-500" />
          {refreshing ? "Detecting your location…" : "Use my current location"}
        </button>
      </div>

      {/* Search input */}
      <div className="px-4 pb-2">
        <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-colors ${field}`}>
          <Search size={13} className="opacity-50 flex-shrink-0" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onManual()}
            placeholder="Type your city…"
            className="flex-1 text-xs font-medium bg-transparent outline-none" />
          {query && (
            <button onClick={onManual} className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 flex-shrink-0">Set</button>
          )}
        </div>
      </div>

      {/* Popular cities */}
      <div className="px-4 pb-4">
        <p className={`text-[9px] font-bold tracking-widest uppercase mb-2 ${sub}`}>Popular Cities</p>
        <div className="flex flex-wrap gap-1.5">
          {filtered.slice(0, 8).map(city => (
            <button key={city} onClick={() => onCitySelect(city)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border transition-all ${cityBtn(location?.city === city)}`}>
              {city}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
