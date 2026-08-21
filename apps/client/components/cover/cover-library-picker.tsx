"use client";

import { useState } from "react";
import { resolveCoverSrc } from "@/lib/cover/cover-image";
import { MAX_COVER_UPLOADS } from "@/lib/cover/cover-library";
import type { CoverUpload } from "@/lib/contracts/cover/cover-upload";
import type { ApiError } from "@/lib/api/error-handler";
import { Button } from "@/components/ui/button";
import { ErrorShow } from "@/components/ui/error-show";
import { TrashIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";

interface CoverLibraryPickerProps {
  embedded?: boolean;
  uploads: CoverUpload[];
  count: number;
  limit?: number;
  atLimit: boolean;
  selectedId: string | null;
  onSelect: (upload: CoverUpload | null) => void;
  onRemove: (upload: CoverUpload) => Promise<void>;
  isRemoving?: boolean;
  removeError?: ApiError | null;
  disabled?: boolean;
}

export function CoverLibraryPicker({
  embedded = false,
  uploads,
  count,
  limit = MAX_COVER_UPLOADS,
  atLimit,
  selectedId,
  onSelect,
  onRemove,
  isRemoving = false,
  removeError = null,
  disabled = false,
}: CoverLibraryPickerProps) {
  const [uploadToRemove, setUploadToRemove] = useState<CoverUpload | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const closeRemoveModal = () => {
    if (!pendingRemoveId) setUploadToRemove(null);
  };

  const handleConfirmRemove = async () => {
    if (!uploadToRemove || pendingRemoveId) return;

    setPendingRemoveId(uploadToRemove.id);
    try {
      await onRemove(uploadToRemove);
      if (selectedId === uploadToRemove.id) {
        onSelect(null);
      }
      setUploadToRemove(null);
    } finally {
      setPendingRemoveId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {!embedded ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                Biblioteca de capas
              </p>
              <p
                className={`text-xs ${atLimit ? "text-danger" : "text-muted-foreground"}`}
              >
                {count}/{limit} imagens
              </p>
            </div>

            {atLimit ? (
              <p className="text-xs text-danger">
                Limite de {limit} imagens atingido. Remova uma da biblioteca ou
                reutilize uma existente antes de enviar outra nova.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Imagens que voce ja enviou em projetos ou sistemas anteriores.
              </p>
            )}
          </>
        ) : atLimit ? (
          <p className="text-xs text-danger">
            Limite atingido ({limit}). Remova uma imagem ou reutilize uma existente.
          </p>
        ) : null}

        {uploads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
            Nenhuma imagem na biblioteca ainda. Envie a primeira capa abaixo.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {uploads.map((upload) => {
              const src = resolveCoverSrc(upload.path);
              const isSelected = selectedId === upload.id;
              const isDeleting = pendingRemoveId === upload.id;

              return (
                <li
                  key={upload.id}
                  className={`relative overflow-hidden rounded-lg border ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    disabled={disabled || isRemoving}
                    onClick={() => onSelect(isSelected ? null : upload)}
                    className="block aspect-square w-full bg-muted"
                  >
                    {src ? (
                      // Library cover URLs are dynamic; next/image needs a fixed remote allowlist.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt="Capa da biblioteca"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Sem preview
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={disabled || isRemoving || isDeleting}
                    onClick={(event) => {
                      event.stopPropagation();
                      setUploadToRemove(upload);
                    }}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md bg-foreground/75 text-surface shadow-sm transition-colors hover:bg-danger disabled:opacity-50"
                    aria-label="Remover imagem da biblioteca"
                  >
                    {isDeleting ? (
                      <Spinner size="sm" />
                    ) : (
                      <TrashIcon className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={uploadToRemove !== null}
        onClose={closeRemoveModal}
        title="Remover imagem da biblioteca"
        description="Esta ação não pode ser desfeita."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={closeRemoveModal}
              disabled={Boolean(pendingRemoveId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={Boolean(pendingRemoveId)}
              onClick={handleConfirmRemove}
            >
              Remover
            </Button>
          </>
        }
      >
        {removeError ? (
          <ErrorShow error={removeError} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover esta imagem do seu histórico? Projetos e
            sistemas que ainda a utilizam nao serao afetados.
          </p>
        )}
      </Modal>
    </>
  );
}
