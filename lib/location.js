/**
 * location.js — Customer location detection utility
 *
 * Priority chain:
 *   1. Cached value in localStorage (< 6 hours old)
 *   2. Browser Geolocation API → Nominatim reverse geocode
 *   3. IP-based geolocation (ipapi.co — free, no key needed)
 *   4. Default fallback: "Delhi"
 *
 * Stores:
 *   locationData = { city, state, lat, lng, source, fetchedAt }
 */

const CACHE_KEY = "sm_location";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms

/** Read cached location — returns null if missing or expired */
export function getCachedLocation() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.fetchedAt > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

/** Persist location to localStorage */
export function saveLocation(locationData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ...locationData,
      fetchedAt: Date.now(),
    }));
  } catch {}
}

/** Clear cached location (used when user manually clears) */
export function clearLocation() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}

/** Reverse geocode coords → city+state via OpenStreetMap Nominatim (free, no key) */
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "en", "User-Agent": "ServiceMarket/1.0" },
  });
  if (!res.ok) throw new Error("Nominatim failed");
  const data = await res.json();
  const addr = data.address || {};
  const city =
    addr.city || addr.town || addr.village || addr.county || addr.state_district || "Unknown";
  const state = addr.state || "";
  return { city, state, lat, lng, source: "gps" };
}

/** IP-based geolocation fallback via ipapi.co */
async function ipGeolocation() {
  const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error("ipapi failed");
  const data = await res.json();
  return {
    city: data.city || "Delhi",
    state: data.region || "",
    lat: data.latitude || null,
    lng: data.longitude || null,
    source: "ip",
  };
}

/**
 * Main entry — auto-detects location.
 * Returns a location object: { city, state, lat, lng, source, fetchedAt }
 * Never throws — always returns something.
 */
export async function detectLocation() {
  // 1. Return cache if fresh
  const cached = getCachedLocation();
  if (cached) return cached;

  // 2. Try GPS + Nominatim
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          maximumAge: 300000,
          enableHighAccuracy: false,
        });
      });
      const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      saveLocation(loc);
      return loc;
    } catch {
      // GPS denied or failed → fall through to IP
    }
  }

  // 3. IP fallback
  try {
    const loc = await ipGeolocation();
    saveLocation(loc);
    return loc;
  } catch {
    // Network or API error
  }

  // 4. Hard fallback
  const fallback = { city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209, source: "fallback" };
  saveLocation(fallback);
  return fallback;
}

/** Force re-detect (ignore cache) */
export async function refreshLocation() {
  clearLocation();
  return detectLocation();
}
