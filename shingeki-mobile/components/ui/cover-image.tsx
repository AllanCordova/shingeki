import { useState } from "react";
import { Image, View } from "react-native";
import { resolveCoverSrc } from "@/lib/cover-image";
import { cn } from "@/lib/utils";

interface CoverImageProps {
  coverPath?: string | null;
  alt: string;
  className?: string;
  heightClass?: string;
}

export function CoverImage({
  coverPath,
  alt,
  className,
  heightClass = "h-36",
}: CoverImageProps) {
  const src = resolveCoverSrc(coverPath);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return null;
  }

  return (
    <View
      className={cn(
        "w-full overflow-hidden rounded-t-app bg-surface-muted",
        heightClass,
        className,
      )}
    >
      <Image
        source={{ uri: src }}
        accessibilityLabel={alt}
        className="h-full w-full"
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </View>
  );
}
