import axios from "axios";

const TOKEN_KEY = "citypulse_token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// In local dev, "/api" is caught by Vite's dev-server proxy (see vite.config.ts).
// In production there's no such proxy — set VITE_API_URL to the deployed
// backend's base URL, e.g. https://citypulse-backend.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL ?? "/api";

export const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Guards against a misconfigured API URL (or an SPA rewrite catching /api/*)
// silently handing back index.html instead of a real API error. Without this,
// a 200 OK HTML body reaches component state as-is, and the first `.length`
// or `.map()` on the missing expected field crashes the whole page.
apiClient.interceptors.response.use((response) => {
  const contentType = String(response.headers["content-type"] ?? "");
  if (!contentType.includes("application/json")) {
    return Promise.reject(
      new Error(
        "Unexpected response from the API (not JSON) — check that VITE_API_URL points to a running backend.",
      ),
    );
  }
  return response;
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
