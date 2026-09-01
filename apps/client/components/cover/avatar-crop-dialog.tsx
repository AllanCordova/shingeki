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
import { useObjectUrl } from "@/lib/cover/use-object-url";
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

export function AvatarCropDialog({
  open,
  file,
  onCancel,
  onConfirm,
}: AvatarCropDialogProps) {
  const fileKey = file
    ? `${file.name}-${file.size}-${file.lastModified}`
    : "empty";

  return (
    <AvatarCropWorkspace
      key={fileKey}
      open={open}
      file={file}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function AvatarCropWorkspace({
  open,
  file,
  onCancel,
  onConfirm,
}: AvatarCropDialogProps) {
  const objectUrl = useObjectUrl(open ? file : null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const imageUrl = dataUrl ?? objectUrl;
  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<Point | null>(null);
  const [viewportSize, setViewportSize] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dragStartRef = useRef<{
    pointer: Point;
    offset: Point;
  } | null>(null);

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

  useEffect(() => {
    setDataUrl(null);
  }, [objectUrl]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!open || !node) return;

    const updateSize = () => {
      const size = Math.round(node.getBoundingClientRect().width);
      if (size > 0) setViewportSize(size);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, imageUrl]);

  useEffect(() => {
    if (!naturalSize || viewportSize <= 0) return;
    setOffset((current) =>
      clampOffset(current, zoom, naturalSize, viewportSize),
    );
  }, [clampOffset, naturalSize, viewportSize, zoom]);

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

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const size = { x: img.naturalWidth, y: img.naturalHeight };
    if (size.x <= 0 || size.y <= 0) {
      setLoadError(
        "Não foi possível carregar a imagem. Tente um arquivo JPG, PNG ou WebP.",
      );
      return;
    }

    setLoadError(null);
    setNaturalSize(size);
  };

  const handleImageError = () => {
    if (file && !dataUrl) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setDataUrl(reader.result);
          setLoadError(null);
        }
      };
      reader.onerror = () => {
        setNaturalSize(null);
        setLoadError(
          "Não foi possível carregar a imagem. No iPhone, escolha JPG, PNG ou WebP — fotos HEIC podem falhar.",
        );
      };
      reader.readAsDataURL(file);
      return;
    }

    setNaturalSize(null);
    setLoadError(
      "Não foi possível carregar a imagem. No iPhone, escolha JPG, PNG ou WebP — fotos HEIC podem falhar.",
    );
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
    const img = imageRef.current;
    const viewport =
      viewportSize ||
      Math.round(viewportRef.current?.getBoundingClientRect().width ?? 0);

    if (!img || !naturalSize || !file || viewport <= 0) {
      setLoadError("Não foi possível enquadrar a foto. Tente novamente.");
      return;
    }

    setIsSaving(true);
    setLoadError(null);
    try {
      const coverScale = Math.max(
        viewport / naturalSize.x,
        viewport / naturalSize.y,
      );
      const scale = coverScale * zoom;
      const sourceScale = 1 / scale;
      const centerX = naturalSize.x / 2 - offset.x * sourceScale;
      const centerY = naturalSize.y / 2 - offset.y * sourceScale;
      const sourceSize = viewport * sourceScale;
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

      const blob = await canvasToPngBlob(canvas);
      const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar";
      onConfirm(
        new File([blob], `${baseName}-avatar.png`, { type: "image/png" }),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível gerar a imagem recortada.";
      setLoadError(message);
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
            disabled={!naturalSize || Boolean(loadError)}
            onClick={() => void handleConfirm()}
          >
            Usar esta foto
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div
          ref={viewportRef}
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
              ref={imageRef}
              src={imageUrl}
              alt="Enquadramento do avatar"
              draggable={false}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: displayWidth,
                height: displayHeight,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          ) : null}
        </div>

        {loadError ? (
          <p className="text-center text-sm text-danger">{loadError}</p>
        ) : null}

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

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
        return;
      }

      try {
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrlToBlob(dataUrl));
      } catch {
        reject(new Error("Falha ao gerar a imagem."));
      }
    }, "image/png");
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  if (!data) throw new Error("Falha ao gerar a imagem.");

  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}
