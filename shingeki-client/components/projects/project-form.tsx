"use client";

import { useForm, type Control, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  projectCreateSchema,
  projectUpdateSchema,
  type ProjectCreateInput,
  type ProjectUpdateInput,
} from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms";
import type { ApiError } from "@/lib/api/error-handler";
import {
  CoverFields,
  type CoverFieldValues,
} from "@/components/cover/cover-fields";
import { Button, ErrorShow, Field, Input, Textarea } from "@/components/ui";

interface ProjectFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<ProjectCreateInput>;
  currentCoverPath?: string | null;
  submitLabel?: string;
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (values: ProjectCreateInput | ProjectUpdateInput) => Promise<void>;
  onCancel?: () => void;
}

export function ProjectForm({
  mode = "create",
  defaultValues,
  currentCoverPath,
  submitLabel = "Salvar",
  isLoading,
  error,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ProjectCreateInput | ProjectUpdateInput>({
    resolver: zodResolver(isEdit ? projectUpdateSchema : projectCreateSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
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
          placeholder="Ex: Loja Virtual"
          hasError={Boolean(errors.name)}
          {...register("name")}
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
