"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type SyntheticEvent,
  type WheelEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const OUTPUT_SIZE = 512;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

interface AvatarCropDialogProps {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Modal para enquadrar avatar: arrastar + zoom, exporta PNG quadrado. */
export function AvatarCropDialog({
  open,
  file,
  onCancel,
  onConfirm,
}: AvatarCropDialogProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<Point | null>(null);
  const [viewportSize, setViewportSize] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dragStartRef = useRef<{
    pointer: Point;
    offset: Point;
  } | null>(null);

  useEffect(() => {
    if (!open || !file) {
      setImageUrl(null);
      setNaturalSize(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNaturalSize(null);

    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const clampOffset = useCallback(
    (next: Point, nextZoom: number, size: Point, viewport: number) => {
      const coverScale = Math.max(viewport / size.x, viewport / size.y);
      const displayW = size.x * coverScale * nextZoom;
      const displayH = size.y * coverScale * nextZoom;
      const maxX = Math.max(0, (displayW - viewport) / 2);
      const maxY = Math.max(0, (displayH - viewport) / 2);

      return {
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      };
    },
    [],
  );

  const applyZoom = (nextZoom: number) => {
    if (!naturalSize || viewportSize <= 0) {
      setZoom(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM));
      return;
    }

    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    setZoom(clampedZoom);
    setOffset((current) =>
      clampOffset(current, clampedZoom, naturalSize, viewportSize),
    );
  };

  const handleViewportRef = (node: HTMLDivElement | null) => {
    if (!node) return;
    setViewportSize(node.clientWidth);
  };

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const size = { x: img.naturalWidth, y: img.naturalHeight };
    setNaturalSize(size);
    if (viewportSize > 0) {
      setOffset(clampOffset({ x: 0, y: 0 }, zoom, size, viewportSize));
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!naturalSize) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointer: { x: event.clientX, y: event.clientY },
      offset: { ...offset },
    };
    setIsDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || !naturalSize || viewportSize <= 0) return;
    const dx = event.clientX - dragStart.pointer.x;
    const dy = event.clientY - dragStart.pointer.y;
    setOffset(
      clampOffset(
        {
          x: dragStart.offset.x + dx,
          y: dragStart.offset.y + dy,
        },
        zoom,
        naturalSize,
        viewportSize,
      ),
    );
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
    setIsDragging(false);
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    applyZoom(zoom + delta);
  };

  const handleConfirm = async () => {
    if (!imageUrl || !naturalSize || !file || viewportSize <= 0) return;

    setIsSaving(true);
    try {
      const img = await loadImageElement(imageUrl);
      const coverScale = Math.max(
        viewportSize / naturalSize.x,
        viewportSize / naturalSize.y,
      );
      const scale = coverScale * zoom;
      const sourceScale = 1 / scale;
      const centerX = naturalSize.x / 2 - offset.x * sourceScale;
      const centerY = naturalSize.y / 2 - offset.y * sourceScale;
      const sourceSize = viewportSize * sourceScale;
      const sx = centerX - sourceSize / 2;
      const sy = centerY - sourceSize / 2;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível.");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(
        img,
        sx,
        sy,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Falha ao gerar a imagem."));
        }, "image/png");
      });

      const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar";
      onConfirm(
        new File([blob], `${baseName}-avatar.png`, { type: "image/png" }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const coverScale =
    naturalSize && viewportSize > 0
      ? Math.max(viewportSize / naturalSize.x, viewportSize / naturalSize.y)
      : 1;
  const displayWidth = naturalSize
    ? naturalSize.x * coverScale * zoom
    : undefined;
  const displayHeight = naturalSize
    ? naturalSize.y * coverScale * zoom
    : undefined;

  return (
    <Modal
      open={open}
      onClose={isSaving ? () => undefined : onCancel}
      title="Enquadrar foto"
      description="Arraste para posicionar e use o zoom para preencher o círculo do avatar."
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            isLoading={isSaving}
            disabled={!naturalSize}
            onClick={() => void handleConfirm()}
          >
            Usar esta foto
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div
          ref={handleViewportRef}
          className={cn(
            "relative mx-auto aspect-square w-full max-w-sm touch-none overflow-hidden rounded-full border border-border bg-muted",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {imageUrl ? (
            // Object URL preview for crop; next/image is not suited for blob transforms.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Enquadramento do avatar"
              draggable={false}
              onLoad={handleImageLoad}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: displayWidth,
                height: displayHeight,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Diminuir zoom"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => applyZoom(zoom - ZOOM_STEP)}
          >
            −
          </Button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={zoom}
            aria-label="Zoom da foto"
            className="h-2 w-full cursor-pointer accent-primary"
            onChange={(event) => applyZoom(Number(event.target.value))}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Aumentar zoom"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => applyZoom(zoom + ZOOM_STEP)}
          >
            +
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Zoom {Math.round(zoom * 100)}%
        </p>
      </div>
    </Modal>
  );
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Não foi possível carregar a imagem."));
    img.src = src;
  });
}
