"use client";

import { useState } from "react";
import type { DispatchCatalogAttack } from "@/lib/contracts/attack/attack";
import type { PaginationMeta } from "@/lib/contracts/common/common";
import type { ApiError } from "@/lib/api/error-handler";
import {
  Button,
  Checkbox,
  ErrorShow,
  Input,
  ListPagination,
  Select,
  Spinner,
} from "@/components/ui";

const PAGE_SIZE = 8;

export function DispatchCatalogPicker({
  attacks,
  selectedIds,
  onChange,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  attacks: DispatchCatalogAttack[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  onRetry: () => void;
}) {
  const [query, setQuery] = useState("");
  const [scanType, setScanType] = useState("all");
  const [page, setPage] = useState(1);
  const selectedSet = new Set(selectedIds);
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = attacks.filter((attack) => {
    if (scanType !== "all" && attack.scan_type !== scanType) return false;
    if (normalizedQuery === "") return true;
    const haystack = `${attack.category} ${attack.target_location} ${attack.risk_level}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const pagination: PaginationMeta = {
    current_page: currentPage,
    last_page: lastPage,
    per_page: PAGE_SIZE,
    total: filtered.length,
    from: filtered.length === 0 ? null : start + 1,
    to: filtered.length === 0 ? null : start + visible.length,
  };

  const toggleAttack = (attackId: string, checked: boolean) => {
    onChange(
      checked
        ? [...selectedIds, attackId]
        : selectedIds.filter((id) => id !== attackId),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Filtrar por categoria"
          aria-label="Filtrar ataques"
          autoComplete="off"
        />
        <Select
          value={scanType}
          aria-label="Tipo de scan"
          onChange={(event) => {
            setScanType(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">DAST e SAST</option>
          <option value="DAST">DAST</option>
          <option value="SAST">SAST</option>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} de {attacks.length} selecionados
          {filtered.length !== attacks.length
            ? ` · ${filtered.length} no filtro`
            : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading || attacks.length === 0}
            onClick={() => onChange(attacks.map((attack) => attack.id))}
          >
            Marcar todos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading || selectedIds.length === 0}
            onClick={() => onChange([])}
          >
            Desmarcar todos
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Carregando ataques...
        </div>
      ) : isError ? (
        <ErrorShow error={error} onRetry={onRetry} />
      ) : attacks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Não há ataques no catálogo para este sistema.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum ataque corresponde ao filtro.
        </p>
      ) : (
        <div
          className="flex flex-col gap-2"
          role="group"
          aria-label="Ataques do catálogo"
        >
          {visible.map((attack) => (
            <Checkbox
              key={attack.id}
              id={`dispatch-attack-${attack.id}`}
              checked={selectedSet.has(attack.id)}
              onChange={(event) =>
                toggleAttack(attack.id, event.target.checked)
              }
              label={attack.category}
              description={`${attack.scan_type} · ${attack.target_location} · ${attack.risk_level}`}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError ? (
        <ListPagination pagination={pagination} onPageChange={setPage} />
      ) : null}
    </div>
  );
}

export function persistedCatalogIds(
  selectedIds: string[],
  attacks: DispatchCatalogAttack[],
): string[] | null {
  if (attacks.length === 0 || selectedIds.length === 0) {
    return selectedIds.length === 0 && attacks.length > 0 ? [] : null;
  }

  const catalogIds = new Set(attacks.map((attack) => attack.id));
  const selected = selectedIds.filter((id) => catalogIds.has(id));

  if (selected.length === attacks.length) {
    return null;
  }

  return selected;
}
