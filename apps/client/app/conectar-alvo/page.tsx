"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ErrorShow, Loading } from "@/components/ui";

function ConectarAlvoContent() {
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <ErrorShow
        error={{
          message: ticket
            ? "Este link de conexão não abre mais uma sessão. Capture o navegador pelo disparo DAST na página do sistema."
            : "Link de conexão inválido.",
          status: 410,
          hasFieldErrors: false,
        }}
      />
      <p className="max-w-md text-sm text-muted-foreground">
        A sessão autenticada nasce da captura do navegador, não desta janela.
      </p>
      <Button type="button" onClick={() => window.close()}>
        Fechar janela
      </Button>
    </div>
  );
}

export default function ConectarAlvoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6">
          <Loading label="Preparando conexão..." />
        </div>
      }
    >
      <ConectarAlvoContent />
    </Suspense>
  );
}
