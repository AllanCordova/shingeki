"use client";

import { NotificationsList } from "@/components/notifications/notifications-list";

export default function NotificacoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Notificacoes
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe scans, importacoes e remova itens antigos da sua caixa de entrada.
        </p>
      </div>

      <NotificationsList />
    </div>
  );
}
