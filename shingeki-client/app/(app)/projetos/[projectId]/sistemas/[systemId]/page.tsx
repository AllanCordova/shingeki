"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useDeleteSystem,
  useSystem,
  useUpdateSystem,
} from "@/lib/hooks/use-systems";
import { SystemForm } from "@/components/forms/system-form";
import { SignaturePanel } from "@/components/signature/signature-panel";
import { AttackForm } from "@/components/attack/attack-form";
import { DispatchesList } from "@/components/results/dispatches-list";
import { notify } from "@/lib/notify";
import { Button, CoverHero, ErrorShow, Loading, Modal } from "@/components/ui";

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

  const [editOpen, setEditOpen] = useState(false);
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

  return (
    <div className="flex flex-col gap-8">
      <CoverHero coverPath={system.cover_path} alt={`Capa de ${system.name}`}>
        <Link
          href={`/projetos/${projectId}`}
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar ao projeto
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {system.name}
            </h1>
            <a
              href={system.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-muted-foreground underline hover:text-foreground sm:text-base"
            >
              {system.target_url}
            </a>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Excluir
            </Button>
          </div>
        </div>
      </CoverHero>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SignaturePanel projectId={projectId} systemId={systemId} />
        <AttackForm projectId={projectId} systemId={systemId} />
      </div>

      <DispatchesList projectId={projectId} systemId={systemId} />

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar sistema"
      >
        <SystemForm
          mode="edit"
          isLoading={updateSystem.isLoading}
          error={updateSystem.error}
          submitLabel="Salvar alteracoes"
          currentCoverPath={system.cover_path}
          defaultValues={{
            name: system.name,
            target_url: system.target_url,
            repository_url: system.repository_url,
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
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir sistema"
        description="Esta acao nao pode ser desfeita."
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
