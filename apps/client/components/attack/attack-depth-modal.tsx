"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RouteMapPreviewList,
  useRouteMapPreview,
} from "@/components/attack/route-map-preview";
import type { AttackDepth } from "@/lib/contracts/attack/attack";
import type { DastRouteMapEntry } from "@/lib/contracts/attack/route-map";
import type { AttackScanType } from "@/lib/hooks/attack/use-attack";
import { Button, Checkbox, Modal } from "@/components/ui";
import { SettingsIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const scanLabels: Record<AttackScanType, string> = {
  dast: "DAST",
  sast: "SAST",
};

const depthOptions: Array<{
  value: AttackDepth;
  title: string;
  description: string;
}> = [
  {
    value: "quick",
    title: "Rápido",
    description:
      "Discovery rasa: menos páginas, sem crawl SPA. Ideal para smoke test.",
  },
  {
    value: "full",
    title: "Completo",
    description:
      "Discovery ampla com os limites padrão do worker. Mais demorado e abrangente.",
  },
];

export type AttackDepthConfirm = {
  depth: AttackDepth;
  route_map?: DastRouteMapEntry[];
};

interface AttackDepthModalProps {
  open: boolean;
  scanType: AttackScanType | null;
  systemId: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (options: AttackDepthConfirm) => void | Promise<void>;
  onCapture?: (options: AttackDepthConfirm) => void | Promise<void>;
}

export function AttackDepthModal({
  open,
  scanType,
  systemId,
  isLoading = false,
  onClose,
  onConfirm,
  onCapture,
}: AttackDepthModalProps) {
  const preview = useRouteMapPreview();
  const [depth, setDepth] = useState<AttackDepth>("full");
  const [useRouteMapOverride, setUseRouteMapOverride] = useState<boolean | null>(null);
  const useRouteMap = useRouteMapOverride ?? preview.routes.length > 0;
  const [routeMapError, setRouteMapError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(`${open}:${scanType ?? ""}`);
  const nextKey = `${open}:${scanType ?? ""}`;
  if (nextKey !== resetKey) {
    setResetKey(nextKey);
    if (open) {
      setDepth("full");
      setRouteMapError(null);
      setUseRouteMapOverride(null);
    }
  }

  const label = scanType ? scanLabels[scanType] : "ataque";
  const settingsHref = `/configuracoes/sistemas/${systemId}/dispatch`;
  const showRouteMap = scanType === "dast";

  const options = (): AttackDepthConfirm | null => {
    if (showRouteMap && useRouteMap) {
      if (preview.selectedRoutes.length === 0) {
        setRouteMapError("Marque pelo menos uma rota para o scan.");
        return null;
      }
      return { depth, route_map: preview.selectedRoutes };
    }
    return { depth };
  };

  const confirm = () => {
    const next = options();
    if (!next) return;
    return onConfirm(next);
  };

  const capture = () => {
    const next = options();
    if (!next || !onCapture) return;
    return onCapture(next);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Profundidade do ${label}`}
      size={showRouteMap ? "lg" : "md"}
      description={
        scanType === "sast"
          ? "Escolha a profundidade. No SAST o valor é registrado, mas não altera a análise estática."
          : "Escolha a profundidade. O mapa de rotas carregado neste sistema pode limitar o scan."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          {showRouteMap && onCapture ? (
            <Button
              variant="outline"
              isLoading={isLoading}
              onClick={() => void confirm()}
            >
              Disparar sem sessão
            </Button>
          ) : null}
          <Button
            variant="primary"
            isLoading={isLoading}
            onClick={() => void (showRouteMap && onCapture ? capture() : confirm())}
          >
            {showRouteMap && onCapture ? "Capturar sessão e iniciar" : `Disparar ${label}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Link
            href={settingsHref}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-app border border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label="Abrir configurações de disparo deste sistema"
            title="Configurações de disparo"
            onClick={onClose}
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
        </div>

        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-label="Profundidade"
        >
          {depthOptions.map((option) => {
            const selected = depth === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setDepth(option.value)}
                className={cn(
                  "rounded-app border px-3 py-3 text-left transition-colors",
                  selected
                    ? "border-foreground bg-surface-muted"
                    : "border-border hover:bg-surface-muted/60",
                )}
              >
                <span className="block text-sm font-medium text-foreground">
                  {option.title}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        {showRouteMap ? (
          <div className="flex flex-col gap-3 rounded-app border border-border p-3">
            <Checkbox
              checked={useRouteMap}
              onChange={(event) => {
                setUseRouteMapOverride(event.target.checked);
                setRouteMapError(null);
              }}
              disabled={preview.routes.length === 0}
              label="Atacar somente as rotas do mapa"
              description={
                preview.routes.length === 0
                  ? "Carregue o mapa de rotas nesta página para escolher os caminhos."
                  : "O DAST testa só as rotas marcadas no mapa deste sistema."
              }
            />
            {useRouteMap && preview.routes.length > 0 ? (
              <div className="flex flex-col gap-3">
                {routeMapError ? (
                  <p className="text-xs text-danger">{routeMapError}</p>
                ) : null}
                <RouteMapPreviewList />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
