"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DispatchOutcomeChart } from "@/components/results/dispatch-outcome-chart";
import { ScanTypeBadge } from "@/components/results/scan-type-badge";
import { useDispatches } from "@/lib/hooks/results/use-results";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorShow,
  Loading,
} from "@/components/ui";

export default function DispatchChartPage() {
  const { projectId, systemId, dispatchId } = useParams<{
    projectId: string;
    systemId: string;
    dispatchId: string;
  }>();

  const { dispatches, isLoading, isError, error, refetch } = useDispatches(
    projectId,
    systemId,
  );
  const dispatch = dispatches.find((item) => item.id === dispatchId);
  const isPending = dispatch?.status === "pending";
  const backHref = `/projetos/${projectId}/sistemas/${systemId}`;
  const logHref = `${backHref}/resultados/${dispatchId}`;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar ao sistema
        </Link>
        {dispatch ? (
          <Link
            href={logHref}
            className="text-sm text-primary hover:underline"
          >
            Ver log completo
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <Loading label="Carregando grafico..." />
      ) : isError ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : !dispatch ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Disparo nao encontrado.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Grafico do disparo {formatDate(dispatch.dispatched_at)}
              </h1>
              <ScanTypeBadge scanType={dispatch.scan_type} />
              <Badge tone={isPending ? "warning" : "success"}>
                {isPending ? "Processando" : "Concluido"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Resumo visual dos testes e da cobertura deste log de ataque.
            </p>
          </div>

          {isPending ? (
            <p className="rounded-app border border-border bg-warning-surface px-3 py-2 text-sm text-foreground">
              O disparo ainda esta em andamento. Os numeros podem mudar conforme novos
              testes forem concluidos.
            </p>
          ) : null}

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Distribuicao do scan</CardTitle>
              <CardDescription>
                Todas as metricas do disparo em uma unica visao. Passe o mouse sobre
                cada barra para ver o significado.
              </CardDescription>
            </CardHeader>
            <CardContent className="w-full">
              <DispatchOutcomeChart dispatch={dispatch} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
