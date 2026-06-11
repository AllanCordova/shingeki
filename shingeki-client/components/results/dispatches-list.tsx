"use client";

import Link from "next/link";
import { useDispatches } from "@/lib/hooks/use-results";
import { formatDate } from "@/lib/utils";
import { ScanTypeBadge } from "@/components/results/scan-type-badge";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorShow,
  Loading,
  Spinner,
} from "@/components/ui";

export function DispatchesList({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const { dispatches, isLoading, isFetching, isError, error, refetch } =
    useDispatches(projectId, systemId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              Disparos e suas vulnerabilidades encontradas.
            </CardDescription>
          </div>
          {isFetching ? <Spinner size="sm" /> : null}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loading label="Carregando disparos..." />
        ) : isError ? (
          <ErrorShow error={error} onRetry={() => refetch()} />
        ) : dispatches.length === 0 ? (
          <EmptyState
            title="Nenhum disparo ainda"
            description="Dispare o catalogo de ataques para ver os resultados aqui."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {dispatches.map((dispatch) => (
              <li key={dispatch.id}>
                <Link
                  href={`/projetos/${projectId}/sistemas/${systemId}/resultados/${dispatch.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-surface-muted"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {formatDate(dispatch.dispatched_at)}
                      </span>
                      <ScanTypeBadge scanType={dispatch.scan_type} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {dispatch.attacks_count} ataque(s)
                      {dispatch.findings_count !== null
                        ? ` · ${dispatch.findings_count} achado(s)`
                        : ""}
                    </span>
                  </div>
                  <Badge
                    tone={dispatch.status === "completed" ? "success" : "warning"}
                  >
                    {dispatch.status === "completed" ? "Concluido" : "Processando"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
