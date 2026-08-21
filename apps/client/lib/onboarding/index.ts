export const GUIDED_SETUP_SESSION_KEY = "shingeki_guided_setup_v1";
const DISMISSED_KEY_PREFIX = "shingeki_guided_setup_dismissed:";
export const GUIDED_SETUP_SESSION_EVENT = "shingeki-guided-setup-session";

export type GuidedSetupStep =
  | "project"
  | "system"
  | "target"
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
    description: "Informe URL alvo, stacks e repositorio quando aplicável.",
  },
  target: {
    title: "Conectar alvo",
    description: "Capture a sessão autenticada para o DAST ir mais fundo.",
    anchorId: "guided-target-session",
  },
  dast: {
    title: "Primeiro DAST",
    description: "Dispare o catálogo de ataques e acompanhe os resultados.",
    anchorId: "guided-attack-form",
  },
};

function dismissedStorageKey(userId: string) {
  return `${DISMISSED_KEY_PREFIX}${userId}`;
}

export function isGuidedSetupDismissed(userId?: string | null): boolean {
  if (!userId || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(dismissedStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markGuidedSetupDismissed(userId?: string | null) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(dismissedStorageKey(userId), "1");
  } catch {
    return;
  }
}

export function clearGuidedSetupDismissed(userId?: string | null) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(dismissedStorageKey(userId));
  } catch {
    return;
  }
}

function dispatchGuidedSetupSessionChange(session: GuidedSetupSession) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<GuidedSetupSession>(GUIDED_SETUP_SESSION_EVENT, {
      detail: session,
    }),
  );
}

function normalizeGuidedSetupStep(step: unknown): GuidedSetupStep {
  // Older sessions stored this step as "signature".
  if (step === "signature") {
    return "dast";
  }
  if (
    step === "project" ||
    step === "system" ||
    step === "target" ||
    step === "dast"
  ) {
    return step;
  }
  return DEFAULT_SESSION.step;
}

export function readGuidedSetupSession(): GuidedSetupSession {
  if (typeof window === "undefined") return DEFAULT_SESSION;

  try {
    const raw = window.sessionStorage.getItem(GUIDED_SETUP_SESSION_KEY);
    if (!raw) return DEFAULT_SESSION;
    const parsed = {
      ...DEFAULT_SESSION,
      ...JSON.parse(raw),
    } as GuidedSetupSession & {
      step: unknown;
    };
    return { ...parsed, step: normalizeGuidedSetupStep(parsed.step) };
  } catch {
    return DEFAULT_SESSION;
  }
}

export function writeGuidedSetupSession(
  patch: Partial<GuidedSetupSession>,
): GuidedSetupSession {
  const next = { ...readGuidedSetupSession(), ...patch };
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(GUIDED_SETUP_SESSION_KEY, JSON.stringify(next));
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

export function completeGuidedSetupSession(
  userId?: string | null,
): GuidedSetupSession {
  clearGuidedSectionHighlights();
  markGuidedSetupDismissed(userId);
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
  userId?: string | null,
): GuidedSetupSession {
  clearGuidedSetupDismissed(userId);
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
    (session.step === "target" || session.step === "dast") &&
    session.projectId &&
    session.systemId
  ) {
    return `/projetos/${session.projectId}/sistemas/${session.systemId}`;
  }

  return null;
}

export function shouldOfferGuidedSetup(
  meta?: {
    projects_count: number;
    systems_count: number;
  },
  userId?: string | null,
): boolean {
  if (!meta) return false;
  if (meta.projects_count > 0) return false;
  if (isGuidedSetupDismissed(userId)) return false;
  return true;
}
