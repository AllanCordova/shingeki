import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { View } from "react-native";
import { attackDispatchSchema, type AttackDispatchInput } from "@/lib/contracts";
import { useDispatchAttack } from "@/lib/hooks/use-attack";
import { applyApiFieldErrors } from "@/lib/forms";
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
  Field,
  Input,
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

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AttackDispatchInput>({
    resolver: zodResolver(attackDispatchSchema),
    defaultValues: { signature_token: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await dispatchAttack(values);
      notify.success(
        `${result.attacks_count} ataque(s) enfileirado(s) para processamento.`,
      );
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
      notify.fromApiError(err, "Nao foi possivel disparar os ataques.");
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disparar ataques</CardTitle>
        <CardDescription>
          Informe o token de assinatura permitido para enfileirar o catalogo de
          ataques contra o sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View className="gap-4">
          {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

          <Field
            label="Token de assinatura"
            error={errors.signature_token?.message}
            hint="64 caracteres gerados na assinatura do sistema."
          >
            <Controller
              control={control}
              name="signature_token"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  className="font-mono"
                  placeholder="cole o token aqui"
                  hasError={Boolean(errors.signature_token)}
                />
              )}
            />
          </Field>

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
