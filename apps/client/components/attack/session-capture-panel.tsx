"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionCaptureCreated } from "@/lib/contracts/attack/session-capture";
import {
  useOpenCaptureBrowser,
  useSessionCapture,
} from "@/lib/hooks/attack/use-session-capture";
import { notify } from "@/lib/notify";
import type { ApiError } from "@/lib/api/error-handler";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

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
  const [novncUrl, setNovncUrl] = useState<string | null>(null);
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
    </div>
  );
}
