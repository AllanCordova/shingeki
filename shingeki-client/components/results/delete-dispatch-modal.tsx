"use client";

import { useDeleteDispatch } from "@/lib/hooks/use-results";
import { notify } from "@/lib/notify";
import { Button, ErrorShow, Modal } from "@/components/ui";

interface DeleteDispatchModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  systemId: string;
  dispatchId: string;
  dispatchLabel: string;
  onDeleted?: () => void;
}

export function DeleteDispatchModal({
  open,
  onClose,
  projectId,
  systemId,
  dispatchId,
  dispatchLabel,
  onDeleted,
}: DeleteDispatchModalProps) {
  const { deleteDispatch, isLoading, error, reset } = useDeleteDispatch(
    projectId,
    systemId,
  );

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDelete = async () => {
    const ok = await notify.run(
      () => deleteDispatch(dispatchId),
      { success: "Disparo excluido." },
    );
    if (!ok) return;
    handleClose();
    onDeleted?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Excluir disparo"
      description="Esta acao nao pode ser desfeita."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="danger" isLoading={isLoading} onClick={handleDelete}>
            Excluir
          </Button>
        </>
      }
    >
      {error ? (
        <ErrorShow error={error} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir o disparo de{" "}
          <strong className="text-foreground">{dispatchLabel}</strong>?
        </p>
      )}
    </Modal>
  );
}
