import type { AuthResultBase } from "./shared.js";

/**
 * Parameters for password reset (using code from email)
 */
export interface PasswordResetParams {
  email: string;
  code: string;
  newPassword: string;
}

/**
 * Result of password reset
 */
export interface PasswordResetResult extends AuthResultBase {
  success: boolean;
}
