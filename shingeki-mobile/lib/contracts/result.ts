import type { Timestamps } from "./common";
import type { AttackDispatch } from "./attack";

export interface SystemResult extends Timestamps {
  id: string;
  system_id: string;
  attack_dispatch_id: string;
  attack_id: string | null;
  vulnerable_route: string | null;
  payload_used: string | null;
  evidence: string | null;
  http_request: string | null;
  attack?: {
    id: string;
    category: string;
    target_location: string;
    risk_level: string;
  };
}

export interface DispatchesResponse {
  dispatches: AttackDispatch[];
}

export interface ResultsResponse {
  dispatch: AttackDispatch;
  results: SystemResult[];
}
