"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { RemediationHistoryEventItem } from "@/components/remediation/remediation-history-panel";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePicker,
  EmptyState,
  ErrorShow,
  Field,
  ListPagination,
  Loading,
  Select,
} from "@/components/ui";
import {
  REMEDIATION_HISTORY_PAGE_SIZE,
  type RemediationHistoryTypeFilter,
} from "@/lib/contracts";
import { useRemediationHistory } from "@/lib/hooks/project/use-project-insights";

export default function RemediationHistoryPage() {
  const { projectId, systemId } = useParams<{
    projectId: string;
    systemId: string;
  }>();

  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<RemediationHistoryTypeFilter>("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [appliedType, setAppliedType] =
    useState<RemediationHistoryTypeFilter>("");

  const { events, pagination, isLoading, isFetching, isError, error, refetch } =
    useRemediationHistory(projectId, systemId, {
      page,
      per_page: REMEDIATION_HISTORY_PAGE_SIZE,
      from: appliedFrom || undefined,
      to: appliedTo || undefined,
      type: appliedType || undefined,
    });

  const backHref = `/projetos/${projectId}/sistemas/${systemId}`;

  const applyFilters = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
    setAppliedType(type);
    setPage(1);
  };

  const clearFilters = () => {
    setFrom("");
    setTo("");
    setType("");
    setAppliedFrom("");
    setAppliedTo("");
    setAppliedType("");
    setPage(1);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <Link
        href={backHref}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Voltar ao sistema
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Histórico do sistema
        </h1>
        <p className="text-sm text-muted-foreground">
          Timeline de ataques, correções do catálogo, sugestões de IA e PRs
          abertos pela remediação do Shingeki.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>
            Filtre por intervalo de datas e tipo de evento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="De" htmlFor="history-from">
              <DatePicker
                id="history-from"
                value={from}
                onChange={setFrom}
                placeholder="Data inicial"
              />
            </Field>
            <Field label="Ate" htmlFor="history-to">
              <DatePicker
                id="history-to"
                value={to}
                onChange={setTo}
                placeholder="Data final"
              />
            </Field>
            <Field label="Tipo" htmlFor="history-type">
              <Select
                id="history-type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as RemediationHistoryTypeFilter)
                }
              >
                <option value="">Todos</option>
                <option value="catalog_suggestion">Remediação comum</option>
                <option value="ai_suggestion">Remediação por IA</option>
                <option value="attack">Ataque</option>
                <option value="github_pr">Pull request</option>
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={applyFilters}>
              Aplicar filtros
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loading label="Carregando histórico..." />
          ) : isError ? (
            <ErrorShow error={error} onRetry={() => refetch()} />
          ) : events.length === 0 ? (
            <EmptyState
              title="Nenhum evento neste periodo"
              description="Ajuste os filtros ou gere novas correções no sistema."
            />
          ) : (
            <div className="flex flex-col gap-4">
              <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
                {events.map((event, index) => (
                  <RemediationHistoryEventItem
                    key={
                      event.id ?? `${event.type}-${event.occurred_at}-${index}`
                    }
                    event={event}
                  />
                ))}
              </ol>
              {pagination ? (
                <ListPagination
                  pagination={pagination}
                  isFetching={isFetching}
                  onPageChange={setPage}
                />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
