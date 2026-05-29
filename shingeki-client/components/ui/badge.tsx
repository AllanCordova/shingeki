import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  success: "bg-success-surface text-success",
  danger: "bg-danger-surface text-danger",
  warning: "bg-warning-surface text-warning",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-app px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
