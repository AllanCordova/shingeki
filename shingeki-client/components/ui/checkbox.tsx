import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className="h-3 w-3 shrink-0"
    >
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Checkbox({
  className,
  label,
  description,
  checked,
  disabled,
  id,
  ref,
  ...props
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[calc(var(--radius)-4px)] border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-surface text-transparent",
        )}
      >
        <CheckIcon />
      </span>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className="sr-only focus-visible:outline-none"
        {...props}
      />
      {label || description ? (
        <span className="flex min-w-0 flex-col gap-0.5 pt-px">
          {label ? <span className="text-sm text-foreground">{label}</span> : null}
          {description ? (
            <span className="text-xs text-muted-foreground">{description}</span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
