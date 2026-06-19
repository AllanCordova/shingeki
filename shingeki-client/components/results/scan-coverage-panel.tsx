"use client";

import type {
  AttackScanTypeValue,
  DispatchProbe,
  DispatchProbeListFilter,
  PaginationMeta,
} from "@/lib/contracts";
import { ScanTypeBadge } from "@/components/results/scan-type-badge";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ListPagination,
} from "@/components/ui";

function outcomeTone(
  outcome: DispatchProbe["outcome"],
): "success" | "danger" | "warning" | "neutral" {
  if (outcome === "vulnerable") return "danger";
  if (outcome === "error") return "warning";
  return "success";
}

function outcomeLabel(outcome: DispatchProbe["outcome"]): string {
  if (outcome === "vulnerable") return "Vulneravel";
  if (outcome === "error") return "Erro";
  return "Limpo";
}

export function ScanCoveragePanel({
  probes,
  isPending,
  scanType,
  probesCount,
  jobsPlanned,
  vectorsDiscovered,
  targetUrl,
  filter,
  pagination,
  isFetching,
  onPageChange,
}: {
  probes: DispatchProbe[];
  isPending: boolean;
  scanType?: AttackScanTypeValue | null;
  probesCount?: number | null;
  jobsPlanned?: number | null;
  vectorsDiscovered?: number | null;
  targetUrl?: string;
  filter: DispatchProbeListFilter;
  pagination?: PaginationMeta;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
}) {
  const emptyForFilter = !isPending && probes.length === 0 && (pagination?.total ?? 0) === 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Cobertura do scan</CardTitle>
          <CardDescription>
            Rotas testadas e payloads aplicados neste disparo.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {emptyForFilter ? (
          <EmptyState
            title={emptyTitle(filter, isPending)}
            description={emptyDescription({
              filter,
              isPending,
              jobsPlanned,
              probesCount,
              targetUrl,
            })}
          />
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border">
              {probes.map((probe) => (
                <li key={probe.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {probe.attack?.category ?? "Teste"}
                    </span>
                    <ScanTypeBadge scanType={probe.attack?.scan_type ?? scanType} />
                    <Badge tone={outcomeTone(probe.outcome)}>
                      {outcomeLabel(probe.outcome)}
                    </Badge>
                  </div>
                  <ProbeDetail label="Rota" value={probe.route} mono />
                  <ProbeDetail label="Payload" value={probe.payload_used} mono />
                  <ProbeDetail label="Resultado" value={probe.evidence} />
                  {probe.error_message ? (
                    <ProbeDetail label="Erro" value={probe.error_message} mono />
                  ) : null}
                  {probe.http_request ? (
                    <ProbeDetail label="Requisicao HTTP" value={probe.http_request} mono />
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {pagination ? (
                <ListPagination
                  pagination={pagination}
                  isFetching={isFetching}
                  onPageChange={onPageChange}
                />
              ) : null}
            </div>

            {isFetching ? (
              <p className="mt-4 text-sm text-muted-foreground">Atualizando lista...</p>
            ) : null}
          </>
        )}

        {!emptyForFilter && vectorsDiscovered != null ? (
          <p className="mt-4 text-xs text-muted-foreground">
            {vectorsDiscovered} rota(s) descoberta(s)
            {jobsPlanned != null ? ` · ${jobsPlanned} teste(s) planejado(s)` : ""}
            {probesCount != null ? ` · ${probesCount} teste(s) executado(s)` : ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function emptyTitle(filter: DispatchProbeListFilter, isPending: boolean): string {
  if (isPending) return "Iniciando cobertura do scan";
  if (filter === "vulnerable") return "Nenhum teste vulneravel neste filtro";
  if (filter === "clean") return "Nenhum teste limpo neste filtro";
  return "Nenhum teste registrado";
}

function emptyDescription({
  filter,
  isPending,
  jobsPlanned,
  probesCount,
  targetUrl,
}: {
  filter: DispatchProbeListFilter;
  isPending: boolean;
  jobsPlanned?: number | null;
  probesCount?: number | null;
  targetUrl?: string;
}): string {
  if (filter !== "all") {
    return "Nenhum registro corresponde ao filtro selecionado.";
  }

  if (isPending) {
    return "Os testes executados aparecerao aqui conforme o worker avanca.";
  }

  const usesLocalhost =
    typeof targetUrl === "string" &&
    /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(targetUrl);

  if (jobsPlanned === 0) {
    return "Nenhum teste foi mapeado para este alvo. Verifique se o worker DAST esta atualizado e se o target_url e acessivel a partir dele.";
  }

  if (usesLocalhost) {
    return "Use http://127.0.0.1:8090 (ou localhost) como target_url. O worker Docker recebe a URL correta automaticamente; host.docker.internal nao abre no navegador.";
  }

  if (probesCount === 0) {
    return "O disparo concluiu sem registrar testes. Reinicie o worker DAST e o consumer (attacks:consume-results) e dispare novamente.";
  }

  return "Nenhuma rota foi testada neste disparo.";
}

function ProbeDetail({
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
