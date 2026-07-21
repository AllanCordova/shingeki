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
            ? "Este atalho não captura mais a sessão automaticamente. Use a extensão Shingeki ou a importação manual na página do sistema."
            : "Link de conexão inválido.",
          status: 410,
          hasFieldErrors: false,
        }}
      />
      <p className="max-w-md text-sm text-muted-foreground">
        A sessão do alvo precisa ser a autenticação do próprio alvo — nunca a
        sessão da plataforma Shingeki.
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
