/**
 * AuthorizeResult - result of an authorization check
 */
export interface AuthorizeResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** Reason for denial (if denied) */
  deniedReason: string | null;
}
