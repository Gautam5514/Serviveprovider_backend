"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, clearAuthSession } from "@/lib/auth";
import { CATEGORY_META, SERVICE_CATALOG, formatPrice } from "@/lib/services";
import LocationBar from "@/components/LocationBar";
import SmartSearch from "@/components/SmartSearch";
import NotificationBell from "@/components/NotificationBell";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Fan,
  MapPin,
  Monitor,
  Plug,
  Quote,
  Refrigerator,
  Repeat2,
  Search,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";

// ─── Static data ───────────────────────────────────────────────────────────────

const STATS = [
  { value: "50,000+", label: "Bookings Done",    Icon: CalendarCheck },
  { value: "2,000+",  label: "Verified Pros",    Icon: BadgeCheck    },
  { value: "4.8★",    label: "Avg. Rating",      Icon: Star          },
  { value: "25+",     label: "Cities",           Icon: MapPin        },
];

const STEPS = [
  {
    Icon: Search,
    title: "Pick a service",
    desc: "Browse our catalog or search — AC repair, wiring, fridge, fan. Everything's listed with upfront pricing.",
  },
  {
    Icon: CalendarCheck,
    title: "Choose a slot",
    desc: "Pick a date and time that works for you. We confirm instantly and send email reminders.",
  },
  {
    Icon: BadgeCheck,
    title: "Job done, then pay",
    desc: "A verified professional arrives, completes the work. You only pay after you're satisfied.",
  },
];

const TRUST = [
  {
    Icon:  ShieldCheck,
    label: "KYC Verified",
    desc:  "Every professional passes Aadhaar, PAN and background verification before joining.",
    tint:  "bg-emerald-50 border-emerald-200 text-emerald-600",
  },
  {
    Icon:  Star,
    label: "Top Rated Only",
    desc:  "We maintain a strict 4.2-star floor. Below that, providers are removed.",
    tint:  "bg-amber-50 border-amber-200 text-amber-600",
  },
  {
    Icon:  CreditCard,
    label: "Pay After Service",
    desc:  "Cash or UPI — after the job is done. Zero advance payment, zero risk.",
    tint:  "bg-sky-50 border-sky-200 text-sky-600",
  },
  {
    Icon:  Repeat2,
    label: "Re-book Instantly",
    desc:  "Loved your pro? One-tap re-booking from your order history.",
    tint:  "bg-violet-50 border-violet-200 text-violet-600",
  },
];

const TESTIMONIALS = [
  {
    name:    "Priya Sharma",
    city:    "Mumbai",
    rating:  5,
    avatar:  "PS",
    service: "AC Repair",
    text:    "Booked at 10 PM, technician was at my door by 9 AM. Fixed in under an hour. Pricing was exactly as shown — no hidden charges.",
  },
  {
    name:    "Rahul Verma",
    city:    "Bangalore",
    rating:  5,
    avatar:  "RV",
    service: "Electrical Work",
    text:    "Had an electrical fault for weeks. The ServiceMarket technician diagnosed and fixed it in 30 minutes. Clean work, zero mess.",
  },
  {
    name:    "Anjali Mehra",
    city:    "Delhi",
    rating:  5,
    avatar:  "AM",
    service: "AC Deep Cleaning",
    text:    "AC deep cleaning was incredibly thorough. Punctual, courteous, and my unit runs like new. Already re-booked for next season.",
  },
];

const CITIES = [
  "Mumbai","Delhi","Bangalore","Hyderabad","Chennai",
  "Pune","Kolkata","Ahmedabad","Jaipur","Lucknow","Noida","Gurgaon",
];

