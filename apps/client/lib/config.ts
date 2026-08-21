export const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000/api";

export const AUTH_COOKIE = "shingeki_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const GOOGLE_REDIRECT_COOKIE = "shingeki_google_redirect";
export const GOOGLE_LOGIN_NONCE_COOKIE = "shingeki_google_login_nonce";
export const GOOGLE_REDIRECT_COOKIE_MAX_AGE = 60 * 10;
