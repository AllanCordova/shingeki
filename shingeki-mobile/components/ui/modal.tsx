import type { ReactNode } from "react";
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <RNModal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-foreground/40 p-4"
        onPress={onClose}
      >
        <Pressable
          className={cn(
            "max-h-[90%] w-full max-w-lg rounded-app border border-border bg-surface",
            className,
          )}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView>
            {(title || description) && (
              <View className="gap-1 border-b border-border p-5">
                {title ? (
                  <Text className="text-base font-semibold text-foreground">
                    {title}
                  </Text>
                ) : null}
                {description ? (
                  <Text className="text-sm text-muted-foreground">
                    {description}
                  </Text>
                ) : null}
              </View>
            )}
            <View className="p-5">{children}</View>
            {footer ? (
              <View className="flex-row items-center justify-end gap-2 border-t border-border p-5">
                {footer}
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
