"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { registerSchema, type RegisterInput } from "@/lib/contracts";
import { useRegister } from "@/lib/hooks/use-auth";
import { applyApiFieldErrors } from "@/lib/forms";
import { notify } from "@/lib/notify";
import type { ApiError } from "@/lib/api/error-handler";
import { Button, ErrorShow, Field, Input } from "@/components/ui";

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser, isLoading, error } = useRegister();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser(values);
      notify.success("Conta criada com sucesso.");
      router.push("/projetos");
      router.refresh();
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
      notify.fromApiError(err, "Nao foi possivel criar a conta.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

      <Field label="Nome" htmlFor="name" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Seu nome"
          hasError={Boolean(errors.name)}
          {...register("name")}
        />
      </Field>

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
          autoComplete="new-password"
          placeholder="Minimo de 8 caracteres"
          hasError={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <Field
        label="Confirmar senha"
        htmlFor="password_confirmation"
        error={errors.password_confirmation?.message}
      >
        <Input
          id="password_confirmation"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          hasError={Boolean(errors.password_confirmation)}
          {...register("password_confirmation")}
        />
      </Field>

      <Button type="submit" isLoading={isLoading} className="w-full">
        Criar conta
      </Button>
    </form>
  );
}
