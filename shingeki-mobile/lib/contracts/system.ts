import { z } from "zod";
import type { Timestamps } from "./common";
import type { Stack } from "./stack";

const stackIdsSchema = z
  .array(z.string().uuid("Stack invalida."))
  .min(1, "Selecione pelo menos uma stack tecnologica.");

export const systemCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Informe o nome do sistema.")
    .max(255, "O nome deve ter no maximo 255 caracteres."),
  target_url: z
    .url("URL alvo invalida.")
    .min(1, "Informe a URL alvo.")
    .max(2048, "A URL alvo e muito longa."),
  repository_url: z
    .url("URL do repositorio invalida.")
    .min(1, "Informe a URL do repositorio.")
    .max(2048, "A URL do repositorio e muito longa."),
  stack_ids: stackIdsSchema,
});

export const systemUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Informe o nome do sistema.")
    .max(255, "O nome deve ter no maximo 255 caracteres.")
    .optional(),
  target_url: z
    .url("URL alvo invalida.")
    .max(2048, "A URL alvo e muito longa.")
    .optional(),
  repository_url: z
    .url("URL do repositorio invalida.")
    .max(2048, "A URL do repositorio e muito longa.")
    .optional(),
  stack_ids: stackIdsSchema.optional(),
});

export type SystemCreateInput = z.infer<typeof systemCreateSchema>;
export type SystemUpdateInput = z.infer<typeof systemUpdateSchema>;

export interface System extends Timestamps {
  id: string;
  project_id: string;
  cover_path: string | null;
  name: string;
  target_url: string;
  repository_url: string;
  stacks: Stack[];
}

export interface SystemsResponse {
  systems: System[];
}

export interface SystemResponse {
  message?: string;
  system: System;
}
