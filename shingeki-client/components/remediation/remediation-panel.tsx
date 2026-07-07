"use client";

import { useState, type ReactNode } from "react";
import type { RemediatedFinding } from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common";
import { useAiRemediateSystem, useGitHubRemediationPr, useRemediateSystem } from "@/lib/hooks/use-remediate";
import { notify } from "@/lib/notify";
import { AiRemediationFindingCard } from "@/components/remediation/ai-remediation-finding-card";
import { GitHubPrPreviewModal } from "@/components/remediation/github-pr-preview-modal";
import { ScanTypeBadge } from "@/components/results/scan-type-badge";
import { cn } from "@/lib/utils";
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
} from "@/components/ui";

type RemediationView = "catalog" | "ai";

async function runAction(action: () => Promise<void>, errorMessage: string) {
  try {
    await action();
  } catch (error) {
    notify.fromApiError(error, errorMessage);
  }
}

export function RemediationPanel({
  projectId,
  systemId,
  dispatchId,
}: {
  projectId: string;
  systemId: string;
  dispatchId?: string;
}) {
  const { remediate, data, isLoading, error, reset } = useRemediateSystem(
    projectId,
    systemId,
  );
  const {
    remediateWithAi,
    data: aiData,
    isLoading: aiLoading,
    error: aiError,
    reset: resetAi,
  } = useAiRemediateSystem(projectId, systemId);
  const {
    openPullRequest,
    isLoading: githubPrLoading,
    error: githubPrError,
  } = useGitHubRemediationPr(projectId, systemId);

  const [hasCatalog, setHasCatalog] = useState(false);
  const [hasAi, setHasAi] = useState(false);
  const [view, setView] = useState<RemediationView>("catalog");
  const [prPreviewOpen, setPrPreviewOpen] = useState(false);

  const baseInput = dispatchId ? { dispatch_id: dispatchId } : {};
  const paginatedInput = { ...baseInput, per_page: DEFAULT_PAGE_SIZE };
  const showResults = hasCatalog || hasAi;
  const patchableFindingIds =
    aiData?.findings
      .filter(
        (finding) =>
          finding.scan_type === "SAST" &&
          finding.ai_suggestion.validation.syntax_valid,
      )
      .map((finding) => finding.system_result_id) ?? [];

  const githubPrInput =
    patchableFindingIds.length > 0
      ? { ...baseInput, finding_ids: patchableFindingIds }
      : null;

  const submitGitHubPullRequest = async () => {
    if (!githubPrInput) return;

    const result = await openPullRequest(githubPrInput);
    const skippedCount = result.skipped_files?.length ?? 0;
    const compareOnly = result.pull_request.compare_only === true;

    if (compareOnly) {
      notify.warning(
        "Commits enviados ao GitHub. Abra o link para criar o PR manualmente (token sem permissao de Pull requests).",
      );
    } else if (skippedCount > 0) {
      const skippedPaths = result.skipped_files
        ?.map((entry) => entry.scan_path)
        .join(", ");
      notify.warning(
        `PR #${result.pull_request.number} atualizado. ${skippedCount} arquivo(s) ausente(s) no GitHub: ${skippedPaths}.`,
      );
    } else {
      notify.success(`PR #${result.pull_request.number} criado no GitHub.`);
    }

    setPrPreviewOpen(false);
    window.open(result.pull_request.url, "_blank", "noopener,noreferrer");
  };

  const loadCatalogPage = async (page: number, notifyOnSuccess = false) => {
    reset();
    const result = await remediate({ ...paginatedInput, page });
    setHasCatalog(true);
    if (notifyOnSuccess) {
      notify.success(
        `${result.findings_count} achado(s) com sugestoes de correcao.`,
      );
    }
  };

  const loadAiPage = async (
    page: number,
    options?: { regenerate?: boolean; notifyOnSuccess?: boolean },
  ) => {
    resetAi();
    const result = await remediateWithAi({
      ...paginatedInput,
      page,
      regenerate: options?.regenerate,
    });
    setHasAi(true);
    if (options?.notifyOnSuccess) {
      notify.success(
        `${result.findings_count} sugestao(oes) de IA gerada(s) via ${result.provider}.`,
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Remediacao</CardTitle>
        <CardDescription>
          Gere sugestoes pelo catalogo ou pela IA e alterne entre as visoes com
          os controles abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}
        {aiError && !aiError.hasFieldErrors ? <ErrorShow error={aiError} /> : null}
        {githubPrError && !githubPrError.hasFieldErrors ? (
          <ErrorShow error={githubPrError} />
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            isLoading={isLoading}
            onClick={() =>
              void runAction(async () => {
                await loadCatalogPage(1, true);
                setView("catalog");
              }, "Nao foi possivel gerar as correcoes.")
            }
          >
            Gerar correcoes
          </Button>
          <Button
            type="button"
            variant="outline"
            isLoading={aiLoading}
            onClick={() =>
              void runAction(async () => {
                await loadAiPage(1, { notifyOnSuccess: true });
                setView("ai");
              }, "Nao foi possivel gerar sugestoes com IA.")
            }
          >
            Sugerir com IA
          </Button>
          {hasAi && aiData ? (
            <Button
              type="button"
              variant="ghost"
              disabled={aiLoading}
              onClick={() =>
                void runAction(
                  () => loadAiPage(1, { regenerate: true, notifyOnSuccess: true }),
                  "Nao foi possivel gerar sugestoes com IA.",
                )
              }
            >
              Regenerar IA
            </Button>
          ) : null}
          {hasAi && patchableFindingIds.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setPrPreviewOpen(true)}
            >
              Abrir PR no GitHub
            </Button>
          ) : null}
        </div>

        <GitHubPrPreviewModal
          open={prPreviewOpen}
          onClose={() => setPrPreviewOpen(false)}
          projectId={projectId}
          systemId={systemId}
          input={githubPrInput}
          isConfirming={githubPrLoading}
          onConfirm={() =>
            void runAction(submitGitHubPullRequest, "Nao foi possivel abrir o pull request no GitHub.")
          }
        />

        {showResults ? (
          <>
            <div className="grid w-full grid-cols-2 gap-1 rounded-app border border-border p-1">
              <ViewToggleButton
                active={view === "catalog"}
                disabled={!hasCatalog}
                onClick={() => setView("catalog")}
              >
                Shingeki remediacoes
              </ViewToggleButton>
              <ViewToggleButton
                active={view === "ai"}
                disabled={!hasAi}
                onClick={() => setView("ai")}
              >
                IA
              </ViewToggleButton>
            </div>

            {view === "catalog" ? (
              !hasCatalog || !data ? (
                <EmptyState
                  title="Catalogo ainda nao gerado"
                  description='Clique em "Gerar correcoes" para ver os snippets do algoritmo.'
                />
              ) : data.findings_count === 0 ? (
                <EmptyState
                  title="Nenhum achado para remediar"
                  description="Execute um ataque e aguarde os resultados antes de gerar correcoes."
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {data.findings.map((finding) => (
                    <FindingRemediationCard
                      key={finding.system_result_id}
                      finding={finding}
                    />
                  ))}
                  <ListPagination
                    pagination={data.findings_pagination}
                    isFetching={isLoading}
                    onPageChange={(page) =>
                      void runAction(
                        () => loadCatalogPage(page),
                        "Nao foi possivel carregar a pagina de correcoes.",
                      )
                    }
                  />
                </div>
              )
            ) : !hasAi || !aiData ? (
              <EmptyState
                title="Sugestoes de IA ainda nao geradas"
                description='Clique em "Sugerir com IA" para analisar o codigo dos achados.'
              />
            ) : aiData.findings_count === 0 ? (
              <EmptyState
                title="Nenhum achado para IA"
                description="Execute um ataque e aguarde os resultados antes de gerar sugestoes."
              />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Modelo:</span>
                  <Badge tone="neutral">
                    {aiData.provider} / {aiData.model}
                  </Badge>
                </div>
                {aiData.findings.map((finding) => (
                  <AiRemediationFindingCard
                    key={finding.system_result_id}
                    finding={finding}
                  />
                ))}
                <ListPagination
                  pagination={aiData.findings_pagination}
                  isFetching={aiLoading}
                  onPageChange={(page) =>
                    void runAction(
                      () => loadAiPage(page),
                      "Nao foi possivel carregar a pagina de sugestoes de IA.",
                    )
                  }
                />
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ViewToggleButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full rounded-[calc(var(--radius)-2px)] px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function FindingRemediationCard({ finding }: { finding: RemediatedFinding }) {
  const isSast = finding.scan_type === "SAST";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">
            {finding.attack?.category ?? "Vulnerabilidade"}
          </CardTitle>
          {finding.scan_type ? <ScanTypeBadge scanType={finding.scan_type} /> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {finding.vulnerable_route ? (
          <Detail label="Local" value={finding.vulnerable_route} />
        ) : null}
        {finding.payload_used ? (
          <Detail
            label={isSast ? "Regra" : "Payload"}
            value={finding.payload_used}
            mono
          />
        ) : null}

        {finding.remediations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma remediação cadastrada para as stacks deste sistema.
          </p>
        ) : (
          finding.remediations.map((remediation) => (
            <div
              key={`${finding.system_result_id}-${remediation.stack.slug}`}
              className="flex flex-col gap-2 rounded-app border border-border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{remediation.stack.name}</Badge>
                <span className="font-medium text-foreground">
                  {remediation.title}
                </span>
              </div>
              <p className="text-muted-foreground">{remediation.description}</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-app bg-surface-muted p-3 font-mono text-xs text-foreground">
                {remediation.code_snippet}
              </pre>
              {remediation.references.length > 0 ? (
                <ul className="list-disc pl-5 text-xs text-muted-foreground">
                  {remediation.references.map((reference) => (
                    <li key={reference}>
                      <a
                        href={reference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        {reference}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <pre
        className={`overflow-x-auto whitespace-pre-wrap break-words rounded-app bg-surface-muted p-3 text-foreground ${
          mono ? "font-mono text-xs" : "text-sm"
        }`}
      >
        {value}
      </pre>
    </div>
  );
}
