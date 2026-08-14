export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  project: {
    name: string;
    description: string;
  };
  system: {
    name: string;
    target_url: string;
    login_url?: string;
    repository_url: string;
    stackSlugs: string[];
  };
  suggestedScan: "dast" | "sast";
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "api-rest",
    name: "API REST",
    description: "Backend HTTP com rotas expostas para testes DAST.",
    project: {
      name: "Minha API REST",
      description: "Projeto focado em endpoints HTTP e autenticacao.",
    },
    system: {
      name: "API principal",
      target_url: "https://api.exemplo.com",
      repository_url: "https://github.com/org/api-rest",
      stackSlugs: ["express", "laravel"],
    },
    suggestedScan: "dast",
  },
  {
    id: "spa-backend",
    name: "SPA + backend",
    description: "Frontend React/Next.js com API separada.",
    project: {
      name: "Produto web",
      description: "Aplicacao com frontend e backend integrados.",
    },
    system: {
      name: "App web",
      target_url: "https://app.exemplo.com",
      login_url: "https://app.exemplo.com/login",
      repository_url: "https://github.com/org/spa-backend",
      stackSlugs: ["react", "nextjs", "express"],
    },
    suggestedScan: "dast",
  },
  {
    id: "php-monolith",
    name: "Monolito PHP",
    description: "Aplicacao PHP tradicional com foco em SAST e DAST.",
    project: {
      name: "Monolito PHP",
      description: "Sistema legado ou monolito em PHP.",
    },
    system: {
      name: "Aplicacao PHP",
      target_url: "https://php.exemplo.com",
      repository_url: "https://github.com/org/monolito-php",
      stackSlugs: ["vanilla_php", "laravel"],
    },
    suggestedScan: "sast",
  },
];

export function getProjectTemplate(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((template) => template.id === id);
}
