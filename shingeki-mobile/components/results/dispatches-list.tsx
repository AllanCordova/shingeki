import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useDispatches } from "@/lib/hooks/use-results";
import { isDispatchCompleted } from "@/lib/dispatch-status";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorShow,
  Loading,
  Spinner,
} from "@/components/ui";

export function DispatchesList({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const { dispatches, isLoading, isFetching, isError, error, refetch } =
    useDispatches(projectId, systemId);

  return (
    <Card>
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <View>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              Disparos e vulnerabilidades. Role a tela para ver a lista completa.
            </CardDescription>
          </View>
          {isFetching ? <Spinner size="sm" /> : null}
        </View>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loading label="Carregando disparos..." />
        ) : isError ? (
          <ErrorShow error={error} onRetry={() => refetch()} />
        ) : dispatches.length === 0 ? (
          <EmptyState
            title="Nenhum disparo ainda"
            description="Dispare o catalogo de ataques para ver os resultados aqui."
          />
        ) : (
          <View className="gap-0">
            {dispatches.map((dispatch, index) => (
              <Link
                key={dispatch.id}
                href={`/projetos/${projectId}/sistemas/${systemId}/resultados/${dispatch.id}`}
                asChild
              >
                <Pressable
                  className={`active:opacity-80 ${
                    index > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <View className="flex-row items-center justify-between gap-4 py-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-sm font-medium text-foreground">
                        {formatDate(dispatch.dispatched_at)}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {dispatch.attacks_count} ataque(s)
                        {dispatch.findings_count !== null
                          ? ` · ${dispatch.findings_count} achado(s)`
                          : ""}
                      </Text>
                    </View>
                    <Badge
                      tone={
                        isDispatchCompleted(dispatch) ? "success" : "warning"
                      }
                    >
                      {isDispatchCompleted(dispatch)
                        ? "Concluido"
                        : "Processando"}
                    </Badge>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
}
