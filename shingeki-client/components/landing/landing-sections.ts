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
        title: "Do scan à correção",
        description:
          "Dispare testes, acompanhe achados e aplique remediações no mesmo fluxo.",
      },
      {
        title: "Resultados em tempo real",
        description:
          "Acompanhe o progresso dos disparos e veja evidências assim que estiverem prontas.",
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
    eyebrow: "Teste dinâmico",
    title: "Varredura dinâmica no alvo real",
    subtitle:
      "Descubra superfícies, execute payloads do catálogo de ataques e colete evidências diretamente na aplicação em produção ou staging.",
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
    eyebrow: "Análise estática",
    title: "Análise estática no código-fonte",
    subtitle:
      "Dispare scans SAST no repositório do sistema e receba achados com regra, arquivo e linha — sem depender de um ambiente exposto.",
    features: [
      {
        title: "Regras por achado",
        description:
          "Cada vulnerabilidade referencia a regra correspondente para remediação precisa.",
      },
      {
        title: "Mesmo fluxo de resultados",
        description:
          "Disparos, acompanhamento e visualização unificados com o DAST.",
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
          "A plataforma confirma a presença da meta tag na URL configurada.",
      },
      {
        title: "Acesso por projeto",
        description:
          "Somente o dono do projeto gerencia sistemas, disparos e sessões.",
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
        title: "Sugestões contextuais",
        description:
          "Match por regra estática ou categoria do achado e extensão do arquivo.",
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
        title: "Hierarquia clara",
        description:
          "Projetos contêm sistemas; cada sistema tem assinatura, ataques e resultados.",
      },
      {
        title: "Upload de capas",
        description:
          "Envie um arquivo novo ou reutilize uma imagem da sua biblioteca.",
      },
      {
        title: "Fluxo unificado",
        description:
          "Os mesmos passos de configuração e disparo em qualquer dispositivo.",
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
    title: "Disparos assíncronos e resultados contínuos",
    subtitle:
      "Cada disparo roda em segundo plano: a plataforma ataca o alvo, coleta evidências e devolve os achados para o painel.",
    features: [
      {
        title: "Resposta imediata",
        description:
          "O disparo é aceito na hora; o scan continua enquanto você acompanha o status.",
      },
      {
        title: "Acompanhamento automático",
        description:
          "O painel atualiza sozinho enquanto o disparo estiver em andamento.",
      },
      {
        title: "Alvos cooperativos",
        description:
          "Conecte a sessão do alvo quando a rota exigir autenticação.",
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
          "Registre-se e comece a testar os seus sistemas autorizados.",
      },
      {
        title: "Guias no produto",
        description:
          "Onboarding e ajuda contextual para configurar projetos, sessões e disparos.",
      },
      {
        title: "Open source",
        description:
          "Código aberto — audite, contribua e adapte à sua stack.",
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
