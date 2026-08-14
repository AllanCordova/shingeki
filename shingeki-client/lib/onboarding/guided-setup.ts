const SESSION_KEY = "shingeki_guided_setup_v1";
export const GUIDED_SETUP_SESSION_EVENT = "shingeki-guided-setup-session";

export type GuidedSetupStep =
  | "project"
  | "system"
  | "target"
  | "signature"
  | "dast";

export interface GuidedSetupSession {
  active: boolean;
  completed: boolean;
  step: GuidedSetupStep;
  projectId?: string;
  systemId?: string;
}

const DEFAULT_SESSION: GuidedSetupSession = {
  active: false,
  completed: false,
  step: "project",
};

export const GUIDED_SETUP_STEP_ORDER: GuidedSetupStep[] = [
  "project",
  "system",
  "target",
  "signature",
  "dast",
];

const GUIDED_HIGHLIGHT_ATTR = "data-guided-setup-highlight";

export const GUIDED_SETUP_STEPS: Record<
  GuidedSetupStep,
  { title: string; description: string; anchorId?: string }
> = {
  project: {
    title: "Criar projeto",
    description: "Comece organizando seu ambiente de testes.",
  },
  system: {
    title: "Cadastrar sistema",
    description: "Informe URL alvo, stacks e repositorio quando aplicavel.",
  },
  target: {
    title: "Conectar alvo",
    description: "Capture a sessao autenticada para o DAST ir mais fundo.",
    anchorId: "guided-target-session",
  },
  signature: {
    title: "Validar assinatura",
    description: "Autorize legalmente o disparo de testes no alvo.",
    anchorId: "guided-signature-panel",
  },
  dast: {
    title: "Primeiro DAST",
    description: "Dispare o catalogo de ataques e acompanhe os resultados.",
    anchorId: "guided-attack-form",
  },
};

function dispatchGuidedSetupSessionChange(session: GuidedSetupSession) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<GuidedSetupSession>(GUIDED_SETUP_SESSION_EVENT, { detail: session }),
  );
}

/** Remove o estado do setup guiado (login, registro, logout). */
export function discardGuidedSetupSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
  dispatchGuidedSetupSessionChange(DEFAULT_SESSION);
}

export function readGuidedSetupSession(): GuidedSetupSession {
  if (typeof window === "undefined") return DEFAULT_SESSION;

  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return DEFAULT_SESSION;
    return { ...DEFAULT_SESSION, ...JSON.parse(raw) } as GuidedSetupSession;
  } catch {
    return DEFAULT_SESSION;
  }
}

export function writeGuidedSetupSession(
  patch: Partial<GuidedSetupSession>,
): GuidedSetupSession {
  const next = { ...readGuidedSetupSession(), ...patch };
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    dispatchGuidedSetupSessionChange(next);
  }
  return next;
}

export function startGuidedSetupSession(): GuidedSetupSession {
  return writeGuidedSetupSession({
    active: true,
    completed: false,
    step: "project",
    projectId: undefined,
    systemId: undefined,
  });
}

export function completeGuidedSetupSession(): GuidedSetupSession {
  clearGuidedSectionHighlights();
  return writeGuidedSetupSession({
    active: false,
    completed: true,
  });
}

export function guidedSetupStepIndex(step: GuidedSetupStep) {
  return GUIDED_SETUP_STEP_ORDER.indexOf(step);
}

export function getAdjacentGuidedSetupStep(
  step: GuidedSetupStep,
  direction: -1 | 1,
): GuidedSetupStep | null {
  const index = guidedSetupStepIndex(step);
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= GUIDED_SETUP_STEP_ORDER.length) return null;
  return GUIDED_SETUP_STEP_ORDER[nextIndex];
}

export function guidedSetupPathForStep(
  step: GuidedSetupStep,
  session: Pick<GuidedSetupSession, "projectId" | "systemId">,
): string {
  if (step === "project") return "/projetos";

  if (step === "system" && session.projectId) {
    return `/projetos/${session.projectId}`;
  }

  if (session.projectId && session.systemId) {
    return `/projetos/${session.projectId}/sistemas/${session.systemId}`;
  }

  return "/projetos";
}

export function clearGuidedSectionHighlights() {
  if (typeof document === "undefined") return;

  document.querySelectorAll(`[${GUIDED_HIGHLIGHT_ATTR}]`).forEach((element) => {
    element.removeAttribute(GUIDED_HIGHLIGHT_ATTR);
    element.classList.remove("guided-setup-highlight");
  });
}

export function focusGuidedSection(anchorId?: string) {
  clearGuidedSectionHighlights();
  if (!anchorId || typeof document === "undefined") return false;

  const element = document.getElementById(anchorId);
  if (!element) return false;

  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.setAttribute(GUIDED_HIGHLIGHT_ATTR, "true");
  element.classList.add("guided-setup-highlight");
  return true;
}

export function scrollToGuidedAnchor(anchorId?: string) {
  focusGuidedSection(anchorId);
}

export function resolveGuidedSetupResumeContext(
  meta: { projects_count: number; systems_count: number },
  items: Array<{
    type: "project" | "system";
    project_id: string;
    system_id: string | null;
    sort_order: number;
  }>,
): Pick<GuidedSetupSession, "step" | "projectId" | "systemId"> {
  if (meta.projects_count === 0) {
    return { step: "project" };
  }

  const firstProject = items
    .filter((item) => item.type === "project")
    .sort((left, right) => left.sort_order - right.sort_order)[0];

  if (meta.systems_count === 0) {
    return {
      step: "system",
      projectId: firstProject?.project_id,
    };
  }

  const firstSystem = items
    .filter(
      (item) =>
        item.type === "system" && item.project_id === firstProject?.project_id,
    )
    .sort((left, right) => left.sort_order - right.sort_order)[0];

  return {
    step: "target",
    projectId: firstProject?.project_id,
    systemId: firstSystem?.system_id ?? undefined,
  };
}

export function reopenGuidedSetupSession(
  meta: { projects_count: number; systems_count: number },
  items: Array<{
    type: "project" | "system";
    project_id: string;
    system_id: string | null;
    sort_order: number;
  }>,
): GuidedSetupSession {
  const context = resolveGuidedSetupResumeContext(meta, items);
  return writeGuidedSetupSession({
    active: true,
    completed: false,
    ...context,
  });
}

export function guidedSetupResumePath(session: GuidedSetupSession): string | null {
  if (session.step === "system" && session.projectId) {
    return `/projetos/${session.projectId}`;
  }

  if (
    (session.step === "target" ||
      session.step === "signature" ||
      session.step === "dast") &&
    session.projectId &&
    session.systemId
  ) {
    return `/projetos/${session.projectId}/sistemas/${session.systemId}`;
  }

  return null;
}

export function shouldOfferGuidedSetup(meta?: {
  projects_count: number;
  systems_count: number;
}): boolean {
  if (!meta) return false;
  return meta.projects_count === 0 && meta.systems_count === 0;
}
