"use client";

import { useState } from "react";
import type { RemediatedFinding } from "@/lib/contracts";
import { useRemediateSystem } from "@/lib/hooks/use-remediate";
import { notify } from "@/lib/notify";
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
} from "@/components/ui";

export function RemediationPanel({
  projectId,
  systemId,
  dispatchId,
}: {
  projectId: string;
  systemId: string;
  dispatchId?: string;
}) {
  const { remediate, data, isLoading, error, reset } = useRemediateSystem(
    projectId,
    systemId,
  );
  const [expanded, setExpanded] = useState(false);

  const handleRemediate = async () => {
    try {
      reset();
      const result = await remediate(
        dispatchId ? { dispatch_id: dispatchId } : {},
      );
      setExpanded(true);
      notify.success(
        `${result.findings_count} achado(s) com sugestoes de correcao.`,
      );
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel gerar as correcoes.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Remediacao</CardTitle>
        <CardDescription>
          Gere snippets de correcao com base nas stacks do sistema e nos achados
          ja registrados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

        <Button type="button" isLoading={isLoading} onClick={() => void handleRemediate()}>
          Gerar correcoes
        </Button>

        {expanded && data ? (
          data.findings_count === 0 ? (
            <EmptyState
              title="Nenhum achado para remediar"
              description="Execute um ataque e aguarde os resultados antes de gerar correcoes."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {data.findings.map((finding) => (
                <FindingRemediationCard key={finding.system_result_id} finding={finding} />
              ))}
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

function FindingRemediationCard({ finding }: { finding: RemediatedFinding }) {
  const isSast = finding.scan_type === "SAST";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">
            {finding.attack?.category ?? "Vulnerabilidade"}
          </CardTitle>
          {finding.scan_type ? <ScanTypeBadge scanType={finding.scan_type} /> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {finding.vulnerable_route ? (
          <Detail label="Local" value={finding.vulnerable_route} />
        ) : null}
        {finding.payload_used ? (
          <Detail
            label={isSast ? "Regra" : "Payload"}
            value={finding.payload_used}
            mono
          />
        ) : null}

        {finding.remediations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma remediação cadastrada para as stacks deste sistema.
          </p>
        ) : (
          finding.remediations.map((remediation) => (
            <div
              key={`${finding.system_result_id}-${remediation.stack.slug}`}
              className="flex flex-col gap-2 rounded-app border border-border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{remediation.stack.name}</Badge>
                <span className="font-medium text-foreground">
                  {remediation.title}
                </span>
              </div>
              <p className="text-muted-foreground">{remediation.description}</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-app bg-surface-muted p-3 font-mono text-xs text-foreground">
                {remediation.code_snippet}
              </pre>
              {remediation.references.length > 0 ? (
                <ul className="list-disc pl-5 text-xs text-muted-foreground">
                  {remediation.references.map((reference) => (
                    <li key={reference}>
                      <a
                        href={reference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        {reference}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
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
