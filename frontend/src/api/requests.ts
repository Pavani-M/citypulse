import { apiClient } from "./client";
import type {
  BusinessRequest,
  RequestCategory,
  RequestComment,
  RequestStatus,
  RequestUpdate,
} from "@/types";

export interface ListRequestsParams {
  targetCity?: string;
  category?: RequestCategory;
  status?: RequestStatus;
  sort?: "top" | "new";
  page?: number;
  pageSize?: number;
}

export async function listRequests(params: ListRequestsParams = {}) {
  const res = await apiClient.get<{ requests: BusinessRequest[]; page: number; pageSize: number }>(
    "/requests",
    { params },
  );
  return res.data;
}

export async function getRequest(id: string) {
  const res = await apiClient.get<{
    request: BusinessRequest;
    updates: RequestUpdate[];
    comments: RequestComment[];
  }>(`/requests/${id}`);
  return res.data;
}

export async function createRequest(input: {
  businessName: string;
  sourceCity: string;
  targetCity: string;
  category: RequestCategory;
  description?: string;
}) {
  const res = await apiClient.post<{ request: BusinessRequest }>("/requests", input);
  return res.data.request;
}

export async function upvoteRequest(id: string) {
  const res = await apiClient.post<{ request: BusinessRequest }>(`/requests/${id}/upvote`);
  return res.data.request;
}

export async function removeUpvote(id: string) {
  const res = await apiClient.delete<{ request: BusinessRequest }>(`/requests/${id}/upvote`);
  return res.data.request;
}

export async function postRequestUpdate(id: string, input: { message: string; status?: RequestStatus }) {
  const res = await apiClient.post<{ update: RequestUpdate }>(`/requests/${id}/updates`, input);
  return res.data.update;
}

export async function postComment(id: string, content: string) {
  const res = await apiClient.post<{ comment: RequestComment }>(`/requests/${id}/comments`, {
    content,
  });
  return res.data.comment;
}
