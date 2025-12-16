import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Base result interface for auth scripts
 */
export interface AuthResultBase {
  userErrors: UserError[];
}

/**
 * Auth token information
 */
export interface AuthTokenData {
  accessToken: string;
  expiresIn: number;
  refreshToken: string | null;
}
