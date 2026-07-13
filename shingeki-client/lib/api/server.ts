import "server-only";

import axios, { type AxiosRequestConfig } from "axios";
import { cookies } from "next/headers";
import { API_BASE_URL, AUTH_COOKIE } from "../config";

/**
 * Cria um cliente axios server-side apontando para a API Laravel.
 * Anexa o token Sanctum (lido do cookie http-only) quando disponivel.
 *
 * Usado exclusivamente nos route handlers (BFF). Nunca importar no browser.
 */
export async function createServerApi(token?: string) {
  const authToken = token ?? (await cookies()).get(AUTH_COOKIE)?.value;

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Accept: "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    // Repassa o status real da Laravel para tratarmos no route handler.
    validateStatus: () => true,
  });
}

/**
 * Encaminha uma requisicao para a API Laravel e devolve a resposta crua
 * (status + corpo), para o route handler repassar ao browser.
 */
export async function forwardToApi(
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string,
  options?: { body?: unknown; token?: string; config?: AxiosRequestConfig },
): Promise<{ status: number; data: unknown }> {
  const api = await createServerApi(options?.token);

  const response = await api.request({
    method,
    url: path,
    data: options?.body,
    ...options?.config,
  });

  return { status: response.status, data: response.data };
}

/** Encaminha multipart/form-data para a API Laravel. */
export async function forwardFormToApi(
  method: "post" | "put",
  path: string,
  formData: FormData,
  options?: { token?: string },
): Promise<{ status: number; data: unknown }> {
  const api = await createServerApi(options?.token);

  const response = await api.request({
    method,
    url: path,
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });

  return { status: response.status, data: response.data };
}

/**
 * Encaminha operacoes GraphQL ao Lighthouse em /graphql
 * (fora do prefixo /api usado pelo REST).
 */
export async function forwardToGraphql(
  body: unknown,
  options?: { token?: string },
): Promise<{ status: number; data: unknown }> {
  const authToken = options?.token ?? (await cookies()).get(AUTH_COOKIE)?.value;
  const laravelOrigin = API_BASE_URL.replace(/\/api$/, "");

  const api = axios.create({
    baseURL: laravelOrigin,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    validateStatus: () => true,
  });

  const response = await api.post("/graphql", body);

  return { status: response.status, data: response.data };
}
