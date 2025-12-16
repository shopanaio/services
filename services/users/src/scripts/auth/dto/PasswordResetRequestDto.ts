import type { AuthResultBase } from "./shared.js";

/**
 * Parameters for password reset request (sends email)
 */
export interface PasswordResetRequestParams {
  email: string;
}

/**
 * Result of password reset request
 * Always returns success=true for security (don't reveal if email exists)
 */
export interface PasswordResetRequestResult extends AuthResultBase {
  success: boolean;
}
