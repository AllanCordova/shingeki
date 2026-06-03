"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { coverStockImageToFile } from "@/lib/cover-stock-image";
import { resolveCoverSrc } from "@/lib/cover-image";
import type { ApiError } from "@/lib/api/error-handler";
import type { CoverStockImage } from "@/lib/contracts/cover-stock-image";
import type { CoverUpload } from "@/lib/contracts/cover-upload";
import { cn } from "@/lib/utils";
import { CoverLibraryPicker } from "./cover-library-picker";
import { CoverStockPicker } from "./cover-stock-picker";
import { Field } from "./field";
import { Button } from "./button";

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

  const selectedUpload = libraryUploads.find((u) => u.id === selectedUploadId);
  const libraryPreviewSrc = selectedUpload
    ? resolveCoverSrc(selectedUpload.path)
    : null;

  const filePreviewUrl = useMemo(() => {
    if (!value) return null;
    return URL.createObjectURL(value);
  }, [value]);

  useEffect(() => {
    if (!filePreviewUrl) return;
    return () => URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);

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
    onChange(file ?? undefined);
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
      onChange(file);
      setSelectedStockId(image.id);
    } catch (err) {
      setSelectedStockId(null);
      const message =
        err instanceof Error
          ? err.message
          : "Nao foi possivel usar a imagem selecionada.";
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
      ? "Escolha uma foto na biblioteca ou envie do computador."
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displaySrc}
              alt={isAvatar ? "Pre-visualizacao do avatar" : "Pre-visualizacao da capa"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground",
                isAvatar ? "min-h-[8rem]" : "min-h-[8rem]",
              )}
            >
              {isAvatar ? "Sem foto" : "Pre-visualizacao da capa"}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {selectionLabel(value, selectedUploadId, selectedStockId)}
        </p>

        <div
          className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-muted p-1"
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
                "flex-1 min-w-[5.5rem] rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === "library" ? (
                <span className="ml-1 text-xs font-normal opacity-70">
                  ({libraryCount}/{libraryLimit})
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
              disabled={Boolean(value) || isPickingStock}
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
              disabled={Boolean(selectedUploadId)}
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
                accept="image/*"
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
    </Field>
  );
}
