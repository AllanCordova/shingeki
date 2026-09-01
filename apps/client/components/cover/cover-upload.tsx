"use client";

import { useId, useRef, useState } from "react";
import { coverStockImageToFile } from "@/lib/cover/cover-stock-image";
import { resolveCoverSrc } from "@/lib/cover/cover-image";
import { useObjectUrl } from "@/lib/cover/use-object-url";
import type { ApiError } from "@/lib/api/error-handler";
import type { CoverStockImage } from "@/lib/contracts/cover/cover-stock-image";
import type { CoverUpload } from "@/lib/contracts/cover/cover-upload";
import { cn } from "@/lib/utils";
import { CoverLibraryPicker } from "./cover-library-picker";
import { CoverStockPicker } from "./cover-stock-picker";
import { AvatarCropDialog } from "./avatar-crop-dialog";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export type CoverSourceTab = "library" | "stock" | "file";

const ALL_TABS: { id: CoverSourceTab; label: string }[] = [
  { id: "library", label: "Biblioteca" },
  { id: "stock", label: "Sugestoes" },
  { id: "file", label: "Computador" },
];

interface CoverUploadProps {
  label?: string;
  value: File | null;
  onChange: (file: File | undefined) => void;
  selectedUploadId: string | null;
  onSelectUpload: (uploadId: string | undefined) => void;
  libraryUploads: CoverUpload[];
  libraryCount: number;
  libraryLimit: number;
  libraryAtLimit: boolean;
  onRemoveLibraryUpload: (upload: CoverUpload) => Promise<void>;
  isRemovingLibrary?: boolean;
  removeLibraryError?: ApiError | null;
  currentCoverPath?: string | null;
  error?: string;
  libraryError?: string;
  required?: boolean;
  hint?: string;
  tabs?: CoverSourceTab[];
  layout?: "cover" | "avatar";
}

function selectionLabel(
  value: File | null,
  selectedUploadId: string | null,
  selectedStockId: number | null,
): string {
  if (value) return `Arquivo: ${value.name}`;
  if (selectedUploadId) return "Capa da biblioteca selecionada";
  if (selectedStockId) return "Imagem sugerida selecionada";
  return "Nenhuma capa escolhida";
}

