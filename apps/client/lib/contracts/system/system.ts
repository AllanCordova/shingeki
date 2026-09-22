import { z } from "zod";
import type { Timestamps } from "../common/common";
import { createWithCoverSchema, updateWithCoverSchema } from "../cover/cover-selection";
import type { Stack } from "./stack";

const stackIdsSchema = z
  .array(z.string().uuid("Stack inválida."))
  .min(1, "Selecione pelo menos uma stack tecnológica.");

export const systemCreateSchema = createWithCoverSchema({
  name: z
    .string()
    .min(1, "Informe o nome do sistema.")
    .max(255, "O nome deve ter no máximo 255 caracteres."),
  target_url: z
    .url("URL alvo inválida.")
    .min(1, "Informe a URL alvo.")
    .max(2048, "A URL alvo é muito longa."),
  login_url: z
    .union([z.url("URL de login inválida."), z.literal("")])
    .optional(),
  login_username: z.string().max(255, "O usuário é muito longo.").optional(),
  login_password: z.string().max(255, "A senha é muito longa.").optional(),
  logged_in_indicator: z
    .string()
    .max(255, "O indicador é muito longo.")
    .optional(),
  repository_url: z
    .url("URL do repositório inválida.")
    .min(1, "Informe a URL do repositório.")
    .max(2048, "A URL do repositório é muito longa."),
  stack_ids: stackIdsSchema,
});

export const systemUpdateSchema = updateWithCoverSchema({
  name: z
    .string()
    .min(1, "Informe o nome do sistema.")
    .max(255, "O nome deve ter no máximo 255 caracteres.")
    .optional(),
  target_url: z
    .url("URL alvo inválida.")
    .min(1, "Informe a URL alvo.")
    .max(2048, "A URL alvo é muito longa.")
    .optional(),
  login_url: z
    .union([z.url("URL de login inválida."), z.literal("")])
    .optional(),
  login_username: z.string().max(255, "O usuário é muito longo.").optional(),
  login_password: z.string().max(255, "A senha é muito longa.").optional(),
  logged_in_indicator: z
    .string()
    .max(255, "O indicador é muito longo.")
    .optional(),
  repository_url: z
    .url("URL do repositório inválida.")
    .min(1, "Informe a URL do repositório.")
    .max(2048, "A URL do repositório é muito longa.")
    .optional(),
  stack_ids: stackIdsSchema.optional(),
});

export type SystemCreateInput = z.infer<typeof systemCreateSchema>;
export type SystemUpdateInput = z.infer<typeof systemUpdateSchema>;

export interface System extends Timestamps {
  id: string;
  project_id: string;
  cover_path: string;
  name: string;
  target_url: string;
  repository_url: string;
  login_url?: string | null;
  login_username?: string | null;
  login_configured?: boolean;
  logged_in_indicator?: string | null;
  dast_start_path?: string | null;
  dast_max_routes?: number | null;
  dast_attack_ids?: string[] | null;
  sast_attack_ids?: string[] | null;
  stacks: Stack[];
  project?: {
    id: string;
    name: string;
  };
}

export interface SystemsResponse {
  systems: System[];
}

export interface SystemResponse {
  message?: string;
  system: System;
}
