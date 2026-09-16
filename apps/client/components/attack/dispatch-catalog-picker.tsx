"use client";

import type { DispatchCatalogAttack } from "@/lib/contracts/attack/attack";
import type { ApiError } from "@/lib/api/error-handler";
import { Button, Checkbox, ErrorShow, Spinner } from "@/components/ui";

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
  const selectedSet = new Set(selectedIds);

  const toggleAttack = (attackId: string, checked: boolean) => {
    onChange(
      checked
        ? [...selectedIds, attackId]
        : selectedIds.filter((id) => id !== attackId),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} de {attacks.length} selecionados
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
      ) : (
        <div
          className="flex flex-col gap-2"
          role="group"
          aria-label="Ataques do catálogo"
        >
          {attacks.map((attack) => (
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
