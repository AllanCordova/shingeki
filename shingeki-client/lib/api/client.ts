import axios from "axios";
import { toApiError } from "./error-handler";

/**
 * Cliente HTTP do browser.
 *
 * Fala sempre com as rotas internas do Next em /api (mesmo origin). Essas rotas
 * (BFF) leem o token do cookie http-only e repassam para a API Laravel. Por isso
 * o browser nunca enxerga o token — apenas envia o cookie automaticamente.
 *
 * Qualquer erro e normalizado para {@link ApiError} (mensagens em portugues).
 */
export const apiClient = axios.create({
  baseURL: "/api",
  headers: { Accept: "application/json" },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
);
