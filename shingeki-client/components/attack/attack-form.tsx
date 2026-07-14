"use client";

import { useState } from "react";
import {
  useDispatchAttack,
  type AttackScanType,
} from "@/lib/hooks/use-attack";
import { AttackDepthModal } from "@/components/attack/attack-depth-modal";
import { ATTACK_ACKNOWLEDGMENT } from "@/lib/contracts/attack-acknowledgment";
import type { AttackDepth } from "@/lib/contracts/attack";
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
  Checkbox,
  ErrorShow,
} from "@/components/ui";

const scanLabels: Record<AttackScanType, string> = {
  dast: "DAST",
  sast: "SAST",
};

const depthLabels: Record<AttackDepth, string> = {
  quick: "Rapido",
  full: "Completo",
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
  const [acceptedResponsibility, setAcceptedResponsibility] = useState(false);
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [depthScanType, setDepthScanType] = useState<AttackScanType | null>(
    null,
  );

  const canDispatch = acceptedResponsibility && acceptedLegalTerms;

  const submitScan = async (scanType: AttackScanType, depth: AttackDepth) => {
    try {
      const result = await dispatchAttack(
        scanType,
        {
          acceptedResponsibility,
          acceptedLegalTerms,
        },
        depth,
      );
      setDepthScanType(null);
      notify.success(
        `${result.attacks_count} teste(s) ${scanLabels[scanType]} (${depthLabels[depth]}) iniciado(s). Acompanhe pelo sininho.`,
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
          Confirme a autorizacao e escolha a profundidade ao disparar DAST ou
          SAST.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {error ? <ErrorShow error={error} /> : null}

          <div className="flex flex-col gap-3 rounded-app border border-border bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">
              Codigo de aceite:{" "}
              <span className="font-mono text-foreground">
                {ATTACK_ACKNOWLEDGMENT.responsibilityCode}
              </span>
            </p>
            <Checkbox
              checked={acceptedResponsibility}
              onChange={(event) =>
                setAcceptedResponsibility(event.target.checked)
              }
              label="Declaro que sou responsavel pelo alvo e tenho autorizacao para testar este sistema."
            />
            <Checkbox
              checked={acceptedLegalTerms}
              onChange={(event) => setAcceptedLegalTerms(event.target.checked)}
              label="Estou ciente de que ataques contra sistemas sem autorizacao sao de minha responsabilidade exclusiva."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                isLoading={isLoading && pendingScanType === "dast"}
                disabled={
                  !canDispatch || (isLoading && pendingScanType !== "dast")
                }
                onClick={() => setDepthScanType("dast")}
              >
                Ataque DAST
              </Button>
              <Button
                type="button"
                variant="outline"
                isLoading={isLoading && pendingScanType === "sast"}
                disabled={
                  !canDispatch || (isLoading && pendingScanType !== "sast")
                }
                onClick={() => setDepthScanType("sast")}
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

      <AttackDepthModal
        open={depthScanType !== null}
        scanType={depthScanType}
        isLoading={isLoading}
        onClose={() => setDepthScanType(null)}
        onConfirm={(depth) => {
          if (!depthScanType) return;
          return submitScan(depthScanType, depth);
        }}
      />
    </Card>
  );
}
