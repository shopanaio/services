const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const EXPIRES_AT_KEY = "auth_expires_at";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getStoredTokens(): StoredTokens | null {
  if (!isClient()) return null;

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);

  if (!accessToken || !refreshToken || !expiresAt) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: parseInt(expiresAt, 10),
  };
}

export function getAccessToken(): string | null {
  if (!isClient()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isClient()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): void {
  if (!isClient()) return;

  const expiresAt = Date.now() + expiresIn * 1000;

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString());
}

export function clearStoredTokens(): void {
  if (!isClient()) return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
}

// Match the buffer in apollo-client.ts for consistency
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

export function isTokenExpired(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return true;

  // Consider expired 60 seconds before actual expiry to allow proactive refresh
  return Date.now() >= tokens.expiresAt - TOKEN_REFRESH_BUFFER_MS;
}
