"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Badge, Button, Checkbox, Input } from "@/components/ui";
import {
  clearRouteMapPreview,
  readRouteMapPreview,
  routeMapPreviewStorageKey,
  routeMatchesFilter,
  writeRouteMapPreview,
} from "@/lib/attack/route-map-preview-storage";
import type { DastRouteMapEntry } from "@/lib/contracts/attack/route-map";
import { useMe } from "@/lib/hooks/auth/use-auth";

type RouteMapPreviewContextValue = {
  routes: DastRouteMapEntry[];
  selected: boolean[];
  filter: string;
  setFilter: (value: string) => void;
  visibleIndexes: number[];
  selectedCount: number;
  selectedRoutes: DastRouteMapEntry[];
  replaceRoutes: (routes: DastRouteMapEntry[]) => void;
  toggle: (index: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  keepFiltered: () => void;
  clearPreview: () => void;
};

const RouteMapPreviewContext = createContext<RouteMapPreviewContextValue | null>(null);

export function useRouteMapPreview(): RouteMapPreviewContextValue {
  const value = useContext(RouteMapPreviewContext);
  if (!value) {
    throw new Error("A lista de rotas precisa estar dentro do preview.");
  }
  return value;
}

export function useRouteMapPreviewState(systemId: string): RouteMapPreviewContextValue {
  const { user } = useMe();
  const storageKey = user ? routeMapPreviewStorageKey(user.id, systemId) : null;
  const [routes, setRoutes] = useState<DastRouteMapEntry[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [filter, setFilter] = useState("");
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  if (storageKey && storageKey !== hydratedKey) {
    const stored = readRouteMapPreview(storageKey);
    setHydratedKey(storageKey);
    setRoutes(stored?.routes ?? []);
    setSelected(stored?.selected ?? []);
  }

  useEffect(() => {
    if (!storageKey || storageKey !== hydratedKey || routes.length === 0) return;
    writeRouteMapPreview(storageKey, { routes, selected });
  }, [storageKey, hydratedKey, routes, selected]);

  const visibleIndexes = useMemo(
    () =>
      routes.flatMap((route, index) =>
        routeMatchesFilter(route, filter) ? [index] : [],
      ),
    [routes, filter],
  );

  return {
    routes,
    selected,
    filter,
    setFilter,
    visibleIndexes,
    selectedCount: selected.filter(Boolean).length,
    selectedRoutes: routes.filter((_, index) => selected[index]),
    replaceRoutes: (nextRoutes) => {
      setRoutes(nextRoutes);
      setSelected(nextRoutes.map(() => true));
      setFilter("");
    },
    toggle: (index) => {
      setSelected((current) =>
        current.map((checked, itemIndex) =>
          itemIndex === index ? !checked : checked,
        ),
      );
    },
    selectAll: () => setSelected(routes.map(() => true)),
    clearSelection: () => setSelected(routes.map(() => false)),
    keepFiltered: () => {
      setSelected(routes.map((route) => routeMatchesFilter(route, filter)));
    },
    clearPreview: () => {
      if (storageKey) clearRouteMapPreview(storageKey);
      setRoutes([]);
      setSelected([]);
      setFilter("");
    },
  };
}

export function RouteMapPreviewProvider({
  value,
  children,
}: {
  value: RouteMapPreviewContextValue;
  children: ReactNode;
}) {
  return (
    <RouteMapPreviewContext.Provider value={value}>
      {children}
    </RouteMapPreviewContext.Provider>
  );
}

export function RouteMapPreviewList() {
  const {
    routes,
    selected,
    filter,
    setFilter,
    visibleIndexes,
    selectedCount,
    toggle,
    selectAll,
    clearSelection,
    keepFiltered,
    clearPreview,
  } = useRouteMapPreview();

  if (routes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Carregue o JSON para ver as rotas e marcar as que entram no scan.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filtrar, ex: orders payments"
          aria-label="Filtrar rotas do mapa"
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {selectedCount} de {routes.length} marcadas
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={selectAll}>
          Marcar todas
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
          Desmarcar todas
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filter.trim() === ""}
          onClick={keepFiltered}
        >
          Manter só as filtradas
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearPreview}>
          Limpar prévia
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        A prévia fica só neste navegador. O scan recebe apenas as rotas marcadas.
      </p>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-app border border-border p-2">
        {visibleIndexes.length === 0 ? (
          <li className="px-2 py-3 text-xs text-muted-foreground">
            Nenhuma rota com esse filtro.
          </li>
        ) : (
          visibleIndexes.map((index) => {
            const route = routes[index];
            return (
              <li key={`${route.method}-${route.path}-${index}`}>
                <Checkbox
                  checked={selected[index] === true}
                  onChange={() => toggle(index)}
                  label={
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge>{route.method}</Badge>
                      <span className="font-mono text-xs text-foreground">
                        {route.path}
                      </span>
                    </span>
                  }
                />
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
