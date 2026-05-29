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
  method: "get" | "post" | "put" | "delete",
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
