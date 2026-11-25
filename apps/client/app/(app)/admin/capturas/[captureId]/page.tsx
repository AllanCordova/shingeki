"use client";

import Link from "next/link";
import { use } from "react";
import { useAdminBrowserCapture } from "@/lib/hooks/admin/use-admin-browser-captures";
import { Badge, EmptyState, ErrorShow, Loading } from "@/components/ui";

export default function AdminCapturaDetailPage({
  params,
}: {
  params: Promise<{ captureId: string }>;
}) {
  const { captureId } = use(params);
  const { capture, isLoading, isError, error, refetch } =
    useAdminBrowserCapture(captureId);

  if (isLoading) return <Loading />;
  if (isError || !capture) {
    return (
      <ErrorShow
        error={error ?? "Captura não encontrada."}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/capturas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar às capturas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Captura {capture.id.slice(0, 8)}…
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {capture.user.email} · {capture.system.name} ·{" "}
          <Badge>{capture.status}</Badge>
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Criada em</dt>
          <dd>
            {capture.created_at
              ? new Date(capture.created_at).toLocaleString("pt-BR")
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Navegador aberto em</dt>
          <dd>
            {capture.browser_opened_at
              ? new Date(capture.browser_opened_at).toLocaleString("pt-BR")
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">IP da criação</dt>
          <dd>{capture.ip_address ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">IP da abertura</dt>
          <dd>{capture.browser_opened_ip ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Origem</dt>
          <dd>{capture.source ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dispatch</dt>
          <dd className="font-mono text-xs">{capture.dispatch_id ?? "—"}</dd>
        </div>
      </dl>

      <div>
        <h2 className="text-lg font-semibold text-foreground">Linha do tempo</h2>
        {capture.events.length === 0 ? (
          <EmptyState
            title="Sem eventos"
            description="Ainda não há registros de auditoria para esta captura."
          />
        ) : (
          <ol className="mt-3 space-y-3 border-l border-border pl-4">
            {capture.events.map((event) => (
              <li key={event.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="font-medium text-foreground">{event.event}</div>
                <div className="text-xs text-muted-foreground">
                  {event.created_at
                    ? new Date(event.created_at).toLocaleString("pt-BR")
                    : "—"}
                  {event.ip_address ? ` · ${event.ip_address}` : ""}
                </div>
                {event.url ? (
                  <div className="mt-1 break-all font-mono text-xs text-foreground">
                    {event.url}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
