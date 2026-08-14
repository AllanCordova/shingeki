"use client";

import { useRouter } from "next/navigation";
import { PROJECT_TEMPLATES, type ProjectTemplate } from "@/lib/projects/project-templates";
import { useCreateProject } from "@/lib/hooks/projects/use-projects";
import { useStacks } from "@/lib/hooks/stacks/use-stacks";
import { apiClient } from "@/lib/api/client";
import { buildSystemCreateFormData } from "@/lib/forms/multipart";
import { notify } from "@/lib/ui/notify";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Modal } from "@/components/ui";

export function ProjectTemplatePicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { stacks } = useStacks();
  const { createProject, isLoading } = useCreateProject();

  const handleSelect = async (template: ProjectTemplate) => {
    const project = await notify.run(
      () =>
        createProject({
          name: template.project.name,
          description: template.project.description,
        }),
      { success: "Projeto criado." },
    );

    if (!project) return;

    const stackIds = stacks
      .filter((stack) => template.system.stackSlugs.includes(stack.slug))
      .map((stack) => stack.id);

    const ok = await notify.run(
      async () => {
        await apiClient.post(
          `/projects/${project.id}/systems`,
          buildSystemCreateFormData({
            name: template.system.name,
            target_url: template.system.target_url,
            repository_url: template.system.repository_url ?? "",
            stack_ids: stackIds,
          }),
        );
        await queryClient.invalidateQueries({
          queryKey: queryKeys.systems(project.id),
        });
      },
      { success: "Sistema do template criado." },
    );

    if (!ok) return;

    router.push(`/projetos/${project.id}`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Criar com template"
      description="Escolha um modelo para preencher projeto e primeiro sistema."
      size="lg"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {PROJECT_TEMPLATES.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                isLoading={isLoading}
                onClick={() => void handleSelect(template)}
              >
                Usar template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </Modal>
  );
}
