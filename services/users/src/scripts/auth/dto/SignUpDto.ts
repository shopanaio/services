import type { AuthResultBase, AuthTokenData } from "./shared.js";

/**
 * Parameters for customer sign up
 */
export interface SignUpParams {
  email: string;
  password: string;
}

/**
 * Result of sign up
 */
export interface SignUpResult extends AuthResultBase {
  customerId?: string;
  token?: AuthTokenData;
}
