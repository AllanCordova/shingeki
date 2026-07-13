"use client";

import Link from "next/link";
import type { RemediationHistoryEvent } from "@/lib/contracts";
import { formatDate } from "@/lib/utils";
import { Badge, Card, CardContent, CardHeader, CardTitle, Loading } from "@/components/ui";
import { useRemediationHistory } from "@/lib/hooks/use-project-insights";

function eventTone(type: RemediationHistoryEvent["type"]): "neutral" | "success" | "warning" | "danger" {
  if (type === "scan_clean") return "success";
  if (type === "github_pr") return "neutral";
  if (type === "ai_suggestion") return "warning";
  return "danger";
}

export function RemediationHistoryPanel({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const { events, isLoading } = useRemediationHistory(projectId, systemId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historico de remediacao</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loading label="Carregando historico..." />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum evento registrado ainda. Dispare scans ou gere sugestoes de correcao.
          </p>
        ) : (
          <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
            {events.map((event, index) => (
              <li key={`${event.type}-${event.occurred_at}-${index}`} className="relative">
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
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
