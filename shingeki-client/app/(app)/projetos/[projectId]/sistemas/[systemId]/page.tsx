"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useDeleteSystem,
  useSystem,
  useUpdateSystem,
} from "@/lib/hooks/system/use-systems";
import { CoverUpdateModal } from "@/components/cover/cover-update-modal";
import { SystemForm } from "@/components/system/system-form";
import { TargetSessionPanel } from "@/components/target-session/target-session-panel";
import { SystemDetailHero } from "@/components/system/system-detail-hero";
import { AttackForm } from "@/components/attack/attack-form";
import { canUseManualProxy } from "@/lib/auth/roles";
import { useMe } from "@/lib/hooks/auth/use-auth";
import { DispatchesList } from "@/components/results/dispatches-list";
import { RemediationHistoryPanel } from "@/components/remediation/remediation-history-panel";
import { RemediationPanel } from "@/components/remediation/remediation-panel";
import { notify } from "@/lib/notify";
import { FORM_MODAL_SIZE } from "@/lib/ui";
import { cn } from "@/lib/utils";
import {
  Button,
  ErrorShow,
  ImageUploadIcon,
  Loading,
  Modal,
} from "@/components/ui";
import { ShieldAlertIcon } from "@/components/ui/icons";

export default function SystemDetailPage() {
  const { projectId, systemId } = useParams<{
    projectId: string;
    systemId: string;
  }>();
  const router = useRouter();

  const { system, isLoading, isError, error, refetch } = useSystem(
    projectId,
    systemId,
  );
  const updateSystem = useUpdateSystem(projectId, systemId);
  const deleteSystem = useDeleteSystem(projectId);
  const { user } = useMe();

  const [editOpen, setEditOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <Loading label="Carregando sistema..." />;
  if (isError || !system)
    return <ErrorShow error={error} onRetry={() => refetch()} />;

  const handleDelete = async () => {
    const ok = await notify.run(
      () => deleteSystem.deleteSystem(systemId),
      { success: "Sistema excluido." },
    );
    if (!ok) return;
    router.push(`/projetos/${projectId}`);
    router.refresh();
  };

  const arsenalHref = `/projetos/${projectId}/sistemas/${systemId}/arsenal`;

  return (
    <div className="flex flex-col gap-8">
      <SystemDetailHero
        system={system}
        backHref={`/projetos/${projectId}`}
        backLabel="← Voltar ao projeto"
        actions={
          <>
            {canUseManualProxy(user) ? (
              <Link
                href={arsenalHref}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-app font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "border border-border bg-surface text-foreground hover:bg-surface-muted",
                  "h-10 px-4 text-sm",
                )}
              >
                <ShieldAlertIcon className="h-4 w-4" />
                Arsenal manual
              </Link>
            ) : null}
            <Button
              variant="outline"
              onClick={() => setCoverOpen(true)}
              aria-label="Trocar capa"
              title="Trocar capa"
              className="px-2.5"
            >
              <ImageUploadIcon />
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Excluir
            </Button>
          </>
        }
      />

      <div id="guided-attack-form" className="guided-setup-section">
        <AttackForm projectId={projectId} systemId={systemId} />
      </div>

      <div id="guided-target-session" className="guided-setup-section">
        <TargetSessionPanel
          projectId={projectId}
          systemId={systemId}
          systemName={system.name}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/projetos/${projectId}/sistemas/${systemId}/comparar`}
          className="text-sm text-primary hover:underline"
        >
          Comparar disparos
        </Link>
      </div>

      <DispatchesList projectId={projectId} systemId={systemId} />

      <RemediationHistoryPanel projectId={projectId} systemId={systemId} />

      <RemediationPanel projectId={projectId} systemId={systemId} />

      <CoverUpdateModal
        open={coverOpen}
        onClose={() => setCoverOpen(false)}
        currentCoverPath={system.cover_path}
        isLoading={updateSystem.isLoading}
        error={updateSystem.error}
        onSubmit={async (values) => {
          const ok = await notify.run(
            () => updateSystem.updateSystem(values),
            { success: "Capa atualizada." },
          );
          if (ok) setCoverOpen(false);
        }}
      />

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar sistema"
        size={FORM_MODAL_SIZE}
      >
        {editOpen ? (
          <SystemForm
            mode="edit"
            isLoading={updateSystem.isLoading}
            error={updateSystem.error}
            submitLabel="Salvar alterações"
            currentCoverPath={system.cover_path}
            defaultValues={{
              name: system.name,
              target_url: system.target_url,
              repository_url: system.repository_url,
              stack_ids: system.stacks?.map((stack) => stack.id) ?? [],
            }}
            onCancel={() => setEditOpen(false)}
            onSubmit={async (values) => {
              const ok = await notify.run(
                () => updateSystem.updateSystem(values),
                { success: "Sistema atualizado." },
              );
              if (ok) setEditOpen(false);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir sistema"
        description="Esta ação não pode ser desfeita."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={deleteSystem.isLoading}
              onClick={handleDelete}
            >
              Excluir
            </Button>
          </>
        }
      >
        {deleteSystem.error ? (
          <ErrorShow error={deleteSystem.error} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o sistema{" "}
            <strong className="text-foreground">{system.name}</strong>?
          </p>
        )}
      </Modal>
    </div>
  );
}
