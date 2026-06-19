"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useResults } from "@/lib/hooks/use-results";
import { useSystem } from "@/lib/hooks/use-systems";
import type { DispatchProbeListFilter } from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common";
import { formatDate } from "@/lib/utils";
import { DeleteDispatchModal } from "@/components/results/delete-dispatch-modal";
import { ProbeOutcomeFilter } from "@/components/results/probe-outcome-filter";
import { RemediationPanel } from "@/components/remediation/remediation-panel";
import { ScanCoveragePanel } from "@/components/results/scan-coverage-panel";
import { ScanTypeBadge } from "@/components/results/scan-type-badge";
import {
  Badge,
  Button,
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
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [probePage, setProbePage] = useState(1);
  const [probeFilter, setProbeFilter] = useState<DispatchProbeListFilter>("all");

  const {
    dispatch,
    results,
    probes,
    probesPagination,
    probeCounts,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useResults(projectId, systemId, dispatchId, {
    page: probePage,
    per_page: DEFAULT_PAGE_SIZE,
    filter: probeFilter,
  });
  const { system } = useSystem(projectId, systemId);

  const dispatchLabel = dispatch?.dispatched_at
    ? formatDate(dispatch.dispatched_at)
    : "este disparo";

  const isPending = dispatch?.status === "pending";
  const coverageSummary = [
    dispatch?.vectors_discovered != null
      ? `${dispatch.vectors_discovered} rota(s) descoberta(s)`
      : null,
    dispatch?.jobs_planned != null
      ? `${dispatch.jobs_planned} teste(s) planejado(s)`
      : null,
    dispatch?.probes_count != null
      ? `${dispatch.probes_count} teste(s) executado(s)`
      : probeCounts
        ? `${probeCounts.all} teste(s) executado(s)`
        : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const showVulnerabilities =
    probeFilter === "all" || probeFilter === "vulnerable";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/projetos/${projectId}/sistemas/${systemId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar ao sistema
        </Link>
        {dispatch ? (
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Remover
          </Button>
        ) : null}
      </div>

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
              {coverageSummary ? ` · ${coverageSummary}` : ""}
              {dispatch?.duration_ms ? ` · ${dispatch.duration_ms} ms` : ""}
            </p>
            <ProbeOutcomeFilter
              filter={probeFilter}
              probeCounts={probeCounts}
              onFilterChange={(nextFilter) => {
                setProbeFilter(nextFilter);
                setProbePage(1);
              }}
            />
          </div>

          {showVulnerabilities && results.length === 0 && !isPending ? (
            <EmptyState
              title="Nenhuma vulnerabilidade encontrada"
              description="O scan foi executado, mas nenhum indicador de vulnerabilidade foi detectado neste disparo."
            />
          ) : showVulnerabilities && results.length === 0 && isPending ? (
            <EmptyState
              title="Aguardando vulnerabilidades"
              description="Os achados aparecerao aqui se alguma vulnerabilidade for detectada."
            />
          ) : showVulnerabilities ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">Vulnerabilidades</h2>
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
          ) : null}

          <ScanCoveragePanel
            probes={probes}
            isPending={isPending}
            scanType={dispatch?.scan_type}
            probesCount={dispatch?.probes_count}
            jobsPlanned={dispatch?.jobs_planned}
            vectorsDiscovered={dispatch?.vectors_discovered}
            targetUrl={system?.target_url}
            filter={probeFilter}
            pagination={probesPagination}
            isFetching={isFetching}
            onPageChange={setProbePage}
          />

          {dispatch?.status === "completed" ? (
            <RemediationPanel
              projectId={projectId}
              systemId={systemId}
              dispatchId={dispatchId}
            />
          ) : null}
        </>
      )}

      <DeleteDispatchModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        projectId={projectId}
        systemId={systemId}
        dispatchId={dispatchId}
        dispatchLabel={dispatchLabel}
        onDeleted={() => {
          router.push(`/projetos/${projectId}/sistemas/${systemId}`);
          router.refresh();
        }}
      />
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
