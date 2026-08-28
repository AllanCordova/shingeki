"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SidePanel({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: SidePanelProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
          className,
        )}
      >
        {(title || description) && (
          <div className="flex shrink-0 flex-col gap-1 border-b border-border px-5 py-4">
            {title ? (
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </>
  );
}
