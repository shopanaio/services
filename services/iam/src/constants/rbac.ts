/**
 * RBAC Constants for IAM Authorization
 *
 * Defines the Casbin model and predefined roles.
 */

/**
 * Casbin Model for RBAC with domains/tenants
 *
 * This model supports multi-tenant authorization where:
 * - sub: subject (user ID)
 * - dom: domain (project ID)
 * - obj: object (resource: product, order, etc.)
 * - act: action (read, write, delete, etc.)
 */
export const CASBIN_MODEL_TEXT = `
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
`.trim();

/**
 * Model name used in Casdoor
 */
export const CASBIN_MODEL_NAME = "model-rbac-domains";

/**
 * Enforcer name used in Casdoor
 */
export const CASBIN_ENFORCER_NAME = "enforcer-shopana";

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

export const ROLE_PERMISSIONS: Record<PredefinedRoleName, RolePermissionDef> = {
  owner: {
    allow: [{ resource: "*", actions: ["*"] }],
  },
  admin: {
    allow: [{ resource: "*", actions: ["*"] }],
    deny: [
      { resource: "project", actions: ["delete"] },
      { resource: "project.billing", actions: ["*"] },
    ],
  },
  manager: {
    allow: [
      { resource: "product", actions: ["read", "write", "publish"] },
      { resource: "category", actions: ["read", "write"] },
      { resource: "order", actions: ["read", "write", "fulfill"] },
      { resource: "media", actions: ["read", "upload"] },
    ],
  },
  support: {
    allow: [
      { resource: "order", actions: ["read", "write"] },
      { resource: "order.comment", actions: ["read", "write"] },
      { resource: "product", actions: ["read"] },
    ],
  },
  viewer: {
    allow: [{ resource: "*", actions: ["read"] }],
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
