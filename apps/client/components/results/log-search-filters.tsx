"use client";

import { ATTACK_CATEGORIES } from "@/lib/contracts";
import { Button, Field, Input, Select } from "@/components/ui";

export interface LogSearchFilterValues {
  category: string;
  risk_level: string;
  route: string;
  q: string;
}

export function LogSearchFilters({
  values,
  onChange,
  onApply,
  onClear,
}: {
  values: LogSearchFilterValues;
  onChange: (values: LogSearchFilterValues) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-app border border-border bg-surface-muted/30 p-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Categoria">
        <Select
          value={values.category}
          onChange={(event) =>
            onChange({ ...values, category: event.target.value })
          }
        >
          <option value="">Todas</option>
          {ATTACK_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Nivel de risco">
        <Select
          value={values.risk_level}
          onChange={(event) =>
            onChange({ ...values, risk_level: event.target.value })
          }
        >
          <option value="">Todos</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </Select>
      </Field>

      <Field label="Rota / arquivo">
        <Input
          value={values.route}
          onChange={(event) => onChange({ ...values, route: event.target.value })}
          placeholder="/api/users ou src/..."
        />
      </Field>

      <Field label="Busca no payload">
        <Input
          value={values.q}
          onChange={(event) => onChange({ ...values, q: event.target.value })}
          placeholder="script, OR 1=1, etc."
        />
      </Field>

      <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
        <Button type="button" variant="primary" size="sm" onClick={onApply}>
          Aplicar filtros
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          Limpar
        </Button>
      </div>
    </div>
  );
}
