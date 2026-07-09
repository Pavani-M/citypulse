import { apiClient } from "./client";
import type { Visit, VisitPrivacy, VisitStats } from "@/types";

export interface VisitInput {
  placeId: string;
  placeName: string;
  placeCategory?: string | null;
  placeAddress?: string | null;
  placePhotoUrl?: string | null;
  visitDate: string;
  purpose?: string | null;
  servicesUsed?: string[];
  itemsPurchased?: string[];
  amountSpent?: number | null;
  rating?: number | null;
  waitingMinutes?: number | null;
  photos?: string[];
  notes?: string | null;
  wouldVisitAgain?: boolean | null;
  privacy: VisitPrivacy;
}

export type VisitUpdateInput = Partial<
  Omit<VisitInput, "placeId" | "placeName" | "placeCategory" | "placeAddress" | "placePhotoUrl">
>;

export async function listVisits(placeId?: string) {
  const res = await apiClient.get<{ visits: Visit[] }>("/me/visits", {
    params: placeId ? { placeId } : undefined,
  });
  return res.data.visits;
}

export async function getVisitStats() {
  const res = await apiClient.get<VisitStats>("/me/visits/stats");
  return res.data;
}

export async function createVisit(input: VisitInput) {
  const res = await apiClient.post<{ visit: Visit }>("/me/visits", input);
  return res.data.visit;
}

export async function updateVisit(visitId: string, input: VisitUpdateInput) {
  const res = await apiClient.patch<{ visit: Visit }>(`/me/visits/${visitId}`, input);
  return res.data.visit;
}

export async function deleteVisit(visitId: string) {
  await apiClient.delete(`/me/visits/${visitId}`);
}
