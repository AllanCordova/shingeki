"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ModalSize = "md" | "lg" | "xl";

const sizeClasses: Record<ModalSize, string> = {
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Largura do painel. Padrao `md`. Formularios com capa: `xl`. */
  size?: ModalSize;
  className?: string;
}

/** Modal controlado e acessivel (fecha com Esc / clique fora). */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[min(90vh,880px)] w-full flex-col overflow-hidden rounded-app border border-border bg-surface shadow-xl",
          sizeClasses[size],
          className,
        )}
      >
        {(title || description) && (
          <div className="flex shrink-0 flex-col gap-1 border-b border-border p-5">
            {title ? (
              <h2 className="text-base font-semibold text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
