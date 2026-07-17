"use client";

import { useEffect, useState } from "react";
import type { AttackDepth, AttackDiscoveryScope } from "@/lib/contracts/attack";
import type { AttackScanType } from "@/lib/hooks/use-attack";
import { Button, Field, Input, Modal } from "@/components/ui";
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
    title: "Rapido",
    description:
      "Discovery rasa: menos paginas, sem crawl SPA. Ideal para smoke test.",
  },
  {
    value: "full",
    title: "Completo",
    description:
      "Discovery ampla com os limites padrao do worker. Mais demorado e abrangente.",
  },
];

export type AttackDepthConfirm = {
  depth: AttackDepth;
} & AttackDiscoveryScope;

interface AttackDepthModalProps {
  open: boolean;
  scanType: AttackScanType | null;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (options: AttackDepthConfirm) => void | Promise<void>;
}

function normalizeStartPath(raw: string): string | undefined {
  const trimmed = raw.trim().replace(/\\/g, "/");
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return `${url.pathname}${url.search}` || "/";
    } catch {
      const fallback = trimmed.replace(/\/+/g, "/");
      return fallback.startsWith("/") ? fallback : `/${fallback}`;
    }
  }
  const withoutHash = (trimmed.split("#")[0] ?? trimmed).replace(/\/+/g, "/");
  if (!withoutHash) return "/";
  return withoutHash.startsWith("/") ? withoutHash : `/${withoutHash}`;
}

export function AttackDepthModal({
  open,
  scanType,
  isLoading = false,
  onClose,
  onConfirm,
}: AttackDepthModalProps) {
  const [depth, setDepth] = useState<AttackDepth>("full");
  const [startPath, setStartPath] = useState("");
  const [maxRoutes, setMaxRoutes] = useState("50");

  useEffect(() => {
    if (open) {
      setDepth("full");
      setStartPath("");
      setMaxRoutes("50");
    }
  }, [open, scanType]);

  const label = scanType ? scanLabels[scanType] : "ataque";
  const isDast = scanType === "dast";

  const handleConfirm = () => {
    const options: AttackDepthConfirm = { depth };
    if (isDast) {
      const path = normalizeStartPath(startPath);
      if (path) {
        const routes = Number.parseInt(maxRoutes, 10);
        options.start_path = path;
        options.max_routes =
          Number.isFinite(routes) && routes > 0 ? Math.min(routes, 500) : 50;
      }
    }
    return onConfirm(options);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Profundidade do ${label}`}
      description={
        scanType === "sast"
          ? "Escolha a profundidade. No SAST o valor e registrado, mas nao altera a analise estatica."
          : "Escolha quanta superficie o scan deve descobrir. Opcionalmente foque a partir de uma rota."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            isLoading={isLoading}
            onClick={() => void handleConfirm()}
          >
            Disparar {label}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
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

        {isDast ? (
          <div className="flex flex-col gap-3 rounded-app border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              Escopo opcional: comece numa rota (ex.{" "}
              <span className="font-mono text-foreground">/products</span>) e
              limite quantas rotas o crawl visita a partir dela. Util para
              retestar uma feature sem varrer o site inteiro.
            </p>
            <Field
              label="Rota inicial"
              htmlFor="attack-start-path"
            >
              <Input
                id="attack-start-path"
                value={startPath}
                onChange={(event) => setStartPath(event.target.value)}
                placeholder="/products"
                disabled={isLoading}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Maximo de rotas"
              htmlFor="attack-max-routes"
              hint="Inclui a rota inicial. Padrao 50 quando ha rota inicial."
            >
              <Input
                id="attack-max-routes"
                type="number"
                min={1}
                max={500}
                value={maxRoutes}
                onChange={(event) => setMaxRoutes(event.target.value)}
                disabled={isLoading}
              />
            </Field>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
