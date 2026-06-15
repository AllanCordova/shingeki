"use client";

import { useForm, type Control, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  systemCreateSchema,
  systemUpdateSchema,
  type SystemCreateInput,
  type SystemUpdateInput,
} from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms";
import type { ApiError } from "@/lib/api/error-handler";
import {
  CoverFields,
  type CoverFieldValues,
} from "@/components/forms/cover-fields";
import { StackFields } from "@/components/forms/stack-fields";
import { Button, ErrorShow, Field, Input } from "@/components/ui";

interface SystemFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<SystemCreateInput> & { stack_ids?: string[] };
  currentCoverPath?: string | null;
  submitLabel?: string;
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (values: SystemCreateInput | SystemUpdateInput) => Promise<void>;
  onCancel?: () => void;
}

export function SystemForm({
  mode = "create",
  defaultValues,
  currentCoverPath,
  submitLabel = "Salvar",
  isLoading,
  error,
  onSubmit,
  onCancel,
}: SystemFormProps) {
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<SystemCreateInput | SystemUpdateInput>({
    resolver: zodResolver(isEdit ? systemUpdateSchema : systemCreateSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      target_url: defaultValues?.target_url ?? "",
      repository_url: defaultValues?.repository_url ?? "",
      stack_ids: defaultValues?.stack_ids ?? [],
      cover: undefined,
      cover_upload_id: undefined,
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

      <StackFields
        control={control as Control<{ stack_ids: string[] }>}
        errors={errors as FieldErrors<{ stack_ids: string[] }>}
      />

      <CoverFields
        control={control as Control<CoverFieldValues>}
        errors={errors as FieldErrors<CoverFieldValues>}
        currentCoverPath={currentCoverPath}
        isEdit={isEdit}
        collapsible
      />

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
