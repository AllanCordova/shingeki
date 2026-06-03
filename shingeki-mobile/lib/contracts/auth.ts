import { z } from "zod";
import type { Timestamps } from "./common";

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

export const updateProfileNameSchema = z.object({
  name: z
    .string()
    .min(1, "Informe o nome.")
    .max(255, "O nome deve ter no maximo 255 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileNameInput = z.infer<typeof updateProfileNameSchema>;

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
