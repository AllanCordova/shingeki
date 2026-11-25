"use client";

import { useAdminOpsStatus } from "@/lib/hooks/admin/use-admin-ops";
import type { AdminOpsUsageWindow } from "@/lib/contracts";
import { Badge, Button, EmptyState, ErrorShow, Loading } from "@/components/ui";

function statusTone(
  status: string,
): "neutral" | "warning" | "success" | "danger" {
  if (status === "ok") return "success";
  if (status === "degraded") return "warning";
  if (status === "down") return "danger";
  return "neutral";
}

function UsageBlock({
  title,
  usage,
}: {
  title: string;
  usage: AdminOpsUsageWindow;
}) {
  return (
    <div className="rounded-app border border-border p-4">
      <h3 className="font-medium text-foreground">{title}</h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Disparos</dt>
          <dd>{usage.dispatches_total}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Concluídos / falha</dt>
          <dd>
            {usage.dispatches_completed} / {usage.dispatches_failed}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Capturas criadas</dt>
          <dd>{usage.captures_created}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Importadas</dt>
          <dd>{usage.captures_imported}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Navegador aberto</dt>
          <dd>{usage.captures_browser_opened}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Contas distintas</dt>
          <dd>{usage.unique_users_opened_browser}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function AdminObservabilidadePage() {
  const { status, isLoading, isFetching, isError, error, refetch } =
    useAdminOpsStatus();

  if (isLoading && !status) return <Loading />;
  if (isError || !status) {
    return (
      <ErrorShow
        error={error ?? "Não foi possível carregar a observabilidade."}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Observabilidade
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Status dos workers/filas, captura remota e uso recente da plataforma.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          isLoading={isFetching}
          onClick={() => void refetch()}
        >
          Atualizar
        </Button>
      </div>

      <section className="rounded-app border border-border p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-foreground">Captura remota</h2>
          <Badge tone={statusTone(status.capture.status)}>
            {status.capture.status}
          </Badge>
          {status.capture.busy ? <Badge tone="warning">busy</Badge> : null}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {status.capture.message}
        </p>
        {status.capture.active_capture_id ? (
          <p className="mt-1 font-mono text-xs">
            {status.capture.active_capture_id}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 font-medium text-foreground">Filas</h2>
        <div className="overflow-x-auto rounded-app border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Fila</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Mensagens</th>
                <th className="px-3 py-2 font-medium">Consumers</th>
                <th className="px-3 py-2 font-medium">Nota</th>
              </tr>
            </thead>
            <tbody>
              {status.queues.map((queue) => (
                <tr key={queue.name} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{queue.name}</td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(queue.status)}>{queue.status}</Badge>
                  </td>
                  <td className="px-3 py-2">{queue.messages ?? "—"}</td>
                  <td className="px-3 py-2">{queue.consumers ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {queue.message ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <UsageBlock title="Uso — 24h" usage={status.usage.last_24h} />
        <UsageBlock title="Uso — 7 dias" usage={status.usage.last_7d} />
      </section>

      <section>
        <h2 className="mb-3 font-medium text-foreground">
          Disparos em andamento ({status.in_flight.count})
        </h2>
        {status.in_flight.items.length === 0 ? (
          <EmptyState
            title="Nenhum disparo em andamento"
            description="Quando um scan estiver rodando, ele aparece aqui."
          />
        ) : (
          <div className="overflow-x-auto rounded-app border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Sistema</th>
                  <th className="px-3 py-2 font-medium">Conta</th>
                  <th className="px-3 py-2 font-medium">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {status.in_flight.items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{item.scan_type}</td>
                    <td className="px-3 py-2">{item.system_name ?? item.system_id}</td>
                    <td className="px-3 py-2">{item.user_email ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      vetores {item.vectors_discovered ?? 0} · jobs{" "}
                      {item.jobs_planned ?? 0} · probes {item.probes_count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Atualizado em{" "}
        {new Date(status.captured_at).toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
