"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SIDEBAR_NAV_PAGE_SIZE } from "@/lib/contracts/common";
import { useSidebarNavigation } from "@/lib/hooks/use-sidebar-navigation";
import { cn } from "@/lib/utils";
import { Button, Spinner } from "@/components/ui";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
} from "@/components/ui/icons";

export function ProjectsSidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { sidebar, isLoading } = useSidebarNavigation();
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(sidebar.length / SIDEBAR_NAV_PAGE_SIZE));

  const pageProjects = useMemo(() => {
    const start = (page - 1) * SIDEBAR_NAV_PAGE_SIZE;
    return sidebar.slice(start, start + SIDEBAR_NAV_PAGE_SIZE);
  }, [page, sidebar]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const match = pathname.match(/^\/projetos\/([^/]+)/);
    if (!match || sidebar.length === 0) return;

    const projectId = match[1];
    const index = sidebar.findIndex((project) => project.id === projectId);
    if (index < 0) return;

    setExpandedProjectId(projectId);
    setPage(Math.floor(index / SIDEBAR_NAV_PAGE_SIZE) + 1);
  }, [pathname, sidebar]);

  useEffect(() => {
    if (!expandedProjectId) return;
    const stillVisible = pageProjects.some((project) => project.id === expandedProjectId);
    if (!stillVisible) {
      setExpandedProjectId(null);
    }
  }, [expandedProjectId, pageProjects]);

  const sectionActive = pathname.startsWith("/projetos");

  if (collapsed) {
    return (
      <Link
        href="/projetos"
        title="Projetos"
        aria-label="Projetos"
        className={cn(
          "flex h-10 items-center justify-center rounded-app text-sm transition-colors",
          sectionActive
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <FolderIcon className="h-4 w-4 shrink-0" />
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Link
        href="/projetos"
        className={cn(
          "flex items-center gap-3 rounded-app px-3 py-2 text-sm transition-colors",
          sectionActive
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <FolderIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">Projetos</span>
      </Link>

      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Spinner size="sm" />
          Carregando...
        </div>
      ) : sidebar.length === 0 ? (
        <p className="px-3 py-1 text-xs text-muted-foreground">Nenhum projeto ainda.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-0.5">
            {pageProjects.map((project) => {
              const isExpanded = expandedProjectId === project.id;
              const projectHref = `/projetos/${project.id}`;
              const projectActive = pathname.startsWith(projectHref);
              const visibleSystems = project.systems.slice(0, SIDEBAR_NAV_PAGE_SIZE);
              const hasMoreSystems = project.systems.length > SIDEBAR_NAV_PAGE_SIZE;

              return (
                <li key={project.id}>
                  <div
                    className={cn(
                      "flex w-full items-center gap-0.5 rounded-app pr-2 text-xs transition-colors",
                      projectActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedProjectId((current) =>
                          current === project.id ? null : project.id,
                        )
                      }
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-app hover:bg-muted hover:text-foreground"
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded
                          ? `Recolher sistemas de ${project.name}`
                          : `Expandir sistemas de ${project.name}`
                      }
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>
                    <Link
                      href={projectHref}
                      title={project.name}
                      className={cn(
                        "min-w-0 flex-1 truncate rounded-app py-1.5 transition-colors",
                        projectActive
                          ? "text-foreground"
                          : "hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {project.name}
                    </Link>
                  </div>

                  {isExpanded ? (
                    <ul className="flex flex-col gap-0.5 pb-1">
                      {project.systems.length === 0 ? (
                        <li className="py-1.5 pl-7 text-xs text-muted-foreground">
                          Nenhum sistema neste projeto.
                        </li>
                      ) : (
                        <>
                          {visibleSystems.map((system) => {
                            const href = `/projetos/${project.id}/sistemas/${system.id}`;
                            const active =
                              pathname === href || pathname.startsWith(`${href}/`);

                            return (
                              <li key={system.id}>
                                <Link
                                  href={href}
                                  title={system.name}
                                  className={cn(
                                    "block truncate rounded-app py-1.5 pl-7 pr-2 text-xs transition-colors",
                                    active
                                      ? "bg-primary/10 font-medium text-primary"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                  )}
                                >
                                  {system.name}
                                </Link>
                              </li>
                            );
                          })}
                          {hasMoreSystems ? (
                            <li>
                              <Link
                                href={projectHref}
                                className="block py-1.5 pl-7 pr-2 text-xs text-primary hover:underline"
                              >
                                Ver todos em {project.name}
                              </Link>
                            </li>
                          ) : null}
                        </>
                      )}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 px-3 py-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {page}/{totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Proxima
              </Button>
            </div>
          ) : null}

          {sidebar.length > SIDEBAR_NAV_PAGE_SIZE ? (
            <Link
              href="/projetos"
              className="px-3 py-1 text-xs text-primary hover:underline"
            >
              Ver todos os projetos
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}
