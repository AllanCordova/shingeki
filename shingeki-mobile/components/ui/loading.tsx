import { Text, View } from "react-native";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export function Loading({
  label = "Carregando...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "items-center justify-center gap-3 py-12",
        className,
      )}
    >
      <Spinner size="lg" />
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}
