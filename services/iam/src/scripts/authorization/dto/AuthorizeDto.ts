import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Authorize - Check if user is authorized to perform action on resource
 *
 * Calls Casdoor enforce() API
 */
export interface AuthorizeParams {
  userId: string;
  tenantId: string; // Casdoor organization name (from integrations)
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
  tenantId: string; // Casdoor organization name (from integrations)
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
 * GetUserRole - Get user's role in a tenant
 *
 * Calls Casdoor getRolesForUser() API
 */
export interface GetUserRoleParams {
  userId: string;
  tenantId: string; // Casdoor organization name (from integrations)
}

export interface GetUserRoleResult {
  role: string | null;
  permissions: string[];
  grantedAt?: Date;
  grantedBy?: string;
  userErrors: UserError[];
}
