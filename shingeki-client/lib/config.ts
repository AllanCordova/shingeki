/**
 * Configuracao central do cliente.
 *
 * - API_BASE_URL: URL da API Laravel (usada apenas no servidor, nos route
 *   handlers / BFF). Nunca exposta ao browser.
 * - O browser sempre fala com as rotas internas do Next em /api (mesmo origin),
 *   que anexam o token guardado no cookie http-only.
 */
export const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000/api";

/** Nome do cookie http-only que guarda o token Sanctum. */
export const AUTH_COOKIE = "shingeki_token";

/** Duracao do cookie de sessao (em segundos). */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias
