import { apiClient } from "./client";
import type { Place } from "@/types";

export interface SearchPlacesParams {
  location: string;
  category?: string;
  minRating?: number;
  minReviews?: number;
  radiusMeters?: number;
  sortBy?: "rating" | "reviews" | "distance";
}

export interface SearchPlacesResult {
  center: { lat: number; lng: number; formattedAddress: string };
  places: Place[];
}

export async function searchPlaces(params: SearchPlacesParams): Promise<SearchPlacesResult> {
  const res = await apiClient.get<SearchPlacesResult>("/places/search", { params });
  return res.data;
}
