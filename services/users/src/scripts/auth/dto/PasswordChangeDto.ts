import type { AuthResultBase } from "./shared.js";

/**
 * Parameters for password change (authenticated customer)
 */
export interface PasswordChangeParams {
  customerId: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * Result of password change
 */
export interface PasswordChangeResult extends AuthResultBase {
  success: boolean;
}
