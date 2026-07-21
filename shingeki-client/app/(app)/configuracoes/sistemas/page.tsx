"use client";

import Link from "next/link";
import { useOwnedSystems } from "@/lib/hooks/system/use-owned-systems";
import {
  EmptyState,
  ErrorShow,
  Loading,
} from "@/components/ui";

export default function ConfiguraçõesSistemasPage() {
  const { systems, isLoading, isError, error, refetch } = useOwnedSystems();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link
            href="/configuracoes"
            className="hover:text-foreground hover:underline"
          >
            Configurações
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Sistemas</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Sistemas
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Escolha um sistema para ajustar o escopo dos scans DAST.
        </p>
      </div>

      {isLoading ? <Loading label="Carregando sistemas..." /> : null}
      {isError ? (
        <ErrorShow error={error} onRetry={() => void refetch()} />
      ) : null}

      {!isLoading && !isError && systems.length === 0 ? (
        <EmptyState
          title="Nenhum sistema cadastrado"
          description="Cadastre um sistema em um projeto para configurar o escopo do DAST."
        />
      ) : null}

      {!isLoading && !isError && systems.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-app border border-border bg-surface">
          {systems.map((system) => (
            <li key={system.id}>
              <Link
                href={`/configuracoes/sistemas/${system.id}/dispatch`}
                className="flex flex-col gap-1 px-4 py-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {system.name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {system.project?.name ?? "Projeto"} · {system.target_url}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">
                  <span className="font-mono">
                    {system.dast_start_path ?? "Raiz do alvo"}
                  </span>
                  {system.dast_max_routes != null
                    ? ` · até ${system.dast_max_routes} páginas`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
