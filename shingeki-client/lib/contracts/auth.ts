import { z } from "zod";
import type { Timestamps } from "./common";

/* ----------------------------- Schemas (Zod) ----------------------------- */

export const loginSchema = z.object({
  email: z.email("E-mail invalido.").min(1, "Informe o e-mail."),
  password: z.string().min(1, "Informe a senha."),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Informe o nome.")
      .max(255, "O nome deve ter no maximo 255 caracteres."),
    email: z
      .email("E-mail invalido.")
      .min(1, "Informe o e-mail.")
      .max(255, "O e-mail deve ter no maximo 255 caracteres."),
    password: z.string().min(8, "A senha deve ter no minimo 8 caracteres."),
    password_confirmation: z.string().min(1, "Confirme a senha."),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "As senhas nao coincidem.",
    path: ["password_confirmation"],
  });

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .max(255, "O nome deve ter no maximo 255 caracteres.")
      .optional()
      .or(z.literal("")),
    email: z
      .union([z.email("E-mail invalido."), z.literal("")])
      .optional(),
    password: z
      .union([
        z.string().min(8, "A senha deve ter no minimo 8 caracteres."),
        z.literal(""),
      ])
      .optional(),
    password_confirmation: z.string().optional().or(z.literal("")),
    current_password: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => !data.password || data.password === data.password_confirmation,
    { message: "As senhas nao coincidem.", path: ["password_confirmation"] },
  )
  .refine((data) => !data.password || !!data.current_password, {
    message: "Informe a senha atual para alterar a senha.",
    path: ["current_password"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateProfileFormSchema = z.object({
  name: z
    .string()
    .min(1, "Informe o nome.")
    .max(255, "O nome deve ter no maximo 255 caracteres."),
  avatar: z.instanceof(File).optional(),
  avatar_upload_id: z.string().uuid().optional(),
  remove_avatar: z.boolean().optional(),
});

export type UpdateProfileFormInput = z.infer<typeof updateProfileFormSchema>;

export type UserRole = "user" | "admin";

export interface User extends Timestamps {
  id: string;
  name: string;
  email: string;
  avatar_path: string | null;
  role: UserRole;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface MeResponse {
  user: User;
}
