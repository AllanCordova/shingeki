"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectCreateSchema, type ProjectCreateInput } from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms";
import type { ApiError } from "@/lib/api/error-handler";
import { Button, ErrorShow, Field, Input, Textarea } from "@/components/ui";

interface ProjectFormProps {
  defaultValues?: Partial<ProjectCreateInput>;
  submitLabel?: string;
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (values: ProjectCreateInput) => Promise<void>;
  onCancel?: () => void;
}

export function ProjectForm({
  defaultValues,
  submitLabel = "Salvar",
  isLoading,
  error,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProjectCreateInput>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      cover_path: defaultValues?.cover_path ?? "",
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
          placeholder="Ex: Loja Virtual"
          hasError={Boolean(errors.name)}
          {...register("name")}
        />
      </Field>

      <Field
        label="Capa (URL da imagem)"
        htmlFor="cover_path"
        error={errors.cover_path?.message}
        hint="Cole o link direto da imagem (https://images.pexels.com/...). Nao use o link da pagina do Pexels. Upload no servidor ainda nao existe."
      >
        <Input
          id="cover_path"
          placeholder="https://images.pexels.com/photos/.../foto.jpeg"
          hasError={Boolean(errors.cover_path)}
          {...register("cover_path")}
        />
      </Field>

      <Field
        label="Descricao"
        htmlFor="description"
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          placeholder="Descreva o projeto"
          hasError={Boolean(errors.description)}
          {...register("description")}
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
