import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { loginSchema, type LoginInput } from "@/lib/contracts";
import { useLogin } from "@/lib/hooks/use-auth";
import { applyApiFieldErrors } from "@/lib/forms";
import { notify } from "@/lib/notify";
import type { ApiError } from "@/lib/api/error-handler";
import { Button, ErrorShow, Field, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error } = useLogin();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      notify.success("Login realizado com sucesso.");
      router.replace("/projetos");
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
      notify.fromApiError(err, "Nao foi possivel entrar.");
    }
  });

  return (
    <View className="gap-4">
      {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

      <Field label="E-mail" error={errors.email?.message}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              hasError={Boolean(errors.email)}
            />
          )}
        />
      </Field>

      <Field label="Senha" error={errors.password?.message}>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              hasError={Boolean(errors.password)}
            />
          )}
        />
      </Field>

      <Button onPress={onSubmit} isLoading={isLoading} className="w-full">
        Entrar
      </Button>
    </View>
  );
}
