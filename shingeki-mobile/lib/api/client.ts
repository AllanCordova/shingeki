import axios from "axios";
import { clearToken, getToken } from "./auth-storage";
import { toApiError } from "./error-handler";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000/api";

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const apiError = toApiError(error);
    if (apiError.status === 401) {
      await clearToken();
      unauthorizedHandler?.();
    }
    return Promise.reject(apiError);
  },
);
