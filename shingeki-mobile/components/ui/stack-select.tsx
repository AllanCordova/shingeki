import { Pressable, Text, View } from "react-native";
import type { Stack } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

interface StackSelectProps {
  stacks: Stack[];
  value: string[];
  onChange: (stackIds: string[]) => void;
  disabled?: boolean;
}

function formatLanguages(languages?: string[]): string | null {
  if (!languages?.length) return null;
  return languages.map((language) => language.toUpperCase()).join(", ");
}

export function StackSelect({
  stacks,
  value,
  onChange,
  disabled = false,
}: StackSelectProps) {
  const toggle = (stackId: string) => {
    if (disabled) return;
    const current = value ?? [];
    onChange(
      current.includes(stackId)
        ? current.filter((id) => id !== stackId)
        : [...current, stackId],
    );
  };

  if (stacks.length === 0) {
    return (
      <View className="rounded-app border border-dashed border-border px-3 py-4">
        <Text className="text-center text-sm text-muted-foreground">
          Nenhuma stack disponivel.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {stacks.map((stack) => {
        const selected = value?.includes(stack.id) ?? false;
        const languages = formatLanguages(stack.languages);

        return (
          <Pressable
            key={stack.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => toggle(stack.id)}
            className={cn(
              "min-w-[46%] flex-1 rounded-app border px-3 py-2.5 active:opacity-80",
              selected
                ? "border-primary bg-surface-muted"
                : "border-border bg-surface",
              disabled && "opacity-50",
            )}
          >
            <Text className="text-sm font-medium text-foreground">
              {stack.name}
            </Text>
            {languages ? (
              <Badge tone="neutral" className="mt-1.5 self-start">
                {languages}
              </Badge>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
