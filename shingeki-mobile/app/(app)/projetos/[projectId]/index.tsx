import { useState } from "react";
import { Text, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import type { SystemCreateInput } from "@/lib/contracts";
import {
  useDeleteProject,
  useProject,
  useUpdateProject,
} from "@/lib/hooks/use-projects";
import { useCreateSystem, useSystems } from "@/lib/hooks/use-systems";
import { getRouteParam } from "@/lib/route-params";
import { ProjectForm } from "@/components/forms/project-form";
import { SystemForm } from "@/components/forms/system-form";
import { SystemCard } from "@/components/systems/system-card";
import { notify } from "@/lib/notify";
import {
  AddActionButton,
  AppScrollView,
  Button,
  CoverHero,
  EmptyState,
  ErrorShow,
  Loading,
  Modal,
} from "@/components/ui";

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const id = getRouteParam(projectId);
  const router = useRouter();

  const { project, isLoading, isError, error, refetch } = useProject(id);
  const {
    systems,
    isLoading: loadingSystems,
    isError: systemsError,
    error: systemsErr,
    refetch: refetchSystems,
  } = useSystems(id);

  const updateProject = useUpdateProject(id);
  const deleteProject = useDeleteProject();
  const createSystem = useCreateSystem(id);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);

  if (isLoading) return <Loading label="Carregando projeto..." />;
  if (isError || !project)
    return <ErrorShow error={error} onRetry={() => refetch()} />;

  const handleDelete = async () => {
    const ok = await notify.run(
      () => deleteProject.deleteProject(id),
      { success: "Projeto excluido." },
    );
    if (!ok) return;
    router.replace("/projetos");
  };

  return (
    <AppScrollView contentContainerClassName="gap-8 pb-8">
      <CoverHero coverPath={project.cover_path} alt={`Capa de ${project.name}`}>
        <Link href="/projetos" asChild>
          <Text className="mb-4 text-sm text-white/75">
            ← Projetos
          </Text>
        </Link>
        <View className="gap-4">
          <Text className="text-2xl font-semibold tracking-tight text-white">
            {project.name}
          </Text>
          <Text className="text-sm text-white/85">
            {project.description}
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

      <View className="gap-4 px-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-foreground">Sistemas</Text>
          <AddActionButton
            onPress={() => setSystemOpen(true)}
            accessibilityLabel="Novo sistema"
          />
        </View>

        {loadingSystems ? (
          <Loading label="Carregando sistemas..." />
        ) : systemsError ? (
          <ErrorShow error={systemsErr} onRetry={() => refetchSystems()} />
        ) : systems.length === 0 ? (
          <EmptyState
            title="Nenhum sistema cadastrado"
            description="Cadastre um sistema alvo para gerar assinatura e disparar ataques."
            action={
              <AddActionButton
                onPress={() => setSystemOpen(true)}
                accessibilityLabel="Criar sistema"
              />
            }
          />
        ) : (
          <View className="gap-4">
            {systems.map((system) => (
              <SystemCard key={system.id} projectId={id} system={system} />
            ))}
          </View>
        )}
      </View>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar projeto"
      >
        <ProjectForm
          mode="edit"
          isLoading={updateProject.isLoading}
          error={updateProject.error}
          submitLabel="Salvar alteracoes"
          defaultValues={{
            name: project.name,
            description: project.description,
          }}
          onCancel={() => setEditOpen(false)}
          onSubmit={async (values) => {
            const ok = await notify.run(
              () => updateProject.updateProject(values),
              { success: "Projeto atualizado." },
            );
            if (ok) setEditOpen(false);
          }}
        />
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir projeto"
        description="Esta acao nao pode ser desfeita."
      >
        <View className="flex-row justify-end gap-2">
          <Button variant="ghost" onPress={() => setDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            isLoading={deleteProject.isLoading}
            onPress={handleDelete}
          >
            Excluir
          </Button>
        </View>
      </Modal>

      <Modal
        open={systemOpen}
        onClose={() => setSystemOpen(false)}
        title="Novo sistema"
        description="Cadastre um sistema alvo."
      >
        <SystemForm
          isLoading={createSystem.isLoading}
          error={createSystem.error}
          submitLabel="Criar sistema"
          onCancel={() => setSystemOpen(false)}
          onSubmit={async (values) => {
            const ok = await notify.run(
              () => createSystem.createSystem(values as SystemCreateInput),
              { success: "Sistema criado." },
            );
            if (ok) setSystemOpen(false);
          }}
        />
      </Modal>
    </AppScrollView>
  );
}
