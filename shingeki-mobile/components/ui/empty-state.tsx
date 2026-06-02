import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <View
      className={cn(
        "items-center justify-center gap-3 rounded-app border border-dashed border-border bg-surface px-6 py-12",
        className,
      )}
    >
      <Text className="text-center text-base font-semibold text-foreground">
        {title}
      </Text>
      {description ? (
        <Text className="max-w-sm text-center text-sm text-muted-foreground">
          {description}
        </Text>
      ) : null}
      {action}
    </View>
  );
}
