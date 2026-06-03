import { Text, View } from "react-native";
import { ProfileForm } from "@/components/forms/profile-form";
import { useMe, useUpdateProfile } from "@/lib/hooks/use-auth";
import { notify } from "@/lib/notify";
import {
  AppScrollView,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorShow,
  Loading,
} from "@/components/ui";

export default function PerfilScreen() {
  const { user, isLoading, isError, error, refetch } = useMe();
  const {
    updateProfile,
    isLoading: isSaving,
    error: saveError,
    reset,
  } = useUpdateProfile();

  if (isLoading) {
    return <Loading label="Carregando perfil..." />;
  }

  if (isError || !user) {
    return <ErrorShow error={error} onRetry={() => refetch()} />;
  }

  const handleSubmit = async (values: { name: string }) => {
    reset();
    try {
      await updateProfile({ name: values.name });
      notify.success("Perfil atualizado.");
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel atualizar o perfil.");
      throw err;
    }
  };

  return (
    <AppScrollView contentContainerClassName="gap-6 px-4 pb-8">
      <View className="gap-1">
        <Text className="text-2xl font-semibold tracking-tight text-foreground">
          Perfil
        </Text>
        <Text className="text-sm text-muted-foreground">
          Atualize seu nome de exibicao.
        </Text>
      </View>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da conta</CardTitle>
          <CardDescription>
            O e-mail nao pode ser alterado pelo app.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-1">
            <Text className="text-sm font-medium text-foreground">E-mail</Text>
            <Text className="text-sm text-muted-foreground">{user.email}</Text>
          </View>

          <ProfileForm
            defaultName={user.name}
            isLoading={isSaving}
            error={saveError}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </AppScrollView>
  );
}
