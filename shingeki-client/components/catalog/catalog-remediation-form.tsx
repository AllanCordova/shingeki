"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ATTACK_CATEGORIES,
  catalogRemediationCreateSchema,
  parseCatalogRemediationPayload,
  type CatalogRemediationCreateInput,
} from "@/lib/contracts";
import { useStacks } from "@/lib/hooks/stacks/use-stacks";
import { applyApiFieldErrors } from "@/lib/forms/apply-api-field-errors";
import type { ApiError } from "@/lib/api/error-handler";
import {
  Button,
  ErrorShow,
  Field,
  Input,
  Loading,
  Select,
  Textarea,
} from "@/components/ui";

export function CatalogRemediationForm({
  isLoading,
  error,
  onSubmit,
  onCancel,
}: {
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (
    payload: ReturnType<typeof parseCatalogRemediationPayload>,
  ) => Promise<void>;
  onCancel?: () => void;
}) {
  const { stacks, isLoading: stacksLoading } = useStacks();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CatalogRemediationCreateInput>({
    resolver: zodResolver(catalogRemediationCreateSchema),
    defaultValues: {
      stack_id: "",
      scan_type: "DAST",
      attack_category: "PATH_TRAVERSAL",
      semgrep_rule_id: "",
      title: "",
      description: "",
      code_snippet: "",
      references_text: "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(parseCatalogRemediationPayload(values));
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
    }
  });

  if (stacksLoading) {
    return <Loading label="Carregando stacks..." />;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

      <Field label="Stack" htmlFor="stack_id" error={errors.stack_id?.message}>
        <Select id="stack_id" hasError={Boolean(errors.stack_id)} {...register("stack_id")}>
          <option value="">Selecione uma stack</option>
          {stacks.map((stack) => (
            <option key={stack.id} value={stack.id}>
              {stack.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de scan" htmlFor="scan_type" error={errors.scan_type?.message}>
          <Select id="scan_type" hasError={Boolean(errors.scan_type)} {...register("scan_type")}>
            <option value="">Qualquer</option>
            <option value="DAST">DAST</option>
            <option value="SAST">SAST</option>
          </Select>
        </Field>

        <Field
          label="Categoria de ataque"
          htmlFor="attack_category"
          error={errors.attack_category?.message}
        >
          <Select
            id="attack_category"
            hasError={Boolean(errors.attack_category)}
            {...register("attack_category")}
          >
            <option value="">Qualquer</option>
            {ATTACK_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Semgrep rule ID (SAST)"
        htmlFor="semgrep_rule_id"
        error={errors.semgrep_rule_id?.message}
      >
        <Input
          id="semgrep_rule_id"
          placeholder="Opcional para mapeamento SAST"
          hasError={Boolean(errors.semgrep_rule_id)}
          {...register("semgrep_rule_id")}
        />
      </Field>

      <Field label="Titulo" htmlFor="title" error={errors.title?.message}>
        <Input
          id="title"
          placeholder="Ex: Validar caminho com realpath"
          hasError={Boolean(errors.title)}
          {...register("title")}
        />
      </Field>

      <Field label="Descricao" htmlFor="description" error={errors.description?.message}>
        <Textarea
          id="description"
          rows={3}
          hasError={Boolean(errors.description)}
          {...register("description")}
        />
      </Field>

      <Field
        label="Script de mitigacao"
        htmlFor="code_snippet"
        error={errors.code_snippet?.message}
      >
        <Textarea
          id="code_snippet"
          rows={8}
          className="font-mono text-sm"
          hasError={Boolean(errors.code_snippet)}
          {...register("code_snippet")}
        />
      </Field>

      <Field
        label="Referencias (uma URL por linha)"
        htmlFor="references_text"
        error={errors.references_text?.message}
      >
        <Textarea
          id="references_text"
          rows={3}
          placeholder="https://owasp.org/..."
          hasError={Boolean(errors.references_text)}
          {...register("references_text")}
        />
      </Field>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" isLoading={isLoading}>
          Cadastrar medicacao
        </Button>
      </div>
    </form>
  );
}