export function CoverUpload({
  label = "Capa",
  value,
  onChange,
  selectedUploadId,
  onSelectUpload,
  libraryUploads,
  libraryCount,
  libraryLimit,
  libraryAtLimit,
  onRemoveLibraryUpload,
  isRemovingLibrary = false,
  removeLibraryError = null,
  currentCoverPath,
  error,
  libraryError,
  required = false,
  hint,
  tabs,
  layout = "cover",
}: CoverUploadProps) {
  const visibleTabs = ALL_TABS.filter((tab) =>
    (tabs ?? ALL_TABS.map((t) => t.id)).includes(tab.id),
  );
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<CoverSourceTab>(
    visibleTabs[0]?.id ?? "file",
  );
  const [uploadBlockedMessage, setUploadBlockedMessage] = useState<string | null>(
    null,
  );
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);
  const [isPickingStock, setIsPickingStock] = useState(false);
  const [stockPickError, setStockPickError] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<File | null>(null);

  const selectedUpload = libraryUploads.find((u) => u.id === selectedUploadId);
  const libraryPreviewSrc = selectedUpload
    ? resolveCoverSrc(selectedUpload.path)
    : null;

  const filePreviewUrl = useObjectUrl(value);

  const existingSrc =
    !value && !selectedUploadId ? resolveCoverSrc(currentCoverPath) : null;
  const displaySrc = filePreviewUrl ?? libraryPreviewSrc ?? existingSrc;

  const clearStockSelection = () => {
    setSelectedStockId(null);
    setStockPickError(null);
  };

  const handleSelectUpload = (upload: CoverUpload | null) => {
    if (upload) {
      onChange(undefined);
      if (inputRef.current) inputRef.current.value = "";
      setUploadBlockedMessage(null);
      clearStockSelection();
      onSelectUpload(upload.id);
      return;
    }

    onSelectUpload(undefined);
  };

  const handleFileChange = (file: File | null | undefined) => {
    if (file && libraryAtLimit) {
      setUploadBlockedMessage(
        `Limite de ${libraryLimit} imagens na biblioteca. Remova uma imagem ou selecione uma existente.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploadBlockedMessage(null);
    clearStockSelection();
    onSelectUpload(undefined);

    if (!file) {
      onChange(undefined);
      return;
    }

    if (layout === "avatar") {
      setCropSource(file);
      return;
    }

    onChange(file);
  };

  const handlePickStockImage = async (image: CoverStockImage) => {
    if (libraryAtLimit) {
      setStockPickError(
        `Limite de ${libraryLimit} imagens na biblioteca. Remova uma imagem antes de adicionar outra.`,
      );
      setSelectedStockId(null);
      return;
    }

    setIsPickingStock(true);
    setStockPickError(null);
    setUploadBlockedMessage(null);
    onSelectUpload(undefined);
    if (inputRef.current) inputRef.current.value = "";

    try {
      const file = await coverStockImageToFile(image);
      if (layout === "avatar") {
        setCropSource(file);
        setSelectedStockId(image.id);
      } else {
        onChange(file);
        setSelectedStockId(image.id);
      }
    } catch (err) {
      setSelectedStockId(null);
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível usar a imagem selecionada.";
      setStockPickError(message);
      onChange(undefined);
    } finally {
      setIsPickingStock(false);
    }
  };

  const displayError =
    error ?? libraryError ?? uploadBlockedMessage ?? stockPickError ?? undefined;

  const isAvatar = layout === "avatar";

  const fieldHint =
    hint ??
    (isAvatar
      ? "Escolha uma foto na biblioteca ou envie do computador. No envio, você pode dar zoom e enquadrar."
      : required
        ? "Escolha uma origem abaixo. Apenas uma secao fica visivel por vez."
        : "Opcional na edicao. Troque a capa por uma das origens abaixo.");

  return (
    <Field
      label={required ? `${label} *` : label}
      htmlFor={inputId}
      error={displayError}
      hint={fieldHint}
    >
      <div className="flex flex-col gap-4">
        <div
          className={cn(
            "relative overflow-hidden border border-border bg-muted",
            isAvatar
              ? "mx-auto h-32 w-32 rounded-full"
              : "aspect-[21/9] w-full rounded-lg",
          )}
        >
          {displaySrc ? (
            // Object URL or remote preview; next/image needs a fixed remote allowlist.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displaySrc}
              alt={isAvatar ? "Pré-visualização do avatar" : "Pré-visualização da capa"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground",
                isAvatar ? "min-h-[8rem]" : "min-h-[8rem]",
              )}
            >
              {isAvatar ? "Sem foto" : "Pre-visualização da capa"}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {selectionLabel(value, selectedUploadId, selectedStockId)}
        </p>

        <div
          className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface-muted p-1"
          role="tablist"
          aria-label={isAvatar ? "Origem da foto" : "Origem da capa"}
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1.5 py-2 text-center transition-colors",
                activeTab === tab.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="w-full truncate text-xs font-medium sm:text-sm">
                {tab.label}
              </span>
              {tab.id === "library" ? (
                <span className="text-[10px] font-normal leading-none opacity-70 sm:text-xs">
                  {libraryCount}/{libraryLimit}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div
          className="min-h-[12rem] rounded-lg border border-border bg-surface p-4"
          role="tabpanel"
        >
          {activeTab === "library" ? (
            <CoverLibraryPicker
              embedded
              uploads={libraryUploads}
              count={libraryCount}
              limit={libraryLimit}
              atLimit={libraryAtLimit}
              selectedId={selectedUploadId}
              onSelect={handleSelectUpload}
              onRemove={onRemoveLibraryUpload}
              isRemoving={isRemovingLibrary}
              removeError={removeLibraryError}
              disabled={isPickingStock}
            />
          ) : null}

          {activeTab === "stock" && visibleTabs.some((t) => t.id === "stock") ? (
            <CoverStockPicker
              embedded
              selectedId={selectedStockId}
              onSelect={(image) => {
                if (!image) {
                  clearStockSelection();
                  onChange(undefined);
                }
              }}
              onPick={handlePickStockImage}
              isPicking={isPickingStock}
              pickError={stockPickError}
              disabled={isPickingStock}
            />
          ) : null}

          {activeTab === "file" ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Envie PNG, JPG ou WebP (max. 5 MB) do seu computador.
              </p>

              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="sr-only"
                disabled={(libraryAtLimit && !value) || isPickingStock}
                onChange={(event) => {
                  handleFileChange(event.target.files?.[0] ?? null);
                }}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={(libraryAtLimit && !value) || isPickingStock}
                  onClick={() => inputRef.current?.click()}
                >
                  {value ? "Trocar arquivo" : "Escolher arquivo"}
                </Button>
                {value && isAvatar ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPickingStock}
                    onClick={() => setCropSource(value)}
                  >
                    Ajustar enquadramento
                  </Button>
                ) : null}
                {value ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleFileChange(undefined)}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>

              {value ? (
                <p className="text-xs text-muted-foreground">{value.name}</p>
              ) : null}

              {libraryAtLimit && !value ? (
                <p className="text-xs text-danger">
                  Biblioteca cheia ({libraryLimit} imagens). Remova uma imagem na
                  aba Biblioteca ou reutilize uma existente.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {isAvatar ? (
        <AvatarCropDialog
          open={cropSource !== null}
          file={cropSource}
          onCancel={() => {
            setCropSource(null);
            if (inputRef.current) inputRef.current.value = "";
            if (!value) {
              clearStockSelection();
            }
          }}
          onConfirm={(cropped) => {
            onChange(cropped);
            setCropSource(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      ) : null}
    </Field>
  );
}
