import { z } from "zod";
import type { Timestamps } from "../common/common";
import { ATTACK_TARGET_LOCATIONS } from "../catalog/catalog-attack";
import { zJsonObjectString } from "../common/zod-helpers";

export const manualProxyMethods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type ManualProxyMethod = (typeof manualProxyMethods)[number];

export const manualProxySendSchema = z.object({
  method: z.enum(manualProxyMethods),
  path: z.string().min(1, "Informe o caminho da rota.").startsWith("/", "Use um caminho relativo, ex: /login"),
  query_json: zJsonObjectString("Query deve ser um objeto JSON valido.").default("{}"),
  headers_json: zJsonObjectString("Headers deve ser um objeto JSON valido.").default("{}"),
  body: z.string().optional(),
  content_type: z.string().optional(),
  use_target_session: z.boolean().default(true),
  apply_payload: z.boolean().default(false),
  payload_target_location: z.enum(ATTACK_TARGET_LOCATIONS).optional(),
  payload_field: z.string().optional(),
  payload_value: z.string().optional(),
});

export type ManualProxySendInput = z.infer<typeof manualProxySendSchema>;

export interface ManualProxySendPayload {
  method: ManualProxyMethod;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  content_type?: string;
  use_target_session?: boolean;
  payload?: {
    target_location: string;
    field?: string;
    value?: string;
  };
}

export interface ManualProxySendResponse {
  message: string;
  url: string;
  method: ManualProxyMethod;
  request_dump: string;
  status_code: number;
  response_headers: Record<string, string[]>;
  response_body: string;
  response_body_truncated: boolean;
  duration_ms: number;
}

export interface ManualRouteMap extends Timestamps {
  id: string;
  system_id: string;
  name: string;
  method: ManualProxyMethod;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
  content_type: string | null;
  notes: string | null;
}

export interface ManualRouteMapsResponse {
  routes: ManualRouteMap[];
}

export interface ManualRouteMapResponse {
  message: string;
  route: ManualRouteMap;
}

export const manualRouteMapSchema = z.object({
  name: z.string().min(1, "Informe um nome para a rota."),
  method: z.enum(manualProxyMethods),
  path: z.string().min(1).startsWith("/"),
  query_json: z.string().default("{}"),
  headers_json: z.string().default("{}"),
  body: z.string().optional(),
  content_type: z.string().optional(),
  notes: z.string().optional(),
});

export type ManualRouteMapInput = z.infer<typeof manualRouteMapSchema>;

export function parseJsonRecord(value: string): Record<string, string> {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  if (Array.isArray(parsed)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, entry]) => [key, String(entry ?? "")]),
  );
}

function emptyRecordOrNull(record: Record<string, string>): Record<string, string> | null {
  return Object.keys(record).length > 0 ? record : null;
}

function recordToJson(value: Record<string, string> | null | undefined): string {
  if (!value || Array.isArray(value)) {
    return "{}";
  }

  return JSON.stringify(value, null, 2);
}

export function buildManualProxyPayload(input: ManualProxySendInput): ManualProxySendPayload {
  const payload: ManualProxySendPayload = {
    method: input.method,
    path: input.path,
    query: parseJsonRecord(input.query_json),
    headers: parseJsonRecord(input.headers_json),
    body: input.body,
    content_type: input.content_type,
    use_target_session: input.use_target_session,
  };

  if (input.apply_payload && input.payload_target_location) {
    payload.payload = {
      target_location: input.payload_target_location,
      field: input.payload_field,
      value: input.payload_value,
    };
  }

  return payload;
}

export function buildRouteMapPayload(input: ManualRouteMapInput) {
  return {
    name: input.name,
    method: input.method,
    path: input.path,
    query: emptyRecordOrNull(parseJsonRecord(input.query_json)),
    headers: emptyRecordOrNull(parseJsonRecord(input.headers_json)),
    body: input.body,
    content_type: input.content_type,
    notes: input.notes,
  };
}

export function routeMapToSendInput(route: ManualRouteMap): ManualProxySendInput {
  return {
    method: route.method,
    path: route.path,
    query_json: recordToJson(route.query),
    headers_json: recordToJson(route.headers),
    body: route.body ?? "",
    content_type: route.content_type ?? undefined,
    use_target_session: true,
    apply_payload: false,
  };
}
