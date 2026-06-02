import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

interface InputProps extends TextInputProps {
  hasError?: boolean;
  className?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { className, hasError, ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor="#71717a"
      className={cn(
        "h-10 w-full rounded-app border bg-surface px-3 text-sm text-foreground",
        hasError ? "border-danger" : "border-input",
        className,
      )}
      {...props}
    />
  );
});
