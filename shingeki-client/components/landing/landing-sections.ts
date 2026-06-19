export type NavTheme = "light" | "dark";

export type EnterDirection = "top" | "bottom" | "left" | "right";

export type SectionLayout =
  | "hero"
  | "split-left"
  | "split-right"
  | "centered"
  | "bento"
  | "timeline"
  | "cta";

export interface LandingFeature {
  title: string;
  description: string;
}

export interface LandingSection {
  id: string;
  label: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  features: LandingFeature[];
  background: string;
  layout: SectionLayout;
  navTheme: NavTheme;
  enterFrom: EnterDirection;
}

export const LANDING_SECTIONS: LandingSection[] = [
  {
    id: "inicio",
    label: "Início",
    eyebrow: "Shingeki",
    title: "A nova era da segurança web",
    subtitle:
      "Detecção automatizada de vulnerabilidades e remediação interativa — do scan ao patch, em uma única plataforma.",
    features: [
      {
        title: "Monorepo completo",
        description:
          "API Laravel, worker Go, cliente Next.js e app mobile Expo compartilhando os mesmos contratos.",
      },
      {
        title: "Pipeline assíncrono",
        description:
          "Disparos via RabbitMQ com processamento em background e resultados em tempo real.",
      },
      {
        title: "Feito para equipes",
        description:
          "Projetos, sistemas e stacks organizados para times de desenvolvimento e segurança.",
      },
    ],
    background:
      "radial-gradient(ellipse 90% 70% at 50% 15%, #1c1c1f 0%, #0a0a0a 65%)",
    layout: "hero",
    navTheme: "dark",
    enterFrom: "bottom",
  },
  {
    id: "dast",
    label: "DAST",
    eyebrow: "Dynamic testing",
    title: "Varredura dinâmica no alvo real",
    subtitle:
      "O worker Go descobre superfícies, executa payloads do catálogo de ataques e coleta evidências diretamente na aplicação em produção ou staging.",
    features: [
      {
        title: "Discovery automático",
        description:
          "Mapeamento de rotas, formulários e parâmetros antes de cada disparo.",
      },
      {
        title: "Catálogo de ataques",
        description:
          "SQL injection, XSS, path traversal e outras categorias com payloads validados.",
      },
      {
        title: "Evidências rastreáveis",
        description:
          "Request, response e metadados de cada achado persistidos para auditoria.",
      },
    ],
    background:
      "radial-gradient(ellipse 75% 65% at 12% 45%, #1a1a1d 0%, #0a0a0a 70%)",
    layout: "split-left",
    navTheme: "dark",
    enterFrom: "left",
  },
  {
    id: "sast",
    label: "SAST",
    eyebrow: "Static analysis",
    title: "Análise estática com Semgrep",
    subtitle:
      "Dispare scans SAST no repositório do sistema e receba achados com regra, arquivo e linha — sem depender de um ambiente exposto.",
    features: [
      {
        title: "Regras Semgrep",
        description:
          "Cada achado referencia o check_id para lookup preciso na remediação.",
      },
      {
        title: "Mesmo fluxo de resultados",
        description:
          "Dispatches, polling e visualização unificados com o DAST.",
      },
      {
        title: "Stacks por sistema",
        description:
          "Associe frameworks e linguagens para snippets de correção adequados.",
      },
    ],
    background:
      "radial-gradient(ellipse 80% 60% at 88% 35%, #18181b 0%, #09090b 68%)",
    layout: "split-right",
    navTheme: "dark",
    enterFrom: "right",
  },
  {
    id: "assinaturas",
    label: "Assinaturas",
    eyebrow: "Autorização",
    title: "Prova de propriedade do alvo",
    subtitle:
      "Antes de qualquer disparo, valide um token de assinatura em uma meta tag HTML do sistema — garantindo que só o dono autoriza os testes.",
    features: [
      {
        title: "Geração e revogação",
        description:
          "Tokens únicos por sistema com estados validados antes do dispatch.",
      },
      {
        title: "Validação no alvo",
        description:
          "A API confirma a presença da meta tag na URL configurada.",
      },
      {
        title: "Policy por projeto",
        description:
          "Acesso restrito ao usuário dono via policies Laravel.",
      },
    ],
    background:
      "radial-gradient(ellipse 85% 55% at 50% 80%, #1f1f22 0%, #0a0a0a 72%)",
    layout: "centered",
    navTheme: "dark",
    enterFrom: "top",
  },
  {
    id: "remediacao",
    label: "Remediação",
    eyebrow: "Correção guiada",
    title: "Do achado ao snippet de correção",
    subtitle:
      "Para cada vulnerabilidade encontrada, a plataforma sugere trechos de código adaptados à stack do sistema — DAST e SAST com lookup inteligente.",
    features: [
      {
        title: "Catálogo por stack",
        description:
          "Snippets filtrados por framework, linguagem e categoria de ataque.",
      },
      {
        title: "Fallback SAST",
        description:
          "Match por semgrep_rule_id ou categoria + extensão do arquivo.",
      },
      {
        title: "Painel interativo",
        description:
          "Visualize achados e remediações lado a lado no cliente web.",
      },
    ],
    background:
      "radial-gradient(ellipse 70% 60% at 25% 60%, #17171a 0%, #0a0a0a 75%)",
    layout: "split-left",
    navTheme: "dark",
    enterFrom: "right",
  },
  {
    id: "projetos",
    label: "Projetos",
    eyebrow: "Organização",
    title: "Projetos, sistemas e capas",
    subtitle:
      "Estruture seus alvos em projetos, configure URLs, stacks e capas visuais — com biblioteca de imagens reutilizável por usuário.",
    features: [
      {
        title: "CRUD aninhado",
        description:
          "Projetos contêm sistemas; cada sistema tem assinatura, ataques e resultados.",
      },
      {
        title: "Upload de capas",
        description:
          "Arquivo novo ou item da biblioteca, via BFF multipart.",
      },
      {
        title: "Mobile em paridade",
        description:
          "Mesmos fluxos no app Expo com token em secure store.",
      },
    ],
    background:
      "radial-gradient(ellipse 78% 62% at 72% 42%, #1c1c1f 0%, #0a0a0a 70%)",
    layout: "bento",
    navTheme: "dark",
    enterFrom: "left",
  },
  {
    id: "arquitetura",
    label: "Arquitetura",
    eyebrow: "Pipeline",
    title: "API, filas e worker distribuído",
    subtitle:
      "Laravel publica lotes em RabbitMQ; o worker Go consome, ataca o alvo e devolve achados. O comando consume-results fecha o ciclo na API.",
    features: [
      {
        title: "202 Accepted",
        description:
          "O dispatch retorna imediatamente; o scan roda em background.",
      },
      {
        title: "Polling inteligente",
        description:
          "React Query com staleTime zero enquanto o dispatch está pendente.",
      },
      {
        title: "Alvo de laboratório",
        description:
          "PHP vulnerável incluso para validar o pipeline end-to-end.",
      },
    ],
    background:
      "radial-gradient(ellipse 82% 58% at 48% 25%, #1a1a1d 0%, #09090b 74%)",
    layout: "timeline",
    navTheme: "dark",
    enterFrom: "bottom",
  },
  {
    id: "comecar",
    label: "Começar",
    eyebrow: "Pronto para usar",
    title: "Proteja suas aplicações hoje",
    subtitle:
      "Crie sua conta, registre um projeto, valide a assinatura no alvo e dispare seu primeiro scan em minutos.",
    features: [
      {
        title: "Conta gratuita",
        description:
          "Registre-se e comece a testar com o alvo de laboratório incluso.",
      },
      {
        title: "Documentação completa",
        description:
          "Arquitetura, API REST e guias de desenvolvimento web e mobile.",
      },
      {
        title: "Open source",
        description:
          "Monorepo MIT — audite, contribua e adapte à sua stack.",
      },
    ],
    background:
      "radial-gradient(ellipse 95% 75% at 50% 40%, #ffffff 0%, #f4f4f5 55%, #e4e4e7 100%)",
    layout: "cta",
    navTheme: "light",
    enterFrom: "top",
  },
];

export const FEATURE_ENTER_DIRECTIONS: EnterDirection[] = [
  "left",
  "right",
  "bottom",
  "top",
];
