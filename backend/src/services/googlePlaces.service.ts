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

// ---------------------------------------------------------------------------
// Geocoding
// ---------------------------------------------------------------------------

/** A handful of well-known localities so common demo searches resolve to real coordinates. */
const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; formattedAddress: string }> = {
  "bangalore": { lat: 12.9716, lng: 77.5946, formattedAddress: "Bangalore, Karnataka, India" },
  "bengaluru": { lat: 12.9716, lng: 77.5946, formattedAddress: "Bengaluru, Karnataka, India" },
  "koramangala": { lat: 12.9352, lng: 77.6245, formattedAddress: "Koramangala, Bengaluru, Karnataka, India" },
  "indiranagar": { lat: 12.9719, lng: 77.6412, formattedAddress: "Indiranagar, Bengaluru, Karnataka, India" },
  "hyderabad": { lat: 17.385, lng: 78.4867, formattedAddress: "Hyderabad, Telangana, India" },
  "gachibowli": { lat: 17.4401, lng: 78.3489, formattedAddress: "Gachibowli, Hyderabad, Telangana, India" },
  "banjara hills": { lat: 17.4156, lng: 78.4347, formattedAddress: "Banjara Hills, Hyderabad, Telangana, India" },
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
  // Keeps the fallback roughly within India's bounding box for demo plausibility.
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

async function geocodeReal(query: string): Promise<GeocodeResult> {
  if (!env.googleGeocodingApiKey) {
    throw ApiError.badRequest(
      "GOOGLE_GEOCODING_API_KEY is not set. Set USE_MOCK_PLACES=true or provide a key.",
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", env.googleGeocodingApiKey);

  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };

  if (data.status !== "OK" || !data.results.length) {
    throw ApiError.badRequest(`Could not geocode "${query}" (${data.status})`);
  }

  const [result] = data.results;
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

export async function geocodeLocation(query: string): Promise<GeocodeResult> {
  return env.useMockPlaces ? geocodeMock(query) : geocodeReal(query);
}

// ---------------------------------------------------------------------------
// Nearby place search
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
    const names = NAME_TEMPLATES[category] ?? NAME_TEMPLATES.restaurant;

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

async function searchNearbyPlacesReal(params: PlaceSearchParams): Promise<Place[]> {
  if (!env.googlePlacesApiKey) {
    throw ApiError.badRequest(
      "GOOGLE_PLACES_API_KEY is not set. Set USE_MOCK_PLACES=true or provide a key.",
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${params.lat},${params.lng}`);
  url.searchParams.set("radius", String(params.radiusMeters));
  if (params.category) url.searchParams.set("type", params.category);
  url.searchParams.set("key", env.googlePlacesApiKey);

  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results: Array<{
      place_id: string;
      name: string;
      types: string[];
      rating?: number;
      user_ratings_total?: number;
      vicinity?: string;
      geometry: { location: { lat: number; lng: number } };
      photos?: Array<{ photo_reference: string }>;
    }>;
  };

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw ApiError.badRequest(`Places search failed (${data.status})`);
  }

  const center = { lat: params.lat, lng: params.lng };

  return (data.results ?? []).map((r) => ({
    placeId: r.place_id,
    name: r.name,
    category: params.category ?? r.types[0] ?? "other",
    rating: r.rating ?? 0,
    userRatingsTotal: r.user_ratings_total ?? 0,
    address: r.vicinity ?? "",
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    distanceMeters: Math.round(haversineDistanceMeters(center, r.geometry.location)),
    photoUrl: r.photos?.[0]
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${r.photos[0].photo_reference}&key=${env.googlePlacesApiKey}`
      : null,
  }));
}

export async function searchNearbyPlaces(params: PlaceSearchParams): Promise<Place[]> {
  const results = env.useMockPlaces
    ? await searchNearbyPlacesMock(params)
    : await searchNearbyPlacesReal(params);

  let filtered = results;
  if (params.minRating !== undefined) {
    filtered = filtered.filter((p) => p.rating >= params.minRating!);
  }
  if (params.minReviews !== undefined) {
    filtered = filtered.filter((p) => p.userRatingsTotal >= params.minReviews!);
  }

  const sortBy = params.sortBy ?? "distance";
  filtered.sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "reviews") return b.userRatingsTotal - a.userRatingsTotal;
    return a.distanceMeters - b.distanceMeters;
  });

  return filtered;
}
