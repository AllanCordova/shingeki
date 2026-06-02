import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { registerSchema, type RegisterInput } from "@/lib/contracts";
import { useRegister } from "@/lib/hooks/use-auth";
import { applyApiFieldErrors } from "@/lib/forms";
import { notify } from "@/lib/notify";
import type { ApiError } from "@/lib/api/error-handler";
import { Button, ErrorShow, Field, Input } from "@/components/ui";

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser, isLoading, error } = useRegister();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser(values);
      notify.success("Conta criada com sucesso.");
      router.replace("/projetos");
    } catch (err) {
      applyApiFieldErrors(err as ApiError, setError);
      notify.fromApiError(err, "Nao foi possivel criar a conta.");
    }
  });

  return (
    <View className="gap-4">
      {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

      <Field label="Nome" error={errors.name?.message}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoComplete="name"
              placeholder="Seu nome"
              hasError={Boolean(errors.name)}
            />
          )}
        />
      </Field>

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
              autoComplete="new-password"
              placeholder="Minimo de 8 caracteres"
              hasError={Boolean(errors.password)}
            />
          )}
        />
      </Field>

      <Field
        label="Confirmar senha"
        error={errors.password_confirmation?.message}
      >
        <Controller
          control={control}
          name="password_confirmation"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoComplete="new-password"
              placeholder="Repita a senha"
              hasError={Boolean(errors.password_confirmation)}
            />
          )}
        />
      </Field>

      <Button onPress={onSubmit} isLoading={isLoading} className="w-full">
        Criar conta
      </Button>
    </View>
  );
}
