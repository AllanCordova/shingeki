import { ActivityIndicator, View } from "react-native";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "small" as const,
  md: "small" as const,
  lg: "large" as const,
};

export function Spinner({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <View className={cn(className)} accessibilityLabel="Carregando">
      <ActivityIndicator size={sizes[size]} color="currentColor" />
    </View>
  );
}
