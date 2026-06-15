"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useResults } from "@/lib/hooks/use-results";
import { formatDate } from "@/lib/utils";
import { RemediationPanel } from "@/components/remediation/remediation-panel";
import { ScanTypeBadge } from "@/components/results/scan-type-badge";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorShow,
  Loading,
} from "@/components/ui";

function riskTone(risk: string): "danger" | "warning" | "neutral" {
  const upper = risk.toUpperCase();
  if (upper === "CRITICAL" || upper === "HIGH") return "danger";
  if (upper === "MEDIUM") return "warning";
  return "neutral";
}

export default function ResultsDetailPage() {
  const { projectId, systemId, dispatchId } = useParams<{
    projectId: string;
    systemId: string;
    dispatchId: string;
  }>();

  const { dispatch, results, isLoading, isError, error, refetch } = useResults(
    projectId,
    systemId,
    dispatchId,
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/projetos/${projectId}/sistemas/${systemId}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Voltar ao sistema
      </Link>

      {isLoading ? (
        <Loading label="Carregando resultados..." />
      ) : isError ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Disparo {formatDate(dispatch?.dispatched_at)}
              </h1>
              <ScanTypeBadge scanType={dispatch?.scan_type} />
              <Badge
                tone={dispatch?.status === "completed" ? "success" : "warning"}
              >
                {dispatch?.status === "completed" ? "Concluido" : "Processando"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {dispatch?.attacks_count} ataque(s)
              {dispatch?.findings_count !== null &&
              dispatch?.findings_count !== undefined
                ? ` · ${dispatch.findings_count} vulnerabilidade(s)`
                : ""}
              {dispatch?.duration_ms ? ` · ${dispatch.duration_ms} ms` : ""}
            </p>
          </div>

          {results.length === 0 ? (
            <EmptyState
              title={
                dispatch?.status === "completed"
                  ? "Nenhuma vulnerabilidade encontrada"
                  : "Aguardando processamento"
              }
              description={
                dispatch?.status === "completed"
                  ? "O sistema nao apresentou vulnerabilidades neste disparo."
                  : "Os resultados aparecerao automaticamente assim que o worker concluir."
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {results.map((result) => (
                <Card key={result.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>
                        {result.attack?.category ?? "Vulnerabilidade"}
                      </CardTitle>
                      <ScanTypeBadge
                        scanType={
                          result.attack?.scan_type ?? dispatch?.scan_type
                        }
                      />
                      {result.attack?.risk_level ? (
                        <Badge tone={riskTone(result.attack.risk_level)}>
                          {result.attack.risk_level}
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 text-sm">
                    {result.vulnerable_route ? (
                      <Detail label="Rota vulneravel" value={result.vulnerable_route} />
                    ) : null}
                    {result.payload_used ? (
                      <Detail
                        label={
                          (result.attack?.scan_type ?? dispatch?.scan_type) ===
                          "SAST"
                            ? "Regra"
                            : "Payload"
                        }
                        value={result.payload_used}
                        mono
                      />
                    ) : null}
                    {result.evidence ? (
                      <Detail label="Evidencia" value={result.evidence} mono />
                    ) : null}
                    {result.http_request ? (
                      <Detail
                        label="Requisicao HTTP"
                        value={result.http_request}
                        mono
                      />
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {dispatch?.status === "completed" ? (
            <RemediationPanel
              projectId={projectId}
              systemId={systemId}
              dispatchId={dispatchId}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <pre
        className={`overflow-x-auto whitespace-pre-wrap break-words rounded-app bg-surface-muted p-3 text-foreground ${
          mono ? "font-mono text-xs" : "text-sm"
        }`}
      >
        {value}
      </pre>
    </div>
  );
}
