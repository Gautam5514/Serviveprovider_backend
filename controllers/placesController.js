// ─── OpenTripMap place explorer ──────────────────────────────────────────────
// Given any place name (a metro, a tiny district, anywhere in the world) this
// resolves it to coordinates and returns its most notable nearby spots with
// preview images. The API key stays server-side; the browser never sees it.

const OTM  = "https://api.opentripmap.com/0.1/en/places";
const KEY  = process.env.OPENTRIPMAP_KEY;

// Simple in-memory cache so repeated lookups (popular cities) don't re-hit OTM.
// Capped so unlimited distinct queries can't grow memory forever.
const cache = new Map();
const TTL   = 1000 * 60 * 60 * 6; // 6 hours
const CACHE_MAX = 500;

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    // Evict the oldest entry (Map preserves insertion order)
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, value);
}

const COUNTRY = {
  IN: "India", US: "United States", GB: "United Kingdom", AE: "UAE",
  AU: "Australia", CA: "Canada", FR: "France", DE: "Germany", IT: "Italy",
  ES: "Spain", JP: "Japan", CN: "China", SG: "Singapore", NP: "Nepal",
  BD: "Bangladesh", LK: "Sri Lanka", PK: "Pakistan", TH: "Thailand",
};

// Turn "religion,hindu_temples,interesting_places" → "Hindu Temple"
function prettyKind(kinds = "") {
  const SKIP = new Set(["interesting_places", "tourist_object", "other", "urban_environment"]);
  const first = kinds.split(",").map(k => k.trim()).find(k => k && !SKIP.has(k));
  if (!first) return "Landmark";
  return first
    .replace(/_/g, " ")
    .replace(/s$/, "")
    .replace(/\b\w/g, c => c.toUpperCase());
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch JSON with one retry — smooths over transient OpenTripMap rate-limits.
// OpenTripMap hands back Wikimedia thumbnails at arbitrary widths (300/400px),
// but Wikimedia now rejects non-standard thumb sizes with HTTP 400. Rewrite the
// width to 500px — a pre-rendered bucket that resolves reliably. Non-Wikimedia
// or non-thumb URLs are returned untouched.
function normalizeImage(url) {
  if (!url || !url.includes("upload.wikimedia.org")) return url;
  return url.replace(/\/\d+px-/, "/500px-");
}

async function getJson(url, retries = 1) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OTM ${res.status}`);
    return res.json();
  } catch (err) {
    if (retries > 0) {
      await sleep(700);
      return getJson(url, retries - 1);
    }
    throw err;
  }
}

const explorePlace = async (req, res) => {
  try {
    if (!requireKey(KEY, res)) return;
    const name = String(req.query.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    const cacheKey = name.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.t < TTL) {
      return res.json(cached.data);
    }

    // 1️⃣  Resolve the place name → coordinates
    const geo = await getJson(`${OTM}/geoname?name=${encodeURIComponent(name)}&apikey=${KEY}`);
    if (!geo || geo.status !== "OK" || geo.lat == null) {
      const data = { success: true, found: false, place: { name }, spots: [] };
      cacheSet(cacheKey, { t: Date.now(), data });
      return res.json(data);
    }

    // 2️⃣  Pull nearby points of interest. Widen the search + relax the rating
    //     filter progressively so even small towns surface something.
    const tiers = [
      { radius: 20000, rate: 3 },
      { radius: 45000, rate: 2 },
      { radius: 75000, rate: 1 },
    ];
    let pois = [];
    for (const t of tiers) {
      const list = await getJson(
        `${OTM}/radius?radius=${t.radius}&lon=${geo.lon}&lat=${geo.lat}&rate=${t.rate}&format=json&limit=40&apikey=${KEY}`
      );
      pois = (Array.isArray(list) ? list : []).filter(p => p.name && p.name.trim());
      if (pois.length >= 6) break;
    }

    // Dedupe by name, rank by rating then proximity, keep a generous pool so
    // image-bearing spots aren't dropped before we resolve their details.
    const seen = new Set();
    pois = pois
      .sort((a, b) => (b.rate - a.rate) || (a.dist - b.dist))
      .filter(p => {
        const k = p.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 16);

    // 3️⃣  Fetch details (preview image, wiki link) for the candidate pool.
    const detailed = await Promise.all(
      pois.slice(0, 14).map(async (p) => {
        try {
          const d = await getJson(`${OTM}/xid/${p.xid}?apikey=${KEY}`);
          return {
            name:     p.name,
            category: prettyKind(p.kinds),
            image:    normalizeImage(d.preview?.source) || null,
            wiki:     d.wikipedia || null,
          };
        } catch {
          return { name: p.name, category: prettyKind(p.kinds), image: null, wiki: null };
        }
      })
    );

    // Spots with images first (they drive the visual tiles), capped for payload.
    const spots = detailed
      .sort((a, b) => (b.image ? 1 : 0) - (a.image ? 1 : 0))
      .slice(0, 8);

    const data = {
      success: true,
      found:   true,
      place: {
        name:    geo.name || name,
        country: COUNTRY[geo.country] || geo.country || "",
        lat:     geo.lat,
        lon:     geo.lon,
      },
      spots,
    };

    cacheSet(cacheKey, { t: Date.now(), data });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Lookup failed" });
  }
};

// ─── Google Places / Geocoding proxy ─────────────────────────────────────────
// The web client can't call Google's REST APIs directly (CORS + the key would
// be exposed). So the browser hits these endpoints and we forward to Google
// server-side, keeping the key private. Mobile apps call Google directly with a
// bundle-id-restricted key, so they don't use these.
const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GMAPS = "https://maps.googleapis.com/maps/api";

// Guard shared by every proxy endpoint — a missing key must fail loudly and
// safely instead of forwarding requests with "undefined" as the key.
function requireKey(key, res) {
  if (key) return true;
  res.status(503).json({ success: false, message: "This feature is not configured on the server." });
  return false;
}

function pickCityPincode(components = []) {
  const get = (type) =>
    components.find((c) => (c.types || []).includes(type))?.long_name || "";
  return {
    city:
      get("locality") ||
      get("administrative_area_level_2") ||
      get("administrative_area_level_1"),
    pincode: get("postal_code"),
  };
}

// GET /api/places/autocomplete?input=&session=
const placesAutocomplete = async (req, res) => {
  try {
    if (!requireKey(GMAPS_KEY, res)) return;
    const input = String(req.query.input || "").trim();
    if (input.length < 3) return res.json({ success: true, predictions: [] });
    const session = String(req.query.session || "");
    const url =
      `${GMAPS}/place/autocomplete/json?input=${encodeURIComponent(input)}` +
      `&components=country:in&sessiontoken=${encodeURIComponent(session)}&key=${GMAPS_KEY}`;
    const r = await fetch(url);
    const json = await r.json();
    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      return res.status(502).json({ success: false, message: json.error_message || json.status });
    }
    res.json({
      success: true,
      predictions: (json.predictions || []).map((p) => ({
        placeId: p.place_id,
        primary: p.structured_formatting?.main_text || p.description,
        secondary: p.structured_formatting?.secondary_text || "",
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/places/details?placeId=&session=
const placeDetails = async (req, res) => {
  try {
    if (!requireKey(GMAPS_KEY, res)) return;
    const placeId = String(req.query.placeId || "");
    if (!placeId) return res.status(400).json({ success: false, message: "placeId required" });
    const session = String(req.query.session || "");
    const url =
      `${GMAPS}/place/details/json?place_id=${encodeURIComponent(placeId)}` +
      `&fields=geometry,formatted_address,address_component,name` +
      `&sessiontoken=${encodeURIComponent(session)}&key=${GMAPS_KEY}`;
    const r = await fetch(url);
    const json = await r.json();
    if (json.status !== "OK") {
      return res.status(502).json({ success: false, message: json.error_message || json.status });
    }
    const result = json.result;
    res.json({
      success: true,
      place: {
        lat: result.geometry?.location?.lat,
        lng: result.geometry?.location?.lng,
        fullAddress: result.formatted_address || result.name || "",
        ...pickCityPincode(result.address_components),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/places/reverse?lat=&lng=
const reverseGeocode = async (req, res) => {
  try {
    if (!requireKey(GMAPS_KEY, res)) return;
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: "lat & lng required" });
    }
    const url = `${GMAPS}/geocode/json?latlng=${lat},${lng}&key=${GMAPS_KEY}`;
    const r = await fetch(url);
    const json = await r.json();
    if (json.status !== "OK" || !json.results?.length) {
      return res.status(502).json({ success: false, message: json.error_message || json.status });
    }
    const top = json.results[0];
    res.json({
      success: true,
      place: {
        lat, lng,
        fullAddress: top.formatted_address || "",
        ...pickCityPincode(top.address_components),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { explorePlace, placesAutocomplete, placeDetails, reverseGeocode };
