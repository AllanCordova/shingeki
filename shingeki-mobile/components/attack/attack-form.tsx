import { View } from "react-native";
import { useDispatchAttack } from "@/lib/hooks/use-attack";
import { notify } from "@/lib/notify";
import type { ApiError } from "@/lib/api/error-handler";
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

export function AttackForm({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const { dispatchAttack, data, isLoading, error } = useDispatchAttack(
    projectId,
    systemId,
  );

  const onSubmit = async () => {
    try {
      const result = await dispatchAttack();
      notify.success(
        `${result.attacks_count} ataque(s) enfileirado(s) para processamento.`,
      );
    } catch (err) {
      notify.fromApiError(err as ApiError, "Nao foi possivel disparar os ataques.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disparar ataques</CardTitle>
        <CardDescription>
          Enfileira o catalogo de ataques apos a assinatura do sistema estar
          validada e permitida.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View className="gap-4">
          {error ? <ErrorShow error={error} /> : null}

          <View className="flex-row items-center justify-between gap-3">
            <Button onPress={onSubmit} isLoading={isLoading}>
              Disparar
            </Button>
            {data ? (
              <Badge tone="success">
                {data.attacks_count} ataque(s) enfileirado(s)
              </Badge>
            ) : null}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
