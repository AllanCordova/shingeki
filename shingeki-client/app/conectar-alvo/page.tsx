"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Button, ErrorShow, Loading } from "@/components/ui";

const TARGET_SESSION_CONNECTED = "shingeki-target-session-connected";

function ConectarAlvoContent() {
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket");
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(true);

  useEffect(() => {
    if (!ticket) {
      setError("Link de conexao invalido.");
      setIsCapturing(false);
      return;
    }

    const capture = async () => {
      try {
        await apiClient.post(`/target-session/capture/${ticket}`);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          const redirect = `${window.location.pathname}${window.location.search}`;
          window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
          return;
        }

        setError("Nao foi possivel capturar a sessao. Tente novamente.");
        setIsCapturing(false);
        return;
      }

      if (window.opener) {
        window.opener.postMessage(
          { type: TARGET_SESSION_CONNECTED },
          window.location.origin,
        );
      }

      setIsCapturing(false);
      window.setTimeout(() => window.close(), 1200);
    };

    void capture();
  }, [ticket]);

  if (isCapturing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Loading label="Conectando sessao do alvo..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <ErrorShow
          error={{ message: error, status: 422, hasFieldErrors: false }}
        />
        <Button type="button" onClick={() => window.close()}>
          Fechar janela
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-medium text-foreground">
        Sessao conectada com sucesso.
      </p>
      <p className="text-sm text-muted-foreground">
        Esta janela fechara automaticamente.
      </p>
    </div>
  );
}

export default function ConectarAlvoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6">
          <Loading label="Preparando conexao..." />
        </div>
      }
    >
      <ConectarAlvoContent />
    </Suspense>
  );
}
