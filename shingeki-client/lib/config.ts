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

/** Cookie curto para destino pos-login Google (BFF, nao a API). */
export const GOOGLE_REDIRECT_COOKIE = "shingeki_google_redirect";

/** Nonce http-only do browser para amarrar o handoff Google (anti login CSRF). */
export const GOOGLE_LOGIN_NONCE_COOKIE = "shingeki_google_login_nonce";

export const GOOGLE_REDIRECT_COOKIE_MAX_AGE = 60 * 10; // 10 minutos
