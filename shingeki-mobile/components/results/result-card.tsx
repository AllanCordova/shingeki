import { Text, View } from "react-native";
import type { SystemResult } from "@/lib/contracts";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

function riskTone(risk: string): "danger" | "warning" | "neutral" {
  const upper = risk.toUpperCase();
  if (upper === "CRITICAL" || upper === "HIGH") return "danger";
  if (upper === "MEDIUM") return "warning";
  return "neutral";
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
      <Text className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </Text>
    </View>
  );
}

export function ResultCard({ result }: { result: SystemResult }) {
  return (
    <Card>
      <CardHeader>
        <View className="flex-row flex-wrap items-center gap-2">
          <CardTitle>{result.attack?.category ?? "Vulnerabilidade"}</CardTitle>
          {result.attack?.risk_level ? (
            <Badge tone={riskTone(result.attack.risk_level)}>
              {result.attack.risk_level}
            </Badge>
          ) : null}
        </View>
      </CardHeader>
      <CardContent className="gap-3">
        {result.vulnerable_route ? (
          <Detail label="Rota vulneravel" value={result.vulnerable_route} />
        ) : null}
        {result.payload_used ? (
          <Detail label="Payload" value={result.payload_used} mono />
        ) : null}
        {result.evidence ? (
          <Detail label="Evidencia" value={result.evidence} mono />
        ) : null}
        {result.http_request ? (
          <Detail label="Requisicao HTTP" value={result.http_request} mono />
        ) : null}
      </CardContent>
    </Card>
  );
}
