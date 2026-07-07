"use client";

import { useEffect, useRef, useState } from "react";
import { useMe } from "@/lib/hooks/use-auth";
import {
  downloadCatalogTemplate,
  useCatalogImportStatus,
  useUploadCatalogImport,
} from "@/lib/hooks/use-catalog-import";
import { canBulkImportCatalog } from "@/lib/auth/roles";
import { notify } from "@/lib/notify";
import { Button, ErrorShow } from "@/components/ui";

interface CatalogBulkImportProps {
  label: string;
  templatePath: string;
  importPath: string;
  docsHint: string;
  onCompleted?: () => void;
}

export function CatalogBulkImport({
  label,
  templatePath,
  importPath,
  docsHint,
  onCompleted,
}: CatalogBulkImportProps) {
  const { user } = useMe();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const completedRef = useRef<string | null>(null);
  const { upload, isLoading, error, reset } = useUploadCatalogImport(importPath);
  const { importJob } = useCatalogImportStatus(importId);

  useEffect(() => {
    if (!importJob || importJob.id === completedRef.current) return;

    const terminal =
      importJob.status === "COMPLETED" || importJob.status === "FAILED";

    if (!terminal) return;

    completedRef.current = importJob.id;
    onCompleted?.();

    if (importJob.status === "FAILED") {
      notify.error(`${label}: importacao falhou. Veja detalhes no sininho.`);
    }
  }, [importJob, label, onCompleted]);

  if (!canBulkImportCatalog(user)) {
    return null;
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    reset();
    setImportId(null);
    completedRef.current = null;

    try {
      const result = await upload(file);

      if (result.validation_errors?.length) {
        notify.error("Planilha com erros de validacao. Revise o template.");
        return;
      }

      setImportId(result.import.id);
      notify.success(`${label} iniciado. Acompanhe pelo sininho de notificacoes.`);
    } catch (err) {
      notify.fromApiError(err, `Nao foi possivel importar ${label.toLowerCase()}.`);
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="rounded-app border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Importacao em massa</p>
          <p className="text-xs text-muted-foreground">{docsHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadCatalogTemplate(templatePath)}
          >
            Baixar template
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            onClick={() => inputRef.current?.click()}
          >
            Enviar CSV
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </div>
      </div>

      {error ? (
        <div className="mt-3">
          <ErrorShow error={error} />
        </div>
      ) : null}

      {importJob ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Importacao {importJob.id.slice(0, 8)}: {importJob.status} ·{" "}
          {importJob.processed_rows}/{importJob.total_rows} linhas ·{" "}
          {importJob.success_count} ok · {importJob.failed_count} falhas
        </p>
      ) : null}
    </div>
  );
}
