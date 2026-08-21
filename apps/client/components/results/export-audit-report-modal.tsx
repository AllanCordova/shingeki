"use client";

import { useState } from "react";
import { notify } from "@/lib/notify";
import { Button, ErrorShow, Modal } from "@/components/ui";

interface ExportAuditReportModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  systemId: string;
  dispatchId: string;
  dispatchLabel: string;
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const match = header.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export function ExportAuditReportModal({
  open,
  onClose,
  projectId,
  systemId,
  dispatchId,
  dispatchLabel,
}: ExportAuditReportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleClose = () => {
    if (isLoading) return;
    setError(null);
    onClose();
  };

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/systems/${systemId}/system-results/${dispatchId}/export`,
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw body ?? { message: "Não foi possível exportar o relatório." };
      }

      const blob = await response.blob();
      const filename = filenameFromDisposition(
        response.headers.get("Content-Disposition"),
        `shingeki-relatorio-auditoria-${dispatchId.slice(0, 8)}.pdf`,
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);

      notify.success("Relatório exportado.");
      handleClose();
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Exportar relatório de auditoria"
      description="O PDF pode conter dados sensiveis do seu sistema."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button isLoading={isLoading} onClick={handleExport}>
            Exportar PDF
          </Button>
        </>
      }
    >
      {error ? (
        <ErrorShow error={error} />
      ) : (
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Este relatório do disparo de{" "}
            <strong className="text-foreground">{dispatchLabel}</strong> pode
            incluir URLs, payloads, trechos de codigo e requisicoes HTTP.
          </p>
          <p>
            Exporte apenas para pessoas autorizadas e armazene o arquivo com
            seguranca. O log completo de cobertura DAST permanece disponivel no
            sistema via link dentro do PDF.
          </p>
        </div>
      )}
    </Modal>
  );
}
