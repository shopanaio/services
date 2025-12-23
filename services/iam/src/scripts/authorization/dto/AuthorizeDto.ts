import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Authorize - Check if user is authorized to perform action on resource
 *
 * Uses Casbin enforce() via CasbinService with domain (project) scoping.
 * New model: (sub, dom, obj, act) where dom = project scope
 */
export interface AuthorizeParams {
  userId: string;
  organizationId: string; // Organization ID (from JWT)
  /** Project ID for domain scoping (optional, "*" for all projects) */
  projectId?: string;
  resource: string; // "product", "order", etc.
  action: string; // "read", "write", "create", "delete"
  resourceId?: string; // optional: specific resource ID

  // Legacy support (deprecated - use organizationId)
  tenantId?: string;
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
 * Uses Casbin batchEnforce() via CasbinService
 */
export interface BatchAuthorizeParams {
  userId: string;
  organizationId: string;
  /** Project ID for domain scoping (optional, "*" for all projects) */
  projectId?: string;
  requests: Array<{
    resource: string;
    action: string;
    resourceId?: string;
  }>;

  // Legacy support (deprecated - use organizationId)
  tenantId?: string;
}

export interface BatchAuthorizeResult {
  results: Array<{
    allowed: boolean;
    deniedReason?: string;
  }>;
  userErrors: UserError[];
}

/**
 * GetUserRole - Get user's role in an organization/project
 *
 * Uses Casbin getRolesForUser() via CasbinService
 */
export interface GetUserRoleParams {
  userId: string;
  organizationId: string;
  /** Project ID for domain scoping (optional, "*" for org-wide role) */
  projectId?: string;

  // Legacy support (deprecated - use organizationId)
  tenantId?: string;
}

export interface GetUserRoleResult {
  role: string | null;
  /** All roles across all domains in organization */
  roles?: Array<{ role: string; domain: string }>;
  permissions: string[];
  grantedAt?: Date;
  grantedBy?: string;
  userErrors: UserError[];
}
