"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useDispatches } from "@/lib/hooks/results/use-results";
import { useCompareDispatches } from "@/lib/hooks/results/use-compare-dispatches";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorShow,
  Loading,
  Select,
} from "@/components/ui";

function FindingList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "danger" | "success" | "warning";
  items: Array<{
    id: string;
    vulnerable_route: string | null;
    payload_used: string | null;
    attack?: { category: string; risk_level: string };
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          {title}
          <Badge tone={tone}>{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item nesta categoria.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-foreground">
                  {item.vulnerable_route ?? "Sem rota"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.attack?.category ?? "—"} · {item.attack?.risk_level ?? "—"}
                </p>
                {item.payload_used ? (
                  <pre className="mt-2 overflow-x-auto rounded-app bg-muted p-2 text-xs">
                    {item.payload_used}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function CompareDispatchesPage() {
  const { projectId, systemId } = useParams<{ projectId: string; systemId: string }>();
  const { dispatches, isLoading, isError, error, refetch } = useDispatches(projectId, systemId);
  const completed = useMemo(
    () => dispatches.filter((dispatch) => dispatch.status === "completed"),
    [dispatches],
  );

  const [baselineId, setBaselineId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");

  const { comparison, isLoading: comparing, isError: compareError, error: compareErr } =
    useCompareDispatches(projectId, systemId, baselineId || null, targetId || null);

  const backHref = `/projetos/${projectId}/sistemas/${systemId}`;

  return (
    <div className="flex w-full flex-col gap-6">
      <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
        ← Voltar ao sistema
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Comparar disparos
        </h1>
        <p className="text-sm text-muted-foreground">
          Veja o que apareceu de novo, o que foi resolvido e o que persistiu entre dois scans.
        </p>
      </div>

      {isLoading ? (
        <Loading label="Carregando disparos..." />
      ) : isError ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : completed.length < 2 ? (
        <EmptyState
          title="Precisa de pelo menos dois scans concluidos"
          description="Dispare novamente o catalogo para comparar evolucao entre logs."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldSelect
              label="Scan base (anterior)"
              value={baselineId}
              onChange={setBaselineId}
              dispatches={completed}
            />
            <FieldSelect
              label="Scan alvo (mais recente)"
              value={targetId}
              onChange={setTargetId}
              dispatches={completed}
            />
          </div>

          {compareError ? <ErrorShow error={compareErr} /> : null}
          {comparing ? <Loading label="Comparando disparos..." /> : null}

          {comparison ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <FindingList title="Novos" tone="danger" items={comparison.new_findings} />
              <FindingList title="Resolvidos" tone="success" items={comparison.resolved_findings} />
              <FindingList
                title="Persistentes"
                tone="warning"
                items={comparison.persisted_findings}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  dispatches,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dispatches: Array<{ id: string; dispatched_at: string | null; findings_count: number | null }>;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione...</option>
        {dispatches.map((dispatch) => (
          <option key={dispatch.id} value={dispatch.id}>
            {formatDate(dispatch.dispatched_at)} · {dispatch.findings_count ?? 0} achado(s)
          </option>
        ))}
      </Select>
    </label>
  );
}
