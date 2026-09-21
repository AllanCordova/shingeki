"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { systemUpdateSchema, type System, type SystemUpdateInput } from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms";
import type { ApiError } from "@/lib/api/error-handler";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input } from "@/components/ui";

export function ScannerLoginCard({
  system,
  isLoading,
  error,
  onSave,
}: {
  system: System;
  isLoading: boolean;
  error: ApiError | null;
  onSave: (values: SystemUpdateInput) => Promise<boolean>;
}) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<SystemUpdateInput>({
    resolver: zodResolver(systemUpdateSchema),
    defaultValues: {
      login_url: system.login_url ?? "",
      login_username: system.login_username ?? "",
      login_password: "",
      logged_in_indicator: system.logged_in_indicator ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await onSave({
        login_url: values.login_url || "",
        login_username: values.login_username,
        login_password: values.login_password,
        logged_in_indicator: values.logged_in_indicator,
      });
      if (!saved) return;
      reset({
        login_url: values.login_url || "",
        login_username: values.login_username ?? "",
        login_password: "",
        logged_in_indicator: values.logged_in_indicator ?? "",
      });
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
    }
  });

  const removeLogin = async () => {
    try {
      const saved = await onSave({
        login_url: "",
        login_username: "",
        login_password: "",
        logged_in_indicator: "",
      });
      if (!saved) return;
      reset({
        login_url: "",
        login_username: "",
        login_password: "",
        logged_in_indicator: "",
      });
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Login do scanner</CardTitle>
          <Badge tone={system.login_configured ? "success" : "neutral"}>
            {system.login_configured ? "Configurado" : "Somente público"}
          </Badge>
        </div>
        <CardDescription>
          O Chromium do DAST entra no alvo com estas credenciais e mapeia as
          rotas autenticadas. A sessão não sai do scanner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error && !error.hasFieldErrors ? (
            <p className="text-sm text-danger">{error.message}</p>
          ) : null}

          <Field
            label="URL de login"
            htmlFor="scanner-login-url"
            error={errors.login_url?.message}
            hint="Ex: https://alvo.exemplo.com/login ou https://alvo.exemplo.com/#/login"
          >
            <Input
              id="scanner-login-url"
              placeholder={system.target_url}
              hasError={Boolean(errors.login_url)}
              {...register("login_url")}
            />
          </Field>

          <Field
            label="Usuário ou e-mail"
            htmlFor="scanner-login-username"
            error={errors.login_username?.message}
          >
            <Input
              id="scanner-login-username"
              autoComplete="username"
              hasError={Boolean(errors.login_username)}
              {...register("login_username")}
            />
          </Field>

          <Field
            label="Senha"
            htmlFor="scanner-login-password"
            error={errors.login_password?.message}
            hint={
              system.login_configured
                ? "Deixe em branco para manter a senha atual."
                : "Usada só pelo worker. Nunca é devolvida na API."
            }
          >
            <Input
              id="scanner-login-password"
              type="password"
              autoComplete="new-password"
              hasError={Boolean(errors.login_password)}
              {...register("login_password")}
            />
          </Field>

          <Field
            label="Texto que confirma sessão"
            htmlFor="scanner-login-indicator"
            error={errors.logged_in_indicator?.message}
            hint="Opcional. Trecho visível só depois do login."
          >
            <Input
              id="scanner-login-indicator"
              hasError={Boolean(errors.logged_in_indicator)}
              {...register("logged_in_indicator")}
            />
          </Field>

          <div className="flex justify-end gap-2">
            {system.login_configured ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isLoading}
                onClick={removeLogin}
              >
                Remover login
              </Button>
            ) : null}
            <Button type="submit" isLoading={isLoading}>
              Salvar login
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
