"use client";

import { useState } from "react";
import {
  useGenerateSignature,
  useRevokeSignature,
  useValidateSignature,
} from "@/lib/hooks/use-signature";
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
} from "@/components/ui";

export function SignaturePanel({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const generate = useGenerateSignature(projectId, systemId);
  const validate = useValidateSignature(projectId, systemId);
  const revoke = useRevokeSignature(projectId, systemId);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);

  const installation = generate.data?.installation;

  const handleGenerate = async () => {
    setRevoked(false);
    generate.reset();
    await notify.run(() => generate.generate(), {
      success: "Token de assinatura gerado.",
    });
  };

  const handleValidate = async () => {
    try {
      const result = await validate.validate();
      if (result.permitted) {
        notify.success("Assinatura permitida no HTML do alvo.");
      } else {
        notify.error(
          result.message || "Assinatura ainda nao permitida no alvo.",
        );
      }
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel validar a assinatura.");
    }
  };

  const handleRevoke = async () => {
    const ok = await notify.run(() => revoke.revoke(), {
      success: "Token revogado.",
    });
    if (ok) setRevoked(true);
  };

  const handleCopy = async () => {
    if (!installation) return;
    try {
      await navigator.clipboard.writeText(installation.example);
      setCopied(true);
      notify.success("Meta tag copiada.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Nao foi possivel copiar.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinatura do sistema</CardTitle>
        <CardDescription>
          Gere um token, instale a meta tag no HTML do alvo e valide a
          instalacao. O token fica salvo no sistema — nao e necessario informa-lo
          ao disparar ataques.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerate} isLoading={generate.isLoading}>
            Gerar token
          </Button>
          <Button
            variant="outline"
            onClick={handleValidate}
            isLoading={validate.isLoading}
          >
            Validar instalacao
          </Button>
          <Button
            variant="danger"
            onClick={handleRevoke}
            isLoading={revoke.isLoading}
          >
            Revogar
          </Button>
        </div>

        {generate.error ? <ErrorShow error={generate.error} /> : null}
        {validate.error ? <ErrorShow error={validate.error} /> : null}
        {revoke.error ? <ErrorShow error={revoke.error} /> : null}

        {generate.data && installation ? (
          <div className="flex flex-col gap-2 rounded-app border border-border bg-surface-muted p-4">
            <span className="text-xs font-medium text-muted-foreground">
              Token gerado
            </span>
            <code className="break-all font-mono text-sm text-foreground">
              {generate.data.signature.token}
            </code>
            <span className="mt-2 text-xs font-medium text-muted-foreground">
              Instale esta meta tag no HTML do alvo
            </span>
            <code className="break-all font-mono text-xs text-foreground">
              {installation.example}
            </code>
            <div>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? "Copiado!" : "Copiar meta tag"}
              </Button>
            </div>
          </div>
        ) : null}

        {validate.data ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={validate.data.permitted ? "success" : "warning"}>
              {validate.data.permitted ? "Permitido" : "Nao permitido"}
            </Badge>
            <span className="text-muted-foreground">{validate.data.message}</span>
          </div>
        ) : null}

        {revoked ? (
          <Badge tone="neutral">Token revogado com sucesso.</Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}
