"use client";

import type { Stack } from "@/lib/contracts/stack";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

interface StackSelectProps {
  stacks: Stack[];
  value: string[];
  onChange: (stackIds: string[]) => void;
  disabled?: boolean;
  id?: string;
}

function formatLanguages(languages?: string[]): string | null {
  if (!languages?.length) {
    return null;
  }

  return languages.map((language) => language.toUpperCase()).join(", ");
}

export function StackSelect({
  stacks,
  value,
  onChange,
  disabled = false,
  id,
}: StackSelectProps) {
  const toggle = (stackId: string) => {
    if (disabled) {
      return;
    }

    const current = value ?? [];

    onChange(
      current.includes(stackId)
        ? current.filter((id) => id !== stackId)
        : [...current, stackId],
    );
  };

  if (stacks.length === 0) {
    return (
      <p className="rounded-app border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
        Nenhuma stack disponivel.
      </p>
    );
  }

  return (
    <div
      id={id}
      role="group"
      aria-label="Stacks tecnologicas"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {stacks.map((stack) => {
        const selected = value?.includes(stack.id) ?? false;
        const languages = formatLanguages(stack.languages);

        return (
          <button
            key={stack.id}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => toggle(stack.id)}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-app border px-3 py-2.5 text-left text-sm transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border bg-surface hover:border-primary/40 hover:bg-surface-muted",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="font-medium text-foreground">{stack.name}</span>
            {languages ? (
              <Badge tone="neutral" className="text-[10px]">
                {languages}
              </Badge>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
