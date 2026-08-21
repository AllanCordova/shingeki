import axios from "axios";
import { toApiError } from "./error-handler";

export const apiClient = axios.create({
  baseURL: "/api",
  headers: { Accept: "application/json" },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
);
