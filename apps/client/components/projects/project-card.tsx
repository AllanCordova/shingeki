"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project, ProjectUpdateInput } from "@/lib/contracts";
import {
  useDeleteProject,
  useUpdateProject,
} from "@/lib/hooks/project/use-projects";
import { notify } from "@/lib/notify";
import { FORM_MODAL_SIZE } from "@/lib/ui";
import { ProjectForm } from "@/components/projects/project-form";
import {
  Card,
  CardContent,
  ConfirmActionModal,
  CoverImage,
  ErrorShow,
  ItemActionsMenu,
  Modal,
} from "@/components/ui";

export function ProjectCard({ project }: { project: Project }) {
  const updateProject = useUpdateProject(project.id);
  const deleteProject = useDeleteProject();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const ok = await notify.run(() => deleteProject.deleteProject(project.id), {
      success: "Projeto excluído.",
    });
    if (ok) setDeleteOpen(false);
  };

  return (
    <>
      <Card className="relative h-full overflow-hidden transition-colors hover:border-foreground/30">
        <div className="absolute right-2 top-2 z-10">
          <ItemActionsMenu
            label={`Opções de ${project.name}`}
            items={[
              {
                label: "Editar",
                onSelect: () => setEditOpen(true),
              },
              {
                label: "Excluir",
                tone: "danger",
                onSelect: () => setDeleteOpen(true),
              },
            ]}
          />
        </div>

        <Link href={`/projetos/${project.id}`} className="group block">
          <CoverImage
            coverPath={project.cover_path}
            alt={`Capa de ${project.name}`}
          />
          <CardContent className="flex flex-col gap-2 pr-12">
            <h3 className="text-base font-semibold text-foreground">
              {project.name}
            </h3>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {project.description}
            </p>
          </CardContent>
        </Link>
      </Card>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar projeto"
        size={FORM_MODAL_SIZE}
      >
        {editOpen ? (
          <ProjectForm
            mode="edit"
            isLoading={updateProject.isLoading}
            error={updateProject.error}
            submitLabel="Salvar alterações"
            currentCoverPath={project.cover_path}
            defaultValues={{
              name: project.name,
              description: project.description,
            }}
            onCancel={() => setEditOpen(false)}
            onSubmit={async (values) => {
              const ok = await notify.run(
                () => updateProject.updateProject(values as ProjectUpdateInput),
                { success: "Projeto atualizado." },
              );
              if (ok) setEditOpen(false);
            }}
          />
        ) : null}
      </Modal>

      <ConfirmActionModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir projeto"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        isLoading={deleteProject.isLoading}
        onConfirm={handleDelete}
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
      </ConfirmActionModal>
    </>
  );
}
