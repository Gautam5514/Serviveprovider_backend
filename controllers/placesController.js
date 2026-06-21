// ─── OpenTripMap place explorer ──────────────────────────────────────────────
// Given any place name (a metro, a tiny district, anywhere in the world) this
// resolves it to coordinates and returns its most notable nearby spots with
// preview images. The API key stays server-side; the browser never sees it.

const OTM  = "https://api.opentripmap.com/0.1/en/places";
const KEY  = process.env.OPENTRIPMAP_KEY || "5ae2e3f221c38a28845f05b6ed65e423c5ac79e40230d91051f17ce8";

// Simple in-memory cache so repeated lookups (popular cities) don't re-hit OTM.
const cache = new Map();
const TTL   = 1000 * 60 * 60 * 6; // 6 hours

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
      cache.set(cacheKey, { t: Date.now(), data });
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

    cache.set(cacheKey, { t: Date.now(), data });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Lookup failed" });
  }
};

module.exports = { explorePlace };
