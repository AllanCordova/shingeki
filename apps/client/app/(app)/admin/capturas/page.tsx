"use client";

import Link from "next/link";
import { useState } from "react";
import {
  downloadBrowserCapturesCsv,
  useAdminBrowserCaptures,
} from "@/lib/hooks/admin/use-admin-browser-captures";
import { notify } from "@/lib/notify";
import type { BrowserCaptureStatus } from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common/common";
import {
  Badge,
  Button,
  EmptyState,
  ErrorShow,
  ListPagination,
  Loading,
  Select,
} from "@/components/ui";

function statusTone(
  status: BrowserCaptureStatus,
): "neutral" | "warning" | "success" {
  if (status === "completed") return "success";
  if (status === "expired") return "warning";
  return "neutral";
}

function sourceLabel(source: string | null): string {
  if (source === "manual_import") return "Importação manual";
  if (source === "remote_browser") return "Navegador remoto";
  return "—";
}

export default function AdminCapturasPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BrowserCaptureStatus | "">("");
  const [source, setSource] = useState("");
  const [exporting, setExporting] = useState(false);

  const { captures, pagination, isLoading, isFetching, isError, error, refetch } =
    useAdminBrowserCaptures({
      page,
      per_page: DEFAULT_PAGE_SIZE,
      status: status || undefined,
      source: source || undefined,
    });

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadBrowserCapturesCsv({
        status: status || undefined,
        source: source || undefined,
      });
      notify.success("CSV exportado.");
    } catch {
      notify.error("Não foi possível exportar o CSV.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Capturas de navegador
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Trilha de auditoria: qual conta abriu qual navegador e quais URLs
            foram visitadas.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          isLoading={exporting}
          onClick={() => void handleExport()}
        >
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          aria-label="Filtrar por status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as BrowserCaptureStatus | "");
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="completed">Concluída</option>
          <option value="expired">Expirada</option>
        </Select>
        <Select
          aria-label="Filtrar por origem"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas as origens</option>
          <option value="remote_browser">Navegador remoto</option>
          <option value="manual_import">Importação manual</option>
        </Select>
      </div>

      {isLoading ? <Loading /> : null}
      {isError ? (
        <ErrorShow
          error={error ?? "Não foi possível carregar as capturas."}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && captures.length === 0 ? (
        <EmptyState
          title="Nenhuma captura encontrada"
          description="Quando alguém abrir o navegador de sessão ou colar cookies, o registro aparece aqui."
        />
      ) : null}

      {!isLoading && captures.length > 0 ? (
        <div className="overflow-x-auto rounded-app border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Conta</th>
                <th className="px-3 py-2 font-medium">Sistema</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Origem</th>
                <th className="px-3 py-2 font-medium">Abertura</th>
                <th className="px-3 py-2 font-medium">URLs</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {captures.map((capture) => (
                <tr key={capture.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">
                      {capture.user.email ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {capture.ip_address ?? "sem IP"}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{capture.system.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {capture.project.name ?? ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(capture.status)}>{capture.status}</Badge>
                  </td>
                  <td className="px-3 py-2">{sourceLabel(capture.source)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {capture.browser_opened_at
                      ? new Date(capture.browser_opened_at).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{capture.navigated_count}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/capturas/${capture.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Detalhe
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {pagination ? (
        <ListPagination
          pagination={pagination}
          onPageChange={setPage}
          isFetching={isFetching}
        />
      ) : null}
    </div>
  );
}
