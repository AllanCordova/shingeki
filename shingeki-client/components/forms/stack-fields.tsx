"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { useStacks } from "@/lib/hooks/use-stacks";
import { Field, Loading, StackSelect } from "@/components/ui";

type StackFieldValues = {
  stack_ids: string[];
};

export function StackFields({
  control,
  errors,
}: {
  control: Control<StackFieldValues>;
  errors: FieldErrors<StackFieldValues>;
}) {
  const { stacks, isLoading, isError } = useStacks();

  return (
    <Field
      label="Stacks tecnologicas"
      htmlFor="stack_ids"
      error={errors.stack_ids?.message}
      hint="Selecione as tecnologias usadas pelo sistema para sugerir correcoes adequadas."
    >
      {isLoading ? (
        <Loading label="Carregando stacks..." />
      ) : isError ? (
        <p className="text-sm text-danger">Nao foi possivel carregar as stacks.</p>
      ) : (
        <Controller
          name="stack_ids"
          control={control}
          render={({ field }) => (
            <StackSelect
              id="stack_ids"
              stacks={stacks}
              value={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      )}
    </Field>
  );
}
