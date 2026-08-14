"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileFormSchema,
  type UpdateProfileFormInput,
} from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms/apply-api-field-errors";
import type { ApiError } from "@/lib/api/error-handler";
import { AvatarFields } from "@/components/auth/avatar-fields";
import { Button, ErrorShow, Field, Input } from "@/components/ui";

interface ProfileFormProps {
  defaultName: string;
  currentAvatarPath?: string | null;
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (values: UpdateProfileFormInput) => Promise<void>;
}

export function ProfileForm({
  defaultName,
  currentAvatarPath,
  isLoading,
  error,
  onSubmit,
}: ProfileFormProps) {
  const {
    control,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateProfileFormInput>({
    resolver: zodResolver(updateProfileFormSchema),
    defaultValues: {
      name: defaultName,
      avatar: undefined,
      avatar_upload_id: undefined,
      remove_avatar: false,
    },
  });

  const hasAvatar = Boolean(currentAvatarPath);
  const removeAvatar = watch("remove_avatar");

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
      throw err;
    }
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

      <Field label="Nome" error={errors.name?.message}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              autoComplete="name"
              placeholder="Seu nome"
              hasError={Boolean(errors.name)}
            />
          )}
        />
      </Field>

      <AvatarFields
        control={control}
        errors={errors}
        currentAvatarPath={removeAvatar ? null : currentAvatarPath}
      />

      {hasAvatar ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = !removeAvatar;
              setValue("remove_avatar", next);
              if (next) {
                setValue("avatar", undefined);
                setValue("avatar_upload_id", undefined);
              }
            }}
          >
            {removeAvatar ? "Manter foto atual" : "Remover foto"}
          </Button>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" isLoading={isLoading}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
