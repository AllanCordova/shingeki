"use client";

import { useState } from "react";
import type { CoverStockImage } from "@/lib/contracts/cover-stock-image";
import { useCoverStockImages } from "@/lib/hooks/use-cover-stock-images";
import { Button } from "./button";
import { ErrorShow } from "./error-show";
import { Input } from "./input";
import { Spinner } from "./spinner";

interface CoverStockPickerProps {
  embedded?: boolean;
  selectedId: number | null;
  onSelect: (image: CoverStockImage | null) => void;
  onPick: (image: CoverStockImage) => Promise<void>;
  isPicking?: boolean;
  pickError?: string | null;
  disabled?: boolean;
}

export function CoverStockPicker({
  embedded = false,
  selectedId,
  onSelect,
  onPick,
  isPicking = false,
  pickError = null,
  disabled = false,
}: CoverStockPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | undefined>(undefined);

  const { images, isLoading, isError, error, refetch, searchQuery } =
    useCoverStockImages({ query: activeQuery });

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    setActiveQuery(trimmed || undefined);
  };

  return (
    <div className="flex flex-col gap-3">
      {!embedded ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Imagens sugeridas</p>
            <p className="text-xs text-muted-foreground">Pexels</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Escolha uma foto para usar como capa. O arquivo sera baixado ao salvar.
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Fotos gratuitas (Pexels). Clique para selecionar.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar (ex: cybersecurity, abstract)"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSearch();
            }
          }}
          disabled={disabled || isPicking}
          className="min-w-[12rem] flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isPicking}
          onClick={handleSearch}
        >
          Buscar
        </Button>
      </div>

      {pickError ? (
        <p className="text-xs text-danger" role="alert">
          {pickError}
        </p>
      ) : null}

      {isError && error ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8">
          <Spinner size="sm" />
          <span className="text-sm text-muted-foreground">Carregando imagens...</span>
        </div>
      ) : images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
          Nenhuma imagem encontrada para &quot;{searchQuery}&quot;.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image) => {
            const isSelected = selectedId === image.id;
            const isActive = isPicking && isSelected;

            return (
              <li
                key={image.id}
                className={`overflow-hidden rounded-lg border ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                }`}
              >
                <button
                  type="button"
                  disabled={disabled || isPicking}
                  onClick={async () => {
                    if (isSelected) {
                      onSelect(null);
                      return;
                    }
                    onSelect(image);
                    await onPick(image);
                  }}
                  className="relative block aspect-video w-full bg-muted"
                  title={image.alt}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.previewUrl}
                    alt={image.alt}
                    className="h-full w-full object-cover"
                  />
                  {isActive ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-foreground/40">
                      <Spinner size="sm" />
                    </span>
                  ) : null}
                </button>
                <p className="truncate px-1 py-0.5 text-[10px] text-muted-foreground">
                  {image.photographer}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
