import { useState } from "react";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
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
      await Clipboard.setStringAsync(installation.example);
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
          Gere um token, instale no HTML do alvo (meta tag) e valide a posse
          antes de disparar ataques.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View className="gap-4">
          <View className="flex-row flex-wrap gap-2">
            <Button onPress={handleGenerate} isLoading={generate.isLoading}>
              Gerar token
            </Button>
            <Button
              variant="outline"
              onPress={handleValidate}
              isLoading={validate.isLoading}
            >
              Validar instalacao
            </Button>
            <Button
              variant="danger"
              onPress={handleRevoke}
              isLoading={revoke.isLoading}
            >
              Revogar
            </Button>
          </View>

          {generate.error ? <ErrorShow error={generate.error} /> : null}
          {validate.error ? <ErrorShow error={validate.error} /> : null}
          {revoke.error ? <ErrorShow error={revoke.error} /> : null}

          {generate.data && installation ? (
            <View className="gap-2 rounded-app border border-border bg-surface-muted p-4">
              <Text className="text-xs font-medium text-muted-foreground">
                Token gerado
              </Text>
              <Text className="font-mono text-sm text-foreground">
                {generate.data.signature.token}
              </Text>
              <Text className="mt-2 text-xs font-medium text-muted-foreground">
                Instale esta meta tag no HTML do alvo
              </Text>
              <Text className="font-mono text-xs text-foreground">
                {installation.example}
              </Text>
              <Button size="sm" variant="outline" onPress={handleCopy}>
                {copied ? "Copiado!" : "Copiar meta tag"}
              </Button>
            </View>
          ) : null}

          {validate.data ? (
            <View className="flex-row flex-wrap items-center gap-2">
              <Badge tone={validate.data.permitted ? "success" : "warning"}>
                {validate.data.permitted ? "Permitido" : "Nao permitido"}
              </Badge>
              <Text className="text-sm text-muted-foreground">
                {validate.data.message}
              </Text>
            </View>
          ) : null}

          {revoked ? (
            <Badge tone="neutral">Token revogado com sucesso.</Badge>
          ) : null}
        </View>
      </CardContent>
    </Card>
  );
}
