import { z } from "zod";

const MAX_COVER_BYTES = 5 * 1024 * 1024;

export type CoverImageAsset = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

export function isCoverImageAsset(value: unknown): value is CoverImageAsset {
  return (
    typeof value === "object" &&
    value !== null &&
    "uri" in value &&
    typeof (value as CoverImageAsset).uri === "string" &&
    "name" in value &&
    "type" in value
  );
}

export const coverAssetSchema = z
  .custom<CoverImageAsset>(
    (value) => isCoverImageAsset(value),
    { message: "Selecione uma imagem de capa." },
  )
  .refine((asset) => asset.size === undefined || asset.size <= MAX_COVER_BYTES, {
    message: "A imagem deve ter no maximo 5 MB.",
  })
  .refine((asset) => asset.type.startsWith("image/"), {
    message: "O arquivo deve ser uma imagem.",
  });

export const optionalCoverAssetSchema = coverAssetSchema.optional();
