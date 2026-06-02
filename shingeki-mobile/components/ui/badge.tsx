import { Text, View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted",
  success: "bg-success-surface",
  danger: "bg-danger-surface",
  warning: "bg-warning-surface",
};

const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
};

interface BadgeProps extends ViewProps {
  tone?: Tone;
  children?: React.ReactNode;
  className?: string;
}

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <View
      className={cn(
        "self-start rounded-app px-2 py-0.5",
        tones[tone],
        className,
      )}
      {...props}
    >
      <Text className={cn("text-xs font-medium", toneText[tone])}>
        {children}
      </Text>
    </View>
  );
}
