"use client";

import { useState } from "react";
import Link from "next/link";
import type { AttackDepth } from "@/lib/contracts/attack/attack";
import type { AttackScanType } from "@/lib/hooks/attack/use-attack";
import { Button, Modal } from "@/components/ui";
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
};

interface AttackDepthModalProps {
  open: boolean;
  scanType: AttackScanType | null;
  systemId: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (options: AttackDepthConfirm) => void | Promise<void>;
}

export function AttackDepthModal({
  open,
  scanType,
  systemId,
  isLoading = false,
  onClose,
  onConfirm,
}: AttackDepthModalProps) {
  const [depth, setDepth] = useState<AttackDepth>("full");
  const [resetKey, setResetKey] = useState(`${open}:${scanType ?? ""}`);
  const nextKey = `${open}:${scanType ?? ""}`;
  if (nextKey !== resetKey) {
    setResetKey(nextKey);
    if (open) {
      setDepth("full");
    }
  }

  const label = scanType ? scanLabels[scanType] : "ataque";
  const isDast = scanType === "dast";
  const settingsHref = `/configuracoes/sistemas/${systemId}/dispatch`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Profundidade do ${label}`}
      description={
        scanType === "sast"
          ? "Escolha a profundidade. No SAST o valor é registrado, mas não altera a análise estática."
          : "Escolha a profundidade do scan. O ponto de partida e o limite de páginas ficam nas configurações do sistema."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            isLoading={isLoading}
            onClick={() => void onConfirm({ depth })}
          >
            Disparar {label}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {isDast ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Escopo do sistema: ponto de partida e limite de páginas.
            </p>
            <Link
              href={settingsHref}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-app border border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              aria-label="Abrir escopo do DAST deste sistema"
              title="Escopo do DAST"
              onClick={onClose}
            >
              <SettingsIcon className="h-4 w-4" />
            </Link>
          </div>
        ) : null}

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
      </div>
    </Modal>
  );
}
