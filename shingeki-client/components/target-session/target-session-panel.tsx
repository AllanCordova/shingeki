"use client";

import { useEffect, useRef, useState } from "react";
import {
  useRevokeTargetSession,
  useStartTargetSessionConnect,
  useStoreTargetSession,
  useTargetSession,
} from "@/lib/hooks/use-target-session";
import {
  armShingekiExtension,
  pingShingekiExtension,
} from "@/lib/extension/target-session-bridge";
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

function resolveCaptureApiBase(fromServer?: string): string {
  if (fromServer) return fromServer.replace(/\/$/, "");
  const media = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");
  if (media) return `${media}/api`;
  return "http://127.0.0.1:8000/api";
}

export function TargetSessionPanel({
  projectId,
  systemId,
  systemName,
}: {
  projectId: string;
  systemId: string;
  systemName?: string;
}) {
  const { session, isLoading, error, refetch } = useTargetSession(
    projectId,
    systemId,
  );
  const startConnect = useStartTargetSessionConnect(projectId, systemId);
  const revokeSession = useRevokeTargetSession(projectId, systemId);
  const storeSession = useStoreTargetSession(projectId, systemId);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualAuthType, setManualAuthType] = useState<"cookie" | "bearer">(
    "cookie",
  );
  const [extensionReady, setExtensionReady] = useState<boolean | null>(null);
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
    const onReady = (event: MessageEvent) => {
      if (
        event.source === window &&
        event.data?.source === "shingeki-extension" &&
        event.data?.type === "shingeki.ready"
      ) {
        setExtensionReady(true);
      }
    };
    window.addEventListener("message", onReady);
    void pingShingekiExtension().then(setExtensionReady);
    return () => window.removeEventListener("message", onReady);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.type === TARGET_SESSION_CONNECTED ||
        (event.data?.source === "shingeki-extension" &&
          event.data?.type === TARGET_SESSION_CONNECTED)
      ) {
        if (
          event.origin === window.location.origin ||
          isAllowedCaptureOrigin(event.origin, allowedOriginsRef.current)
        ) {
          handleConnected();
        }
        return;
      }

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

      const hasExtension =
        extensionReady === true || (await pingShingekiExtension());
      setExtensionReady(hasExtension);

      if (hasExtension && result.mode === "external") {
        const apiBase = resolveCaptureApiBase(result.capture_api_base);
        const openUrl = result.open_url || result.popup_url;
        const expiresAt = result.expires_at
          ? Date.parse(result.expires_at)
          : Date.now() + 15 * 60 * 1000;

        const armed = await armShingekiExtension({
          ticket: result.ticket,
          apiBase,
          targetOrigin: result.target_origin ?? "",
          clientOrigin: result.client_origin ?? window.location.origin,
          openUrl,
          systemName,
          expiresAt,
        });

        if (!armed.ok) {
          notify.error(
            armed.error ??
              "Extensao detectada, mas falhou ao armar a captura.",
          );
          return;
        }

        startCapturePolling();
        notify.success(
          "Aba do alvo aberta. Faca login la, depois clique no icone Shingeki → Capturar sessao.",
        );
        return;
      }

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
          hasExtension
            ? "Faca login na janela aberta."
            : "Lab: faca login e aguarde o capture. Para SaaS (Bling etc.), instale a extensao Shingeki.",
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
      notify.fromApiError(err, "Nao foi possivel remover a sessao.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessao do alvo</CardTitle>
        <CardDescription>
          Conecte a sessao autenticada para o scan acessar areas protegidas.
          Em sites externos (SaaS), use a extensao Chrome/Edge Shingeki; no lab
          vulneravel o popup ainda captura sozinho.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? <ErrorShow error={error} onRetry={() => refetch()} /> : null}
        {startConnect.error ? <ErrorShow error={startConnect.error} /> : null}

        {extensionReady === false ? (
          <div className="flex flex-col gap-2 rounded-app border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <p>
              Extensao nao detectada. Para Bling e outros SaaS, instale a
              extensao Chrome/Edge:
            </p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                <a
                  href="/extensions/shingeki-target-session.zip"
                  className="text-primary underline hover:no-underline"
                  download
                >
                  Baixar shingeki-target-session.zip
                </a>
              </li>
              <li>
                Extraia a pasta e abra{" "}
                <code className="font-mono text-xs">chrome://extensions</code>
              </li>
              <li>
                Modo do desenvolvedor → Carregar sem compactacao → selecione a
                pasta extraida
              </li>
              <li>Recarregue esta pagina do Shingeki</li>
            </ol>
            <p>
              Em producao o caminho ideal e publicar na Chrome Web Store; o ZIP
              serve para instalação local / piloto.
            </p>
          </div>
        ) : null}
        {extensionReady === true ? (
          <p className="text-xs text-muted-foreground">
            Extensao detectada. Conectar abre o login em aba normal; depois use
            o icone Shingeki → Capturar sessao (nao precisa estar na aba do
            Shingeki).
          </p>
        ) : null}

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
              1) Conectar ao alvo (abre aba de login) → 2) faca login → 3) icone
              da extensao → <strong>Capturar sessao</strong>.
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
            {showAdvanced
              ? "Ocultar importacao manual"
              : "Importar sessao manualmente"}
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
                  .then(() => notify.success("Sessao salva com sucesso."))
                  .catch((err) =>
                    notify.fromApiError(
                      err,
                      "Nao foi possivel salvar a sessao.",
                    ),
                  );
              }}
            >
              <p className="text-sm text-muted-foreground">
                Fallback sem extensao: cole o Cookie ou Bearer do DevTools.
              </p>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Tipo de autenticacao
                </span>
                <select
                  name="auth_type"
                  className="w-full rounded-app border border-border bg-surface px-3 py-2 text-sm"
                  value={manualAuthType}
                  onChange={(event) =>
                    setManualAuthType(
                      event.target.value as "cookie" | "bearer",
                    )
                  }
                >
                  <option value="cookie">Cookie</option>
                  <option value="bearer">Bearer token</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  {manualAuthType === "cookie" ? "Cookie" : "Token Bearer"}
                </span>
                <textarea
                  name="credential"
                  rows={3}
                  className="w-full rounded-app border border-border bg-surface px-3 py-2 font-mono text-xs"
                  placeholder={
                    manualAuthType === "cookie"
                      ? "Cole aqui o cookie (ex.: PHPSESSID=abc123)"
                      : "Cole aqui seu token Bearer"
                  }
                  required
                />
              </label>
              <Button
                type="submit"
                variant="outline"
                isLoading={storeSession.isLoading}
              >
                Salvar sessao
              </Button>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
