"use client";

import { CatalogBulkImport } from "@/components/admin/catalog-bulk-import";
import { CatalogAttackForm } from "@/components/forms/catalog-attack-form";
import {
  useCatalogAttacks,
  useCreateCatalogAttack,
  useDeleteCatalogAttack,
} from "@/lib/hooks/use-catalog-attacks";
import { useUiStore } from "@/lib/stores/ui-store";
import { notify } from "@/lib/notify";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  AddActionButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorShow,
  Loading,
  SidePanel,
} from "@/components/ui";

const PANEL_KEY = "create-catalog-attack";

export default function AdminAtaquesPage() {
  const queryClient = useQueryClient();
  const { attacks, isLoading, isError, error, refetch } = useCatalogAttacks();
  const {
    createAttack,
    isLoading: isCreating,
    error: createError,
    reset,
  } = useCreateCatalogAttack();
  const { deleteAttack, isLoading: isDeleting } = useDeleteCatalogAttack();

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Catalogo de ataques
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
          void queryClient.invalidateQueries({ queryKey: queryKeys.catalogAttacks });
        }}
      />

      {isLoading ? (
        <Loading label="Carregando ataques..." />
      ) : isError ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : attacks.length === 0 ? (
        <EmptyState
          title="Nenhum ataque cadastrado"
          description="Adicione o primeiro vetor ao catalogo global."
          action={
            <AddActionButton
              onClick={handleOpen}
              aria-label="Cadastrar ataque"
              title="Cadastrar ataque"
            />
          }
        />
      ) : (
        <div className="grid gap-4">
          {attacks.map((attack) => (
            <Card key={attack.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{attack.category}</CardTitle>
                  <CardDescription>
                    {attack.scan_type} · {attack.target_location} ·{" "}
                    {attack.risk_level}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{attack.author?.name ?? "—"}</Badge>
                  {attack.permissions.delete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={isDeleting}
                      onClick={() =>
                        void notify.run(
                          () => deleteAttack(attack.id),
                          { success: "Ataque removido." },
                        )
                      }
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-app bg-muted p-3 text-xs">
                  {JSON.stringify(attack.payload, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SidePanel
        open={isOpen}
        onClose={handleClose}
        title="Novo ataque"
        description="Cadastre um vetor no catalogo global."
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
