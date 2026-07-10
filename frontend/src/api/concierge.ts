import { apiClient } from "./client";
import type { ConciergeResponse } from "@/types";

export async function queryConcierge(
  message: string,
  opts?: { near?: string; excludePlaceIds?: string[] },
) {
  const res = await apiClient.post<ConciergeResponse>("/concierge", {
    message,
    near: opts?.near,
    excludePlaceIds: opts?.excludePlaceIds ?? [],
  });
  return res.data;
}
