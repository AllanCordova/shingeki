"use client";

import type { AttackDispatch } from "@/lib/contracts/attack/attack";
import type { ProbeOutcomeCounts } from "@/lib/contracts/results/result";
import { cn } from "@/lib/utils";

interface ChartSegment {
  key: string;
  label: string;
  hint: string;
  value: number;
  barClassName: string;
}

function buildChartSegments(
  dispatch: AttackDispatch,
  counts: ProbeOutcomeCounts,
): ChartSegment[] {
  return [
    {
      key: "vulnerable",
      label: "Vulneraveis",
      hint: "Testes que indicaram vulnerabilidade",
      value: counts.vulnerable,
      barClassName: "bg-danger",
    },
    {
      key: "clean",
      label: "Limpos",
      hint: "Testes sem indicadores de falha",
      value: counts.clean,
      barClassName: "bg-success",
    },
    {
      key: "error",
      label: "Erros",
      hint: "Testes que falharam na execucao",
      value: counts.error,
      barClassName: "bg-warning",
    },
    {
      key: "findings",
      label: "Achados",
      hint: "Vulnerabilidades confirmadas neste disparo",
      value: dispatch.findings_count ?? 0,
      barClassName: "bg-foreground",
    },
    {
      key: "probes",
      label: "Testes",
      hint: "Probes executados durante o scan",
      value: dispatch.probes_count ?? 0,
      barClassName: "bg-primary",
    },
    {
      key: "routes",
      label: "Rotas",
      hint: "Rotas descobertas no alvo",
      value: dispatch.vectors_discovered ?? 0,
      barClassName: "bg-muted-foreground",
    },
  ];
}

function VerticalBarChart({
  segments,
  maxValue,
  emptyLabel = "Sem dados para exibir",
}: {
  segments: ChartSegment[];
  maxValue: number;
  emptyLabel?: string;
}) {
  const hasData = segments.some((segment) => segment.value > 0);

  if (!hasData) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-app border border-dashed border-border bg-surface-muted/40 px-4 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex h-64 w-full items-end gap-2 sm:gap-3">
      {segments.map((segment) => {
        const height =
          segment.value > 0 && maxValue > 0
            ? Math.max((segment.value / maxValue) * 100, 8)
            : 0;

        return (
          <div
            key={segment.key}
            className="group relative flex h-full min-w-0 flex-1 flex-col items-center"
          >
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 w-max max-w-[11rem] -translate-x-1/2 rounded-app border border-border bg-surface px-3 py-2 text-center text-xs opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <p className="font-medium text-foreground">{segment.label}</p>
              <p className="mt-0.5 text-muted-foreground">{segment.hint}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {segment.value}
              </p>
            </div>

            <div className="flex w-full flex-1 flex-col justify-end">
              {segment.value > 0 ? (
                <div
                  tabIndex={0}
                  aria-label={`${segment.label}: ${segment.value}. ${segment.hint}`}
                  className={cn(
                    "w-full rounded-t-app transition-transform duration-200 group-hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    segment.barClassName,
                  )}
                  style={{ height: `${height}%` }}
                />
              ) : (
                <div
                  tabIndex={0}
                  aria-label={`${segment.label}: 0. ${segment.hint}`}
                  className="h-1.5 w-full rounded-full bg-surface-muted"
                />
              )}
            </div>

            <span className="mt-3 w-full truncate text-center text-xs font-medium text-muted-foreground">
              {segment.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DispatchOutcomeChart({
  dispatch,
  probeCounts,
  className,
}: {
  dispatch: AttackDispatch;
  probeCounts?: ProbeOutcomeCounts;
  className?: string;
}) {
  const outcomeCounts = probeCounts ??
    dispatch.probe_counts ?? {
      all: 0,
      vulnerable: 0,
      clean: 0,
      error: 0,
    };
  const segments = buildChartSegments(dispatch, outcomeCounts);
  const maxValue = Math.max(...segments.map((segment) => segment.value), 1);

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <div className="flex w-full items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Passe o mouse sobre cada barra para ver o detalhe.
        </p>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {outcomeCounts.all} teste(s)
        </span>
      </div>

      <VerticalBarChart
        segments={segments}
        maxValue={maxValue}
        emptyLabel="Nenhuma metrica registrada ainda."
      />
    </div>
  );
}
