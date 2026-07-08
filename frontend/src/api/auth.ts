import { apiClient } from "./client";
import type { PublicUser, UserRole } from "@/types";

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  role?: Extract<UserRole, "user" | "business_rep">;
}): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>("/auth/register", input);
  return res.data;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>("/auth/login", input);
  return res.data;
}

export async function fetchMe(): Promise<PublicUser> {
  const res = await apiClient.get<{ user: PublicUser }>("/auth/me");
  return res.data.user;
}
