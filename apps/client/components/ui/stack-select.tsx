"use client";

import { useMemo, useState } from "react";
import type { Stack, StackKind } from "@/lib/contracts/system/stack";
import { cn } from "@/lib/utils";
import { StackIcon } from "@/components/system/stack-icon";
import { Badge } from "./badge";
import { Input } from "./input";

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

function isSelectable(stack: Stack): boolean {
  return stack.kind !== "generic" && stack.slug !== "generic";
}

export function StackSelect({
  stacks,
  value,
  onChange,
  disabled = false,
  id,
}: StackSelectProps) {
  const [query, setQuery] = useState("");

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

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const selectable = stacks.filter((stack) => {
      if (!isSelectable(stack)) {
        return false;
      }

      if (needle === "") {
        return true;
      }

      return (
        stack.name.toLowerCase().includes(needle) ||
        stack.slug.toLowerCase().includes(needle) ||
        stack.languages?.some((language) => language.includes(needle))
      );
    });

    const languages = selectable.filter((stack) => stack.kind === "language");
    const frameworks = selectable.filter(
      (stack) => stack.kind !== "language",
    );

    return [
      { kind: "language" as StackKind, label: "Linguagens", items: languages },
      { kind: "framework" as StackKind, label: "Frameworks", items: frameworks },
    ].filter((group) => group.items.length > 0);
  }, [query, stacks]);

  if (stacks.filter(isSelectable).length === 0) {
    return (
      <p className="rounded-app border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
        Nenhuma stack disponível.
      </p>
    );
  }

  return (
    <div id={id} className="flex flex-col gap-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar linguagem ou framework"
        aria-label="Buscar stack"
        disabled={disabled}
      />
      {groups.length === 0 ? (
        <p className="rounded-app border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
          Nenhuma stack corresponde à busca.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.kind} className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div
              role="group"
              aria-label={group.label}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {group.items.map((stack) => {
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
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <StackIcon slug={stack.slug} />
                      {stack.name}
                    </span>
                    {languages ? (
                      <Badge tone="neutral" className="text-[10px]">
                        {languages}
                      </Badge>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
