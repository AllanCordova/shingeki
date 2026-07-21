"use client";

import { NotificationsList } from "@/components/notifications/notifications-list";

export default function NotificaçõesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Notificações
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe scans, importações e remova itens antigos da sua caixa de entrada.
        </p>
      </div>

      <NotificationsList />
    </div>
  );
}
