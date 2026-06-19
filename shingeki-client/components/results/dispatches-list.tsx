"use client";

import Link from "next/link";
import { useState } from "react";
import { useDispatches } from "@/lib/hooks/use-results";
import { formatDate } from "@/lib/utils";
import { DeleteAllDispatchesModal } from "@/components/results/delete-all-dispatches-modal";
import { DeleteDispatchModal } from "@/components/results/delete-dispatch-modal";
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
  Spinner,
  TrashIcon,
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
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Resultados</CardTitle>
              <CardDescription>
                Disparos e suas vulnerabilidades encontradas.
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!isLoading && dispatches.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2.5 text-danger hover:bg-danger-surface hover:text-danger"
                  aria-label="Excluir todos os disparos"
                  title="Excluir todos os disparos"
                  onClick={() => setDeleteAllOpen(true)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              ) : null}
              {isFetching ? <Spinner size="sm" /> : null}
            </div>
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
                  <div className="flex items-center justify-between gap-4 py-3">
                    <Link
                      href={`/projetos/${projectId}/sistemas/${systemId}/resultados/${dispatch.id}`}
                      className="min-w-0 flex-1 transition-colors hover:opacity-80"
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
                          {dispatch.probes_count !== null && dispatch.probes_count > 0
                            ? ` · ${dispatch.probes_count} teste(s)`
                            : ""}
                        </span>
                      </div>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        tone={
                          dispatch.status === "completed" ? "success" : "warning"
                        }
                      >
                        {dispatch.status === "completed"
                          ? "Concluido"
                          : "Processando"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-surface hover:text-danger"
                        onClick={() =>
                          setDeleteTarget({
                            id: dispatch.id,
                            label: formatDate(dispatch.dispatched_at),
                          })
                        }
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {deleteTarget ? (
        <DeleteDispatchModal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          projectId={projectId}
          systemId={systemId}
          dispatchId={deleteTarget.id}
          dispatchLabel={deleteTarget.label}
        />
      ) : null}

      <DeleteAllDispatchesModal
        open={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        projectId={projectId}
        systemId={systemId}
        dispatchCount={dispatches.length}
      />
    </>
  );
}
