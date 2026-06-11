"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { attackDispatchSchema, type AttackDispatchInput } from "@/lib/contracts";
import {
  useDispatchAttack,
  type AttackScanType,
} from "@/lib/hooks/use-attack";
import { applyApiFieldErrors } from "@/lib/forms";
import { notify } from "@/lib/notify";
import type { ApiError } from "@/lib/api/error-handler";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorShow,
  Field,
  Input,
} from "@/components/ui";

const scanLabels: Record<AttackScanType, string> = {
  dast: "DAST",
  sast: "SAST",
};

export function AttackForm({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const { dispatchAttack, data, isLoading, pendingScanType, error } =
    useDispatchAttack(projectId, systemId);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AttackDispatchInput>({
    resolver: zodResolver(attackDispatchSchema),
    defaultValues: { signature_token: "" },
  });

  const submitScan = (scanType: AttackScanType) =>
    handleSubmit(async (values) => {
      try {
        const result = await dispatchAttack(values, scanType);
        notify.success(
          `${result.attacks_count} ataque(s) ${scanLabels[scanType]} enfileirado(s) para processamento.`,
        );
      } catch (err) {
        applyApiFieldErrors(err as ApiError, setError);
        notify.fromApiError(
          err,
          `Nao foi possivel disparar o ataque ${scanLabels[scanType]}.`,
        );
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disparar ataques</CardTitle>
        <CardDescription>
          Informe o token de assinatura permitido para enfileirar o catalogo de
          ataques contra o sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" noValidate>
          {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

          <Field
            label="Token de assinatura"
            htmlFor="signature_token"
            error={errors.signature_token?.message}
            hint="64 caracteres gerados na assinatura do sistema."
          >
            <Input
              id="signature_token"
              className="font-mono"
              placeholder="cole o token aqui"
              hasError={Boolean(errors.signature_token)}
              {...register("signature_token")}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                isLoading={isLoading && pendingScanType === "dast"}
                disabled={isLoading && pendingScanType !== "dast"}
                onClick={() => void submitScan("dast")()}
              >
                Ataque DAST
              </Button>
              <Button
                type="button"
                variant="outline"
                isLoading={isLoading && pendingScanType === "sast"}
                disabled={isLoading && pendingScanType !== "sast"}
                onClick={() => void submitScan("sast")()}
              >
                Ataque SAST
              </Button>
            </div>
            {data ? (
              <Badge tone="success">
                {data.attacks_count} ataque(s) {scanLabels[data.scanType]}{" "}
                enfileirado(s)
              </Badge>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
