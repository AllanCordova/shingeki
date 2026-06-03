"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useDeleteProject,
  useProject,
  useUpdateProject,
} from "@/lib/hooks/use-projects";
import { useCreateSystem, useSystems } from "@/lib/hooks/use-systems";
import { CoverUpdateModal } from "@/components/forms/cover-update-modal";
import { ProjectForm } from "@/components/forms/project-form";
import { SystemForm } from "@/components/forms/system-form";
import { SystemCard } from "@/components/systems/system-card";
import { notify } from "@/lib/notify";
import { FORM_MODAL_SIZE } from "@/lib/ui";
import type { SystemCreateInput } from "@/lib/contracts";
import {
  AddActionButton,
  Button,
  CoverHero,
  EmptyState,
  ErrorShow,
  ImageUploadIcon,
  Loading,
  Modal,
} from "@/components/ui";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const { project, isLoading, isError, error, refetch } = useProject(projectId);
  const {
    systems,
    isLoading: loadingSystems,
    isError: systemsError,
    error: systemsErr,
    refetch: refetchSystems,
  } = useSystems(projectId);

  const updateProject = useUpdateProject(projectId);
  const deleteProject = useDeleteProject();
  const createSystem = useCreateSystem(projectId);

  const [editOpen, setEditOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);

  if (isLoading) return <Loading label="Carregando projeto..." />;
  if (isError || !project)
    return <ErrorShow error={error} onRetry={() => refetch()} />;

  const handleDelete = async () => {
    const ok = await notify.run(
      () => deleteProject.deleteProject(projectId),
      { success: "Projeto excluido." },
    );
    if (!ok) return;
    router.push("/projetos");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-8">
      <CoverHero
        coverPath={project.cover_path}
        alt={`Capa de ${project.name}`}
      >
        <Link
          href="/projetos"
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Projetos
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {project.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {project.description}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
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
          </div>
        </div>
      </CoverHero>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Sistemas</h2>
          <AddActionButton
            onClick={() => setSystemOpen(true)}
            aria-label="Novo sistema"
            title="Novo sistema"
          />
        </div>

        {loadingSystems ? (
          <Loading label="Carregando sistemas..." />
        ) : systemsError ? (
          <ErrorShow error={systemsErr} onRetry={() => refetchSystems()} />
        ) : systems.length === 0 ? (
          <EmptyState
            title="Nenhum sistema cadastrado"
            description="Cadastre um sistema alvo para gerar assinatura e disparar ataques."
            action={
              <AddActionButton
                onClick={() => setSystemOpen(true)}
                aria-label="Criar sistema"
                title="Criar sistema"
              />
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {systems.map((system) => (
              <SystemCard
                key={system.id}
                projectId={projectId}
                system={system}
              />
            ))}
          </div>
        )}
      </section>

      <CoverUpdateModal
        open={coverOpen}
        onClose={() => setCoverOpen(false)}
        currentCoverPath={project.cover_path}
        isLoading={updateProject.isLoading}
        error={updateProject.error}
        onSubmit={async (values) => {
          const ok = await notify.run(
            () => updateProject.updateProject(values),
            { success: "Capa atualizada." },
          );
          if (ok) setCoverOpen(false);
        }}
      />

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar projeto"
        size={FORM_MODAL_SIZE}
      >
        <ProjectForm
          mode="edit"
          isLoading={updateProject.isLoading}
          error={updateProject.error}
          submitLabel="Salvar alteracoes"
          currentCoverPath={project.cover_path}
          defaultValues={{
            name: project.name,
            description: project.description,
          }}
          onCancel={() => setEditOpen(false)}
          onSubmit={async (values) => {
            const ok = await notify.run(
              () => updateProject.updateProject(values),
              { success: "Projeto atualizado." },
            );
            if (ok) setEditOpen(false);
          }}
        />
      </Modal>

      <Modal
        open={systemOpen}
        onClose={() => setSystemOpen(false)}
        title="Novo sistema"
        size={FORM_MODAL_SIZE}
      >
        <SystemForm
          isLoading={createSystem.isLoading}
          error={createSystem.error}
          submitLabel="Criar sistema"
          onCancel={() => setSystemOpen(false)}
          onSubmit={async (values) => {
            const ok = await notify.run(
              () => createSystem.createSystem(values as SystemCreateInput),
              { success: "Sistema criado." },
            );
            if (ok) setSystemOpen(false);
          }}
        />
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir projeto"
        description="Esta acao nao pode ser desfeita."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={deleteProject.isLoading}
              onClick={handleDelete}
            >
              Excluir
            </Button>
          </>
        }
      >
        {deleteProject.error ? (
          <ErrorShow error={deleteProject.error} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o projeto{" "}
            <strong className="text-foreground">{project.name}</strong> e todos
            os seus sistemas?
          </p>
        )}
      </Modal>
    </div>
  );
}
