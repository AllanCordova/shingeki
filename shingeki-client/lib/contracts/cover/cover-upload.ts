import type { Timestamps } from "./common";

export interface CoverUpload extends Timestamps {
  id: string;
  path: string;
}

export interface CoverUploadsResponse {
  limit: number;
  count: number;
  cover_uploads: CoverUpload[];
}
