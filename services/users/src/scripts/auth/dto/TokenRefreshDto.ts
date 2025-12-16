import type { AuthResultBase, AuthTokenData } from "./shared.js";

/**
 * Parameters for token refresh
 */
export interface TokenRefreshParams {
  refreshToken: string;
}

/**
 * Result of token refresh
 */
export interface TokenRefreshResult extends AuthResultBase {
  token?: AuthTokenData;
}
