import { cn } from "@/lib/utils";
import { Button } from "./button";

/** Extrai uma mensagem amigavel de qualquer erro normalizado. */
function getMessage(error: unknown): string {
  if (!error) return "Ocorreu um erro inesperado.";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Ocorreu um erro inesperado.";
}

interface ErrorShowProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

/** Bloco de erro reutilizavel (mensagem ja traduzida + acao opcional). */
export function ErrorShow({ error, onRetry, className }: ErrorShowProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start justify-between gap-3 rounded-app border bg-danger-surface px-4 py-3 text-sm text-danger",
        className,
      )}
      style={{ borderColor: "var(--danger)" }}
    >
      <span className="flex-1">{getMessage(error)}</span>
      {onRetry ? (
        <Button variant="ghost" size="sm" onClick={onRetry} className="text-danger">
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
