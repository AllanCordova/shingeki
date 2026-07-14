"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useResults } from "@/lib/hooks/use-results";
import type { DispatchProbeListFilter } from "@/lib/contracts";
import type { AttackDispatch } from "@/lib/contracts/attack";
import type { PaginationMeta, SystemResult } from "@/lib/contracts/result";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common";
import { formatFindingSourceLocation, isSastResult } from "@/lib/results/source-location";
import { formatDate, formatDuration, cn } from "@/lib/utils";
import { DeleteDispatchModal } from "@/components/results/delete-dispatch-modal";
import { ExportAuditReportModal } from "@/components/results/export-audit-report-modal";
import { ProbeOutcomeFilter } from "@/components/results/probe-outcome-filter";
import {
  LogSearchFilters,
  type LogSearchFilterValues,
} from "@/components/results/log-search-filters";
import { RemediationPanel } from "@/components/remediation/remediation-panel";
import { ScanCoveragePanel } from "@/components/results/scan-coverage-panel";
import { ScanTypeBadge } from "@/components/results/scan-type-badge";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorShow,
  Loading,
  ListPagination,
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
  const [exportOpen, setExportOpen] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);
  const [probePage, setProbePage] = useState(1);
  const [probeFilter, setProbeFilter] = useState<DispatchProbeListFilter>("all");
  const [logFilterDraft, setLogFilterDraft] = useState<LogSearchFilterValues>({
    category: "",
    risk_level: "",
    route: "",
    q: "",
  });
  const [appliedLogFilters, setAppliedLogFilters] = useState<LogSearchFilterValues>({
    category: "",
    risk_level: "",
    route: "",
    q: "",
  });

  const {
    dispatch,
    results,
    resultsPagination,
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
    results_page: resultsPage,
    results_per_page: DEFAULT_PAGE_SIZE,
    filter: probeFilter,
    category: appliedLogFilters.category,
    risk_level: appliedLogFilters.risk_level,
    route: appliedLogFilters.route,
    q: appliedLogFilters.q,
  });
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
    dispatch?.scan_type === "SAST" ||
    probeFilter === "all" ||
    probeFilter === "vulnerable";
  const vulnerabilitiesTotal = resultsPagination?.total ?? results.length;

  const coverageTotal = probesPagination?.total ?? probeCounts?.all ?? 0;
  const showCompactCoverage =
    probeFilter === "all" && (isPending || coverageTotal === 0);

  const coveragePanelProps = {
    probes,
    isPending,
    scanType: dispatch?.scan_type,
    probesCount: dispatch?.probes_count,
    jobsPlanned: dispatch?.jobs_planned,
    vectorsDiscovered: dispatch?.vectors_discovered,
    filter: probeFilter,
    pagination: probesPagination,
    isFetching,
    onPageChange: setProbePage,
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <Link
          href={`/projetos/${projectId}/sistemas/${systemId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar ao sistema
        </Link>
        {dispatch ? (
          <div className="flex flex-wrap items-center gap-2">
            {dispatch.status === "completed" ? (
              <Button variant="outline" onClick={() => setExportOpen(true)}>
                Exportar relatorio
              </Button>
            ) : null}
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Remover
            </Button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="w-full">
          <Loading label="Carregando resultados..." />
        </div>
      ) : isError ? (
        <div className="w-full">
          <ErrorShow error={error} onRetry={() => refetch()} />
        </div>
      ) : (
        <>
          <div className="flex w-full flex-col gap-2">
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
              {dispatch?.duration_ms != null
                ? ` · ${formatDuration(dispatch.duration_ms)}`
                : ""}
            </p>
          </div>

          {dispatch?.status === "completed" ? (
            <RemediationPanel
              projectId={projectId}
              systemId={systemId}
              dispatchId={dispatchId}
            />
          ) : null}

          <ProbeOutcomeFilter
            filter={probeFilter}
            probeCounts={probeCounts}
            onFilterChange={(nextFilter) => {
              setProbeFilter(nextFilter);
              setProbePage(1);
              setResultsPage(1);
            }}
          />

          <LogSearchFilters
            values={logFilterDraft}
            onChange={setLogFilterDraft}
            onApply={() => {
              setAppliedLogFilters(logFilterDraft);
              setProbePage(1);
              setResultsPage(1);
            }}
            onClear={() => {
              const empty = { category: "", risk_level: "", route: "", q: "" };
              setLogFilterDraft(empty);
              setAppliedLogFilters(empty);
              setProbePage(1);
              setResultsPage(1);
            }}
          />

          {showCompactCoverage ? (
            <ScanCoveragePanel {...coveragePanelProps} compactWhenEmpty />
          ) : null}

          <section className="w-full">
            {showCompactCoverage ? (
              showVulnerabilities ? (
                <VulnerabilitiesSection
                  results={results}
                  dispatch={dispatch}
                  isPending={isPending}
                  isFetching={isFetching}
                  vulnerabilitiesTotal={vulnerabilitiesTotal}
                  resultsPagination={resultsPagination}
                  onPageChange={setResultsPage}
                />
              ) : null
            ) : (
              <div
                className={cn(
                  "grid grid-cols-1 gap-6",
                  showVulnerabilities ? "xl:grid-cols-2 xl:items-start" : "",
                )}
              >
                <div className={cn(!showVulnerabilities && "xl:col-span-2")}>
                  <ScanCoveragePanel {...coveragePanelProps} />
                </div>

                {showVulnerabilities ? (
                  <VulnerabilitiesSection
                    results={results}
                    dispatch={dispatch}
                    isPending={isPending}
                    isFetching={isFetching}
                    vulnerabilitiesTotal={vulnerabilitiesTotal}
                    resultsPagination={resultsPagination}
                    onPageChange={setResultsPage}
                  />
                ) : null}
              </div>
            )}
          </section>
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

      <ExportAuditReportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        projectId={projectId}
        systemId={systemId}
        dispatchId={dispatchId}
        dispatchLabel={dispatchLabel}
      />
    </div>
  );
}

function VulnerabilitiesSection({
  results,
  dispatch,
  isPending,
  isFetching,
  vulnerabilitiesTotal,
  resultsPagination,
  onPageChange,
}: {
  results: SystemResult[];
  dispatch?: AttackDispatch;
  isPending: boolean;
  isFetching: boolean;
  vulnerabilitiesTotal: number;
  resultsPagination?: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vulnerabilidades</CardTitle>
        <CardDescription>
          Achados confirmados e evidencias do scan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {vulnerabilitiesTotal === 0 && !isPending ? (
          <EmptyState
            title="Nenhuma vulnerabilidade encontrada"
            description="O scan foi executado, mas nenhum indicador de vulnerabilidade foi detectado."
          />
        ) : vulnerabilitiesTotal === 0 && isPending ? (
          <EmptyState
            title="Aguardando vulnerabilidades"
            description="Os achados aparecerao aqui se alguma vulnerabilidade for detectada."
          />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {results.map((result) => {
                const sast = isSastResult(result, dispatch?.scan_type);
                const sourceLocation =
                  formatFindingSourceLocation(result) ??
                  (sast && result.vulnerable_route ? result.vulnerable_route : null);

                return (
                  <Card key={result.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">
                          {result.attack?.category ?? "Vulnerabilidade"}
                        </CardTitle>
                        <ScanTypeBadge
                          scanType={result.attack?.scan_type ?? dispatch?.scan_type}
                        />
                        {result.attack?.risk_level ? (
                          <Badge tone={riskTone(result.attack.risk_level)}>
                            {result.attack.risk_level}
                          </Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-sm">
                      {sourceLocation ? (
                        <Detail
                          label={sast ? "Arquivo e linha(s)" : "Localizacao"}
                          value={sourceLocation}
                          mono
                        />
                      ) : null}
                      {result.vulnerable_route && !sast ? (
                        <Detail
                          label="Rota vulneravel"
                          value={result.vulnerable_route}
                        />
                      ) : null}
                      {result.payload_used ? (
                        <Detail
                          label={sast ? "Regra Semgrep" : "Payload"}
                          value={result.payload_used}
                          mono
                        />
                      ) : null}
                      {result.matched_snippet ? (
                        <Detail
                          label="Trecho afetado"
                          value={result.matched_snippet}
                          mono
                        />
                      ) : null}
                      {result.evidence ? (
                        <Detail label="Evidencia" value={result.evidence} mono />
                      ) : null}
                      {result.http_request ? (
                        <Detail
                          label={sast ? "Contexto" : "Requisicao HTTP"}
                          value={result.http_request}
                          mono
                        />
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {resultsPagination ? (
              <ListPagination
                pagination={resultsPagination}
                isFetching={isFetching}
                onPageChange={onPageChange}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
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
