"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { UserNotification, UserNotificationStatus } from "@/lib/contracts";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationUnreadCount,
} from "@/lib/hooks/notifications/use-notifications";
import { cn } from "@/lib/utils";
import { Badge, Button, EmptyState, Loading, Spinner } from "@/components/ui";
import { BellIcon } from "@/components/ui/icons";

function statusTone(status: UserNotificationStatus): "neutral" | "success" | "danger" | "warning" {
  if (status === "pending") return "warning";
  if (status === "failed") return "danger";
  return "success";
}

function statusLabel(status: UserNotificationStatus): string {
  if (status === "pending") return "Em andamento";
  if (status === "failed") return "Falhou";
  return "Concluido";
}

export function NotificationBell({ enabled = true }: { enabled?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { badgeCount } = useNotificationUnreadCount(enabled);
  const {
    notifications,
    isLoading,
    isFetching,
    unreadCount,
    pendingCount,
    refetch,
  } = useNotifications(1, enabled && open);
  const { markRead } = useMarkNotificationRead();
  const { markAllRead, isLoading: isMarkingAll } = useMarkAllNotificationsRead();

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

  if (!enabled) return null;

  const handleOpen = () => {
    setOpen((current) => !current);
    if (!open) {
      void refetch();
    }
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    if (notification.read_at === null && notification.status !== "pending") {
      try {
        await markRead(notification.id);
      } catch {
        // navigation still proceeds
      }
    }

    setOpen(false);
    router.push("/notificacoes");
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative px-2.5"
        aria-label="Notificacoes"
        title="Notificacoes"
        onClick={handleOpen}
      >
        <BellIcon className="h-4 w-4" />
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-app border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Notificacoes</p>
              <p className="text-xs text-muted-foreground">
                {pendingCount > 0 ? `${pendingCount} em andamento` : "Nenhum job pendente"}
                {unreadCount > 0 ? ` · ${unreadCount} nao lida(s)` : ""}
              </p>
            </div>
            {isFetching && !isLoading ? <Spinner size="sm" /> : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4">
                <Loading label="Carregando..." />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="Nenhuma notificacao"
                  description="Scans e importacoes aparecem aqui quando houver atualizacoes."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <NotificationPreviewItem
                      notification={notification}
                      onClick={() => void handleNotificationClick(notification)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 ? (
            <div className="flex flex-col gap-1 border-t border-border px-4 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                isLoading={isMarkingAll}
                onClick={() => void markAllRead()}
              >
                Marcar todas como lidas
              </Button>
              <Link
                href="/notificacoes"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-full items-center justify-center rounded-app border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
              >
                Ver todas as notificacoes
              </Link>
            </div>
          ) : (
            <div className="border-t border-border px-4 py-2">
              <Link
                href="/notificacoes"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-full items-center justify-center rounded-app border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
              >
                Ver todas as notificacoes
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotificationPreviewItem({
  notification,
  onClick,
}: {
  notification: UserNotification;
  onClick: () => void;
}) {
  const unread = notification.read_at === null && notification.status !== "pending";

  return (
    <button type="button" onClick={onClick} className="block w-full">
      <div
        className={cn(
          "flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-muted",
          unread && "bg-primary/5",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{notification.title}</p>
          <Badge tone={statusTone(notification.status)}>{statusLabel(notification.status)}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{notification.body}</p>
      </div>
    </button>
  );
}
