import "server-only";

import axios, { type AxiosRequestConfig } from "axios";
import { cookies } from "next/headers";
import { API_BASE_URL, AUTH_COOKIE } from "../config";

async function authHeaders() {
  const authToken = (await cookies()).get(AUTH_COOKIE)?.value;

  return {
    Accept: "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

export async function createServerApi() {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: await authHeaders(),
    validateStatus: () => true,
  });
}

export async function forwardToApi(
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string,
  options?: { body?: unknown; config?: AxiosRequestConfig },
): Promise<{ status: number; data: unknown }> {
  const api = await createServerApi();

  const response = await api.request({
    method,
    url: path,
    data: options?.body,
    ...options?.config,
  });

  return { status: response.status, data: response.data };
}

export async function forwardFormToApi(
  method: "post" | "put",
  path: string,
  formData: FormData,
): Promise<{ status: number; data: unknown }> {
  const api = await createServerApi();

  const response = await api.request({
    method,
    url: path,
    data: formData,
  });

  return { status: response.status, data: response.data };
}

export async function forwardToGraphql(
  body: unknown,
): Promise<{ status: number; data: unknown }> {
  const laravelOrigin = API_BASE_URL.replace(/\/api$/, "");

  const api = axios.create({
    baseURL: laravelOrigin,
    headers: {
      ...(await authHeaders()),
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });

  const response = await api.post("/graphql", body);

  return { status: response.status, data: response.data };
}
