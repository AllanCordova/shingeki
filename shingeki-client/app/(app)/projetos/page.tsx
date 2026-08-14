"use client";

import { useState } from "react";
import { useProjects, useCreateProject } from "@/lib/hooks/projects/use-projects";
import type { ProjectCreateInput } from "@/lib/contracts";
import { useUiStore } from "@/lib/stores/ui-store";
import { ProjectForm } from "@/components/forms/project-form";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectTemplatePicker } from "@/components/projects/project-template-picker";
import { ReopenGuidedSetupButton } from "@/components/onboarding/reopen-guided-setup-button";
import { notify } from "@/lib/ui/notify";
import { FORM_MODAL_SIZE } from "@/lib/ui/form-modal";
import {
  AddActionButton,
  Button,
  EmptyState,
  ErrorShow,
  Loading,
  Modal,
} from "@/components/ui";

const MODAL_KEY = "create-project";
const TEMPLATE_MODAL_KEY = "create-from-template";

export default function ProjetosPage() {
  const { projects, isLoading, isError, error, refetch } = useProjects();
  const {
    createProject,
    isLoading: isCreating,
    error: createError,
    reset,
  } = useCreateProject();

  const openModals = useUiStore((state) => state.openModals);
  const openModal = useUiStore((state) => state.openModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const isOpen = Boolean(openModals[MODAL_KEY]);
  const templateOpen = Boolean(openModals[TEMPLATE_MODAL_KEY]);

  const handleOpen = () => {
    reset();
    openModal(MODAL_KEY);
  };

  const handleClose = () => {
    reset();
    closeModal(MODAL_KEY);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Projetos
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize seus sistemas e testes de seguranca.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReopenGuidedSetupButton />
          <Button variant="outline" onClick={() => openModal(TEMPLATE_MODAL_KEY)}>
            Usar template
          </Button>
          <AddActionButton
            onClick={handleOpen}
            aria-label="Novo projeto"
            title="Novo projeto"
          />
        </div>
      </div>

      {isLoading ? (
        <Loading label="Carregando projetos..." />
      ) : isError ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto para comecar a cadastrar sistemas."
          action={
            <AddActionButton
              onClick={handleOpen}
              aria-label="Criar projeto"
              title="Criar projeto"
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <Modal
        open={isOpen}
        onClose={handleClose}
        title="Novo projeto"
        description="Preencha os dados do projeto."
        size={FORM_MODAL_SIZE}
      >
        {isOpen ? (
          <ProjectForm
            isLoading={isCreating}
            error={createError}
            submitLabel="Criar projeto"
            onCancel={handleClose}
            onSubmit={async (values) => {
              const ok = await notify.run(
                () => createProject(values as ProjectCreateInput),
                { success: "Projeto criado com sucesso." },
              );
              if (ok) handleClose();
            }}
          />
        ) : null}
      </Modal>

      <ProjectTemplatePicker
        open={templateOpen}
        onClose={() => closeModal(TEMPLATE_MODAL_KEY)}
      />
    </div>
  );
}
