import { apiClient } from "./client";
import type { Tip, TipSort } from "@/types";

export async function listTips(placeId: string, sort: TipSort = "helpful") {
  const res = await apiClient.get<{ tips: Tip[] }>(`/places/${encodeURIComponent(placeId)}/tips`, {
    params: { sort },
  });
  return res.data.tips;
}

export async function createTip(placeId: string, body: string) {
  const res = await apiClient.post<{ tip: Tip }>(`/places/${encodeURIComponent(placeId)}/tips`, { body });
  return res.data.tip;
}

export async function updateTip(placeId: string, tipId: string, body: string) {
  const res = await apiClient.patch<{ tip: Tip }>(
    `/places/${encodeURIComponent(placeId)}/tips/${tipId}`,
    { body },
  );
  return res.data.tip;
}

export async function deleteTip(placeId: string, tipId: string) {
  await apiClient.delete(`/places/${encodeURIComponent(placeId)}/tips/${tipId}`);
}

export async function voteTip(placeId: string, tipId: string, value: 1 | -1) {
  const res = await apiClient.post<{ tip: Tip }>(
    `/places/${encodeURIComponent(placeId)}/tips/${tipId}/vote`,
    { value },
  );
  return res.data.tip;
}

export async function reportTip(placeId: string, tipId: string) {
  const res = await apiClient.post<{ tip: Tip }>(
    `/places/${encodeURIComponent(placeId)}/tips/${tipId}/report`,
  );
  return res.data.tip;
}

export async function pinTip(placeId: string, tipId: string, pinned: boolean) {
  const res = await apiClient.patch<{ tip: Tip }>(
    `/places/${encodeURIComponent(placeId)}/tips/${tipId}/pin`,
    { pinned },
  );
  return res.data.tip;
}
