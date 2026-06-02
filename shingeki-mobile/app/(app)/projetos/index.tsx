import { ScrollView, Text, View } from "react-native";
import type { ProjectCreateInput } from "@/lib/contracts";
import { useProjects, useCreateProject } from "@/lib/hooks/use-projects";
import { useUiStore } from "@/lib/stores/ui-store";
import { ProjectForm } from "@/components/forms/project-form";
import { ProjectCard } from "@/components/projects/project-card";
import { notify } from "@/lib/notify";
import {
  Button,
  EmptyState,
  ErrorShow,
  Loading,
  Modal,
} from "@/components/ui";

const MODAL_KEY = "create-project";

export default function ProjetosScreen() {
  const { projects, isLoading, isError, error, refetch } = useProjects();
  const {
    createProject,
    isLoading: isCreating,
    error: createError,
    reset,
  } = useCreateProject();

  const openModals = useUiStore((state) => state.openModals);
  const openModal = useUiStore((state) => state.openModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const isOpen = Boolean(openModals[MODAL_KEY]);

  const handleOpen = () => {
    reset();
    openModal(MODAL_KEY);
  };

  const handleClose = () => {
    reset();
    closeModal(MODAL_KEY);
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-6 px-4 pb-8">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-semibold tracking-tight text-foreground">
            Projetos
          </Text>
          <Text className="text-sm text-muted-foreground">
            Organize seus sistemas e testes de seguranca.
          </Text>
        </View>
        <Button onPress={handleOpen}>Novo projeto</Button>
      </View>

      {isLoading ? (
        <Loading label="Carregando projetos..." />
      ) : isError ? (
        <ErrorShow error={error} onRetry={() => refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto para comecar a cadastrar sistemas."
          action={<Button onPress={handleOpen}>Criar projeto</Button>}
        />
      ) : (
        <View className="gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </View>
      )}

      <Modal
        open={isOpen}
        onClose={handleClose}
        title="Novo projeto"
        description="Preencha os dados do projeto."
      >
        <ProjectForm
          isLoading={isCreating}
          error={createError}
          submitLabel="Criar projeto"
          onCancel={handleClose}
          onSubmit={async (values) => {
            const ok = await notify.run(
              () => createProject(values as ProjectCreateInput),
              { success: "Projeto criado com sucesso." },
            );
            if (ok) handleClose();
          }}
        />
      </Modal>
    </ScrollView>
  );
}
