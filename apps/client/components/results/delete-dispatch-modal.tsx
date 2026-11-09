"use client";

import { useCancelDispatch, useDeleteDispatch } from "@/lib/hooks/results/use-results";
import { notify } from "@/lib/notify";
import { Button, ErrorShow, Modal } from "@/components/ui";

interface DeleteDispatchModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  systemId: string;
  dispatchId: string;
  dispatchLabel: string;
  mode?: "delete" | "cancel";
  onDeleted?: () => void;
}

export function DeleteDispatchModal({
  open,
  onClose,
  projectId,
  systemId,
  dispatchId,
  dispatchLabel,
  mode = "delete",
  onDeleted,
}: DeleteDispatchModalProps) {
  const deleteAction = useDeleteDispatch(projectId, systemId);
  const cancelAction = useCancelDispatch(projectId, systemId);
  const isCancel = mode === "cancel";
  const isLoading = isCancel ? cancelAction.isLoading : deleteAction.isLoading;
  const error = isCancel ? cancelAction.error : deleteAction.error;

  const handleClose = () => {
    deleteAction.reset();
    cancelAction.reset();
    onClose();
  };

  const handleConfirm = async () => {
    const ok = await notify.run(
      () =>
        isCancel
          ? cancelAction.cancelDispatch(dispatchId)
          : deleteAction.deleteDispatch(dispatchId),
      {
        success: isCancel ? "Disparo cancelado." : "Disparo excluido.",
      },
    );
    if (!ok) return;
    handleClose();
    onDeleted?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isCancel ? "Cancelar disparo" : "Excluir disparo"}
      description={
        isCancel
          ? "O scan para na hora. Os achados já registrados ficam neste disparo."
          : "Esta ação não pode ser desfeita."
      }
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Voltar
          </Button>
          <Button
            variant={isCancel ? "outline" : "danger"}
            isLoading={isLoading}
            onClick={handleConfirm}
          >
            {isCancel ? "Cancelar scan" : "Excluir"}
          </Button>
        </>
      }
    >
      {error ? (
        <ErrorShow error={error} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {isCancel ? (
            <>
              Tem certeza que deseja cancelar o disparo de{" "}
              <strong className="text-foreground">{dispatchLabel}</strong>?
            </>
          ) : (
            <>
              Tem certeza que deseja excluir o disparo de{" "}
              <strong className="text-foreground">{dispatchLabel}</strong>?
            </>
          )}
        </p>
      )}
    </Modal>
  );
}
