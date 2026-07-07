"use client";

import type { DispatchProbeListFilter, ProbeOutcomeCounts } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS: {
  value: DispatchProbeListFilter;
  label: string;
}[] = [
  { value: "all", label: "Todos" },
  { value: "vulnerable", label: "Vulneraveis" },
  { value: "clean", label: "Limpos" },
];

function filterCount(
  filter: DispatchProbeListFilter,
  counts?: ProbeOutcomeCounts,
): number | null {
  if (!counts) return null;
  if (filter === "vulnerable") return counts.vulnerable;
  if (filter === "clean") return counts.clean;
  return counts.all;
}

export function ProbeOutcomeFilter({
  filter,
  probeCounts,
  onFilterChange,
  className,
}: {
  filter: DispatchProbeListFilter;
  probeCounts?: ProbeOutcomeCounts;
  onFilterChange: (filter: DispatchProbeListFilter) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {FILTER_OPTIONS.map((option) => {
        const count = filterCount(option.value, probeCounts);
        const active = filter === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            variant={active ? "primary" : "outline"}
            onClick={() => onFilterChange(option.value)}
          >
            {option.label}
            {count !== null ? ` (${count})` : ""}
          </Button>
        );
      })}
    </div>
  );
}
