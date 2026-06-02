import type { ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        "rounded-app border border-border bg-surface",
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ className, children, ...props }: ViewProps) {
  return (
    <View className={cn("flex flex-col gap-1 p-5 pb-0", className)} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: ViewProps & { children?: ReactNode }) {
  return (
    <Text
      className={cn("text-base font-semibold text-foreground", className)}
      {...(props as object)}
    >
      {children}
    </Text>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: ViewProps & { children?: ReactNode }) {
  return (
    <Text
      className={cn("text-sm text-muted-foreground", className)}
      {...(props as object)}
    >
      {children}
    </Text>
  );
}

export function CardContent({ className, children, ...props }: ViewProps) {
  return (
    <View className={cn("p-5", className)} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ className, children, ...props }: ViewProps) {
  return (
    <View
      className={cn("flex-row items-center gap-2 p-5 pt-0", className)}
      {...props}
    >
      {children}
    </View>
  );
}
