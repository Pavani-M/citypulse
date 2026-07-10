import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import type { Place } from "../types";

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface PlaceSearchParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  category?: string;
  minRating?: number;
  minReviews?: number;
  sortBy?: "rating" | "reviews" | "distance";
}

const FOURSQUARE_BASE = "https://places-api.foursquare.com";
const FOURSQUARE_API_VERSION = "2025-06-17";

function foursquareHeaders() {
  return {
    Authorization: `Bearer ${env.foursquareApiKey}`,
    Accept: "application/json",
    "X-Places-Api-Version": FOURSQUARE_API_VERSION,
  };
}

function requireFoursquareKey() {
  if (!env.foursquareApiKey) {
    throw ApiError.badRequest(
      "FOURSQUARE_API_KEY is not set. Set USE_MOCK_PLACES=true or provide a key.",
    );
  }
}

// ---------------------------------------------------------------------------
// Geocoding + Autocomplete — Foursquare's free Autocomplete endpoint doubles as
// both: selecting (or taking the top) suggestion gives real lat/lng directly,
// with no separate geocoding provider needed.
// ---------------------------------------------------------------------------

/** A handful of well-known localities so common demo searches resolve to real coordinates in mock mode. */
const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; formattedAddress: string }> = {
  "bangalore": { lat: 12.9716, lng: 77.5946, formattedAddress: "Bangalore, Karnataka, India" },
  "bengaluru": { lat: 12.9716, lng: 77.5946, formattedAddress: "Bengaluru, Karnataka, India" },
  "koramangala": { lat: 12.9352, lng: 77.6245, formattedAddress: "Koramangala, Bengaluru, Karnataka, India" },
  "indiranagar": { lat: 12.9719, lng: 77.6412, formattedAddress: "Indiranagar, Bengaluru, Karnataka, India" },
  "hyderabad": { lat: 17.385, lng: 78.4867, formattedAddress: "Hyderabad, Telangana, India" },
  "gachibowli": { lat: 17.4401, lng: 78.3489, formattedAddress: "Gachibowli, Hyderabad, Telangana, India" },
  "banjara hills": { lat: 17.4156, lng: 78.4347, formattedAddress: "Banjara Hills, Hyderabad, Telangana, India" },
  "jubilee hills": { lat: 17.4326, lng: 78.4071, formattedAddress: "Jubilee Hills, Hyderabad, Telangana, India" },
  "madhapur": { lat: 17.4483, lng: 78.3915, formattedAddress: "Madhapur, Hyderabad, Telangana, India" },
  "mumbai": { lat: 19.076, lng: 72.8777, formattedAddress: "Mumbai, Maharashtra, India" },
  "bandra": { lat: 19.0596, lng: 72.8295, formattedAddress: "Bandra, Mumbai, Maharashtra, India" },
  "delhi": { lat: 28.7041, lng: 77.1025, formattedAddress: "Delhi, India" },
  "connaught place": { lat: 28.6315, lng: 77.2167, formattedAddress: "Connaught Place, New Delhi, Delhi, India" },
  "pune": { lat: 18.5204, lng: 73.8567, formattedAddress: "Pune, Maharashtra, India" },
  "chennai": { lat: 13.0827, lng: 80.2707, formattedAddress: "Chennai, Tamil Nadu, India" },
};

/** Deterministic pseudo-random offset so an unrecognized query still resolves to a stable point. */
function fallbackCoordinatesFor(query: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash * 31 + query.charCodeAt(i)) % 100000;
  }
  const lat = 12 + (hash % 1000) / 1000;
  const lng = 77 + ((hash * 7) % 1000) / 1000;
  return { lat, lng };
}

async function geocodeMock(query: string): Promise<GeocodeResult> {
  const key = query.trim().toLowerCase();
  const known = KNOWN_LOCATIONS[key];
  if (known) return known;

  const { lat, lng } = fallbackCoordinatesFor(key);
  return { lat, lng, formattedAddress: query };
}

