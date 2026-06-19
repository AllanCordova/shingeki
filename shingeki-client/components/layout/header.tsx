"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserAvatarLink } from "@/components/ui/user-avatar-link";
import { useLogout, useMe } from "@/lib/hooks/use-auth";
import { notify } from "@/lib/notify";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const { user } = useMe();
  const { logout, isLoading } = useLogout();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      notify.success("Sessao encerrada.");
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel sair.");
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          shingeki
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.name}
              </span>
              <UserAvatarLink name={user.name} avatarPath={user.avatar_path} />
            </>
          ) : null}
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            isLoading={isLoading}
          >
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
