import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { View } from "react-native";
import {
  projectCreateSchema,
  projectUpdateSchema,
  type ProjectCreateInput,
  type ProjectUpdateInput,
} from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms";
import type { ApiError } from "@/lib/api/error-handler";
import { Button, ErrorShow, Field, Input, Textarea } from "@/components/ui";

interface ProjectFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<ProjectCreateInput>;
  submitLabel?: string;
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (values: ProjectCreateInput | ProjectUpdateInput) => Promise<void>;
  onCancel?: () => void;
}

export function ProjectForm({
  mode = "create",
  defaultValues,
  submitLabel = "Salvar",
  isLoading,
  error,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const isEdit = mode === "edit";

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProjectCreateInput | ProjectUpdateInput>({
    resolver: zodResolver(isEdit ? projectUpdateSchema : projectCreateSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
      throw err;
    }
  });

  return (
    <View className="gap-4">
      {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

      <Field label="Nome" error={errors.name?.message}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Ex: Loja Virtual"
              hasError={Boolean(errors.name)}
            />
          )}
        />
      </Field>

      <Field label="Descricao" error={errors.description?.message}>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Textarea
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Descreva o projeto"
              hasError={Boolean(errors.description)}
            />
          )}
        />
      </Field>

      <View className="flex-row items-center justify-end gap-2">
        {onCancel ? (
          <Button variant="ghost" onPress={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button onPress={submit} isLoading={isLoading}>
          {submitLabel}
        </Button>
      </View>
    </View>
  );
}
