import { ScrollView, type ScrollViewProps } from "react-native";
import { cn } from "@/lib/utils";
import { appBackgroundColor } from "@/lib/css-vars";

export function AppScrollView({ className, style, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      className={cn("flex-1 bg-background", className)}
      style={[{ flex: 1, backgroundColor: appBackgroundColor }, style]}
      {...props}
    />
  );
}
