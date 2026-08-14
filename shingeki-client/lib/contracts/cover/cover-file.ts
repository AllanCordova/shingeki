import { z } from "zod";

const MAX_COVER_BYTES = 5 * 1024 * 1024;

export const coverFileSchema = z
  .instanceof(File, { message: "Selecione uma imagem de capa." })
  .refine((file) => file.size <= MAX_COVER_BYTES, {
    message: "A imagem deve ter no maximo 5 MB.",
  })
  .refine((file) => file.type.startsWith("image/"), {
    message: "O arquivo deve ser uma imagem.",
  });

export const optionalCoverFileSchema = coverFileSchema.optional();
