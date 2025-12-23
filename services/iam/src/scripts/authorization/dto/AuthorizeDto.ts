import type { UserError } from "../../../kernel/BaseScript.js";
import type { ScopePart } from "../../../casbin/CasbinService.js";

/**
 * Authorize - Check if user is authorized to perform action on resource
 *
 * Uses Casbin enforce() via CasbinService with domain scoping.
 * Casbin model: (sub, dom, obj, act) where dom = domain scope
 */
export interface AuthorizeParams {
  userId: string;
  organizationId: string;
  /** Domain scope (optional). Example: [["store", "abc-123"]]. Empty = org-wide. */
  domain?: ScopePart[];
  resource: string;
  action: string;
  resourceId?: string;
}

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
  implicitDeny?: boolean;
  userErrors: UserError[];
}

/**
 * BatchAuthorize - Check multiple authorizations in one call
 */
export interface BatchAuthorizeParams {
  userId: string;
  organizationId: string;
  /** Domain scope (optional). Example: [["store", "abc-123"]]. Empty = org-wide. */
  domain?: ScopePart[];
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
 * GetUserRole - Get user's role in an organization
 */
export interface GetUserRoleParams {
  userId: string;
  organizationId: string;
  /** Domain scope (optional). Example: [["store", "abc-123"]]. Empty = org-wide role. */
  domain?: ScopePart[];
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
