import { z } from "zod";
import type { Timestamps } from "./common";

export const projectCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Informe o nome do projeto.")
    .max(255, "O nome deve ter no maximo 255 caracteres."),
  description: z.string().min(1, "Informe a descricao."),
});

export const projectUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Informe o nome do projeto.")
    .max(255, "O nome deve ter no maximo 255 caracteres.")
    .optional(),
  description: z.string().min(1, "Informe a descricao.").optional(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export interface Project extends Timestamps {
  id: string;
  user_id: string;
  cover_path: string | null;
  name: string;
  description: string;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface ProjectResponse {
  message?: string;
  project: Project;
}
