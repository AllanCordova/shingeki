import { Text, View } from "react-native";
import { cn } from "@/lib/utils";
import { Button } from "./button";

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

export function ErrorShow({ error, onRetry, className }: ErrorShowProps) {
  return (
    <View
      className={cn(
        "flex-row items-start justify-between gap-3 rounded-app border border-danger bg-danger-surface px-4 py-3",
        className,
      )}
      accessibilityRole="alert"
    >
      <Text className="flex-1 text-sm text-danger">{getMessage(error)}</Text>
      {onRetry ? (
        <Button variant="ghost" size="sm" onPress={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </View>
  );
}
