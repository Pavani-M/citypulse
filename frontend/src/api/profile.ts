import { apiClient } from "./client";
import type { BusinessRequest, Place, SavedPlace } from "@/types";

export async function listSavedPlaces() {
  const res = await apiClient.get<{ savedPlaces: SavedPlace[] }>("/me/saved-places");
  return res.data.savedPlaces;
}

export async function savePlace(place: Place) {
  const res = await apiClient.post<{ savedPlace: SavedPlace }>("/me/saved-places", {
    placeId: place.placeId,
    name: place.name,
    address: place.address,
    category: place.category,
    rating: place.rating,
    userRatingsTotal: place.userRatingsTotal,
    lat: place.lat,
    lng: place.lng,
    photoUrl: place.photoUrl,
  });
  return res.data.savedPlace;
}

export async function unsavePlace(placeId: string) {
  await apiClient.delete(`/me/saved-places/${encodeURIComponent(placeId)}`);
}

export async function listUpvotedRequests() {
  const res = await apiClient.get<{ requests: BusinessRequest[] }>("/me/upvoted-requests");
  return res.data.requests;
}

export async function listMyRequests() {
  const res = await apiClient.get<{ requests: BusinessRequest[] }>("/me/my-requests");
  return res.data.requests;
}
