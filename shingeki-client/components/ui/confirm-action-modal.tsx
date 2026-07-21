"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

/** Modal reutilizavel para confirmar ações destrutivas. */
export function ConfirmActionModal({
  open,
  title,
  description,
  children,
  confirmLabel = "Remover",
  cancelLabel = "Cancelar",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  return (
    <Modal
      open={open}
      onClose={isLoading ? () => undefined : onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={isLoading}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
