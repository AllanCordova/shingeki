import type { Ref, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ className, hasError, ref, children, ...props }: SelectProps) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-app border bg-surface px-3 text-sm text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        hasError ? "border-danger" : "border-input",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
