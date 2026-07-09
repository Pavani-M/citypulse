export type UserRole = "user" | "business_rep" | "admin";

export type RequestCategory = "restaurant" | "cafe" | "retail" | "entertainment" | "other";

export type RequestStatus = "Requested" | "Under Review" | "Planned" | "Coming Soon" | "Not Planned";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface BusinessRequest {
  id: string;
  business_name: string;
  source_city: string;
  target_city: string;
  category: RequestCategory;
  description: string | null;
  created_by: string;
  upvote_count: number;
  status: RequestStatus;
  created_at: Date;
  updated_at: Date;
}

export interface RequestUpdateRow {
  id: string;
  request_id: string;
  posted_by: string;
  status: RequestStatus | null;
  message: string;
  created_at: Date;
}

export interface CommentRow {
  id: string;
  request_id: string;
  user_id: string;
  content: string;
  created_at: Date;
}

export interface SavedPlaceRow {
  id: string;
  user_id: string;
  place_id: string;
  name: string;
  address: string | null;
  category: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  created_at: Date;
}

export interface Place {
  placeId: string;
  name: string;
  category: string;
  // Undefined when sourced from a free-tier provider that doesn't expose ratings
  // (e.g. Foursquare's free tier) — the UI hides the rating row in that case.
  rating?: number;
  userRatingsTotal?: number;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  photoUrl: string | null;
}

/** Augments Express's Request with the authenticated user, set by requireAuth. */
export interface AuthPayload {
  userId: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}
