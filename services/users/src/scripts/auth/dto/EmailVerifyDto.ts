import type { AuthResultBase } from "./shared.js";

/**
 * Parameters for email verification request (sends email)
 */
export interface EmailVerifyRequestParams {
  email?: string;
  customerId: string;
}

/**
 * Result of email verification request
 */
export interface EmailVerifyRequestResult extends AuthResultBase {
  success: boolean;
}

/**
 * Parameters for email verification (using code from email)
 */
export interface EmailVerifyParams {
  email: string;
  code: string;
}

/**
 * Result of email verification
 */
export interface EmailVerifyResult extends AuthResultBase {
  success: boolean;
  customerId?: string;
}
