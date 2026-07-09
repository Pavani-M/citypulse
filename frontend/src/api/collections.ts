import { apiClient } from "./client";
import type { Collection, CollectionPlace, Place } from "@/types";

export async function listCollections() {
  const res = await apiClient.get<{ collections: Collection[] }>("/me/collections");
  return res.data.collections;
}

export async function createCollection(name: string) {
  const res = await apiClient.post<{ collection: Collection }>("/me/collections", { name });
  return res.data.collection;
}

export async function renameCollection(collectionId: string, name: string) {
  const res = await apiClient.patch<{ collection: Collection }>(`/me/collections/${collectionId}`, {
    name,
  });
  return res.data.collection;
}

export async function deleteCollection(collectionId: string) {
  await apiClient.delete(`/me/collections/${collectionId}`);
}

export async function addPlaceToCollection(collectionId: string, place: Place) {
  const res = await apiClient.post<{ place: CollectionPlace }>(`/me/collections/${collectionId}/places`, {
    placeId: place.placeId,
    name: place.name,
    category: place.category,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    photoUrl: place.photoUrl,
  });
  return res.data.place;
}

export async function removePlaceFromCollection(collectionId: string, placeId: string) {
  await apiClient.delete(`/me/collections/${collectionId}/places/${encodeURIComponent(placeId)}`);
}
