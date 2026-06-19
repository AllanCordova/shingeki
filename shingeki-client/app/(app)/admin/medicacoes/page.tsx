"use client";

import { CatalogBulkImport } from "@/components/admin/catalog-bulk-import";
import { CatalogRemediationForm } from "@/components/forms/catalog-remediation-form";
import {
  useCatalogRemediations,
  useCreateCatalogRemediation,
  useDeleteCatalogRemediation,
} from "@/lib/hooks/use-catalog-remediations";
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

const PANEL_KEY = "create-catalog-remediation";

export default function AdminMedicacoesPage() {
  const queryClient = useQueryClient();
  const { remediations, isLoading, isError, error, refetch } =
    useCatalogRemediations();
  const {
    createRemediation,
    isLoading: isCreating,
    error: createError,
    reset,
  } = useCreateCatalogRemediation();
  const { deleteRemediation, isLoading: isDeleting } =
    useDeleteCatalogRemediation();

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
            Catalogo de medicacoes
          </h1>
          <p className="text-sm text-muted-foreground">
            Scripts e mitigacoes globais cruzados com findings dos sistemas.
          </p>
        </div>
        <AddActionButton
          onClick={handleOpen}
          aria-label="Nova medicacao"
          title="Nova medicacao"
        />
      </div>

      <CatalogBulkImport
        label="Medicacoes"
        templatePath="/api/catalog/remediations/import/template"
        importPath="/catalog/remediations/import"
        docsHint="CSV com ate 200 linhas. Use stack_slug valido e separadores no campo references."
        onCompleted={() => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.catalogRemediations,
          });
        }}
      />

      {isLoading ? (
        <Loading label="Carregando medicacoes..." />
      ) : isError ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : remediations.length === 0 ? (
        <EmptyState
          title="Nenhuma medicacao cadastrada"
          description="Adicione a primeira mitigacao global ao catalogo."
          action={
            <AddActionButton
              onClick={handleOpen}
              aria-label="Cadastrar medicacao"
              title="Cadastrar medicacao"
            />
          }
        />
      ) : (
        <div className="grid gap-4">
          {remediations.map((remediation) => (
            <Card key={remediation.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{remediation.title}</CardTitle>
                  <CardDescription>
                    {remediation.stack?.name ?? "Stack"} ·{" "}
                    {remediation.attack_category ?? "Qualquer categoria"} ·{" "}
                    {remediation.scan_type ?? "Qualquer scan"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{remediation.author?.name ?? "—"}</Badge>
                  <Badge tone="neutral">{remediation.stack?.slug ?? "—"}</Badge>
                  {remediation.permissions.delete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={isDeleting}
                      onClick={() =>
                        void notify.run(
                          () => deleteRemediation(remediation.id),
                          { success: "Medicacao removida." },
                        )
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
                <pre className="overflow-x-auto rounded-app bg-muted p-3 text-xs">
                  {remediation.code_snippet}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SidePanel
        open={isOpen}
        onClose={handleClose}
        title="Nova medicacao"
        description="Cadastre uma mitigacao global no catalogo."
      >
        <CatalogRemediationForm
          isLoading={isCreating}
          error={createError}
          onCancel={handleClose}
          onSubmit={async (payload) => {
            const ok = await notify.run(() => createRemediation(payload), {
              success: "Medicacao cadastrada com sucesso.",
            });
            if (ok) handleClose();
          }}
        />
      </SidePanel>
    </div>
  );
}
