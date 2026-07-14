"use client";

import { useEffect, useState } from "react";
import type { AttackDepth } from "@/lib/contracts/attack";
import type { AttackScanType } from "@/lib/hooks/use-attack";
import { Button, Modal } from "@/components/ui";
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

interface AttackDepthModalProps {
  open: boolean;
  scanType: AttackScanType | null;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (depth: AttackDepth) => void | Promise<void>;
}

export function AttackDepthModal({
  open,
  scanType,
  isLoading = false,
  onClose,
  onConfirm,
}: AttackDepthModalProps) {
  const [depth, setDepth] = useState<AttackDepth>("full");

  useEffect(() => {
    if (open) setDepth("full");
  }, [open, scanType]);

  const label = scanType ? scanLabels[scanType] : "ataque";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Profundidade do ${label}`}
      description={
        scanType === "sast"
          ? "Escolha a profundidade. No SAST o valor e registrado, mas nao altera a analise estatica."
          : "Escolha quanta superficie o scan deve descobrir antes de atacar."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            isLoading={isLoading}
            onClick={() => void onConfirm(depth)}
          >
            Disparar {label}
          </Button>
        </>
      }
    >
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
    </Modal>
  );
}
