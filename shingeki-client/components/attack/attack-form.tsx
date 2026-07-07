"use client";

import {
  useDispatchAttack,
  type AttackScanType,
} from "@/lib/hooks/use-attack";
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

  const submitScan = async (scanType: AttackScanType) => {
    try {
      const result = await dispatchAttack(scanType);
      notify.success(
        `${result.attacks_count} teste(s) ${scanLabels[scanType]} iniciado(s). Acompanhe pelo sininho.`,
      );
    } catch (err) {
      notify.fromApiError(
        err as ApiError,
        `Nao foi possivel disparar o ataque ${scanLabels[scanType]}.`,
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disparar ataques</CardTitle>
        <CardDescription>
          Enfileira o catalogo de ataques apos a assinatura do sistema estar
          validada e permitida.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {error ? <ErrorShow error={error} /> : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                isLoading={isLoading && pendingScanType === "dast"}
                disabled={isLoading && pendingScanType !== "dast"}
                onClick={() => void submitScan("dast")}
              >
                Ataque DAST
              </Button>
              <Button
                type="button"
                variant="outline"
                isLoading={isLoading && pendingScanType === "sast"}
                disabled={isLoading && pendingScanType !== "sast"}
                onClick={() => void submitScan("sast")}
              >
                Ataque SAST
              </Button>
            </div>
            {data ? (
              <Badge tone="success">
                {data.attacks_count} teste(s) {scanLabels[data.scanType]}{" "}
                iniciado(s)
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
