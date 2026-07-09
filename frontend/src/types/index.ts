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
