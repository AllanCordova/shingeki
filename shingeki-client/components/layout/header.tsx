"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserAvatarLink } from "@/components/ui/user-avatar-link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useLogout, useMe } from "@/lib/hooks/use-auth";
import { useUiStore } from "@/lib/stores/ui-store";
import { notify } from "@/lib/notify";
import { MenuIcon, SettingsIcon } from "@/components/ui/icons";
import { ThemeToggle } from "./theme-toggle";
import { UserAccountMenu } from "./user-account-menu";

export function Header({ showMenuButton = false }: { showMenuButton?: boolean }) {
  const { user } = useMe();
  const { logout, isLoading } = useLogout();
  const router = useRouter();
  const mobileOpen = useUiStore((state) => state.mobileMenuOpen);
  const setMobileMenu = useUiStore((state) => state.setMobileMenu);

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
      <div className="flex h-16 w-full items-center justify-between gap-2 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {showMenuButton ? (
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-app text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileMenu(!mobileOpen)}
            >
              <MenuIcon className="h-5 w-5 shrink-0" />
            </button>
          ) : null}
          <Link
            href="/"
            className="truncate text-lg font-semibold tracking-tight text-foreground"
          >
            shingeki
          </Link>
        </div>

        {/* Mobile: avatar menu only (or theme when logged out) */}
        {user ? (
          <UserAccountMenu />
        ) : (
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        )}

        {/* Desktop toolbar */}
        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <NotificationBell enabled />
              <Link
                href="/configuracoes"
                className="inline-flex h-9 w-9 items-center justify-center rounded-app text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Configuracoes"
                title="Configuracoes"
              >
                <SettingsIcon className="h-4 w-4 shrink-0" />
              </Link>
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
