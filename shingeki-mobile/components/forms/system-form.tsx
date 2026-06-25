import { Controller, useForm, type Control, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { View } from "react-native";
import {
  systemCreateSchema,
  systemUpdateSchema,
  type SystemCreateInput,
  type SystemUpdateInput,
} from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms";
import type { ApiError } from "@/lib/api/error-handler";
import { StackFields } from "@/components/forms/stack-fields";
import { Button, ErrorShow, Field, Input } from "@/components/ui";

interface SystemFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<SystemCreateInput> & { stack_ids?: string[] };
  submitLabel?: string;
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (values: SystemCreateInput | SystemUpdateInput) => Promise<void>;
  onCancel?: () => void;
}

export function SystemForm({
  mode = "create",
  defaultValues,
  submitLabel = "Salvar",
  isLoading,
  error,
  onSubmit,
  onCancel,
}: SystemFormProps) {
  const isEdit = mode === "edit";

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SystemCreateInput | SystemUpdateInput>({
    resolver: zodResolver(isEdit ? systemUpdateSchema : systemCreateSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      target_url: defaultValues?.target_url ?? "",
      repository_url: defaultValues?.repository_url ?? "",
      stack_ids: defaultValues?.stack_ids ?? [],
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
              placeholder="Ex: API de pagamentos"
              hasError={Boolean(errors.name)}
            />
          )}
        />
      </Field>

      <Field
        label="URL alvo"
        error={errors.target_url?.message}
        hint="Endereco do sistema que sera testado."
      >
        <Controller
          control={control}
          name="target_url"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              placeholder="https://alvo.exemplo.com"
              hasError={Boolean(errors.target_url)}
            />
          )}
        />
      </Field>

      <Field
        label="URL do repositorio"
        error={errors.repository_url?.message}
      >
        <Controller
          control={control}
          name="repository_url"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              placeholder="https://github.com/org/repo"
              hasError={Boolean(errors.repository_url)}
            />
          )}
        />
      </Field>

      <StackFields
        control={control as Control<{ stack_ids: string[] }>}
        errors={errors as FieldErrors<{ stack_ids: string[] }>}
      />

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
