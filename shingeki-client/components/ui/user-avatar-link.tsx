import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserAvatar, type UserAvatarSize } from "@/components/ui/user-avatar";

interface UserAvatarLinkProps {
  name: string;
  avatarPath?: string | null;
  size?: UserAvatarSize;
  className?: string;
}

export function UserAvatarLink({
  name,
  avatarPath,
  size = "md",
  className,
}: UserAvatarLinkProps) {
  return (
    <Link
      href="/perfil"
      aria-label="Abrir perfil"
      title="Perfil"
      className={cn(
        "inline-flex shrink-0 transition-opacity hover:opacity-90",
        className,
      )}
    >
      <UserAvatar name={name} avatarPath={avatarPath} size={size} />
    </Link>
  );
}
