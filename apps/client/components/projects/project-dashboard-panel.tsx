"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { TrendDirection } from "@/lib/contracts";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Loading,
} from "@/components/ui";
import { useProjectDashboard } from "@/lib/hooks/project/use-project-insights";

function trendLabel(direction: TrendDirection, value: number): string {
  if (direction === "flat") return "Estavel vs. scan anterior";
  if (direction === "up") return `+${value} achado(s) vs. scan anterior`;
  return `${value} achado(s) vs. scan anterior`;
}

function trendTone(direction: TrendDirection): "danger" | "success" | "neutral" {
  if (direction === "up") return "danger";
  if (direction === "down") return "success";
  return "neutral";
}

export function ProjectDashboardPanel({ projectId }: { projectId: string }) {
  const { dashboard, isLoading } = useProjectDashboard(projectId);

  if (isLoading) {
    return <Loading label="Carregando painel..." />;
  }

  if (!dashboard) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardCard
        title="Ultimo scan"
        description="Disparo mais recente no projeto"
        value={
          dashboard.last_dispatch?.dispatched_at
            ? formatDate(dashboard.last_dispatch.dispatched_at)
            : "Nenhum"
        }
        footer={
          dashboard.last_dispatch ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{dashboard.last_dispatch.system_name ?? "Sistema"}</Badge>
              <Badge tone="neutral">{dashboard.last_dispatch.scan_type}</Badge>
              {dashboard.last_dispatch.status === "pending" ? (
                <Badge tone="warning">Processando</Badge>
              ) : null}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Dispare um scan em um sistema.</span>
          )
        }
      />

      <DashboardCard
        title="Achados atuais"
        description="Soma do ultimo scan concluido por sistema"
        value={String(dashboard.total_findings)}
        footer={
          <Badge tone={trendTone(dashboard.trend_direction)}>
            {trendLabel(dashboard.trend_direction, dashboard.findings_trend)}
          </Badge>
        }
      />

      <DashboardCard
        title="Sistemas"
        description="Alvos cadastrados neste projeto"
        value={String(dashboard.systems_count)}
        footer={
          <span className="text-xs text-muted-foreground">
            {dashboard.systems_with_findings.length} com achados pendentes
          </span>
        }
      />

      <DashboardCard
        title="Remediação"
        description="Sistemas com achados no ultimo scan"
        value={String(dashboard.systems_with_findings.length)}
        footer={
          dashboard.systems_with_findings.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {dashboard.systems_with_findings.slice(0, 3).map((item) => (
                <li key={item.system_id}>
                  <Link
                    href={`/projetos/${projectId}/sistemas/${item.system_id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {item.system_name} · {item.findings_count} achado(s)
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-muted-foreground">Nenhuma ação pendente.</span>
          )
        }
      />
    </div>
  );
}

function DashboardCard({
  title,
  description,
  value,
  footer,
}: {
  title: string;
  description: string;
  value: string;
  footer?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-3xl font-semibold tabular-nums text-foreground">{value}</p>
        {footer}
      </CardContent>
    </Card>
  );
}
