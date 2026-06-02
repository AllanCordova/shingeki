import { Text, type TextProps } from "react-native";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: TextProps) {
  return (
    <Text className={cn("text-sm font-medium text-foreground", className)} {...props} />
  );
}
