"use client";

import Link from "next/link";
import type { RemediationHistoryEvent } from "@/lib/contracts";
import { REMEDIATION_HISTORY_PREVIEW_SIZE } from "@/lib/contracts";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Loading,
} from "@/components/ui";
import { useRemediationHistory } from "@/lib/hooks/project/use-project-insights";

function eventTone(
  type: RemediationHistoryEvent["type"],
): "neutral" | "success" | "warning" | "danger" {
  if (type === "scan_clean") return "success";
  if (type === "github_pr" || type === "catalog_suggestion") return "neutral";
  if (type === "ai_suggestion") return "warning";
  return "danger";
}

export function RemediationHistoryEventItem({
  event,
}: {
  event: RemediationHistoryEvent;
}) {
  return (
    <li className="relative">
      <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{event.label}</span>
          <Badge tone={eventTone(event.type)}>{event.type}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(event.occurred_at)}
        </span>
        {event.github_pr_url ? (
          <Link
            href={event.github_pr_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Ver pull request
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export function RemediationHistoryPanel({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const { events, pagination, isLoading } = useRemediationHistory(
    projectId,
    systemId,
    { page: 1, per_page: REMEDIATION_HISTORY_PREVIEW_SIZE },
  );

  const historyHref = `/projetos/${projectId}/sistemas/${systemId}/historico-remediacao`;
  const total = pagination?.total ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Histórico do sistema</CardTitle>
          {total > 0 ? (
            <Link
              href={historyHref}
              className="text-sm text-primary hover:underline"
            >
              Ver todos
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loading label="Carregando histórico..." />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum evento registrado ainda. Dispare scans ou gere sugestões de
            correção.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
              {events.map((event, index) => (
                <RemediationHistoryEventItem
                  key={event.id ?? `${event.type}-${event.occurred_at}-${index}`}
                  event={event}
                />
              ))}
            </ol>
            {total > REMEDIATION_HISTORY_PREVIEW_SIZE ? (
              <p className="text-xs text-muted-foreground">
                Mostrando {events.length} de {total}.{" "}
                <Link href={historyHref} className="text-primary hover:underline">
                  Abrir histórico completo
                </Link>
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
