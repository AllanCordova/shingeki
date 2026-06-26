"use client";

import type { CatalogAuthor } from "@/lib/contracts";
import { Field, Select } from "@/components/ui";

export function CatalogOwnerFilter({
  owners,
  value,
  onChange,
}: {
  owners: CatalogAuthor[];
  value: string | null;
  onChange: (userId: string | null) => void;
}) {
  if (owners.length <= 1) {
    return null;
  }

  return (
    <div className="max-w-xs">
      <Field label="Autor">
        <Select
          value={value ?? ""}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next === "" ? null : next);
          }}
        >
          <option value="">Todos os autores</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name} ({owner.email})
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
