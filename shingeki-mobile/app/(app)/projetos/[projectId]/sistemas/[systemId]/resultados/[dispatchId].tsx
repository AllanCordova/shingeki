import { Pressable, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { useResults } from "@/lib/hooks/use-results";
import { formatDate } from "@/lib/utils";
import {
  AppScrollView,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorShow,
  Loading,
} from "@/components/ui";

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
      <Text
        className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ResultsDetailScreen() {
  const { projectId, systemId, dispatchId } = useLocalSearchParams<{
    projectId: string;
    systemId: string;
    dispatchId: string;
  }>();

  const pid = projectId ?? "";
  const sid = systemId ?? "";
  const did = dispatchId ?? "";

  const { dispatch, results, isLoading, isError, error, refetch } = useResults(
    pid,
    sid,
    did,
  );

  return (
    <AppScrollView contentContainerClassName="gap-6 px-4 pb-8">
      <Link href={`/projetos/${pid}/sistemas/${sid}`} asChild>
        <Pressable className="active:opacity-80">
          <Text className="text-sm text-muted-foreground">← Voltar ao sistema</Text>
        </Pressable>
      </Link>

      {isLoading ? (
        <Loading label="Carregando resultados..." />
      ) : isError ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <View className="gap-2">
            <View className="flex-row flex-wrap items-center gap-3">
              <Text className="text-2xl font-semibold tracking-tight text-foreground">
                Disparo {formatDate(dispatch?.dispatched_at)}
              </Text>
              <Badge
                tone={dispatch?.status === "completed" ? "success" : "warning"}
              >
                {dispatch?.status === "completed" ? "Concluido" : "Processando"}
              </Badge>
            </View>
            <Text className="text-sm text-muted-foreground">
              {dispatch?.attacks_count} ataque(s)
              {dispatch?.findings_count !== null &&
              dispatch?.findings_count !== undefined
                ? ` · ${dispatch.findings_count} vulnerabilidade(s)`
                : ""}
              {dispatch?.duration_ms ? ` · ${dispatch.duration_ms} ms` : ""}
            </Text>
          </View>

          {results.length === 0 ? (
            <EmptyState
              title={
                dispatch?.status === "completed"
                  ? "Nenhuma vulnerabilidade encontrada"
                  : "Aguardando processamento"
              }
              description={
                dispatch?.status === "completed"
                  ? "O sistema nao apresentou vulnerabilidades neste disparo."
                  : "Os resultados aparecerao automaticamente assim que o worker concluir."
              }
            />
          ) : (
            <View className="gap-4">
              {results.map((result) => (
                <Card key={result.id}>
                  <CardHeader>
                    <View className="flex-row flex-wrap items-center gap-2">
                      <CardTitle>
                        {result.attack?.category ?? "Vulnerabilidade"}
                      </CardTitle>
                      {result.attack?.risk_level ? (
                        <Badge tone={riskTone(result.attack.risk_level)}>
                          {result.attack.risk_level}
                        </Badge>
                      ) : null}
                    </View>
                  </CardHeader>
                  <CardContent className="gap-3">
                    {result.vulnerable_route ? (
                      <Detail
                        label="Rota vulneravel"
                        value={result.vulnerable_route}
                      />
                    ) : null}
                    {result.payload_used ? (
                      <Detail label="Payload" value={result.payload_used} mono />
                    ) : null}
                    {result.evidence ? (
                      <Detail label="Evidencia" value={result.evidence} mono />
                    ) : null}
                    {result.http_request ? (
                      <Detail
                        label="Requisicao HTTP"
                        value={result.http_request}
                        mono
                      />
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </View>
          )}
        </>
      )}
    </AppScrollView>
  );
}
