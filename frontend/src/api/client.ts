import axios from "axios";

const TOKEN_KEY = "citywish_token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// In local dev, "/api" is caught by Vite's dev-server proxy (see vite.config.ts).
// In production there's no such proxy — set VITE_API_URL to the deployed
// backend's base URL, e.g. https://citywish-backend.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL ?? "/api";

export const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorResponse {
  error: string;
  details?: Array<{ path: string; message: string }>;
}

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(err)) {
    return err.response?.data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
