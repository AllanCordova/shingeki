"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { systemCreateSchema, type SystemCreateInput } from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms";
import type { ApiError } from "@/lib/api/error-handler";
import { Button, ErrorShow, Field, Input } from "@/components/ui";

interface SystemFormProps {
  defaultValues?: Partial<SystemCreateInput>;
  submitLabel?: string;
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (values: SystemCreateInput) => Promise<void>;
  onCancel?: () => void;
}

export function SystemForm({
  defaultValues,
  submitLabel = "Salvar",
  isLoading,
  error,
  onSubmit,
  onCancel,
}: SystemFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SystemCreateInput>({
    resolver: zodResolver(systemCreateSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      cover_path: defaultValues?.cover_path ?? "",
      target_url: defaultValues?.target_url ?? "",
      repository_url: defaultValues?.repository_url ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
    }
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

      <Field label="Nome" htmlFor="name" error={errors.name?.message}>
        <Input
          id="name"
          placeholder="Ex: API de pagamentos"
          hasError={Boolean(errors.name)}
          {...register("name")}
        />
      </Field>

      <Field
        label="Capa (URL da imagem)"
        htmlFor="cover_path"
        error={errors.cover_path?.message}
        hint="Link direto da imagem (https://images.pexels.com/...), nao a pagina do site."
      >
        <Input
          id="cover_path"
          placeholder="https://images.pexels.com/photos/.../foto.jpeg"
          hasError={Boolean(errors.cover_path)}
          {...register("cover_path")}
        />
      </Field>

      <Field
        label="URL alvo"
        htmlFor="target_url"
        error={errors.target_url?.message}
        hint="Endereco do sistema que sera testado."
      >
        <Input
          id="target_url"
          placeholder="https://alvo.exemplo.com"
          hasError={Boolean(errors.target_url)}
          {...register("target_url")}
        />
      </Field>

      <Field
        label="URL do repositorio"
        htmlFor="repository_url"
        error={errors.repository_url?.message}
      >
        <Input
          id="repository_url"
          placeholder="https://github.com/org/repo"
          hasError={Boolean(errors.repository_url)}
          {...register("repository_url")}
        />
      </Field>

      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" isLoading={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