interface FoursquareAutocompleteResult {
  type: string;
  text: { primary: string; secondary?: string };
  geo?: { name: string; center: { latitude: number; longitude: number } };
  place?: { name: string; latitude: number; longitude: number };
}

/** Extracts coordinates regardless of whether Foursquare typed this result as "geo" or "place". */
function coordinatesOf(r: FoursquareAutocompleteResult): { lat: number; lng: number } | null {
  if (r.geo) return { lat: r.geo.center.latitude, lng: r.geo.center.longitude };
  if (r.place) return { lat: r.place.latitude, lng: r.place.longitude };
  return null;
}

async function foursquareAutocompleteRaw(
  query: string,
  types?: string,
): Promise<FoursquareAutocompleteResult[]> {
  requireFoursquareKey();

  const url = new URL(`${FOURSQUARE_BASE}/autocomplete`);
  url.searchParams.set("query", query);
  if (types) url.searchParams.set("types", types);

  const res = await fetch(url, { headers: foursquareHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw ApiError.badRequest(`Foursquare autocomplete failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { results?: FoursquareAutocompleteResult[] };
  return data.results ?? [];
}

/**
 * Prefers clean "geo" (locality/region) results, but many real neighborhoods
 * (e.g. "AECS Layout") aren't in Foursquare's geo index at all — only showing
 * up incidentally in a business name (a "place" result). Falling back to
 * unrestricted results means those areas still resolve instead of hard-failing.
 */
async function foursquareAutocomplete(query: string): Promise<FoursquareAutocompleteResult[]> {
  const geoResults = await foursquareAutocompleteRaw(query, "geo");
  if (geoResults.length > 0) return geoResults;
  return foursquareAutocompleteRaw(query);
}

async function geocodeReal(query: string): Promise<GeocodeResult> {
  const results = await foursquareAutocomplete(query);

  for (const r of results) {
    const coords = coordinatesOf(r);
    if (coords) {
      return { lat: coords.lat, lng: coords.lng, formattedAddress: r.text.primary };
    }
  }

  // Foursquare's free autocomplete has limited coverage for informal/hyperlocal
  // names (e.g. small residential layouts) — even city-qualified text doesn't
  // always help, since it really needs a geographic bias this app doesn't have
  // (no browser geolocation). A more prominent nearby landmark/neighborhood
  // name usually resolves fine.
  throw ApiError.badRequest(
    `Could not find "${query}" — try a more well-known nearby landmark or neighborhood name`,
  );
}

export async function geocodeLocation(query: string): Promise<GeocodeResult> {
  return env.useMockPlaces ? geocodeMock(query) : geocodeReal(query);
}

export interface AutocompleteSuggestion {
  placeId?: string;
  description: string;
  mainText: string;
  secondaryText?: string;
}

const AUTOCOMPLETE_POOL = [
  "Bangalore, Karnataka, India",
  "Koramangala, Bengaluru, Karnataka, India",
  "Indiranagar, Bengaluru, Karnataka, India",
  "HSR Layout, Bengaluru, Karnataka, India",
  "Whitefield, Bengaluru, Karnataka, India",
  "Jayanagar, Bengaluru, Karnataka, India",
  "Electronic City, Bengaluru, Karnataka, India",
  "MG Road, Bengaluru, Karnataka, India",
  "Hyderabad, Telangana, India",
  "Gachibowli, Hyderabad, Telangana, India",
  "Banjara Hills, Hyderabad, Telangana, India",
  "Jubilee Hills, Hyderabad, Telangana, India",
  "Hitech City, Hyderabad, Telangana, India",
  "Mumbai, Maharashtra, India",
  "Bandra, Mumbai, Maharashtra, India",
  "Andheri, Mumbai, Maharashtra, India",
  "Powai, Mumbai, Maharashtra, India",
  "Delhi, India",
  "Connaught Place, New Delhi, Delhi, India",
  "Saket, New Delhi, Delhi, India",
  "Pune, Maharashtra, India",
  "Koregaon Park, Pune, Maharashtra, India",
  "Chennai, Tamil Nadu, India",
  "Anna Nagar, Chennai, Tamil Nadu, India",
  "T Nagar, Chennai, Tamil Nadu, India",
];

function autocompletePlacesMock(input: string): AutocompleteSuggestion[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];

  return AUTOCOMPLETE_POOL.filter((entry) => entry.toLowerCase().includes(q))
    .slice(0, 8)
    .map((entry) => {
      const [mainText, ...rest] = entry.split(", ");
      return { description: entry, mainText, secondaryText: rest.join(", ") || undefined };
    });
}

async function autocompletePlacesReal(input: string): Promise<AutocompleteSuggestion[]> {
  const results = await foursquareAutocomplete(input);
  return results
    .filter((r) => coordinatesOf(r) !== null)
    .map((r) => ({
      description: r.text.primary,
      mainText: r.text.primary,
    }));
}

export async function autocompletePlaces(input: string): Promise<AutocompleteSuggestion[]> {
  return env.useMockPlaces ? autocompletePlacesMock(input) : autocompletePlacesReal(input);
}

// ---------------------------------------------------------------------------
// Nearby place search — Foursquare Places API free tier (mock fallback)
// ---------------------------------------------------------------------------

const NAME_TEMPLATES: Record<string, string[]> = {
  restaurant: [
    "Spice Route",
    "The Grand Thali",
    "Urban Tandoor",
    "Coastal Curry House",
    "Bombay Brasserie",
    "Green Chili Kitchen",
    "The Biryani Trail",
    "Saffron & Smoke",
    "Tiffin Box Diner",
    "The Curry Leaf",
  ],
  cafe: [
    "Brew & Bean",
    "The Daily Grind",
    "Cafe Mocha House",
    "Espresso Lane",
    "The Coffee Nook",
    "Roast & Toast",
    "Third Wave Coffee Co.",
    "The Filter Kaapi Stop",
  ],
  tourist_attraction: [
    "Heritage Fort View",
    "City Lake Gardens",
    "Old Town Museum",
    "Skyline Viewpoint",
    "Historic Clock Tower",
    "Riverside Heritage Walk",
  ],
  park: [
    "Central Green Park",
    "Riverside Park",
    "Botanical Gardens",
    "Sunset Hill Park",
    "Lakeside Promenade Park",
  ],
  mall: [
    "Grand Plaza Mall",
    "City Central Mall",
    "Horizon Shopping Complex",
    "Metro Square Mall",
    "The Galleria",
  ],
};

const ALL_CATEGORIES = Object.keys(NAME_TEMPLATES);

/** Plausible-sounding mock names for a category with no curated template (e.g. concierge-extracted categories like "dermatologist"). */
function genericNamesFor(category: string): string[] {
  const label = category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return [
    `${label} Point`,
    `The ${label} Studio`,
    `City ${label}`,
    `${label} Hub`,
    `Prime ${label}`,
  ];
}

const EARTH_RADIUS_METERS = 6371000;

function haversineDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(h));
}

/** Offsets a lat/lng by up to `radiusMeters` in a random direction. */
function randomPointWithin(center: { lat: number; lng: number }, radiusMeters: number) {
  const radiusInDegrees = radiusMeters / 111000; // ~111km per degree of latitude
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusInDegrees;
  return {
    lat: center.lat + distance * Math.cos(angle),
    lng: center.lng + distance * Math.sin(angle) / Math.cos((center.lat * Math.PI) / 180),
  };
}

async function searchNearbyPlacesMock(params: PlaceSearchParams): Promise<Place[]> {
  const categories = params.category ? [params.category] : ALL_CATEGORIES;
  const center = { lat: params.lat, lng: params.lng };
  const places: Place[] = [];

  categories.forEach((category) => {
    const names = NAME_TEMPLATES[category] ?? genericNamesFor(category);

    names.forEach((name, i) => {
      const point = randomPointWithin(center, params.radiusMeters);
      const distanceMeters = Math.round(haversineDistanceMeters(center, point));

      places.push({
        placeId: `mock-${category}-${i}-${Math.round(point.lat * 1e5)}-${Math.round(point.lng * 1e5)}`,
        name,
        category,
        rating: Math.round((3 + Math.random() * 2) * 10) / 10, // 3.0–5.0
        userRatingsTotal: Math.floor(20 + Math.random() * 2000),
        address: `${name}, near ${params.lat.toFixed(3)}, ${params.lng.toFixed(3)}`,
        lat: point.lat,
        lng: point.lng,
        distanceMeters,
        photoUrl: Math.random() > 0.35 ? `https://picsum.photos/seed/${category}-${i}/400/300` : null,
      });
    });
  });

  return places.filter((p) => p.distanceMeters <= params.radiusMeters);
}

