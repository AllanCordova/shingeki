"use client";

import type { AttackScanTypeValue, DispatchProbe } from "@/lib/contracts";
import { ScanTypeBadge } from "@/components/results/scan-type-badge";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
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
}: {
  probes: DispatchProbe[];
  isPending: boolean;
  scanType?: AttackScanTypeValue | null;
  probesCount?: number | null;
  jobsPlanned?: number | null;
  vectorsDiscovered?: number | null;
  targetUrl?: string;
}) {
  if (probes.length === 0) {
    const usesLocalhost =
      typeof targetUrl === "string" &&
      /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(targetUrl);

    return (
      <EmptyState
        title={isPending ? "Iniciando cobertura do scan" : "Nenhum teste registrado"}
        description={
          isPending
            ? "Os testes executados aparecerao aqui conforme o worker avanca."
            : jobsPlanned === 0
              ? "Nenhum teste foi mapeado para este alvo. Verifique se o worker DAST esta atualizado e se o target_url e acessivel a partir dele."
              : usesLocalhost
                ? "Use http://127.0.0.1:8090 (ou localhost) como target_url. O worker Docker recebe a URL correta automaticamente; host.docker.internal nao abre no navegador."
                : probesCount === 0
                  ? "O disparo concluiu sem registrar testes. Reinicie o worker DAST e o consumer (attacks:consume-results) e dispare novamente."
                  : "Nenhuma rota foi testada neste disparo."
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobertura do scan</CardTitle>
        <CardDescription>
          Rotas testadas e payloads aplicados, mesmo quando nenhuma vulnerabilidade
          e encontrada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {probes.map((probe) => (
            <li key={probe.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {probe.attack?.category ?? "Teste"}
                </span>
                <ScanTypeBadge scanType={probe.attack?.scan_type ?? scanType} />
                <Badge tone={outcomeTone(probe.outcome)}>{outcomeLabel(probe.outcome)}</Badge>
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
      </CardContent>
    </Card>
  );
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
