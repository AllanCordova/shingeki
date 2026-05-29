import { z } from "zod";
import type { Timestamps } from "./common";
import { coverPathSchema } from "./cover-path";

export const systemCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Informe o nome do sistema.")
    .max(255, "O nome deve ter no maximo 255 caracteres."),
  cover_path: coverPathSchema,
  target_url: z
    .url("URL alvo invalida.")
    .min(1, "Informe a URL alvo.")
    .max(2048, "A URL alvo e muito longa."),
  repository_url: z
    .url("URL do repositorio invalida.")
    .min(1, "Informe a URL do repositorio.")
    .max(2048, "A URL do repositorio e muito longa."),
});

export const systemUpdateSchema = systemCreateSchema.partial();

export type SystemCreateInput = z.infer<typeof systemCreateSchema>;
export type SystemUpdateInput = z.infer<typeof systemUpdateSchema>;

export interface System extends Timestamps {
  id: string;
  project_id: string;
  cover_path: string;
  name: string;
  target_url: string;
  repository_url: string;
}

export interface SystemsResponse {
  systems: System[];
}

export interface SystemResponse {
  message?: string;
  system: System;
}
