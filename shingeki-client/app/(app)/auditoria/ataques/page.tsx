"use client";

import { useState } from "react";
import { CatalogBulkImport } from "@/components/catalog/catalog-bulk-import";
import { CatalogOwnerFilter } from "@/components/catalog/catalog-owner-filter";
import { CatalogAttackForm } from "@/components/catalog/catalog-attack-form";
import {
  useCatalogAttacks,
  useCreateCatalogAttack,
  useDeleteCatalogAttack,
} from "@/lib/hooks/catalog/use-catalog-attacks";
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

const PANEL_KEY = "create-catalog-attack";

export default function AuditoriaAtaquesPage() {
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
    attacks,
    pagination,
    owners,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCatalogAttacks(listParams);
  const {
    createAttack,
    isLoading: isCreating,
    error: createError,
    reset,
  } = useCreateCatalogAttack();
  const { deleteAttack, deletingId } = useDeleteCatalogAttack();

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
    const ok = await notify.run(() => deleteAttack(pendingDelete.id), {
      success: "Ataque removido.",
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
            Catálogo de ataques
          </h1>
          <p className="text-sm text-muted-foreground">
            Vetores globais usados nos scans DAST e SAST.
          </p>
        </div>
        <AddActionButton
          onClick={handleOpen}
          aria-label="Novo ataque"
          title="Novo ataque"
        />
      </div>

      <CatalogBulkImport
        label="Ataques"
        templatePath="/api/catalog/attacks/import/template"
        importPath="/catalog/attacks/import"
        docsHint="CSV com ate 200 linhas. Baixe o template para ver colunas e valores aceitos."
        onCompleted={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.catalogAttacksAll });
        }}
      />

      <CatalogOwnerFilter
        owners={owners}
        value={ownerId}
        onChange={handleOwnerChange}
      />

      {isLoading ? (
        <Loading label="Carregando ataques..." />
      ) : isError ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : isEmpty ? (
        <EmptyState
          title={hasFilter ? "Nenhum ataque deste autor" : "Nenhum ataque cadastrado"}
          description={
            hasFilter
              ? "Tente outro autor ou volte para todos."
              : "Adicione o primeiro vetor ao catálogo global."
          }
          action={
            hasFilter ? undefined : (
              <AddActionButton
                onClick={handleOpen}
                aria-label="Cadastrar ataque"
                title="Cadastrar ataque"
              />
            )
          }
        />
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid min-w-0 gap-4">
            {attacks.map((attack) => (
              <Card key={attack.id} className="min-w-0 overflow-hidden">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="break-words text-base">
                      {attack.category}
                    </CardTitle>
                    <CardDescription className="break-words">
                      {attack.scan_type} · {attack.target_location} ·{" "}
                      {attack.risk_level}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge tone="neutral">{attack.author?.name ?? "—"}</Badge>
                    {attack.permissions.delete ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPendingDelete({
                            id: attack.id,
                            label: attack.category,
                          })
                        }
                      >
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="min-w-0">
                  <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-app bg-muted p-3 text-xs">
                    {JSON.stringify(attack.payload, null, 2)}
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
        title="Remover ataque"
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
        title="Novo ataque"
        description="Cadastre um vetor no catálogo global."
      >
        <CatalogAttackForm
          isLoading={isCreating}
          error={createError}
          onCancel={handleClose}
          onSubmit={async (payload) => {
            const ok = await notify.run(() => createAttack(payload), {
              success: "Ataque cadastrado com sucesso.",
            });
            if (ok) handleClose();
          }}
        />
      </SidePanel>
    </div>
  );
}
