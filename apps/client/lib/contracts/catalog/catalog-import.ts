import type { Timestamps } from "../common/common";

export type CatalogImportStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type CatalogImportType = "ATTACKS" | "REMEDIATIONS";

export interface CatalogImportRowError {
  row: number | null;
  messages: string[];
}

export interface CatalogImport extends Timestamps {
  id: string;
  type: CatalogImportType;
  status: CatalogImportStatus;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  failed_count: number;
  row_errors: CatalogImportRowError[];
  started_at: string | null;
  completed_at: string | null;
}

export interface CatalogImportResponse {
  message: string;
  import: CatalogImport;
  validation_errors?: CatalogImportRowError[];
}

export interface CatalogImportStatusResponse {
  import: CatalogImport;
}
