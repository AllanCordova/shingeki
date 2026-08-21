"use client";

import { useEffect } from "react";
import type {
  GitHubRemediationPrPreviewFile,
  GitHubRemediationPrPreviewResponse,
  OpenGitHubRemediationPrInput,
} from "@/lib/contracts";
import { useGitHubRemediationPrPreview } from "@/lib/hooks/remediation/use-remediate";
import { Badge, Button, ErrorShow, Loading, Modal } from "@/components/ui";

interface GitHubPrPreviewModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  systemId: string;
  input: OpenGitHubRemediationPrInput | null;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export function GitHubPrPreviewModal({
  open,
  onClose,
  projectId,
  systemId,
  input,
  onConfirm,
  isConfirming = false,
}: GitHubPrPreviewModalProps) {
  const {
    previewPullRequest,
    data: preview,
    isLoading,
    error,
    reset,
  } = useGitHubRemediationPrPreview(projectId, systemId);

  const inputKey = input ? JSON.stringify(input) : null;

  useEffect(() => {
    if (!open || !input) return;

    reset();
    void previewPullRequest(input);
  }, [open, input, inputKey, previewPullRequest, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Confirmar pull request"
      description="Revise as alterações antes de abrir o PR no GitHub."
      size="xl"
      className="max-w-5xl"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isConfirming}>
            Cancelar
          </Button>
          <Button
            isLoading={isConfirming}
            disabled={!preview?.can_submit || isLoading || Boolean(error)}
            onClick={onConfirm}
          >
            Abrir PR no GitHub
          </Button>
        </>
      }
    >
      {isLoading ? (
        <Loading label="Gerando preview das alterações..." />
      ) : error ? (
        <ErrorShow error={error} />
      ) : preview ? (
        <PreviewContent preview={preview} />
      ) : null}
    </Modal>
  );
}

function PreviewContent({ preview }: { preview: GitHubRemediationPrPreviewResponse }) {
  const readyFiles = preview.files.filter((file) => file.status === "ready");
  const skippedFiles = preview.files.filter((file) => file.status === "skipped");

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2 rounded-app border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Resumo do PR</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <PreviewMeta label="Repositorio" value={preview.repository.url} mono />
          <PreviewMeta
            label="Branch"
            value={`${preview.pull_request.head_branch} → ${preview.pull_request.base_branch}`}
            mono
          />
          <PreviewMeta label="Titulo" value={preview.pull_request.title} className="sm:col-span-2" />
        </dl>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge tone="neutral">{preview.files_ready} arquivo(s) pronto(s)</Badge>
          <Badge tone="neutral">{preview.findings_applied} correção(ões)</Badge>
          <Badge tone="neutral">
            {preview.provider} / {preview.model}
          </Badge>
        </div>
      </section>

      {preview.warnings?.map((warning) => (
        <p key={warning} className="rounded-app border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {warning}
        </p>
      ))}

      {!preview.can_submit ? (
        <p className="rounded-app border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-foreground">
          Nenhum arquivo pode ser enviado com seguranca. Ajuste os achados ou corrija manualmente antes de abrir o PR.
        </p>
      ) : null}

      {readyFiles.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Alterações que serao enviadas</h3>
          {readyFiles.map((file) => (
            <FileDiffPreview key={file.path} file={file} />
          ))}
        </section>
      ) : null}

      {skippedFiles.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Arquivos ignorados</h3>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {skippedFiles.map((file) => (
              <li
                key={file.path}
                className="rounded-app border border-dashed border-border px-4 py-3"
              >
                <span className="font-mono text-xs text-foreground">{file.path}</span>
                {file.reason ? <p className="mt-1">{file.reason}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PreviewMeta({
  label,
  value,
  mono = false,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-words text-foreground ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function FileDiffPreview({ file }: { file: GitHubRemediationPrPreviewFile }) {
  const displayPath = file.github_path ?? file.path;

  return (
    <article className="flex flex-col gap-3 rounded-app border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-mono text-sm text-foreground">{displayPath}</h4>
        <Badge tone="success">Pronto</Badge>
        <Badge tone="neutral">
          {file.findings_count} correção(ões)
        </Badge>
      </div>

      {file.changes.map((change, index) => (
        <div key={`${file.path}-${change.start_line}-${index}`} className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Linhas {change.start_line}
            {change.end_line !== change.start_line ? `–${change.end_line}` : ""}
          </p>
          <DiffBlock label="Antes" value={extractLines(file.before, change.start_line, change.end_line)} tone="removed" />
          <DiffBlock label="Depois" value={change.replacement} tone="added" />
        </div>
      ))}

      {file.before && file.after ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver arquivo completo
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <DiffBlock label="Arquivo atual" value={file.before} tone="neutral" />
            <DiffBlock label="Arquivo após correção" value={file.after} tone="neutral" />
          </div>
        </details>
      ) : null}
    </article>
  );
}

function DiffBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "removed" | "added" | "neutral";
}) {
  const toneClass =
    tone === "removed"
      ? "border-danger/20 bg-danger/5"
      : tone === "added"
        ? "border-success/20 bg-success/5"
        : "border-border bg-surface-muted";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <pre
        className={`overflow-x-auto whitespace-pre-wrap break-words rounded-app border p-3 font-mono text-xs text-foreground ${toneClass}`}
      >
        {value || "—"}
      </pre>
    </div>
  );
}

function extractLines(
  content: string | null,
  startLine: number,
  endLine: number,
): string {
  if (!content) return "";

  return content
    .split(/\r?\n/)
    .slice(startLine - 1, endLine)
    .join("\n");
}
