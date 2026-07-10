export type UserRole = "user" | "business_rep" | "admin";

export type RequestCategory = "restaurant" | "cafe" | "retail" | "entertainment" | "other";

export type RequestStatus = "Requested" | "Under Review" | "Planned" | "Coming Soon" | "Not Planned";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface BusinessRequest {
  id: string;
  businessName: string;
  sourceCity: string;
  targetCity: string;
  category: RequestCategory;
  description: string | null;
  createdBy?: string;
  upvoteCount: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt?: string;
  isUpvotedByMe?: boolean;
}

export interface RequestUpdate {
  id: string;
  requestId: string;
  postedBy: string;
  postedByName: string | null;
  status: RequestStatus | null;
  message: string;
  createdAt: string;
}

export interface RequestComment {
  id: string;
  requestId: string;
  userId: string;
  userName: string | null;
  content: string;
  createdAt: string;
}

export interface Place {
  placeId: string;
  name: string;
  category: string;
  // Undefined when using the real (Foursquare free-tier) provider, which doesn't
  // include ratings/review counts — only present in mock mode.
  rating?: number;
  userRatingsTotal?: number;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  photoUrl: string | null;
}

export interface CollectionPlace {
  placeId: string;
  name: string;
  category: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  savedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  places: CollectionPlace[];
}

export type VisitPrivacy = "public" | "private" | "friends";

export interface Visit {
  id: string;
  placeId: string;
  placeName: string;
  placeCategory: string | null;
  placeAddress: string | null;
  placePhotoUrl: string | null;
  visitDate: string;
  purpose: string | null;
  servicesUsed: string[];
  itemsPurchased: string[];
  amountSpent: number | null;
  rating: number | null;
  waitingMinutes: number | null;
  photos: string[];
  notes: string | null;
  wouldVisitAgain: boolean | null;
  privacy: VisitPrivacy;
  createdAt: string;
  updatedAt: string;
}

export interface VisitStats {
  totalVisits: number;
  totalSpent: number;
  categoriesVisited: number;
  favoriteCategory: string | null;
  monthlyActivity: Array<{ month: string; count: number }>;
}

export const VISIT_PRIVACY_OPTIONS: VisitPrivacy[] = ["private", "friends", "public"];

export type TipSort = "helpful" | "newest" | "verified" | "pinned";

export interface Tip {
  id: string;
  placeId: string;
  userId: string;
  userName: string | null;
  userRole: UserRole;
  body: string;
  upvoteCount: number;
  downvoteCount: number;
  reportCount: number;
  isPinned: boolean;
  myVote: 1 | -1 | null;
  isReportedByMe: boolean;
  isTopContributor: boolean;
  createdAt: string;
  updatedAt: string;
}

export const TIP_SORT_OPTIONS: TipSort[] = ["helpful", "newest", "verified", "pinned"];

export const REQUEST_CATEGORIES: RequestCategory[] = [
  "restaurant",
  "cafe",
  "retail",
  "entertainment",
  "other",
];

export const REQUEST_STATUSES: RequestStatus[] = [
  "Requested",
  "Under Review",
  "Planned",
  "Coming Soon",
  "Not Planned",
];

export const PLACE_CATEGORIES = ["restaurant", "cafe", "tourist_attraction", "park", "mall"] as const;

export const SEARCH_RADII_METERS = [1000, 3000, 5000, 10000] as const;

export interface ConciergeItineraryStop {
  time: string;
  label: string;
  placeId: string | null;
  placeName: string;
  category: string;
  estimatedCostInr: number;
  distanceMeters: number | null;
}

export interface ConciergeItineraryResult {
  stops: ConciergeItineraryStop[];
  estimatedTotalCostInr: number;
  drivingDistanceKm: number | null;
  parkingAvailable: boolean;
  notes: string | null;
}

export interface ConciergeRecommendationItem {
  placeId: string | null;
  placeName: string;
  reason: string;
  estimatedCostInr: number | null;
  distanceMeters: number | null;
  rating: number | null;
}

export interface ConciergeRecommendationResult {
  items: ConciergeRecommendationItem[];
  notes: string | null;
}

export type ConciergeResponse =
  | { type: "itinerary"; result: ConciergeItineraryResult; usedPlaceIds: string[] }
  | { type: "recommendation"; result: ConciergeRecommendationResult; usedPlaceIds: string[] };
