import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextInputProps {
  hasError?: boolean;
  className?: string;
}

export const Textarea = forwardRef<TextInput, TextareaProps>(function Textarea(
  { className, hasError, ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      multiline
      textAlignVertical="top"
      placeholderTextColor="#71717a"
      className={cn(
        "min-h-24 w-full rounded-app border bg-surface px-3 py-2 text-sm text-foreground",
        hasError ? "border-danger" : "border-input",
        className,
      )}
      {...props}
    />
  );
});
