import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { useResults } from "@/lib/hooks/use-results";
import { isDispatchCompleted } from "@/lib/dispatch-status";
import { getRouteParam } from "@/lib/route-params";
import { formatDate } from "@/lib/utils";
import { ResultCard } from "@/components/results/result-card";
import {
  Badge,
  EmptyState,
  ErrorShow,
  Loading,
  Screen,
} from "@/components/ui";

export default function ResultsDetailScreen() {
  const { projectId, systemId, dispatchId } = useLocalSearchParams<{
    projectId: string;
    systemId: string;
    dispatchId: string;
  }>();

  const pid = getRouteParam(projectId);
  const sid = getRouteParam(systemId);
  const did = getRouteParam(dispatchId);

  const { dispatch, results, isLoading, isError, error, refetch, isFetching } =
    useResults(pid, sid, did);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (!did) {
    return (
      <Screen>
        <Loading label="Carregando disparo..." />
      </Screen>
    );
  }

  if (isLoading && !dispatch) {
    return (
      <Screen>
        <Loading label="Carregando resultados..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="px-4">
        <ErrorShow error={error} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const completed = isDispatchCompleted(dispatch);

  const listHeader = (
    <View className="gap-6 px-4 pb-4 pt-2">
      <Link href={`/projetos/${pid}/sistemas/${sid}`} asChild>
        <Pressable className="active:opacity-80">
          <Text className="text-sm text-muted-foreground">
            ← Voltar ao sistema
          </Text>
        </Pressable>
      </Link>

      <View className="gap-2">
        <View className="flex-row flex-wrap items-center gap-3">
          <Text className="text-2xl font-semibold tracking-tight text-foreground">
            Disparo {formatDate(dispatch?.dispatched_at)}
          </Text>
          <Badge tone={completed ? "success" : "warning"}>
            {completed ? "Concluido" : "Processando"}
          </Badge>
        </View>
        <Text className="text-sm text-muted-foreground">
          {dispatch?.attacks_count} ataque(s)
          {dispatch?.findings_count !== null &&
          dispatch?.findings_count !== undefined
            ? ` · ${dispatch.findings_count} vulnerabilidade(s)`
            : ""}
          {results.length > 0 ? ` · ${results.length} exibida(s)` : ""}
          {dispatch?.duration_ms ? ` · ${dispatch.duration_ms} ms` : ""}
        </Text>
        {!completed ? (
          <Text className="text-xs text-muted-foreground">
            {isFetching
              ? "Atualizando resultados do worker..."
              : "Arraste para baixo para atualizar."}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const listEmpty = (
    <View className="px-4">
      <EmptyState
        title={
          completed
            ? "Nenhuma vulnerabilidade encontrada"
            : "Aguardando processamento"
        }
        description={
          completed
            ? "O sistema nao apresentou vulnerabilidades neste disparo."
            : isFetching
              ? "Atualizando resultados do worker..."
              : "Os resultados aparecerao automaticamente assim que o worker concluir."
        }
      />
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-4 pb-4">
            <ResultCard result={item} />
          </View>
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{ paddingBottom: 32, flexGrow: results.length === 0 ? 1 : undefined }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </Screen>
  );
}
