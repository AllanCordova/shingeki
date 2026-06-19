export type TargetAuthType = "cookie" | "bearer";

export interface TargetSessionStatus {
  connected: boolean;
  auth_type?: TargetAuthType;
  header_names?: string[];
  expires_at?: string | null;
  updated_at?: string;
}

export interface StoreTargetSessionInput {
  auth_type: TargetAuthType;
  credential: string;
  expires_at?: string | null;
}

export interface StoreTargetSessionResponse extends TargetSessionStatus {
  message: string;
}
