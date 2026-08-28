"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  coverUpdateOnlySchema,
  type CoverUpdateOnlyInput,
} from "@/lib/contracts";
import { applyApiFieldErrors } from "@/lib/forms";
import type { ApiError } from "@/lib/api/error-handler";
import { FORM_MODAL_SIZE } from "@/lib/ui";
import { CoverFields } from "@/components/cover/cover-fields";
import { Button, ErrorShow, Modal } from "@/components/ui";

interface CoverUpdateModalProps {
  open: boolean;
  onClose: () => void;
  currentCoverPath?: string | null;
  isLoading: boolean;
  error: ApiError | null;
  onSubmit: (values: CoverUpdateOnlyInput) => Promise<void>;
}

export function CoverUpdateModal({
  open,
  onClose,
  currentCoverPath,
  isLoading,
  error,
  onSubmit,
}: CoverUpdateModalProps) {
  const {
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors },
  } = useForm<CoverUpdateOnlyInput>({
    resolver: zodResolver(coverUpdateOnlySchema),
    defaultValues: {
      cover: undefined,
      cover_upload_id: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        cover: undefined,
        cover_upload_id: undefined,
      });
    }
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Trocar capa"
      size={FORM_MODAL_SIZE}
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

        <CoverFields
          control={control}
          errors={errors}
          currentCoverPath={currentCoverPath}
          isEdit
        />

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Salvar capa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
