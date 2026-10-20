import type { AttackDepth } from "./attack";
import type { DastRouteMapEntry } from "./route-map";

export type SessionCaptureStatus = "pending" | "completed" | "expired";

export interface SessionCapture {
  id: string;
  status: SessionCaptureStatus;
  expires_at: string;
  login_url?: string;
  dispatch_id: string | null;
}

export interface SessionCaptureCreated {
  capture: SessionCapture;
  token: string;
  remote_available: boolean;
}

export interface SessionCaptureScope {
  depth: AttackDepth;
  start_path?: string;
  max_routes?: number;
  route_map?: DastRouteMapEntry[];
}