interface FoursquareSearchResult {
  fsq_place_id?: string;
  fsq_id?: string;
  name: string;
  categories?: Array<{ name: string }>;
  location?: { formatted_address?: string; address?: string };
  latitude?: number;
  longitude?: number;
  geocodes?: { main?: { latitude: number; longitude: number } };
  distance?: number;
}

async function searchNearbyPlacesReal(params: PlaceSearchParams): Promise<Place[]> {
  requireFoursquareKey();

  const url = new URL(`${FOURSQUARE_BASE}/places/search`);
  url.searchParams.set("ll", `${params.lat},${params.lng}`);
  url.searchParams.set("radius", String(Math.min(params.radiusMeters, 100000)));
  url.searchParams.set("limit", "50");
  // Foursquare's real category system uses its own numeric ID taxonomy rather than
  // simple names — using `query` as a loose text filter is an approximation, not an
  // exact category match, since mapping every category to Foursquare's ID tree is out
  // of scope for this demo.
  if (params.category) {
    url.searchParams.set("query", params.category.replace("_", " "));
  }

  const res = await fetch(url, { headers: foursquareHeaders() });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw ApiError.badRequest(`Foursquare search failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { results?: FoursquareSearchResult[] };
  const center = { lat: params.lat, lng: params.lng };

  return (data.results ?? []).map((r) => {
    const lat = r.latitude ?? r.geocodes?.main?.latitude ?? center.lat;
    const lng = r.longitude ?? r.geocodes?.main?.longitude ?? center.lng;

    return {
      placeId: r.fsq_place_id ?? r.fsq_id ?? `${r.name}-${lat}-${lng}`,
      name: r.name,
      category: r.categories?.[0]?.name ?? params.category ?? "place",
      address: r.location?.formatted_address ?? r.location?.address ?? "",
      lat,
      lng,
      distanceMeters: r.distance ?? Math.round(haversineDistanceMeters(center, { lat, lng })),
      // Ratings, review counts, and photos are Premium (paid) fields on Foursquare's
      // free tier — intentionally omitted rather than faked.
      photoUrl: null,
    };
  });
}

export async function searchNearbyPlaces(params: PlaceSearchParams): Promise<Place[]> {
  const results = env.useMockPlaces
    ? await searchNearbyPlacesMock(params)
    : await searchNearbyPlacesReal(params);

  // Real results have no rating/review data, so a min-rating/min-reviews filter can't
  // meaningfully apply to them — leave those results in rather than filtering everything out.
  let filtered = results;
  if (params.minRating !== undefined) {
    filtered = filtered.filter((p) => p.rating === undefined || p.rating >= params.minRating!);
  }
  if (params.minReviews !== undefined) {
    filtered = filtered.filter(
      (p) => p.userRatingsTotal === undefined || p.userRatingsTotal >= params.minReviews!,
    );
  }

  const sortBy = params.sortBy ?? "distance";
  filtered.sort((a, b) => {
    if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    if (sortBy === "reviews") return (b.userRatingsTotal ?? 0) - (a.userRatingsTotal ?? 0);
    return a.distanceMeters - b.distanceMeters;
  });

  return filtered;
}
