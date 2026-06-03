import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { View } from "react-native";
import {
  updateProfileNameSchema,
  type UpdateProfileNameInput,
} from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms";
import type { ApiError } from "@/lib/api/error-handler";
import { Button, ErrorShow, Field, Input } from "@/components/ui";

interface ProfileFormProps {
  defaultName: string;
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (values: UpdateProfileNameInput) => Promise<void>;
}

export function ProfileForm({
  defaultName,
  isLoading,
  error,
  onSubmit,
}: ProfileFormProps) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateProfileNameInput>({
    resolver: zodResolver(updateProfileNameSchema),
    defaultValues: { name: defaultName },
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
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Seu nome"
              autoComplete="name"
              hasError={Boolean(errors.name)}
            />
          )}
        />
      </Field>

      <View className="flex-row justify-end">
        <Button onPress={submit} isLoading={isLoading}>
          Salvar
        </Button>
      </View>
    </View>
  );
}
