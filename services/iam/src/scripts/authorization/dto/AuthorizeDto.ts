import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Authorize - Check if user is authorized to perform action on resource
 *
 * Calls Casdoor enforce() API
 */
export interface AuthorizeParams {
  userId: string;
  projectId: string; // domain in RBAC
  resource: string; // "product", "order", etc.
  action: string; // "read", "write", etc.
  resourceId?: string; // optional: specific resource ID (ARN)
}

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
  implicitDeny?: boolean; // true if no matching policy found
  userErrors: UserError[];
}

/**
 * BatchAuthorize - Check multiple authorizations in one call
 *
 * Calls Casdoor batchEnforce() API
 */
export interface BatchAuthorizeParams {
  userId: string;
  projectId: string;
  requests: Array<{
    resource: string;
    action: string;
    resourceId?: string;
  }>;
}

export interface BatchAuthorizeResult {
  results: Array<{
    allowed: boolean;
    deniedReason?: string;
  }>;
  userErrors: UserError[];
}

/**
 * GetUserRole - Get user's role in a project
 *
 * Calls Casdoor getRolesForUser() API
 */
export interface GetUserRoleParams {
  userId: string;
  projectId: string;
}

export interface GetUserRoleResult {
  role: string | null;
  permissions: string[];
  grantedAt?: Date;
  grantedBy?: string;
  userErrors: UserError[];
}
