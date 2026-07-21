import { resolveCoverSrc } from "@/lib/cover/cover-image";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "h-8 w-8 text-xs",
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-sm",
  lg: "h-15 w-15 text-lg",
} as const;

export type UserAvatarSize = keyof typeof sizes;

interface UserAvatarProps {
  name: string;
  avatarPath?: string | null;
  size?: UserAvatarSize;
  className?: string;
}

/** Face circular do usuario (foto ou inicial). Sem link. */
export function UserAvatar({
  name,
  avatarPath,
  size = "sm",
  className,
}: UserAvatarProps) {
  const src = resolveCoverSrc(avatarPath);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted font-semibold text-foreground",
        sizes[size],
        className,
      )}
    >
      {src ? (
        // Remote avatar URLs; next/image would require a dynamic remotePatterns allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </span>
  );
}
