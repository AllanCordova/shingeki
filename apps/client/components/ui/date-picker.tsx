"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Selecionar data",
  disabled = false,
  className,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseDateValue(value);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
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
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={inputId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-app border bg-surface px-3 text-left text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "border-input text-foreground",
        )}
      >
        <span className={cn(!selected && "text-muted-foreground")}>
          {selected
            ? format(selected, "dd/MM/yyyy", { locale: ptBR })
            : placeholder}
        </span>
        <span className="text-muted-foreground" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          className="absolute z-40 mt-2 rounded-app border border-border bg-surface p-2 shadow-lg"
          role="dialog"
          aria-label="Calendario"
        >
          <DayPicker
            mode="single"
            locale={ptBR}
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
            className="rdp-shingeki"
          />
          {value ? (
            <button
              type="button"
              className="mt-1 w-full rounded-app px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Limpar data
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
