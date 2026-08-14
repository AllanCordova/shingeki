"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useAttackAcknowledgment,
  useDispatchAttack,
  type AttackScanType,
} from "@/lib/hooks/attack/use-attack";
import { AttackDepthModal } from "@/components/attack/attack-depth-modal";
import type { AttackDepthConfirm } from "@/components/attack/attack-depth-modal";
import type { AttackDepth } from "@/lib/contracts/attack/attack";
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
  Loading,
} from "@/components/ui";

const TERMS_HREF = "/termos/ataques";

const scanLabels: Record<AttackScanType, string> = {
  dast: "DAST",
  sast: "SAST",
};

const depthLabels: Record<AttackDepth, string> = {
  quick: "Rápido",
  full: "Completo",
};

export function AttackForm({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const {
    acknowledged,
    terms,
    isLoading: loadingAck,
    isError: ackError,
    error: ackErr,
    refetch: refetchAck,
  } = useAttackAcknowledgment(projectId, systemId);
  const { dispatchAttack, data, isLoading, pendingScanType, error } =
    useDispatchAttack(projectId, systemId);
  const [acceptedResponsibility, setAcceptedResponsibility] = useState(false);
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [depthScanType, setDepthScanType] = useState<AttackScanType | null>(
    null,
  );

  const needsFreshAcceptance = !acknowledged;
  const canDispatch = acknowledged
    ? true
    : acceptedResponsibility && acceptedLegalTerms;

  const submitScan = async (
    scanType: AttackScanType,
    options: AttackDepthConfirm,
  ) => {
    try {
      const result = await dispatchAttack(
        scanType,
        {
          acceptedResponsibility: acknowledged ? true : acceptedResponsibility,
          acceptedLegalTerms: acknowledged ? true : acceptedLegalTerms,
        },
        options.depth,
      );
      setDepthScanType(null);
      notify.success(
        `${result.attacks_count} teste(s) ${scanLabels[scanType]} (${depthLabels[options.depth]}) iniciado(s). Acompanhe pelo sininho.`,
      );
    } catch (err) {
      notify.fromApiError(
        err as ApiError,
        `Não foi possível disparar o ataque ${scanLabels[scanType]}.`,
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disparar ataques</CardTitle>
        <CardDescription>
          {acknowledged
            ? "Escolha a profundidade ao disparar DAST ou SAST."
            : "Confirme a autorização e escolha a profundidade ao disparar DAST ou SAST."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {error ? <ErrorShow error={error} /> : null}
          {ackError ? (
            <ErrorShow error={ackErr} onRetry={() => void refetchAck()} />
          ) : null}

          {loadingAck ? (
            <Loading label="Verificando aceite..." />
          ) : needsFreshAcceptance ? (
            <div className="flex flex-col gap-3 rounded-app border border-border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">
                Código de aceite:{" "}
                <span className="font-mono text-foreground">
                  {terms?.responsibility_code ?? "—"}
                </span>
              </p>
              <p className="text-muted-foreground">
                Leia o{" "}
                <Link
                  href={TERMS_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                >
                  código de conduta completo
                </Link>{" "}
                antes de aceitar.
              </p>
              <Checkbox
                checked={acceptedResponsibility}
                onChange={(event) =>
                  setAcceptedResponsibility(event.target.checked)
                }
                label={
                  terms?.checklist[0] ??
                  "Declaro que sou responsável pelo alvo e tenho autorização para testar este sistema."
                }
              />
              <Checkbox
                checked={acceptedLegalTerms}
                onChange={(event) =>
                  setAcceptedLegalTerms(event.target.checked)
                }
                label={
                  terms?.checklist[1] ??
                  "Estou ciente de que ataques contra sistemas sem autorização são de minha responsabilidadé exclusiva."
                }
              />
            </div>
          ) : (
            <div className="rounded-app border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Você já aceitou o código de conduta deste sistema
              {terms?.version ? (
                <>
                  {" "}
                  (versão{" "}
                  <span className="font-mono text-foreground">
                    {terms.version}
                  </span>
                  )
                </>
              ) : null}
              .{" "}
              <Link
                href={TERMS_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              >
                Ler termos
              </Link>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                isLoading={isLoading && pendingScanType === "dast"}
                disabled={
                  !canDispatch ||
                  loadingAck ||
                  (isLoading && pendingScanType !== "dast")
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
                  !canDispatch ||
                  loadingAck ||
                  (isLoading && pendingScanType !== "sast")
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
        systemId={systemId}
        isLoading={isLoading}
        onClose={() => setDepthScanType(null)}
        onConfirm={(options) => {
          if (!depthScanType) return;
          return submitScan(depthScanType, options);
        }}
      />
    </Card>
  );
}
