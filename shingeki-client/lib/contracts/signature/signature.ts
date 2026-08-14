import type { Timestamps } from "../common/common";

export type SignatureStatus = "permitted" | "revoked" | "pending";

export interface Signature extends Timestamps {
  id: string;
  user_id: string;
  system_id: string;
  ip_address: string;
  status: SignatureStatus;
  expiration: string | null;
  token?: string;
}

export interface SignatureGenerateResponse {
  message: string;
  signature: Signature;
  installation: {
    meta_name: string;
    example: string;
  };
}

export interface SignatureValidateResponse {
  message: string;
  exists: boolean;
  found_in_html?: boolean;
  permitted: boolean;
  signature?: Signature;
}
