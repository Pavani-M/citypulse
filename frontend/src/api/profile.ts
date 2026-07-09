import { apiClient } from "./client";
import type { BusinessRequest } from "@/types";

export async function listUpvotedRequests() {
  const res = await apiClient.get<{ requests: BusinessRequest[] }>("/me/upvoted-requests");
  return res.data.requests;
}

export async function listMyRequests() {
  const res = await apiClient.get<{ requests: BusinessRequest[] }>("/me/my-requests");
  return res.data.requests;
}
