import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

/** Estado de carregamento reutilizavel (tela/secao). */
export function Loading({
  label = "Carregando...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground",
        className,
      )}
    >
      <Spinner size="lg" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
