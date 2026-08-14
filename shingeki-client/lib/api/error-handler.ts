import { AxiosError } from "axios";

/**
 * Erro normalizado da aplicação. Todo erro vindo da API (Laravel) ou da rede
 * é convertido para este formato, já traduzido para português.
 */
export interface NormalizedError {
  /** Código HTTP (0 quando não houve resposta — erro de rede). */
  status: number;
  /** Mensagem geral, pronta para exibir ao usuário. */
  message: string;
  /** Erros por campo (validação 422), já traduzidos. */
  fieldErrors: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor({ status, message, fieldErrors }: NormalizedError) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** Indica se há erros de validação por campo. */
  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

/** Mensagens conhecidas da API (inglês) traduzidas para português. */
const MESSAGE_TRANSLATIONS: Record<string, string> = {
  "Invalid credentials.": "Credenciais inválidas.",
  "Unauthenticated.": "Sessão expirada. Faça login novamente.",
  "This action is unauthorized.": "Você não tem permissão para esta ação.",
  "You must accept responsibility for authorized testing.":
    "Você deve aceitar a responsabilidade pelos testes autorizados.",
  "You must accept the attack authorization terms.":
    "Você deve aceitar os termos de autorização de ataque.",
  "Acknowledgment terms version is outdated. Refresh and try again.":
    "A versão dos termos de aceite está desatualizada. Atualize a página e tente novamente.",
  "No AI provider is configured.":
    "IA indisponível no momento. Tente mais tarde ou contate o suporte.",
  "No AI provider is configured. Set GEMINI_API_KEY or GROQ_API_KEY.":
    "IA indisponível no momento. Tente mais tarde ou contate o suporte.",
  "AI remediation suggestions generated.":
    "Sugestões de IA geradas com sucesso.",
  "Target session imported successfully.":
    "Sessão do alvo importada com sucesso.",
  "Target session removed successfully.":
    "Sessão do alvo removida com sucesso.",
  "No target session found for this system.":
    "Nenhuma sessão do alvo encontrada para este sistema.",
  "Target session captured successfully.":
    "Sessão do alvo conectada com sucesso.",
  "Target session capture started.": "Captura de sessão iniciada.",
  "User role updated successfully.": "Permissão atualizada com sucesso.",
  "You cannot change your own role.":
    "Você não pode alterar a sua própria permissão.",
  "At least one administrator must remain on the platform.":
    "É preciso manter pelo menos um administrador na plataforma.",
  "Platform API tokens cannot be used as target session credentials.":
    "Não use a sessão da plataforma Shingeki como autenticação do alvo.",
  "Use a extensão Shingeki ou a importação manual para conectar a sessão do alvo.":
    "Use a extensão Shingeki ou a importação manual para conectar a sessão do alvo.",
};

/** Tradução de mensagens de validação do Laravel (heurística por padrão). */
function translateFieldMessage(message: string): string {
  if (MESSAGE_TRANSLATIONS[message]) {
    return MESSAGE_TRANSLATIONS[message];
  }
  const lower = message.toLowerCase();
  if (lower.includes("has already been taken")) {
    return "Este valor já está em uso.";
  }
  if (
    lower.includes("current password") ||
    lower.includes("password is incorrect")
  ) {
    return "A senha atual está incorreta.";
  }
  if (lower.includes("must be a valid url")) {
    return "URL inválida.";
  }
  if (lower.includes("must be a valid email")) {
    return "E-mail inválido.";
  }
  if (lower.includes("is required") || lower.includes("field is required")) {
    return "Campo obrigatório.";
  }
  return message;
}

/** Mensagem padrão por status quando a API não envia algo útil. */
function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 0:
      return "Não foi possível conectar ao servidor. Verifique sua conexão.";
    case 400:
      return "Requisição inválida.";
    case 401:
      return "Sessão expirada. Faça login novamente.";
    case 403:
      return "Você não tem permissão para esta ação.";
    case 404:
      return "Recurso não encontrado.";
    case 410:
      return "Esta ação não está mais disponível. Use a extensão ou a importação manual.";
    case 422:
      return "Dados inválidos. Verifique os campos destacados.";
    case 429:
      return "Muitas tentativas. Aguarde alguns instantes.";
    case 500:
    case 502:
    case 503:
      return "Erro interno do servidor. Tente novamente mais tarde.";
    default:
      return "Ocorreu um erro inesperado.";
  }
}

interface LaravelErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Converte qualquer erro (Axios, ApiError já normalizado, ou desconhecido)
 * em um {@link NormalizedError}.
 */
export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    const body = (error.response?.data ?? {}) as LaravelErrorBody;

    const fieldErrors: Record<string, string> = {};
    if (body.errors) {
      for (const [field, messages] of Object.entries(body.errors)) {
        const first = Array.isArray(messages) ? messages[0] : String(messages);
        if (first) fieldErrors[field] = translateFieldMessage(first);
      }
    }

    let message: string;
    if (status === 422) {
      const firstFieldError = Object.values(fieldErrors)[0];
      message = firstFieldError ?? defaultMessageForStatus(422);
    } else if (body.message && MESSAGE_TRANSLATIONS[body.message]) {
      message = MESSAGE_TRANSLATIONS[body.message];
    } else if (body.message && status !== 500) {
      message = body.message;
    } else {
      message = defaultMessageForStatus(status);
    }

    return { status, message, fieldErrors };
  }

  if (error instanceof Error) {
    return { status: 0, message: error.message, fieldErrors: {} };
  }

  return {
    status: 0,
    message: defaultMessageForStatus(0),
    fieldErrors: {},
  };
}

/** Converte um erro qualquer em {@link ApiError}. */
export function toApiError(error: unknown): ApiError {
  return new ApiError(normalizeError(error));
}
