import { cn } from "@/lib/utils";

function Radar({ className }: { className?: string }) {
  return (
    <span className={cn("scan-activity-radar shrink-0", className)} aria-hidden>
      <span className="scan-activity-ring" />
      <span className="scan-activity-ring scan-activity-ring-delay" />
      <span className="scan-activity-sweep" />
      <span className="scan-activity-core" />
    </span>
  );
}

export function ScanActivity({
  title = "Ataque em processamento",
  description = "O worker está percorrendo o alvo. Os achados aparecem aqui conforme os testes terminam.",
  compact = false,
  className,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <span
        role="status"
        className={cn("inline-flex items-center gap-2 text-xs text-foreground", className)}
      >
        <Radar className="h-5 w-5" />
        <span>{title}</span>
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-4 rounded-app border border-border bg-surface px-4 py-3",
        className,
      )}
    >
      <Radar className="h-14 w-14" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
