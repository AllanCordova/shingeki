"use client";

import { useState } from "react";
import Link from "next/link";
import type { System, SystemUpdateInput } from "@/lib/contracts";
import {
  useDeleteSystem,
  useUpdateSystem,
} from "@/lib/hooks/system/use-systems";
import { notify } from "@/lib/notify";
import { FORM_MODAL_SIZE } from "@/lib/ui";
import { SystemForm } from "@/components/system/system-form";
import {
  Card,
  CardContent,
  ConfirmActionModal,
  CoverImage,
  ErrorShow,
  ItemActionsMenu,
  Modal,
} from "@/components/ui";

export function SystemCard({
  projectId,
  system,
}: {
  projectId: string;
  system: System;
}) {
  const updateSystem = useUpdateSystem(projectId, system.id);
  const deleteSystem = useDeleteSystem(projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const ok = await notify.run(() => deleteSystem.deleteSystem(system.id), {
      success: "Sistema excluído.",
    });
    if (ok) setDeleteOpen(false);
  };

  return (
    <>
      <Card className="relative h-full overflow-hidden transition-colors hover:border-foreground/30">
        <div className="absolute right-2 top-2 z-10">
          <ItemActionsMenu
            label={`Opções de ${system.name}`}
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

        <Link
          href={`/projetos/${projectId}/sistemas/${system.id}`}
          className="group block"
        >
          <CoverImage
            coverPath={system.cover_path}
            alt={`Capa de ${system.name}`}
          />
          <CardContent className="flex flex-col gap-2 pr-12">
            <h3 className="text-base font-semibold text-foreground">
              {system.name}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {system.target_url}
            </p>
          </CardContent>
        </Link>
      </Card>

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
                () => updateSystem.updateSystem(values as SystemUpdateInput),
                { success: "Sistema atualizado." },
              );
              if (ok) setEditOpen(false);
            }}
          />
        ) : null}
      </Modal>

      <ConfirmActionModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir sistema"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        isLoading={deleteSystem.isLoading}
        onConfirm={handleDelete}
      >
        {deleteSystem.error ? (
          <ErrorShow error={deleteSystem.error} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o sistema{" "}
            <strong className="text-foreground">{system.name}</strong>?
          </p>
        )}
      </ConfirmActionModal>
    </>
  );
}