// Each `wiki` field is the Wikipedia article title — CityImage fetches the correct
// photo from the Wikipedia REST API at runtime, so URLs never go stale.
const CITY_LANDMARKS = {
  Mumbai:    { label: "Mumbai",    state: "Maharashtra",   gradient: "bg-blue-950",    images: [{ landmark: "Gateway of India",   wiki: "Gateway_of_India"                   }, { landmark: "Marine Drive",        wiki: "Marine_Drive,_Mumbai"                }] },
  Delhi:     { label: "New Delhi", state: "Delhi",         gradient: "bg-zinc-900",    images: [{ landmark: "India Gate",          wiki: "India_Gate"                         }, { landmark: "Red Fort",            wiki: "Red_Fort"                            }] },
  Bangalore: { label: "Bengaluru", state: "Karnataka",     gradient: "bg-emerald-950", images: [{ landmark: "Vidhana Soudha",     wiki: "Vidhana_Soudha"                     }, { landmark: "Lalbagh Gardens",     wiki: "Lalbagh_Botanical_Garden"            }] },
  Hyderabad: { label: "Hyderabad", state: "Telangana",     gradient: "bg-amber-950",   images: [{ landmark: "Charminar",           wiki: "Charminar"                          }, { landmark: "Golconda Fort",       wiki: "Golconda_Fort"                       }] },
  Chennai:   { label: "Chennai",   state: "Tamil Nadu",    gradient: "bg-orange-950",  images: [{ landmark: "Marina Beach",        wiki: "Marina_Beach"                       }, { landmark: "Kapaleeshwarar",      wiki: "Kapaleeshwarar_temple"               }] },
  Pune:      { label: "Pune",      state: "Maharashtra",   gradient: "bg-slate-900",   images: [{ landmark: "Shaniwar Wada",       wiki: "Shaniwar_Wada"                      }, { landmark: "Aga Khan Palace",     wiki: "Aga_Khan_Palace"                     }] },
  Kolkata:   { label: "Kolkata",   state: "West Bengal",   gradient: "bg-indigo-950",  images: [{ landmark: "Victoria Memorial",   wiki: "Victoria_Memorial,_Kolkata"         }, { landmark: "Howrah Bridge",       wiki: "Howrah_Bridge"                       }] },
  Ahmedabad: { label: "Ahmedabad", state: "Gujarat",       gradient: "bg-yellow-950",  images: [{ landmark: "Adalaj Stepwell",     wiki: "Adalaj"                             }, { landmark: "Sabarmati Ashram",    wiki: "Sabarmati_Ashram"                    }] },
  Jaipur:    { label: "Jaipur",    state: "Rajasthan",     gradient: "bg-rose-950",    images: [{ landmark: "Hawa Mahal",           wiki: "Hawa_Mahal"                         }, { landmark: "Amber Fort",          wiki: "Amer_Fort"                           }] },
  Lucknow:   { label: "Lucknow",   state: "Uttar Pradesh", gradient: "bg-teal-950",    images: [{ landmark: "Bara Imambara",        wiki: "Bara_Imambara"                      }, { landmark: "Rumi Darwaza",        wiki: "Rumi_Darwaza"                        }] },
  Noida:     { label: "Noida",     state: "Uttar Pradesh", gradient: "bg-violet-950",  images: [{ landmark: "Akshardham Temple",    wiki: "Swaminarayan_Akshardham_(Delhi)"    }, { landmark: "Okhla Bird Sanctuary",wiki: "Okhla_Bird_Sanctuary"                }] },
  Gurgaon:   { label: "Gurugram",  state: "Haryana",       gradient: "bg-fuchsia-950", images: [{ landmark: "Kingdom of Dreams",    wiki: "Kingdom_of_Dreams"                  }, { landmark: "Sultanpur Lake",      wiki: "Sultanpur_National_Park"             }] },
};

const DEFAULT_GRID_CITIES = ["Delhi", "Mumbai", "Bangalore", "Hyderabad"];

const PROVIDER_PERKS = [
  { Icon: TrendingUp, text: "Earn ₹800–₹2,500 per job"        },
  { Icon: Users,      text: "Steady inbound customer flow"     },
  { Icon: Briefcase,  text: "Work your own hours & days"       },
  { Icon: ShieldCheck,text: "Platform backs every booking"     },
];

const EARNINGS = [
  { role: "AC Technician",       rate: "18–22 jobs / mo", earn: "₹18K–₹25K" },
  { role: "Electrician",         rate: "20–28 jobs / mo", earn: "₹15K–₹22K" },
  { role: "Appliance Repair Pro",rate: "15–20 jobs / mo", earn: "₹12K–₹18K" },
];

const CATEGORY_ICONS = {
  ac:        Snowflake,
  cooler:    Wind,
  fan:       Fan,
  tv:        Monitor,
  fridge:    Refrigerator,
  electrical:Zap,
  appliance: Plug,
};

// ─── Small reusable atoms ──────────────────────────────────────────────────────

function Stars({ n = 5, size = 10 }) {
  return (
    <span className="inline-flex gap-0.5">
      {[0,1,2,3,4].map(i => (
        <Star key={i} size={size} strokeWidth={0}
          className={i < n ? "fill-amber-400 text-amber-400" : "fill-zinc-200 text-zinc-200"} />
      ))}
    </span>
  );
}

function Overline({ children, light = false }) {
  return (
    <p className={`text-[10px] font-bold tracking-[0.28em] uppercase mb-3 flex items-center gap-2 ${light ? "text-white/30" : "text-zinc-400"}`}>
      <span className="w-5 h-px bg-current opacity-60 shrink-0" />
      {children}
    </p>
  );
}

// ─── Wikipedia image cache (module-level — survives re-renders) ────────────────
const _wikiCache = {};

