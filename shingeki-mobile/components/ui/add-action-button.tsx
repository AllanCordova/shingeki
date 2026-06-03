import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { appPrimaryForegroundColor } from "@/lib/css-vars";
import { cn } from "@/lib/utils";

interface AddActionButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  className?: string;
}

export function AddActionButton({
  onPress,
  accessibilityLabel,
  className,
}: AddActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "h-10 w-10 items-center justify-center rounded-app bg-primary active:opacity-90",
        className,
      )}
    >
      <Ionicons name="add" size={24} color={appPrimaryForegroundColor} />
    </Pressable>
  );
}
