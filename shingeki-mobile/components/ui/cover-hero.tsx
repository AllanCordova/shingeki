import type { ReactNode } from "react";
import { useState } from "react";
import { Image, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { resolveCoverSrc } from "@/lib/cover-image";
import { cn } from "@/lib/utils";

const SCREEN_TOP_PADDING = 24;

interface CoverHeroProps {
  coverPath?: string | null;
  alt: string;
  children: ReactNode;
  className?: string;
}

export function CoverHero({
  coverPath,
  alt,
  children,
  className,
}: CoverHeroProps) {
  const src = resolveCoverSrc(coverPath);
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(src && !failed);

  return (
    <View
      className={cn("w-full", className)}
      style={{ marginTop: -SCREEN_TOP_PADDING }}
    >
      <View
        className={cn(
          "relative min-h-[240px] w-full justify-end overflow-hidden",
          hasImage ? "bg-black" : "border-b border-border bg-surface-muted",
        )}
      >
        {hasImage && src ? (
          <>
            <Image
              source={{ uri: src }}
              accessibilityLabel={alt}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
              resizeMode="cover"
              onError={() => setFailed(true)}
            />
            <LinearGradient
              colors={[
                "rgba(0,0,0,0.15)",
                "rgba(0,0,0,0.55)",
                "rgba(0,0,0,0.92)",
              ]}
              locations={[0, 0.45, 1]}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
              }}
            />
          </>
        ) : null}
        <View className="relative z-10 px-4 pb-6 pt-10">{children}</View>
      </View>
    </View>
  );
}
