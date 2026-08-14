"use client";

import { useDeleteAllDispatches } from "@/lib/hooks/results/use-results";
import { notify } from "@/lib/ui/notify";
import { Button, ErrorShow, Modal } from "@/components/ui";

interface DeleteAllDispatchesModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  systemId: string;
  dispatchCount: number;
  onDeleted?: () => void;
}

export function DeleteAllDispatchesModal({
  open,
  onClose,
  projectId,
  systemId,
  dispatchCount,
  onDeleted,
}: DeleteAllDispatchesModalProps) {
  const { deleteAllDispatches, isLoading, error, reset } = useDeleteAllDispatches(
    projectId,
    systemId,
  );

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDelete = async () => {
    const ok = await notify.run(() => deleteAllDispatches(), {
      success: "Todos os disparos foram excluidos.",
    });
    if (!ok) return;
    handleClose();
    onDeleted?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Excluir todos os disparos"
      description="Esta acao nao pode ser desfeita."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="danger" isLoading={isLoading} onClick={handleDelete}>
            Excluir todos
          </Button>
        </>
      }
    >
      {error ? (
        <ErrorShow error={error} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir{" "}
          <strong className="text-foreground">
            {dispatchCount} disparo(s)
          </strong>{" "}
          e todos os resultados associados?
        </p>
      )}
    </Modal>
  );
}
