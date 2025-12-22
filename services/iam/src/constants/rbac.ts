/**
 * RBAC Constants for IAM Authorization
 *
 * Defines the Casbin model and predefined roles.
 *
 * TENANT ISOLATION:
 * Each tenant (project) has isolated Casbin policies via:
 * - Filtered policies by tenantId (v4 field in casbin_rule)
 * - Own Roles (owner, admin, etc. - simple names)
 * - Own Permissions stored in PostgreSQL
 */

/**
 * Casbin Model for RBAC (per-tenant)
 *
 * Simplified model without domains - isolation is achieved through
 * filtered policies per tenant (v4 = tenantId).
 *
 * - sub: subject (user ID)
 * - obj: object (resource: product, order, etc.)
 * - act: action (read, write, delete, etc.)
 * - eft: effect (allow or deny)
 *
 * Features:
 * - keyMatch for wildcard resource matching (e.g., "*" matches all, "product/*" matches "product/123")
 * - Role hierarchy support via g = _, _ (up to 10 levels)
 * - Deny rules override allow rules
 */
export const CASBIN_MODEL_TEXT = `
[request_definition]
r = sub, obj, act, dom

[policy_definition]
p = sub, obj, act, eft

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.dom) && keyMatch(r.obj, p.obj) && keyMatch(r.act, p.act)
`.trim();

/**
 * Model name (used for identification)
 */
export const CASBIN_MODEL_NAME = "model-rbac";

/**
 * Enforcer name (used for identification)
 */
export const CASBIN_ENFORCER_NAME = "enforcer-main";

// ============================================================================
// Tenant Organization Helpers
// ============================================================================

/**
 * Get tenant organization name from project ID
 */
export const getTenantOrg = (projectId: string): string => `org-${projectId}`;

/**
 * Get full model ID for a tenant
 */
export const getModelId = (tenantOrg: string): string =>
  `${tenantOrg}/${CASBIN_MODEL_NAME}`;

/**
 * Get full enforcer ID for a tenant
 */
export const getEnforcerId = (tenantOrg: string): string =>
  `${tenantOrg}/${CASBIN_ENFORCER_NAME}`;

/**
 * Permission name prefix for project permissions
 */
export const PERMISSION_PREFIX = "perm";

/**
 * Predefined role names
 */
export const PREDEFINED_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  SUPPORT: "support",
  VIEWER: "viewer",
} as const;

export type PredefinedRoleName =
  (typeof PREDEFINED_ROLES)[keyof typeof PREDEFINED_ROLES];

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<PredefinedRoleName, string> = {
  owner: "Owner",
  admin: "Administrator",
  manager: "Manager",
  support: "Customer Support",
  viewer: "Viewer",
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<PredefinedRoleName, string> = {
  owner: "Full access to all resources",
  admin: "Full access except project deletion and billing",
  manager: "Manage products, orders, and content",
  support: "Handle orders and customer inquiries",
  viewer: "Read-only access",
};

/**
 * Role permission definitions
 *
 * Format: { resource: actions[] }
 * Special values:
 *   - resource "*" means all resources
 *   - action "*" means all actions
 */
export interface RolePermissionDef {
  allow: Array<{
    resource: string;
    actions: string[];
  }>;
  deny?: Array<{
    resource: string;
    actions: string[];
  }>;
}

/**
 * Role permissions with hierarchy support
 *
 * Hierarchy: owner > admin > manager > support > viewer
 * Each role inherits all permissions from roles below it.
 *
 * With keyMatch wildcards:
 * - "*" matches any resource
 * - "product/*" matches "product", "product/123", "product/123/variant"
 */
export const ROLE_PERMISSIONS: Record<PredefinedRoleName, RolePermissionDef> = {
  // Base role: read-only access to everything
  viewer: {
    allow: [{ resource: "*", actions: ["read"] }],
  },

  // Inherits from viewer, adds order management
  support: {
    allow: [
      { resource: "order/*", actions: ["write"] },
      { resource: "customer/*", actions: ["read", "write"] },
    ],
  },

  // Inherits from support, adds product/category/media management
  manager: {
    allow: [
      { resource: "product/*", actions: ["write", "publish"] },
      { resource: "category/*", actions: ["write"] },
      { resource: "media/*", actions: ["upload", "delete"] },
      { resource: "order/*", actions: ["fulfill"] },
    ],
  },

  // Inherits from manager, adds full access with restrictions
  admin: {
    allow: [{ resource: "*", actions: ["*"] }],
    deny: [
      { resource: "project", actions: ["delete"] },
      { resource: "project/billing", actions: ["*"] },
    ],
  },

  // Inherits from admin, removes deny restrictions (full access)
  owner: {
    allow: [{ resource: "*", actions: ["*"] }],
  },
};

/**
 * Cache TTL values (in milliseconds)
 */
export const CACHE_TTL = {
  /** L1 in-memory cache TTL */
  L1: 10 * 1000, // 10 seconds

  /** L2 Redis cache TTL */
  L2: 5 * 60 * 1000, // 5 minutes

  /** Role definition cache TTL (L1) */
  ROLE_DEF_L1: 30 * 1000, // 30 seconds

  /** Role definition cache TTL (L2) */
  ROLE_DEF_L2: 10 * 60 * 1000, // 10 minutes

  /** Resources cache TTL (in-memory) */
  RESOURCES: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Cache key prefixes
 */
export const CACHE_KEYS = {
  /** Role version (incremented on role changes) */
  ROLE_VERSION: "iam:version:role",

  /** User membership version (incremented on attach/detach) */
  USER_VERSION: "iam:version:user",

  /** User role cache */
  USER_ROLE: "iam:role",

  /** Authorization result cache */
  AUTH: "iam:auth",

  /** Role definition cache */
  ROLE_DEF: "iam:roledef",

  /** Redis pub/sub channel for cache invalidation */
  INVALIDATE_CHANNEL: "iam:cache:invalidate",
} as const;
