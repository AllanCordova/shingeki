"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ProjectForm } from "@/components/forms/project-form";
import { SystemForm } from "@/components/forms/system-form";
import { useCreateProject, useProject } from "@/lib/hooks/projects/use-projects";
import { useCreateSystem, useSystem } from "@/lib/hooks/systems/use-systems";
import { useSidebarNavigation } from "@/lib/hooks/settings/use-sidebar-navigation";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
  SystemCreateInput,
  SystemUpdateInput,
} from "@/lib/contracts";
import {
  GUIDED_SETUP_SESSION_EVENT,
  GUIDED_SETUP_STEP_ORDER,
  GUIDED_SETUP_STEPS,
  clearGuidedSectionHighlights,
  completeGuidedSetupSession,
  focusGuidedSection,
  getAdjacentGuidedSetupStep,
  guidedSetupPathForStep,
  guidedSetupStepIndex,
  readGuidedSetupSession,
  shouldOfferGuidedSetup,
  startGuidedSetupSession,
  writeGuidedSetupSession,
  type GuidedSetupStep,
} from "@/lib/onboarding/guided-setup";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";
import { Button, Card, CardContent } from "@/components/ui";

const FORM_STEPS = new Set<GuidedSetupStep>(["project", "system"]);
const PAGE_STEPS = new Set<GuidedSetupStep>(["target", "signature", "dast"]);

