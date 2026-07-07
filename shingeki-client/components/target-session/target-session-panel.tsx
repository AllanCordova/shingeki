"use client";

import { useEffect, useRef, useState } from "react";
import {
  useRevokeTargetSession,
  useStartTargetSessionConnect,
  useStoreTargetSession,
  useTargetSession,
} from "@/lib/hooks/use-target-session";
import { notify } from "@/lib/notify";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorShow,
  Loading,
} from "@/components/ui";

const TARGET_SESSION_CONNECTED = "shingeki-target-session-connected";
const POPUP_FEATURES =
  "popup=yes,width=520,height=720,menubar=no,toolbar=no,location=yes,status=no";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

function isAllowedCaptureOrigin(
  origin: string,
  allowedOrigins: string[],
): boolean {
  return allowedOrigins.some(
    (allowed) => allowed.toLowerCase() === origin.toLowerCase(),
  );
}

export function TargetSessionPanel({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const { session, isLoading, error, refetch } = useTargetSession(
    projectId,
    systemId,
  );
  const startConnect = useStartTargetSessionConnect(projectId, systemId);
  const revokeSession = useRevokeTargetSession(projectId, systemId);
  const storeSession = useStoreTargetSession(projectId, systemId);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const allowedOriginsRef = useRef<string[]>([window.location.origin]);
  const pollTimerRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const handleConnected = () => {
    stopPolling();
    void refetch();
    notify.success("Sessao do alvo conectada.");
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== TARGET_SESSION_CONNECTED) return;
      if (!isAllowedCaptureOrigin(event.origin, allowedOriginsRef.current)) {
        return;
      }

      handleConnected();
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      stopPolling();
    };
  }, [refetch]);

  const startCapturePolling = () => {
    stopPolling();
    const startedAt = Date.now();

    pollTimerRef.current = window.setInterval(() => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stopPolling();
        return;
      }

      void refetch().then((result) => {
        if (result.data?.connected) {
          handleConnected();
        }
      });
    }, POLL_INTERVAL_MS);
  };

  const handleConnect = async () => {
    try {
      const result = await startConnect.startConnect();
      allowedOriginsRef.current = [
        window.location.origin,
        ...(result.target_origin ? [result.target_origin] : []),
      ];

      const popup = window.open(
        result.popup_url,
        "shingeki-target-login",
        POPUP_FEATURES,
      );

      if (!popup) {
        notify.error("Permita pop-ups para conectar a sessao do alvo.");
        return;
      }

      startCapturePolling();

      if (result.mode === "external") {
        notify.success(
          "Faca login na janela aberta. A sessao sera capturada automaticamente.",
        );
      } else {
        notify.success("Faca login na janela aberta para conectar a sessao.");
      }
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel iniciar a conexao com o alvo.");
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeSession.revokeSession();
      notify.success("Sessao do alvo removida.");
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel remover a sessao do alvo.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessao do alvo</CardTitle>
        <CardDescription>
          Conecte sua sessao autenticada para que o scan acesse areas protegidas do
          sistema. Uma janela separada abrira para voce fazer login — sem copiar
          cookies manualmente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? <ErrorShow error={error} onRetry={() => refetch()} /> : null}
        {startConnect.error ? <ErrorShow error={startConnect.error} /> : null}

        {isLoading ? (
          <Loading label="Carregando sessao..." />
        ) : session?.connected ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success">Conectada</Badge>
              <Badge tone="neutral">{session.auth_type}</Badge>
              {session.header_names?.map((name) => (
                <Badge key={name} tone="neutral">
                  {name}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Os proximos scans utilizarao esta sessao automaticamente.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                isLoading={startConnect.isLoading}
                onClick={() => void handleConnect()}
              >
                Reconectar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-danger hover:bg-danger-surface hover:text-danger"
                isLoading={revokeSession.isLoading}
                onClick={() => void handleRevoke()}
              >
                Remover sessao
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Clique abaixo, faca login na janela que abrir e aguarde a confirmacao
              de conexao.
            </p>
            <Button
              type="button"
              isLoading={startConnect.isLoading}
              onClick={() => void handleConnect()}
            >
              Conectar ao alvo
            </Button>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <button
            type="button"
            className="text-sm text-muted-foreground underline hover:text-foreground"
            onClick={() => setShowAdvanced((value) => !value)}
          >
            {showAdvanced ? "Ocultar importacao manual" : "Importacao manual (avancado)"}
          </button>

          {showAdvanced ? (
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const formData = new FormData(form);
                void storeSession
                  .storeSession({
                    auth_type: formData.get("auth_type") as "cookie" | "bearer",
                    credential: String(formData.get("credential") ?? ""),
                  })
                  .then(() => notify.success("Sessao importada manualmente."))
                  .catch((err) =>
                    notify.fromApiError(err, "Nao foi possivel importar a sessao."),
                  );
              }}
            >
              <select
                name="auth_type"
                className="w-full rounded-app border border-border bg-surface px-3 py-2 text-sm"
                defaultValue="cookie"
              >
                <option value="cookie">Cookie</option>
                <option value="bearer">Bearer token</option>
              </select>
              <textarea
                name="credential"
                rows={3}
                className="w-full rounded-app border border-border bg-surface px-3 py-2 font-mono text-xs"
                placeholder="Cole o cookie ou token apenas se souber o que esta fazendo."
                required
              />
              <Button type="submit" variant="outline" isLoading={storeSession.isLoading}>
                Importar manualmente
              </Button>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
