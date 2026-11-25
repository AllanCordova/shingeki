"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionCaptureCreated } from "@/lib/contracts/attack/session-capture";
import {
  useImportSessionCapture,
  useOpenCaptureBrowser,
  useSessionCapture,
} from "@/lib/hooks/attack/use-session-capture";
import { notify } from "@/lib/notify";
import type { ApiError } from "@/lib/api/error-handler";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("{") && trimmed.includes("cookies");
}

function looksLikeBearer(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^bearer\s+/i.test(trimmed) ||
    (!trimmed.includes("=") && !trimmed.includes("{") && trimmed.length > 16)
  );
}

export function SessionCapturePanel({
  projectId,
  systemId,
  created,
}: {
  projectId: string;
  systemId: string;
  created: SessionCaptureCreated;
}) {
  const router = useRouter();
  const { capture } = useSessionCapture(projectId, systemId, created.capture.id);
  const { openBrowser, isLoading } = useOpenCaptureBrowser(projectId, systemId);
  const { importSession, isLoading: isImporting } = useImportSessionCapture(
    projectId,
    systemId,
  );
  const [novncUrl, setNovncUrl] = useState<string | null>(null);
  const [manualSession, setManualSession] = useState("");
  const openButtonRef = useRef<HTMLDivElement>(null);
  const browserNeedsOpen = created.remote_available && !novncUrl;

  useEffect(() => {
    if (!browserNeedsOpen) return;
    openButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [browserNeedsOpen]);

  const startRemote = async () => {
    try {
      const result = await openBrowser({
        captureId: created.capture.id,
        token: created.token,
      });
      setNovncUrl(result.novnc_url);
    } catch (err) {
      notify.fromApiError(
        err as ApiError,
        "Não foi possível abrir o navegador remoto.",
      );
    }
  };

  const submitManual = async () => {
    const value = manualSession.trim();
    if (!value) {
      notify.error("Cole cookies, um token de API ou um storageState JSON.");
      return;
    }

    try {
      let payload: {
        token: string;
        cookies?: string;
        authorization?: string;
        storage_state?: unknown;
      } = { token: created.token };

      if (looksLikeJson(value)) {
        payload = {
          ...payload,
          storage_state: JSON.parse(value) as unknown,
        };
      } else if (looksLikeBearer(value)) {
        payload = { ...payload, authorization: value };
      } else {
        payload = { ...payload, cookies: value };
      }

      const result = await importSession({
        captureId: created.capture.id,
        ...payload,
      });
      router.push(
        `/projetos/${projectId}/sistemas/${systemId}/resultados/${result.dispatch_id}`,
      );
    } catch (err) {
      notify.fromApiError(
        err as ApiError,
        "Não foi possível usar a sessão colada.",
      );
    }
  };

  useEffect(() => {
    if (capture?.status === "completed" && capture.dispatch_id) {
      router.push(
        `/projetos/${projectId}/sistemas/${systemId}/resultados/${capture.dispatch_id}`,
      );
    }
  }, [capture, projectId, router, systemId]);

  return (
    <div className="flex flex-col gap-3 rounded-app border border-border bg-muted/30 p-3 text-sm">
      <p className="text-foreground">
        {created.remote_available ? (
          <>
            O navegador abre nesta página. Use o botão destacado abaixo, entre no alvo e clique em{" "}
            <strong>Login concluído — iniciar scan</strong>.
          </>
        ) : (
          "O navegador de captura não está disponível."
        )}
        {capture?.status === "expired"
          ? " Esta captura expirou. Gere outra."
          : " Esta página abre o disparo quando a sessão chegar."}
      </p>
      {created.remote_available ? (
        <div
          ref={openButtonRef}
          className={cn(
            "guided-setup-section w-fit rounded-app",
            browserNeedsOpen && "guided-setup-highlight",
          )}
        >
          <Button
            type="button"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            onClick={() => void startRemote()}
          >
            Abrir navegador no painel
          </Button>
        </div>
      ) : null}
      {novncUrl ? (
        <iframe
          title="Navegador de captura"
          src={novncUrl}
          className="h-[640px] w-full rounded-app border border-border bg-black"
        />
      ) : null}

      <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
        <p className="text-foreground">
          Ou cole cookies de sessão (`a=b; c=d`), um token de API (`Bearer …`) ou um
          JSON no formato Playwright storageState.
        </p>
        <textarea
          value={manualSession}
          onChange={(event) => setManualSession(event.target.value)}
          rows={4}
          placeholder="session=…; token=…  ou  Bearer eyJ…  ou  {&quot;cookies&quot;:[…]}"
          className="w-full rounded-app border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
        />
        <div>
          <Button
            type="button"
            variant="outline"
            isLoading={isImporting}
            onClick={() => void submitManual()}
          >
            Usar sessão colada e iniciar scan
          </Button>
        </div>
      </div>
    </div>
  );
}
