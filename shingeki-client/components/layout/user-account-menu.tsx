"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveCoverSrc } from "@/lib/cover-image";
import { useLogout, useMe } from "@/lib/hooks/use-auth";
import { useNotificationUnreadCount } from "@/lib/hooks/use-notifications";
import { useThemeStore } from "@/lib/stores/theme-store";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SettingsIcon } from "@/components/ui/icons";

function UserAvatarFace({
  name,
  avatarPath,
  className,
}: {
  name: string;
  avatarPath?: string | null;
  className?: string;
}) {
  const src = resolveCoverSrc(avatarPath);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-sm font-semibold text-foreground",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </span>
  );
}

/** Compact account menu for small screens: avatar trigger + collapsed actions. */
export function UserAccountMenu() {
  const { user } = useMe();
  const { logout, isLoading } = useLogout();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { badgeCount } = useNotificationUnreadCount(Boolean(user));
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
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
    <div ref={containerRef} className="relative lg:hidden">
      <button
        type="button"
        className="relative inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Abrir menu da conta"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <UserAvatarFace name={user.name} avatarPath={user.avatar_path} />
        {badgeCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-app border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <nav className="flex flex-col p-1">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="rounded-app px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              Perfil
            </Link>
            <Link
              href="/notificacoes"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-app px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <span>Notificacoes</span>
              {badgeCount > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="/configuracoes"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-app px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <SettingsIcon className="h-4 w-4 shrink-0" />
              Configuracoes
            </Link>
            <button
              type="button"
              onClick={() => {
                toggleTheme();
              }}
              className="rounded-app px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              {theme === "dark" ? "Tema claro" : "Tema escuro"}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start px-3"
              isLoading={isLoading}
              onClick={() => void handleLogout()}
            >
              Sair
            </Button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
