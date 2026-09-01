export type TargetAuthType = "cookie" | "bearer";

export interface TargetSessionReplayMeta {
  cookie_count: number;
  route_count: number;
  has_storage: boolean;
  has_user_agent: boolean;
}

export interface TargetSessionStatus {
  connected: boolean;
  auth_type?: TargetAuthType;
  header_names?: string[];
  replay?: TargetSessionReplayMeta;
  expires_at?: string | null;
  updated_at?: string;
}

export type TargetSessionConnectStartResponse = {
  message: string;
  ticket: string;
  mode: "same_origin" | "external";
  popup_url: string;
  open_url?: string;
  capture_callback_url: string | null;
  capture_api_base?: string;
  target_origin?: string;
  client_origin?: string;
  extension_supported?: boolean;
  expires_at?: string;
};

export interface StoreTargetSessionInput {
  auth_type: TargetAuthType;
  credential: string;
  expires_at?: string | null;
}

export interface StoreTargetSessionResponse extends TargetSessionStatus {
  message: string;
}
