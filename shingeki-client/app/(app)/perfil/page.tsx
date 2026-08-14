"use client";

import { useMe, useUpdateProfile } from "@/lib/hooks/auth/use-auth";
import { notify } from "@/lib/ui/notify";
import { ProfileForm } from "@/components/forms/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorShow,
  Loading,
} from "@/components/ui";

export default function PerfilPage() {
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

  const handleSubmit = async (values: Parameters<typeof updateProfile>[0]) => {
    reset();
    await notify.run(() => updateProfile(values), {
      success: "Perfil atualizado.",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          Atualize sua foto e nome de exibicao.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da conta</CardTitle>
          <CardDescription>
            E-mail: {user.email} (nao editavel nesta tela).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultName={user.name}
            currentAvatarPath={user.avatar_path}
            isLoading={isSaving}
            error={saveError}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
