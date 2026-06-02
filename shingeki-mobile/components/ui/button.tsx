import type { ReactNode } from "react";
import { Pressable, Text, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary active:opacity-90",
  outline: "border border-border bg-surface active:bg-surface-muted",
  ghost: "active:bg-surface-muted",
  danger: "bg-danger active:opacity-90",
};

const variantText: Record<Variant, string> = {
  primary: "text-primary-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
  danger: "text-danger-foreground",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3",
  md: "h-10 px-4",
  lg: "h-12 px-6",
};

const textSizes: Record<Size, string> = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

interface ButtonProps extends PressableProps {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled || isLoading}
      className={cn(
        "flex-row items-center justify-center gap-2 rounded-app",
        "disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading ? <Spinner size="sm" /> : leftIcon}
      {children ? (
        <Text
          className={cn("font-medium", variantText[variant], textSizes[size])}
        >
          {children}
        </Text>
      ) : null}
    </Pressable>
  );
}
