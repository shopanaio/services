import type { AuthResultBase } from "./shared.js";

/**
 * Parameters for customer sign out
 */
export interface SignOutParams {
  allSessions?: boolean;
}

/**
 * Result of sign out
 */
export interface SignOutResult extends AuthResultBase {
  success: boolean;
}
