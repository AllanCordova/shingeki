import type { TextareaHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ className, hasError, ref, ...props }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-app border bg-surface px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        hasError ? "border-danger" : "border-input",
        className,
      )}
      {...props}
    />
  );
}
