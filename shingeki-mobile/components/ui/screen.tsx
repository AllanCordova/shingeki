import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { cn } from "@/lib/utils";
import { appBackgroundColor } from "@/lib/css-vars";

interface ScreenProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, className, style }: ScreenProps) {
  return (
    <View
      className={cn("flex-1 bg-background", className)}
      style={[{ flex: 1, backgroundColor: appBackgroundColor }, style]}
    >
      {children}
    </View>
  );
}
