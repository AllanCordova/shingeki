"use client";

import Link from "next/link";
import { useState } from "react";
import type { UserNotification, UserNotificationStatus } from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common/common";
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/hooks/notifications/use-notifications";
import { notify } from "@/lib/ui/notify";
import { cn, formatDate } from "@/lib/utils";
import { safeHref } from "@/lib/urls";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorShow,
  ListPagination,
  Loading,
  Modal,
  Spinner,
  TrashIcon,
} from "@/components/ui";

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

export function NotificationsList() {
  const [page, setPage] = useState(1);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    notifications,
    pagination,
    unreadCount,
    pendingCount,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useNotifications(page, true, DEFAULT_PAGE_SIZE);
  const { markRead } = useMarkNotificationRead();
  const { markAllRead, isLoading: isMarkingAll } = useMarkAllNotificationsRead();
  const { deleteNotification } = useDeleteNotification();
  const { deleteAllNotifications, isLoading: isDeletingAll } = useDeleteAllNotifications();

  const handleMarkRead = async (notification: UserNotification) => {
    if (notification.read_at !== null || notification.status === "pending") return;

    try {
      await markRead(notification.id);
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel marcar como lida.");
    }
  };

  const handleDelete = async (notificationId: string) => {
    setDeletingId(notificationId);
    try {
      await deleteNotification(notificationId);
      notify.success("Notificacao removida.");
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel remover a notificacao.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    const ok = await notify.run(() => deleteAllNotifications(), {
      success: "Todas as notificacoes foram removidas.",
    });
    if (!ok) return;
    setDeleteAllOpen(false);
    setPage(1);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Notificacoes</CardTitle>
              <CardDescription>
                {pendingCount > 0 ? `${pendingCount} em andamento` : "Nenhum job pendente"}
                {unreadCount > 0 ? ` · ${unreadCount} nao lida(s)` : ""}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {notifications.length > 0 ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isLoading={isMarkingAll}
                    onClick={() =>
                      void notify.run(() => markAllRead(), {
                        success: "Todas marcadas como lidas.",
                      })
                    }
                  >
                    Marcar todas como lidas
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2.5 text-danger hover:bg-danger-surface hover:text-danger"
                    aria-label="Remover todas as notificacoes"
                    title="Remover todas as notificacoes"
                    onClick={() => setDeleteAllOpen(true)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
              {isFetching && !isLoading ? <Spinner size="sm" /> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loading label="Carregando notificacoes..." />
          ) : error ? (
            <ErrorShow error={error} onRetry={() => refetch()} />
          ) : notifications.length === 0 ? (
            <EmptyState
              title="Nenhuma notificacao"
              description="Scans e importacoes aparecem aqui quando houver atualizacoes."
            />
          ) : (
            <div className="flex flex-col gap-4">
              <ul className="flex flex-col divide-y divide-border rounded-app border border-border">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <NotificationRow
                      notification={notification}
                      isDeleting={deletingId === notification.id}
                      onDelete={() => void handleDelete(notification.id)}
                      onMarkRead={() => void handleMarkRead(notification)}
                    />
                  </li>
                ))}
              </ul>
              {pagination ? (
                <ListPagination
                  pagination={pagination}
                  isFetching={isFetching}
                  onPageChange={setPage}
                />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        title="Remover todas as notificacoes"
        description="Esta acao nao pode ser desfeita."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteAllOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isDeletingAll}
              onClick={() => void handleDeleteAll()}
            >
              Remover todas
            </Button>
          </>
        }
      />
    </>
  );
}

function NotificationRow({
  notification,
  isDeleting,
  onDelete,
  onMarkRead,
}: {
  notification: UserNotification;
  isDeleting: boolean;
  onDelete: () => void;
  onMarkRead: () => void;
}) {
  const unread = notification.read_at === null && notification.status !== "pending";
  const actionHref = safeHref(notification.action_url);

  const content = (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2 px-4 py-3 text-left",
        unread && "bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <Badge tone={statusTone(notification.status)}>{statusLabel(notification.status)}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{notification.body}</p>
      <p className="text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
    </div>
  );

  return (
    <div className="flex items-stretch gap-2">
      {actionHref && notification.status !== "pending" ? (
        <Link
          href={actionHref}
          onClick={onMarkRead}
          className="min-w-0 flex-1 transition-colors hover:bg-surface-muted"
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onMarkRead}
          className="min-w-0 flex-1 text-left transition-colors hover:bg-surface-muted"
        >
          {content}
        </button>
      )}
      <div className="flex shrink-0 items-center pr-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-2.5 text-danger hover:bg-danger-surface hover:text-danger"
          aria-label="Remover notificacao"
          title="Remover notificacao"
          isLoading={isDeleting}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
