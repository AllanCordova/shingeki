"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MoreVerticalIcon } from "@/components/ui/icons";

export interface ItemActionsMenuItem {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
}

interface ItemActionsMenuProps {
  items: ItemActionsMenuItem[];
  label?: string;
  className?: string;
}

export function ItemActionsMenu({
  items,
  label = "Mais opções",
  className,
}: ItemActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-8 w-8 items-center justify-center rounded-app border border-border bg-surface/95 text-foreground shadow-sm backdrop-blur-sm hover:bg-surface-muted"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-36 overflow-hidden rounded-app border border-border bg-surface py-1 shadow-lg"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {items.map((item) => (
            <MenuButton
              key={item.label}
              tone={item.tone}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </MenuButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
        tone === "danger" ? "text-danger" : "text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