// Fetches the Wikipedia article summary and returns a usable thumbnail URL.
// Bumps thumbnail width to 800px for crisp display in the grid.
async function fetchWikiImg(articleTitle) {
  if (_wikiCache[articleTitle] !== undefined) return _wikiCache[articleTitle];

  try {
    const res  = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();

    // Prefer thumbnail enlarged to 800px; fall back to originalimage (full-res).
    const thumb = data.thumbnail?.source
      ? data.thumbnail.source.replace(/\/\d+px-/, "/800px-")
      : null;
    const url = thumb || data.originalimage?.source || null;

    _wikiCache[articleTitle] = url;
    return url;
  } catch {
    _wikiCache[articleTitle] = null;
    return null;
  }
}

// ─── CityImage ─────────────────────────────────────────────────────────────────
// Fetches the correct landmark photo from the Wikipedia REST API.
// - Free, CORS-enabled, no API key.
// - Module-level cache so switching back to a city never re-fetches.
// - All setState calls are in async callbacks (never synchronously in the effect body).
function CityImage({ wiki, landmark, cityLabel, gradient }) {
  // null = in-flight | string = resolved URL | false = failed
  const [fetchResult, setFetchResult] = useState(null);

  useEffect(() => {
    if (!wiki) return; // "failed" derived during rendering — no synchronous setState here

    let cancelled = false;

    fetchWikiImg(wiki).then(url => {
      // Only async callbacks reach this — linter is satisfied.
      if (!cancelled) setFetchResult(url || false);
    });

    // Cleanup: cancel the in-flight promise and reset to "loading" for the next city.
    return () => {
      cancelled = true;
      setFetchResult(null);
    };
  }, [wiki]);

  // All status is derived during render — no synchronous setState needed.
  const isLoading = !!wiki && fetchResult === null;
  const ready     = typeof fetchResult === "string" && fetchResult.length > 0;
  const failed    = !wiki || fetchResult === false;
  const imgUrl    = ready ? fetchResult : null;

  return (
    <div className={`relative w-full h-full overflow-hidden ${ready ? "bg-zinc-900" : (gradient || "bg-zinc-900")}`}>

      {/* Skeleton pulse while fetching */}
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}

      {/* Diagonal hatch for gradient-only / failed cells */}
      {failed && (
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }} />
      )}

      {/* Landmark photo */}
      {ready && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imgUrl}
          alt={`${landmark} — ${cityLabel}`}
          onError={() => setFetchResult(false)}
          className="absolute inset-0 w-full h-full object-cover grayscale transition-transform duration-700 hover:scale-105"
        />
      )}

      {/* Vignette over photos */}
      {ready && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
      )}

      {/* Bottom label — always visible */}
      <div className="absolute bottom-0 left-0 right-0 bg-white px-4 py-3">
        <p className="text-[8px] font-bold tracking-[0.18em] uppercase text-zinc-400 mb-0.5">
          Featured City
        </p>
        <p className="text-[13px] font-extrabold text-black tracking-tight leading-tight">{cityLabel}</p>
        <p className="text-[10px] text-zinc-500 font-medium truncate">{landmark}</p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [user,      setUser]      = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [location,  setLocation]  = useState(null);

  useEffect(() => {
    const id = setTimeout(() => {
      const stored = getStoredUser();
      setUser(stored);
      setAuthReady(true);
      if (stored?.role === "provider") router.replace("/dashboard/provider");
      if (stored?.role === "admin")    router.replace("/admin");
    }, 0);
    return () => clearTimeout(id);
  }, [router]);

  const logout = () => { clearAuthSession(); setUser(null); };

  const popularServices = Object.values(SERVICE_CATALOG).flat().filter(s => s.popular).slice(0, 6);
  const catCounts       = Object.fromEntries(
    Object.entries(SERVICE_CATALOG).map(([k, a]) => [k, a.length])
  );

  // ── City landmark section state ──────────────────────────────────────────
  const [citySearch, setCitySearch] = useState("");
  const [pinnedCity, setPinnedCity] = useState("Delhi"); // set by chip click / FIND button

  // Derive which city to highlight purely from input — no setState in effect.
  const searchMatchCity = useMemo(() => {
    const q = citySearch.toLowerCase().trim();
    if (!q) return null;
    const exact = CITIES.find(c => c.toLowerCase() === q);
    if (exact) return exact;
    const prefix = CITIES.filter(c => c.toLowerCase().startsWith(q));
    return prefix.length === 1 ? prefix[0] : null;
  }, [citySearch]);

  // What the grid actually shows: search match takes precedence over pinned chip
  const activeCity = searchMatchCity || pinnedCity;

  const filteredCities = useMemo(
    () => !citySearch.trim()
      ? CITIES
      : CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())),
    [citySearch],
  );

  // 4 items for the 2×2 landmark grid
  const gridItems = useMemo(() => {
    const city = CITY_LANDMARKS[activeCity];
    if (city) {
      return [
        { kind: "img",  ...city.images[0], cityLabel: city.label, gradient: city.gradient },
        { kind: "img",  ...city.images[1], cityLabel: city.label, gradient: city.gradient },
        { kind: "info" },
        { kind: "book" },
      ];
    }
    return DEFAULT_GRID_CITIES.map(c => ({
      kind:      "img",
      ...CITY_LANDMARKS[c].images[0],
      cityLabel: CITY_LANDMARKS[c].label,
      gradient:  CITY_LANDMARKS[c].gradient,
    }));
  }, [activeCity]);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-black selection:text-white">

      {/* ── TOP ANNOUNCEMENT ─────────────────────────────────────────── */}
      <div className="bg-zinc-950 border-b border-zinc-800 py-2 text-center">
        <p className="text-[10px] font-semibold text-white/40 tracking-wide">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 align-middle mr-2 animate-pulse" />
          Now live in 25+ cities · Free service diagnosis on every visit · Pay after job done
        </p>
      </div>

      {/* ── NAVBAR ───────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/96 backdrop-blur-md border-b border-zinc-100 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 md:px-10 h-16 flex items-center gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <div className="absolute inset-0 bg-black rounded-xl opacity-0 group-hover:opacity-5 transition-opacity" />
              <img 
                src="/logo-transparent.png" 
                alt="ServiceMarket" 
                className="w-8 h-8 object-contain drop-shadow-sm"
              />
            </div>
            <span className="hidden sm:block text-base font-extrabold tracking-tight">
              Service<span className="font-light text-zinc-400">Market</span>
            </span>
          </Link>

          {/* Desktop search */}
          <div className="flex-1 max-w-lg mx-4 hidden md:block">
            <SmartSearch role={user?.role === "customer" ? "customer" : "public"} compact />
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {authReady && (
              <>
                <LocationBar onLocationChange={setLocation} compact />
                {user ? (
                  <>
                    <Link href="/bookings"
                      className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-black transition-colors border border-zinc-200 px-3 py-1.5 hover:border-zinc-400">
                      <CalendarDays size={13} /> Bookings
                    </Link>
                    <NotificationBell variant="light" />
                    <button onClick={logout}
                      className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-red-500 transition-colors">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login"
                      className="hidden sm:block text-xs font-semibold text-zinc-500 hover:text-black transition-colors px-1">
                      Sign In
                    </Link>
                    <Link href="/register"
                      className="bg-black text-white px-4 py-2 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
                      Register
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile search row */}
        <div className="md:hidden border-t border-zinc-100 px-4 py-2.5">
          <SmartSearch role={user?.role === "customer" ? "customer" : "public"} compact />
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative bg-zinc-950 text-white overflow-hidden">
        {/* Fine grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right,#fff 1px,transparent 1px)," +
              "linear-gradient(to bottom,#fff 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[400px]"
          style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 md:px-10 pt-14 pb-10 md:pt-20 md:pb-14">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 border border-white/[0.12] bg-white/[0.05] px-3.5 py-1.5 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/50">
              Trusted Home Services
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight leading-[1.04] max-w-4xl mb-5">
            Expert home services,{" "}
            <span className="text-white/30">at your doorstep.</span>
          </h1>

          <p className="text-white/45 text-base md:text-lg max-w-[500px] mb-8 leading-relaxed">
            Book KYC-verified technicians & appliance experts in minutes.
            Transparent pricing — pay only after the job is done.
          </p>

          {/* Location picker */}
          <div className="mb-8">
            <LocationBar onLocationChange={setLocation} />
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 mb-14">
            <Link href="/services/ac"
              className="group inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 text-xs font-bold tracking-widest uppercase hover:bg-zinc-100 transition-colors">
              Book AC Service
              <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
            <Link href="#categories"
              className="inline-flex items-center gap-2 border border-white/20 text-white/70 px-7 py-3.5 text-xs font-bold tracking-widest uppercase hover:border-white/35 hover:text-white hover:bg-white/[0.04] transition-all">
              Browse All Services
            </Link>
            {!user && (
              <Link href="/provider"
                className="hidden sm:block text-white/25 hover:text-white/50 text-[10px] font-bold tracking-widest uppercase transition-colors ml-2">
                Earn as Provider →
              </Link>
            )}
          </div>

          {/* Stats row */}
          <div className="border-t border-white/[0.07] pt-8 grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-6">
            {STATS.map(({ value, label, Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-9 h-9 shrink-0 border border-white/[0.10] bg-white/[0.05] flex items-center justify-center">
                  <Icon size={15} className="text-white/40" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-xl font-extrabold text-white leading-none">{value}</p>
                  <p className="text-[10px] text-white/30 font-semibold tracking-wider uppercase mt-0.5">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICE CATEGORIES ───────────────────────────────────────── */}
      <section id="categories" className="py-24 md:py-32 relative overflow-hidden bg-white">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
          style={{backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '64px 64px'}} 
        />
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent" />

        <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-12 h-px bg-zinc-900" />
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-400">Discover Services</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-black mb-6 leading-[0.9]">
                Browse by <span className="text-zinc-300">Category</span>
              </h2>
              {location && (
                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[11px] font-bold text-zinc-500">
                    Showing top-rated professionals in <span className="text-black">{location.city}</span>
                  </p>
                </div>
              )}
            </div>
            <Link href="/services/ac"
              className="group flex items-center gap-3 text-[11px] font-black tracking-widest uppercase text-black">
              View All Services
              <div className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center group-hover:bg-black group-hover:border-black group-hover:text-white transition-all duration-300">
                <ChevronRight size={14} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-5">
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const Icon  = CATEGORY_ICONS[key] || Sparkles;
              const count = catCounts[key] || 0;
              return (
                <Link key={key} href={`/services/${key}`} className="group relative">
                  <div className="h-full min-h-[160px] bg-white border border-zinc-100 p-6 flex flex-col items-center justify-center text-center transition-all duration-500 hover:-translate-y-2 hover:border-black hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.12)] cursor-pointer group-hover:z-20">
                    
                    {/* Glowing background effect on hover */}
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500" />
                    
                    {/* Icon container */}
                    <div className={`w-14 h-14 mb-5 flex items-center justify-center rounded-2xl transition-all duration-500 bg-zinc-50 group-hover:bg-black group-hover:text-white group-hover:rotate-[10deg] group-hover:scale-110 shadow-sm`}>
                      <Icon size={24} strokeWidth={1.5} />
                    </div>

                    <div className="relative">
                      <p className="text-xs font-black text-zinc-950 tracking-tight mb-1 uppercase">
                        {meta.label}
                      </p>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-zinc-200 group-hover:bg-black transition-colors" />
                        <p className="text-[9px] font-bold text-zinc-400 tracking-widest uppercase">
                          {count} Options
                        </p>
                      </div>
                    </div>

                    {/* Corner Decoration */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                      <ArrowUpRight size={14} className="text-black" strokeWidth={2.5} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── POPULAR SERVICES ─────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-zinc-50 border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 md:px-10">

          <div className="flex items-end justify-between mb-10">
            <div>
              <Overline>Most Booked</Overline>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black">
                Popular Services
              </h2>
            </div>
            <Link href="/services/ac"
              className="hidden sm:flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors">
              View All <ChevronRight size={11} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularServices.map(svc => {
              const cat  = Object.entries(SERVICE_CATALOG).find(([, a]) => a.includes(svc))?.[0] || "ac";
              const meta = CATEGORY_META[cat];
              const Icon = CATEGORY_ICONS[cat] || Sparkles;
              return (
                <Link key={svc.slug} href={`/book/${svc.slug}`}>
                  <div className="group relative bg-white border border-zinc-200 hover:border-black hover:shadow-xl transition-all duration-200 p-6 h-full flex flex-col overflow-hidden cursor-pointer">
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-black scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                    {/* Card header */}
                    <div className="flex items-start justify-between mb-5">
                      <span className={`w-11 h-11 inline-flex items-center justify-center border shrink-0 ${meta.color}`}>
                        <Icon size={19} strokeWidth={1.7} />
                      </span>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[9px] font-bold tracking-widest uppercase bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5">
                          {meta.label}
                        </span>
                        <Stars n={5} size={10} />
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1">
                      <h3 className="text-[15px] font-extrabold text-black tracking-tight mb-1">
                        {svc.name}
                      </h3>
                      <p className="flex items-center gap-1 text-xs text-zinc-400 font-medium mb-3.5">
                        <Clock size={11} className="shrink-0" />
                        {svc.duration}
                      </p>
                      <ul className="space-y-1.5 mb-5">
                        {svc.includes.slice(0, 3).map(item => (
                          <li key={item} className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Card footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 leading-none mb-1">
                          Starting at
                        </p>
                        <p className="text-[1.4rem] font-extrabold text-black leading-none">
                          {formatPrice(svc.price)}
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-black group-hover:gap-2.5 transition-all duration-200">
                        Book Now <ArrowRight size={11} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-zinc-950 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-10">

          <div className="mb-14 text-center">
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-white/25 mb-3">
              Simple Process
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              3 steps to a fixed home
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06]">
            {STEPS.map((step, i) => (
              <div key={i} className="relative bg-zinc-950 p-8 md:p-10 hover:bg-zinc-900 transition-colors">
                <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/18 mb-7">
                  Step 0{i + 1}
                </p>
                <span className="w-12 h-12 inline-flex items-center justify-center border border-white/[0.10] bg-white/[0.04] mb-7">
                  <step.Icon size={20} strokeWidth={1.8} className="text-white/60" />
                </span>
                <h3 className="text-xl font-extrabold tracking-tight mb-3">{step.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{step.desc}</p>
                {i < 2 && (
                  <ChevronRight size={14} className="hidden md:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-white/15 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 bg-zinc-950 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] border border-white/[0.02] rounded-full pointer-events-none animate-[pulse_8s_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/[0.02] rounded-full pointer-events-none animate-[pulse_12s_infinite]" />
        
        {/* Luminous Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-24">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-full mb-8">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-400">Security & Integrity</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-8 leading-[0.85] bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40">
              Built for <br className="hidden md:block" /> <span className="text-zinc-500">peace of mind</span>
            </h2>
            <p className="text-zinc-500 text-base max-w-xl mx-auto font-medium leading-relaxed">
              We&apos;ve engineered every step of the service journey to prioritize your safety, comfort, and absolute satisfaction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST.map((t, idx) => (
              <div key={t.label}
                className="group relative bg-zinc-900/30 backdrop-blur-sm border border-white/[0.04] p-10 md:p-12 hover:border-white/10 hover:bg-zinc-900/60 transition-all duration-700 cursor-default overflow-hidden">
                
                {/* Large background number - Ghost effect */}
                <span className="absolute -bottom-10 -right-6 text-[160px] font-black text-white/[0.01] group-hover:text-white/[0.03] transition-all duration-700 pointer-events-none tracking-tighter italic">
                  0{idx + 1}
                </span>

                {/* Corner Glow */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-white opacity-0 group-hover:opacity-[0.04] blur-[80px] transition-opacity duration-700" />

                <div className={`w-16 h-16 inline-flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5 mb-10 transition-all duration-700 group-hover:scale-110 group-hover:bg-white group-hover:text-black group-hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] text-white/30`}>
                  <t.Icon size={28} strokeWidth={1.2} />
                </div>
                
                <h3 className="text-xl font-black text-white mb-4 tracking-tight uppercase">{t.label}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed font-medium group-hover:text-zinc-300 transition-colors duration-500">
                  {t.desc}
                </p>

                {/* Bottom line animation - Elegant Beam */}
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-1000 cubic-bezier(0.16, 1, 0.3, 1)" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-white relative overflow-hidden">
        {/* Decorative Background Blob */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-zinc-50 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-zinc-50 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-12 h-px bg-zinc-900" />
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-400">Social Proof</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-black leading-tight">
                Real reviews, <br /> <span className="text-zinc-300">real customers</span>
              </h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-xl font-black text-black leading-none">4.8/5</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Average Rating</p>
              </div>
              <div className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center text-black">
                <Star size={16} fill="currentColor" className="text-amber-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx}
                className="group relative bg-white border border-zinc-100 p-8 md:p-10 transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] hover:border-black flex flex-col min-h-[340px]">
                
                {/* Decorative Quote Mark */}
                <span className="absolute top-8 right-8 text-8xl font-black text-zinc-50 group-hover:text-zinc-100 transition-colors pointer-events-none">
                  &ldquo;
                </span>

                {/* Review Text */}
                <div className="relative z-10 flex-1">
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill={i < t.rating ? "currentColor" : "none"} className={i < t.rating ? "text-amber-400" : "text-zinc-200"} />
                    ))}
                  </div>
                  <p className="text-base font-medium text-zinc-600 leading-relaxed group-hover:text-black transition-colors duration-300 italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>

                {/* Author Info */}
                <div className="mt-8 pt-8 border-t border-zinc-50 flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-zinc-950 text-white flex items-center justify-center text-xs font-black shadow-lg group-hover:scale-110 transition-transform duration-500">
                    {t.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-black truncate">{t.name}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                      <span>{t.city}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-200" />
                      <span className="text-emerald-500">Verified</span>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-zinc-50 rounded-full border border-zinc-100">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">
                      {t.service}
                    </p>
                  </div>
                </div>

                {/* Entrance line animation */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-black scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROVIDER RECRUITMENT ─────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-zinc-950 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left — copy */}
            <div>
              <Overline light>For Professionals</Overline>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-5">
                Turn your skills into a stable income.
              </h2>
              <p className="text-white/40 text-base leading-relaxed mb-8 max-w-md">
                Join 2,000+ verified professionals already earning through ServiceMarket. Flexible hours, instant job alerts, and weekly direct payouts.
              </p>

              {/* Perks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-9">
                {PROVIDER_PERKS.map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <span className="w-7 h-7 shrink-0 border border-white/[0.09] bg-white/[0.04] flex items-center justify-center">
                      <Icon size={13} strokeWidth={1.8} className="text-white/45" />
                    </span>
                    <span className="text-sm text-white/55">{text}</span>
                  </div>
                ))}
              </div>

              <Link href="/provider"
                className="group inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 text-xs font-bold tracking-widest uppercase hover:bg-zinc-100 transition-colors">
                Apply as a Professional
                <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Right — earnings table */}
            <div className="lg:flex lg:justify-end">
              <div className="w-full max-w-sm border border-white/[0.09] bg-white/[0.03] p-7">
                <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-white/22 mb-7">
                  Estimated Monthly Earnings
                </p>
                <div>
                  {EARNINGS.map((row, i) => (
                    <div key={row.role}
                      className={`flex items-center justify-between py-4 ${i < EARNINGS.length - 1 ? "border-b border-white/[0.07]" : ""}`}>
                      <div>
                        <p className="text-sm font-bold text-white">{row.role}</p>
                        <p className="text-[10px] text-white/25 font-medium mt-0.5">{row.rate}</p>
                      </div>
                      <p className="text-sm font-extrabold text-emerald-400 shrink-0 ml-4">{row.earn}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/18 font-medium mt-6 leading-relaxed">
                  * Based on active professional averages on the platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CITY COVERAGE ────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 border-b border-zinc-100 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

            {/* ── Left: headline + search + chips ── */}
            <div>
              {/* Label */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-px bg-zinc-900" />
                <p className="text-[10px] font-black tracking-[0.35em] uppercase text-zinc-400">
                  Expanding Rapidly
                </p>
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-black leading-[1.0] mb-6">
                Serving the{" "}
                <span className="text-zinc-300">nation</span>
              </h2>

              <p className="text-zinc-500 text-base font-medium leading-relaxed mb-8 max-w-md">
                From the bustling streets of Delhi to the tech hubs of Bengaluru, we bring expert home services to your doorstep across 25+ cities in India.
              </p>

              {/* Search bar */}
              <div className="flex max-w-sm mb-7 border border-zinc-200 bg-white focus-within:border-black transition-colors">
                <span className="flex items-center pl-4 text-zinc-400 shrink-0">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const q = citySearch.toLowerCase().trim();
                      const m = CITIES.find(c => c.toLowerCase().includes(q));
                      if (m) { setPinnedCity(m); setCitySearch(""); }
                    }
                  }}
                  placeholder="Search your state or district..."
                  className="flex-1 px-3 py-3.5 text-sm font-medium text-black placeholder:text-zinc-400 bg-transparent outline-none"
                />
                <button
                  onClick={() => {
                    const q = citySearch.toLowerCase().trim();
                    if (!q) return;
                    const m = CITIES.find(c => c.toLowerCase().includes(q));
                    if (m) { setPinnedCity(m); setCitySearch(""); }
                  }}
                  className="bg-black text-white px-5 text-[10px] font-black tracking-widest uppercase hover:bg-zinc-800 transition-colors shrink-0"
                >
                  Find
                </button>
              </div>

              {/* City chips — filtered when user is typing */}
              <div className="flex flex-wrap gap-2">
                {(filteredCities.length > 0 ? filteredCities : CITIES).slice(0, 8).map(city => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => { setPinnedCity(city); setCitySearch(""); }}
                    className={`px-4 py-2 text-[10px] font-black tracking-widest uppercase border transition-all ${
                      activeCity === city
                        ? "bg-black text-white border-black"
                        : "bg-white border-zinc-200 text-zinc-400 hover:border-black hover:text-black"
                    }`}
                  >
                    {city}
                  </button>
                ))}
                {filteredCities.length === 0 && citySearch && (
                  <p className="text-xs text-zinc-400 font-medium py-1.5">
                    No city found — expanding there soon!
                  </p>
                )}
                {!citySearch && (
                  <span className="px-4 py-2 bg-zinc-50 border border-dashed border-zinc-200 text-[10px] font-black tracking-widest uppercase text-zinc-400 select-none">
                    +{CITIES.length - 8} More
                  </span>
                )}
              </div>

              {/* Active city pill */}
              {activeCity && CITY_LANDMARKS[activeCity] && (
                <div className="mt-6 flex items-center gap-3 py-3 px-4 border border-zinc-100 bg-zinc-50 max-w-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Now showing</p>
                    <p className="text-sm font-extrabold text-black truncate">
                      {CITY_LANDMARKS[activeCity].label}
                      <span className="font-medium text-zinc-400 ml-1.5">
                        · {CITY_LANDMARKS[activeCity].state}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: 2×2 landmark grid ── */}
            <div className="relative">
              {/* Subtle tilted background slab */}
              <div className="absolute -inset-3 bg-zinc-100 rounded-[1.5rem] -rotate-1 pointer-events-none" />

              <div className="relative grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden shadow-2xl shadow-zinc-300/60 h-[440px]">
                {gridItems.map((item, i) => {
                  if (item.kind === "img") {
                    return (
                      <CityImage
                        key={`${activeCity}-${i}`}
                        url={item.url}
                        landmark={item.landmark}
                        cityLabel={item.cityLabel}
                        gradient={item.gradient}
                      />
                    );
                  }

                  if (item.kind === "info") {
                    const city = CITY_LANDMARKS[activeCity];
                    return (
                      <div key="info" className="relative bg-zinc-950 p-5 flex flex-col justify-between overflow-hidden">
                        {/* Dot-grid pattern */}
                        <div className="absolute inset-0 opacity-[0.07]"
                          style={{ backgroundImage: "radial-gradient(circle at 1.5px 1.5px,#fff 1px,transparent 0)", backgroundSize: "14px 14px" }} />
                        <div className="relative">
                          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-3">
                            City Guide
                          </p>
                          <p className="text-xl font-extrabold text-white leading-tight">
                            {city?.label}
                          </p>
                          <p className="text-sm text-zinc-400 mt-0.5 font-medium">{city?.state}</p>
                        </div>
                        <div className="relative space-y-2 mt-3">
                          {city?.images.map(img => (
                            <div key={img.landmark} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-[11px] text-zinc-400 font-medium truncate">{img.landmark}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (item.kind === "book") {
                    const city = CITY_LANDMARKS[activeCity];
                    return (
                      <div key="book" className="bg-black p-5 flex flex-col justify-between">
                        <div>
                          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-600 mb-3">
                            Available in {city?.label}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {["AC", "Fridge", "Fan", "TV", "Electrical", "Cooler"].map(s => (
                              <span key={s}
                                className="px-2 py-1 text-[9px] font-bold uppercase tracking-wide border border-white/10 text-white/40">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Link
                          href="/services/ac"
                          className="flex items-center gap-1.5 mt-4 text-[10px] font-bold tracking-widest uppercase text-white hover:text-zinc-300 transition-colors group"
                        >
                          Book in {city?.label}
                          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-zinc-50 border-b border-zinc-100">
        <div className="max-w-2xl mx-auto px-4 md:px-10 text-center">
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-zinc-400 mb-4">
            Get Started Today
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-black mb-5">
            Ready for a service?
          </h2>
          <p className="text-zinc-500 text-base leading-relaxed mb-10 max-w-md mx-auto">
            Join 50,000+ customers who trust ServiceMarket for fast, reliable, and transparently-priced home services.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/services/ac"
              className="group inline-flex items-center justify-center gap-2 bg-black text-white px-8 py-4 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
              Book a Service Now
              <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
            {!user && (
              <Link href="/register"
                className="inline-flex items-center justify-center border border-zinc-300 text-black px-8 py-4 text-xs font-bold tracking-widest uppercase hover:border-black transition-colors">
                Create Free Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-10 pt-12 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4 group">
                <img 
                  src="/logo-transparent.png" 
                  alt="ServiceMarket" 
                  className="w-8 h-8 object-contain"
                />
                <span className="text-base font-extrabold tracking-tight">
                  Service<span className="font-light text-zinc-400">Market</span>
                </span>
              </Link>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-[195px]">
                Expert home services at your doorstep. Verified professionals, transparent pricing.
              </p>
            </div>

            {/* Services */}
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-4">Services</p>
              <ul className="space-y-2.5">
                {Object.entries(CATEGORY_META).map(([key, m]) => (
                  <li key={key}>
                    <Link href={`/services/${key}`}
                      className="text-xs font-semibold text-zinc-500 hover:text-black transition-colors">
                      {m.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-4">Company</p>
              <ul className="space-y-2.5">
                {[
                  ["About Us",           "/about"],
                  ["How It Works",       "/how-it-works"],
                  ["Careers",            "/careers"],
                  ["Blog",               "/blog"],
                  ["Become a Provider",  "/provider"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href}
                      className="text-xs font-semibold text-zinc-500 hover:text-black transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-4">Support</p>
              <ul className="space-y-2.5">
                {[
                  ["Help Center",      "/help"],
                  ["Contact Us",       "/contact"],
                  ["My Bookings",      "/bookings"],
                  ["Terms of Service", "/terms"],
                  ["Privacy Policy",   "/privacy"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href}
                      className="text-xs font-semibold text-zinc-500 hover:text-black transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-7 border-t border-zinc-100">
            <p className="text-[10px] text-zinc-400 font-medium">
              © {new Date().getFullYear()} ServiceMarket · All rights reserved.
            </p>
            <p className="text-[10px] text-zinc-300 font-medium">
              Built with care for India&apos;s homes.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
