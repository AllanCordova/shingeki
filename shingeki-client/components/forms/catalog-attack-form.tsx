"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ATTACK_CATEGORIES,
  ATTACK_TARGET_LOCATIONS,
  catalogAttackCreateSchema,
  parseCatalogAttackPayload,
  type CatalogAttackCreateInput,
} from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms";
import type { ApiError } from "@/lib/api/error-handler";
import { Button, ErrorShow, Field, Input, Select, Textarea } from "@/components/ui";

const defaultPayload = '{\n  "parameter": "q",\n  "value": "<script>alert(1)</script>"\n}';

export function CatalogAttackForm({
  isLoading,
  error,
  onSubmit,
  onCancel,
}: {
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (payload: ReturnType<typeof parseCatalogAttackPayload>) => Promise<void>;
  onCancel?: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CatalogAttackCreateInput>({
    resolver: zodResolver(catalogAttackCreateSchema),
    defaultValues: {
      scan_type: "DAST",
      category: "XSS",
      target_location: "QUERY_PARAMETER",
      risk_level: "MEDIUM",
      payload_json: defaultPayload,
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(parseCatalogAttackPayload(values));
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
    }
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de scan" htmlFor="scan_type" error={errors.scan_type?.message}>
          <Select id="scan_type" hasError={Boolean(errors.scan_type)} {...register("scan_type")}>
            <option value="DAST">DAST</option>
            <option value="SAST">SAST</option>
          </Select>
        </Field>

        <Field label="Nivel de risco" htmlFor="risk_level" error={errors.risk_level?.message}>
          <Select id="risk_level" hasError={Boolean(errors.risk_level)} {...register("risk_level")}>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </Select>
        </Field>
      </div>

      <Field label="Categoria" htmlFor="category" error={errors.category?.message}>
        <Select id="category" hasError={Boolean(errors.category)} {...register("category")}>
          {ATTACK_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Local do alvo"
        htmlFor="target_location"
        error={errors.target_location?.message}
      >
        <Select
          id="target_location"
          hasError={Boolean(errors.target_location)}
          {...register("target_location")}
        >
          {ATTACK_TARGET_LOCATIONS.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Payload (JSON)" htmlFor="payload_json" error={errors.payload_json?.message}>
        <Textarea
          id="payload_json"
          rows={8}
          className="font-mono text-sm"
          hasError={Boolean(errors.payload_json)}
          {...register("payload_json")}
        />
      </Field>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" isLoading={isLoading}>
          Cadastrar ataque
        </Button>
      </div>
    </form>
  );
}
