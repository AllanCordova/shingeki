import Link from "next/link";
import { resolveCoverSrc } from "@/lib/cover-image";
import { cn } from "@/lib/utils";

interface UserAvatarLinkProps {
  name: string;
  avatarPath?: string | null;
  size?: "sm" | "md";
  className?: string;
}

const sizes = {
  sm: "h-12 w-12 text-sm",
  md: "h-15 w-15 text-lg",
};

export function UserAvatarLink({
  name,
  avatarPath,
  size = "sm",
  className,
}: UserAvatarLinkProps) {
  const src = resolveCoverSrc(avatarPath);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link
      href="/perfil"
      aria-label="Abrir perfil"
      title="Perfil"
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted font-semibold text-foreground transition-opacity hover:opacity-90",
        sizes[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </Link>
  );
}
