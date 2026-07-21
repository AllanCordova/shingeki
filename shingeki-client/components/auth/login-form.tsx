"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { loginSchema, type LoginInput } from "@/lib/contracts";
import { useLogin } from "@/lib/hooks/auth/use-auth";
import { applyApiFieldErrors } from "@/lib/forms";
import { notify } from "@/lib/notify";
import type { ApiError } from "@/lib/api/error-handler";
import { Button, ErrorShow, Field, Input } from "@/components/ui";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error } = useLogin();
  const googleError = searchParams.get("error");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      notify.success("Login realizado com sucesso.");
      const redirectTo = searchParams.get("redirect") ?? "/projetos";
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
      notify.fromApiError(err, "Não foi possível entrar.");
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <form
        method="post"
        action="#"
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
        noValidate
      >
        {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}
        {googleError ? (
          <p className="text-sm text-danger" role="alert">
            Não foi possível entrar com Google. Tente novamente.
          </p>
        ) : null}

        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            hasError={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>

        <Field label="Senha" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            hasError={Boolean(errors.password)}
            {...register("password")}
          />
        </Field>

        <Button type="submit" isLoading={isLoading} className="w-full">
          Entrar
        </Button>
      </form>

      <div className="relative flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleSignInButton />
    </div>
  );
}
