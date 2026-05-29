import { AxiosError } from "axios";

/**
 * Erro normalizado da aplicacao. Todo erro vindo da API (Laravel) ou da rede
 * e convertido para este formato, ja traduzido para portugues.
 */
export interface NormalizedError {
  /** Codigo HTTP (0 quando nao houve resposta — erro de rede). */
  status: number;
  /** Mensagem geral, pronta para exibir ao usuario. */
  message: string;
  /** Erros por campo (validacao 422), ja traduzidos. */
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

  /** Indica se ha erros de validacao por campo. */
  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

/** Mensagens conhecidas da API (ingles) traduzidas para portugues. */
const MESSAGE_TRANSLATIONS: Record<string, string> = {
  "Invalid credentials.": "Credenciais invalidas.",
  "Unauthenticated.": "Sessao expirada. Faca login novamente.",
  "This action is unauthorized.": "Voce nao tem permissao para esta acao.",
  "Signature token not found in system index.":
    "Token de assinatura nao encontrado no HTML do sistema.",
  "Signature not found.": "Assinatura nao encontrada.",
  "No signature token found for this system.":
    "Nenhum token de assinatura encontrado para este sistema.",
};

/** Traducao de mensagens de validacao do Laravel (heuristica por padrao). */
function translateFieldMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("has already been taken")) {
    return "Este valor ja esta em uso.";
  }
  if (lower.includes("current password") || lower.includes("password is incorrect")) {
    return "A senha atual esta incorreta.";
  }
  if (lower.includes("must be a valid url")) {
    return "URL invalida.";
  }
  if (lower.includes("must be a valid email")) {
    return "E-mail invalido.";
  }
  if (lower.includes("is required") || lower.includes("field is required")) {
    return "Campo obrigatorio.";
  }
  return message;
}

/** Mensagem padrao por status quando a API nao envia algo util. */
function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 0:
      return "Nao foi possivel conectar ao servidor. Verifique sua conexao.";
    case 400:
      return "Requisicao invalida.";
    case 401:
      return "Sessao expirada. Faca login novamente.";
    case 403:
      return "Voce nao tem permissao para esta acao.";
    case 404:
      return "Recurso nao encontrado.";
    case 422:
      return "Dados invalidos. Verifique os campos destacados.";
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
 * Converte qualquer erro (Axios, ApiError ja normalizado, ou desconhecido)
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
      message = body.message
        ? translateFieldMessage(body.message)
        : defaultMessageForStatus(422);
      // Para 422 preferimos uma mensagem generica de validacao.
      message = defaultMessageForStatus(422);
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