function StepProgress({
  currentStep,
  onStepSelect,
}: {
  currentStep: GuidedSetupStep;
  onStepSelect: (step: GuidedSetupStep) => void;
}) {
  const currentIndex = guidedSetupStepIndex(currentStep);

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {GUIDED_SETUP_STEP_ORDER.map((step, index) => {
        const isActive = index === currentIndex;
        const isDone = index < currentIndex;
        const canSelect = index <= currentIndex;

        return (
          <li key={step} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canSelect}
              onClick={() => canSelect && onStepSelect(step)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full transition-colors",
                canSelect ? "cursor-pointer hover:opacity-90" : "cursor-default",
                !canSelect && "opacity-70",
              )}
              aria-label={`${GUIDED_SETUP_STEPS[step].title}${isActive ? " (atual)" : ""}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={cn(
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isDone && "bg-primary/15 text-primary",
                  !isActive && !isDone && "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm sm:inline",
                  isActive ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {GUIDED_SETUP_STEPS[step].title}
              </span>
            </button>
            {index < GUIDED_SETUP_STEP_ORDER.length - 1 ? (
              <span className="hidden h-px w-6 bg-border sm:block" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function GuidedSetupHeader({
  step,
  currentStepNumber,
  canGoBack,
  onBack,
  onDismiss,
  onStepSelect,
  currentStep,
}: {
  step: (typeof GUIDED_SETUP_STEPS)[GuidedSetupStep];
  currentStepNumber: number;
  canGoBack: boolean;
  onBack: () => void;
  onDismiss: () => void;
  onStepSelect: (step: GuidedSetupStep) => void;
  currentStep: GuidedSetupStep;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border px-4 py-5 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Configuracao inicial
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {step.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Passo {currentStepNumber} de {GUIDED_SETUP_STEP_ORDER.length} — {step.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canGoBack ? (
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              Voltar
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
            Fechar
          </Button>
        </div>
      </div>
      <StepProgress currentStep={currentStep} onStepSelect={onStepSelect} />
    </div>
  );
}

function GuidedSetupFooter({
  canGoBack,
  onBack,
  onPrimary,
  primaryLabel,
  secondaryLabel,
  onSecondary,
}: {
  canGoBack: boolean;
  onBack: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <Button type="button" variant="outline" onClick={onBack} disabled={!canGoBack}>
        Voltar
      </Button>
      <div className="flex flex-col gap-2 sm:flex-row">
        {secondaryLabel && onSecondary ? (
          <Button type="button" variant="outline" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        ) : null}
        <Button type="button" onClick={onPrimary}>
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}

export function GuidedSetupFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const { meta, isLoading } = useSidebarNavigation();
  const [session, setSession] = useState(readGuidedSetupSession());
  const { createProject, isLoading: creatingProject, error: projectError, reset: resetProject } =
    useCreateProject();
  const projectIdForSystem = session.projectId ?? "";
  const { createSystem, isLoading: creatingSystem, error: systemError } =
    useCreateSystem(projectIdForSystem);
  const { project } = useProject(session.projectId ?? "");
  const { system } = useSystem(session.projectId ?? "", session.systemId ?? "");

  const isFormStep = FORM_STEPS.has(session.step);
  const isPageStep = PAGE_STEPS.has(session.step);
  const canGoBack = guidedSetupStepIndex(session.step) > 0;

  const navigateToStep = useCallback(
    (nextStep: GuidedSetupStep, patch?: Partial<typeof session>) => {
      const next = writeGuidedSetupSession({ step: nextStep, ...patch });
      setSession(next);

      const targetPath = guidedSetupPathForStep(nextStep, next);
      if (pathname !== targetPath) {
        router.push(targetPath);
        return;
      }

      if (PAGE_STEPS.has(nextStep)) {
        window.setTimeout(() => {
          focusGuidedSection(GUIDED_SETUP_STEPS[nextStep].anchorId);
        }, 200);
      }
    },
    [pathname, router],
  );

  useEffect(() => {
    if (isLoading || !meta || session.completed) return;

    if (shouldOfferGuidedSetup(meta) && !session.active && !session.completed) {
      setSession(startGuidedSetupSession());
    }
  }, [isLoading, meta, session.active, session.completed]);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) {
        setSession(detail);
        return;
      }
      setSession(readGuidedSetupSession());
    };

    window.addEventListener(GUIDED_SETUP_SESSION_EVENT, sync);
    return () => window.removeEventListener(GUIDED_SETUP_SESSION_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!session.active || session.completed) return;

    const projectMatch = pathname.match(/^\/projetos\/([^/]+)/);
    const systemMatch = pathname.match(/^\/projetos\/([^/]+)\/sistemas\/([^/]+)/);

    if (systemMatch) {
      const [, projectId, systemId] = systemMatch;
      if (session.projectId !== projectId || session.systemId !== systemId) {
        setSession(writeGuidedSetupSession({ projectId, systemId }));
      }
      return;
    }

    if (projectMatch) {
      const [, projectId] = projectMatch;
      if (session.projectId !== projectId) {
        setSession(writeGuidedSetupSession({ projectId }));
      }
    }
  }, [pathname, session.active, session.completed, session.projectId, session.systemId]);

  useEffect(() => {
    if (!session.active || session.completed || !isPageStep) return;

    const anchorId = GUIDED_SETUP_STEPS[session.step].anchorId;
    let attempts = 0;
    let retryTimer: number | undefined;

    const tryFocus = () => {
      if (focusGuidedSection(anchorId)) return;
      if (attempts < 12) {
        attempts += 1;
        retryTimer = window.setTimeout(tryFocus, 200);
      }
    };

    const initialTimer = window.setTimeout(tryFocus, 350);

    return () => {
      window.clearTimeout(initialTimer);
      if (retryTimer) window.clearTimeout(retryTimer);
      clearGuidedSectionHighlights();
    };
  }, [session.active, session.completed, session.step, pathname, isPageStep]);

  useEffect(() => {
    if (!session.active || session.completed || !isFormStep) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [session.active, session.completed, isFormStep]);

  if (isLoading || session.completed) return null;
  if (!session.active && !shouldOfferGuidedSetup(meta)) return null;

  const step = GUIDED_SETUP_STEPS[session.step];
  const currentStepNumber = guidedSetupStepIndex(session.step) + 1;

  const handleBack = () => {
    const previousStep = getAdjacentGuidedSetupStep(session.step, -1);
    if (!previousStep) return;
    navigateToStep(previousStep);
  };

  const handleNext = () => {
    if (session.step === "project" && !session.projectId) return;
    if (session.step === "system" && !session.systemId) return;

    if (session.step === "dast") {
      clearGuidedSectionHighlights();
      setSession(completeGuidedSetupSession());
      return;
    }

    const nextStep = getAdjacentGuidedSetupStep(session.step, 1);
    if (!nextStep) return;
    navigateToStep(nextStep);
  };

  const handleDismiss = () => {
    clearGuidedSectionHighlights();
    setSession(completeGuidedSetupSession());
  };

  const handleHighlightSection = () => {
    focusGuidedSection(step.anchorId);
  };

  const handleProjectCreated = async (values: ProjectCreateInput | ProjectUpdateInput) => {
    const name = values.name?.trim();
    const description = values.description?.trim();
    if (!name || !description) return;

    resetProject();
    const createdProject = await notify.run(
      () =>
        createProject({
          name,
          description,
          cover: values.cover,
          cover_upload_id: values.cover_upload_id,
        }),
      {
        success: "Projeto criado. Proximo passo: cadastrar sistema.",
      },
    );
    if (!createdProject) return;

    navigateToStep("system", { projectId: createdProject.id });
  };

  const handleSystemCreated = async (values: SystemCreateInput | SystemUpdateInput) => {
    if (!session.projectId) return;

    const name = values.name?.trim();
    const targetUrl = values.target_url?.trim();
    const repositoryUrl = values.repository_url?.trim();
    const stackIds = values.stack_ids;
    if (!name || !targetUrl || !repositoryUrl || !stackIds?.length) return;

    const createdSystem = await notify.run(
      () =>
        createSystem({
          name,
          target_url: targetUrl,
          repository_url: repositoryUrl,
          stack_ids: stackIds,
          cover: values.cover,
          cover_upload_id: values.cover_upload_id,
        }),
      {
        success: "Sistema criado. Vamos conectar o alvo.",
      },
    );
    if (!createdSystem) return;

    navigateToStep("target", { systemId: createdSystem.id });
  };

  const headerProps = {
    step,
    currentStepNumber,
    canGoBack,
    onBack: handleBack,
    onDismiss: handleDismiss,
    onStepSelect: navigateToStep,
    currentStep: session.step,
  };

  const pageStepContent = (
    <GuidedSetupFooter
      canGoBack={canGoBack}
      onBack={handleBack}
      onSecondary={handleHighlightSection}
      secondaryLabel="Destacar secao"
      onPrimary={handleNext}
      primaryLabel={session.step === "dast" ? "Concluir guia" : "Proximo passo"}
    />
  );

  if (isFormStep) {
    const projectAlreadyCreated = session.step === "project" && Boolean(session.projectId && project);
    const systemAlreadyCreated = session.step === "system" && Boolean(session.systemId && system);

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-background"
        role="dialog"
        aria-modal="true"
        aria-label="Configuracao inicial"
      >
        <GuidedSetupHeader {...headerProps} />

        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
          <div className="mx-auto w-full max-w-3xl">
            {session.step === "project" && projectAlreadyCreated ? (
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <p className="text-sm text-muted-foreground">
                    O projeto <strong className="text-foreground">{project?.name}</strong> ja foi
                    criado. Voce pode voltar para revisar ou seguir para o proximo passo.
                  </p>
                  <Button type="button" onClick={() => navigateToStep("system")}>
                    Continuar para cadastrar sistema
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {session.step === "project" && !projectAlreadyCreated ? (
              <ProjectForm
                isLoading={creatingProject}
                error={projectError}
                submitLabel="Criar e continuar"
                onSubmit={handleProjectCreated}
              />
            ) : null}

            {session.step === "system" && systemAlreadyCreated ? (
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <p className="text-sm text-muted-foreground">
                    O sistema <strong className="text-foreground">{system?.name}</strong> ja foi
                    cadastrado. Siga para conectar o alvo.
                  </p>
                  <Button type="button" onClick={() => navigateToStep("target")}>
                    Continuar para conectar alvo
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {session.step === "system" && session.projectId && !systemAlreadyCreated ? (
              <SystemForm
                isLoading={creatingSystem}
                error={systemError}
                submitLabel="Criar e continuar"
                onSubmit={handleSystemCreated}
              />
            ) : null}
          </div>
        </main>

        <GuidedSetupFooter
          canGoBack={canGoBack}
          onBack={handleBack}
          onPrimary={handleNext}
          primaryLabel="Proximo passo"
        />
      </div>
    );
  }

  if (isPageStep) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 shadow-2xl backdrop-blur"
        role="dialog"
        aria-label="Configuracao inicial"
      >
        <div className="mx-auto w-full max-w-5xl">
          <GuidedSetupHeader {...headerProps} />
          <div className="px-4 pb-6 pt-2 sm:px-8">
            <p className="mb-4 text-sm text-muted-foreground sm:text-base">
              A secao correspondente foi destacada na pagina. Conclua a acao e avance quando
              estiver pronto.
            </p>
            {pageStepContent}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
