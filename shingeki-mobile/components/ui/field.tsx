import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Label } from "./label";

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <View className="flex flex-col gap-1.5">
      {label ? <Label>{label}</Label> : null}
      {children}
      {hint && !error ? (
        <Text className="text-xs text-muted-foreground">{hint}</Text>
      ) : null}
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
