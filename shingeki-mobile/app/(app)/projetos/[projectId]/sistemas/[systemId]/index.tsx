import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import {
  useDeleteSystem,
  useSystem,
  useUpdateSystem,
} from "@/lib/hooks/use-systems";
import { SystemForm } from "@/components/forms/system-form";
import { SignaturePanel } from "@/components/signature/signature-panel";
import { AttackForm } from "@/components/attack/attack-form";
import { DispatchesList } from "@/components/results/dispatches-list";
import { notify } from "@/lib/notify";
import {
  AppScrollView,
  Button,
  CoverHero,
  ErrorShow,
  Loading,
  Modal,
} from "@/components/ui";

export default function SystemDetailScreen() {
  const { projectId, systemId } = useLocalSearchParams<{
    projectId: string;
    systemId: string;
  }>();
  const pid = projectId ?? "";
  const sid = systemId ?? "";
  const router = useRouter();

  const { system, isLoading, isError, error, refetch } = useSystem(pid, sid);
  const updateSystem = useUpdateSystem(pid, sid);
  const deleteSystem = useDeleteSystem(pid);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <Loading label="Carregando sistema..." />;
  if (isError || !system)
    return <ErrorShow error={error} onRetry={() => refetch()} />;

  const handleDelete = async () => {
    const ok = await notify.run(
      () => deleteSystem.deleteSystem(sid),
      { success: "Sistema excluido." },
    );
    if (!ok) return;
    router.replace(`/projetos/${pid}`);
  };

  return (
    <AppScrollView contentContainerClassName="gap-8 pb-8">
      <CoverHero coverPath={system.cover_path} alt={`Capa de ${system.name}`}>
        <Link href={`/projetos/${pid}`} asChild>
          <Text className="mb-4 text-sm text-white/75">
            ← Voltar ao projeto
          </Text>
        </Link>
        <View className="gap-4">
          <Text className="text-2xl font-semibold tracking-tight text-white">
            {system.name}
          </Text>
          <Text
            className="text-sm text-white/85 underline"
            onPress={() => Linking.openURL(system.target_url)}
          >
            {system.target_url}
          </Text>
          <View className="flex-row gap-2">
            <Button variant="outline" onPress={() => setEditOpen(true)}>
              Editar
            </Button>
            <Button variant="danger" onPress={() => setDeleteOpen(true)}>
              Excluir
            </Button>
          </View>
        </View>
      </CoverHero>

      <View className="gap-8 px-4">
        <SignaturePanel projectId={pid} systemId={sid} />
        <AttackForm projectId={pid} systemId={sid} />
        <DispatchesList projectId={pid} systemId={sid} />
      </View>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar sistema"
      >
        <SystemForm
          mode="edit"
          isLoading={updateSystem.isLoading}
          error={updateSystem.error}
          submitLabel="Salvar alteracoes"
          defaultValues={{
            name: system.name,
            target_url: system.target_url,
            repository_url: system.repository_url,
          }}
          onCancel={() => setEditOpen(false)}
          onSubmit={async (values) => {
            const ok = await notify.run(
              () => updateSystem.updateSystem(values),
              { success: "Sistema atualizado." },
            );
            if (ok) setEditOpen(false);
          }}
        />
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir sistema"
        description="Esta acao nao pode ser desfeita."
      >
        <View className="flex-row justify-end gap-2">
          <Button variant="ghost" onPress={() => setDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            isLoading={deleteSystem.isLoading}
            onPress={handleDelete}
          >
            Excluir
          </Button>
        </View>
      </Modal>
    </AppScrollView>
  );
}
