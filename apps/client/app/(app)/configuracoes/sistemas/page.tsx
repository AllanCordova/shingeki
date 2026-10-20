"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useOwnedSystems } from "@/lib/hooks/system/use-owned-systems";
import type { System } from "@/lib/contracts";
import {
  Card,
  CardContent,
  CoverImage,
  EmptyState,
  ErrorShow,
  Input,
  Loading,
  Select,
} from "@/components/ui";

type ProjectGroup = {
  id: string;
  name: string;
  coverPath: string | null;
  systems: System[];
};

function matchesQuery(system: System, query: string): boolean {
  if (query === "") return true;
  const haystack = `${system.name} ${system.target_url}`.toLowerCase();
  return haystack.includes(query);
}

export default function ConfiguraçõesSistemasPage() {
  const { systems, isLoading, isError, error, refetch } = useOwnedSystems();
  const [projectId, setProjectId] = useState("");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const projects = useMemo(() => {
    const groups = new Map<string, ProjectGroup>();

    for (const system of systems) {
      const id = system.project?.id ?? system.project_id;
      const current = groups.get(id);
      if (current) {
        current.systems.push(system);
        continue;
      }

      groups.set(id, {
        id,
        name: system.project?.name ?? "Projeto",
        coverPath: system.project?.cover_path ?? null,
        systems: [system],
      });
    }

    return [...groups.values()].sort((left, right) =>
      left.name.localeCompare(right.name, "pt"),
    );
  }, [systems]);

  const selectedProject =
    projects.find((project) => project.id === projectId) ?? null;

  const visibleProjects = projects.filter((project) => {
    if (normalizedQuery === "") return true;
    if (project.name.toLowerCase().includes(normalizedQuery)) return true;
    return project.systems.some((system) => matchesQuery(system, normalizedQuery));
  });

  const visibleSystems = (selectedProject?.systems ?? []).filter((system) =>
    matchesQuery(system, normalizedQuery),
  );

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
          Escolha o projeto e depois o sistema. O catálogo de ataques é o
          mesmo para todos os alvos; o disparo e a correção seguem a stack de
          cada um.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Buscar</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome ou URL do alvo"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Projeto</span>
          <Select
            value={selectedProject?.id ?? ""}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">Todos os projetos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {isLoading ? <Loading label="Carregando sistemas..." /> : null}
      {isError ? (
        <ErrorShow error={error} onRetry={() => void refetch()} />
      ) : null}

      {!isLoading && !isError && systems.length === 0 ? (
        <EmptyState
          title="Nenhum sistema cadastrado"
          description="Cadastre um sistema em um projeto para configurar o disparo."
        />
      ) : null}

      {!isLoading && !isError && systems.length > 0 && selectedProject === null ? (
        visibleProjects.length === 0 ? (
          <EmptyState
            title="Nenhum projeto encontrado"
            description="A busca não encontrou projeto, sistema ou URL."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {visibleProjects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => setProjectId(project.id)}
                  className="block h-full w-full text-left"
                >
                  <Card className="h-full overflow-hidden transition-colors hover:border-foreground/30">
                    <CoverImage
                      coverPath={project.coverPath}
                      alt={`Capa de ${project.name}`}
                    />
                    <CardContent className="flex flex-col gap-1">
                      <h2 className="text-base font-semibold text-foreground">
                        {project.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {project.systems.length === 1
                          ? "1 sistema"
                          : `${project.systems.length} sistemas`}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {!isLoading && !isError && selectedProject !== null ? (
        visibleSystems.length === 0 ? (
          <EmptyState
            title="Nenhum sistema neste projeto"
            description="A busca não encontrou sistema ou URL neste projeto."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {visibleSystems.map((system) => (
              <li key={system.id}>
                <Link href={`/configuracoes/sistemas/${system.id}/dispatch`} className="block h-full">
                  <Card className="h-full overflow-hidden transition-colors hover:border-foreground/30">
                    <CoverImage
                      coverPath={system.cover_path}
                      alt={`Capa de ${system.name}`}
                    />
                    <CardContent className="flex flex-col gap-1">
                      <h2 className="truncate text-base font-semibold text-foreground">
                        {system.name}
                      </h2>
                      <p className="truncate text-sm text-muted-foreground">
                        {system.target_url}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-mono">
                          {system.dast_start_path ?? "Raiz do alvo"}
                        </span>
                        {system.dast_max_routes != null
                          ? ` · até ${system.dast_max_routes} páginas`
                          : ""}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
