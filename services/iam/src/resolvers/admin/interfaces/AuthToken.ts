/**
 * AuthToken - authentication token information returned to clients
 */
export interface AuthToken {
  /** Access token for API requests */
  accessToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** Refresh token for obtaining new access tokens */
  refreshToken: string | null;
}
