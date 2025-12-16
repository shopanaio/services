import type { AuthResultBase, AuthTokenData } from "./shared.js";

/**
 * Parameters for customer sign in
 */
export interface SignInParams {
  email: string;
  password: string;
}

/**
 * Result of sign in
 */
export interface SignInResult extends AuthResultBase {
  customerId?: string;
  token?: AuthTokenData;
}
