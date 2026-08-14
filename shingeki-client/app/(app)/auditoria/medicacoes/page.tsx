"use client";

import { useState } from "react";
import { CatalogBulkImport } from "@/components/catalog/catalog-bulk-import";
import { CatalogOwnerFilter } from "@/components/catalog/catalog-owner-filter";
import { CatalogRemediationForm } from "@/components/catalog/catalog-remediation-form";
import {
  useCatalogRemediations,
  useCreateCatalogRemediation,
  useDeleteCatalogRemediation,
} from "@/lib/hooks/catalog/use-catalog-remediations";
import { useUiStore } from "@/lib/stores/ui-store";
import { notify } from "@/lib/ui/notify";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common/common";
import {
  AddActionButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmActionModal,
  EmptyState,
  ErrorShow,
  ListPagination,
  Loading,
  SidePanel,
} from "@/components/ui";

const PANEL_KEY = "create-catalog-remediation";

export default function AuditoriaMedicaçõesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const listParams = {
    page,
    per_page: DEFAULT_PAGE_SIZE,
    user_id: ownerId,
  };

  const {
    remediations,
    pagination,
    owners,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCatalogRemediations(listParams);
  const {
    createRemediation,
    isLoading: isCreating,
    error: createError,
    reset,
  } = useCreateCatalogRemediation();
  const { deleteRemediation, deletingId } = useDeleteCatalogRemediation();

  const openModals = useUiStore((state) => state.openModals);
  const openModal = useUiStore((state) => state.openModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const isOpen = Boolean(openModals[PANEL_KEY]);

  const handleOpen = () => {
    reset();
    openModal(PANEL_KEY);
  };

  const handleClose = () => {
    reset();
    closeModal(PANEL_KEY);
  };

  const handleOwnerChange = (userId: string | null) => {
    setOwnerId(userId);
    setPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const ok = await notify.run(() => deleteRemediation(pendingDelete.id), {
      success: "Medicação removida.",
    });
    if (ok) setPendingDelete(null);
  };

  const hasFilter = ownerId !== null;
  const isEmpty = (pagination?.total ?? 0) === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Catálogo de medicações
          </h1>
          <p className="text-sm text-muted-foreground">
            Scripts e mitigações globais cruzados com achados dos sistemas.
          </p>
        </div>
        <AddActionButton
          onClick={handleOpen}
          aria-label="Nova medicação"
          title="Nova medicação"
        />
      </div>

      <CatalogBulkImport
        label="Medicações"
        templatePath="/api/catalog/remediations/import/template"
        importPath="/catalog/remediations/import"
        docsHint="CSV com ate 200 linhas. Use stack_slug valido e separadores no campo references."
        onCompleted={() => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.catalogRemediationsAll,
          });
        }}
      />

      <CatalogOwnerFilter
        owners={owners}
        value={ownerId}
        onChange={handleOwnerChange}
      />

      {isLoading ? (
        <Loading label="Carregando medicações..." />
      ) : isError ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : isEmpty ? (
        <EmptyState
          title={
            hasFilter ? "Nenhuma medicação deste autor" : "Nenhuma medicação cadastrada"
          }
          description={
            hasFilter
              ? "Tente outro autor ou volte para todos."
              : "Adicione a primeira mitigação global ao catálogo."
          }
          action={
            hasFilter ? undefined : (
              <AddActionButton
                onClick={handleOpen}
                aria-label="Cadastrar medicação"
                title="Cadastrar medicação"
              />
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4">
            {remediations.map((remediation) => (
              <Card key={remediation.id} className="min-w-0">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="break-words text-base">
                      {remediation.title}
                    </CardTitle>
                    <CardDescription className="break-words">
                      {remediation.stack?.name ?? "Stack"} ·{" "}
                      {remediation.attack_category ?? "Qualquer categoria"} ·{" "}
                      {remediation.scan_type ?? "Qualquer scan"}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge tone="neutral">{remediation.author?.name ?? "—"}</Badge>
                    <Badge tone="neutral">{remediation.stack?.slug ?? "—"}</Badge>
                    {remediation.permissions.delete ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPendingDelete({
                            id: remediation.id,
                            label: remediation.title,
                          })
                        }
                      >
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    {remediation.description}
                  </p>
                  <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-app bg-muted p-3 text-xs">
                    {remediation.code_snippet}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>

          {pagination ? (
            <ListPagination
              pagination={pagination}
              isFetching={isFetching}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      )}

      <ConfirmActionModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Remover medicação"
        description="Esta ação não pode ser desfeita."
        isLoading={deletingId === pendingDelete?.id}
        onConfirm={handleConfirmDelete}
      >
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja remover{" "}
          <span className="font-medium text-foreground">
            {pendingDelete?.label}
          </span>{" "}
          do catálogo?
        </p>
      </ConfirmActionModal>

      <SidePanel
        open={isOpen}
        onClose={handleClose}
        title="Nova medicação"
        description="Cadastre uma mitigação global no catálogo."
      >
        <CatalogRemediationForm
          isLoading={isCreating}
          error={createError}
          onCancel={handleClose}
          onSubmit={async (payload) => {
            const ok = await notify.run(() => createRemediation(payload), {
              success: "Medicação cadastrada com sucesso.",
            });
            if (ok) handleClose();
          }}
        />
      </SidePanel>
    </div>
  );
}
