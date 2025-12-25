/**
 * RBAC Constants for IAM Authorization
 *
 * Defines predefined roles, permissions, and organization-level resources.
 *
 * ORGANIZATION ISOLATION:
 * Each organization has isolated Casbin policies via:
 * - Filtered policies by organizationId (v5 field in casbin_rule)
 * - Own Roles (owner, admin, etc. - simple names)
 * - Own Permissions stored in PostgreSQL
 */

import type {
  ResourceDefinition,
  ServiceResourceDeclaration,
} from "@shopana/shared-kernel";

// ============================================================================
// Organization Resources
// ============================================================================

/**
 * Predefined resources for organization-level access control.
 * These resources are managed by the IAM service and apply to all organizations.
 */
export const ORGANIZATION_RESOURCES: ResourceDefinition[] = [
  {
    name: "org",
    displayName: "Organization",
    description: "Organization settings and configuration",
    actions: [
      {
        name: "read",
        displayName: "View",
        description: "View organization details",
      },
      {
        name: "update",
        displayName: "Edit",
        description: "Edit organization settings",
      },
      {
        name: "delete",
        displayName: "Delete",
        description: "Delete the organization",
      },
    ],
  },
  {
    name: "org.members",
    displayName: "Members",
    description: "Organization member management",
    actions: [
      {
        name: "read",
        displayName: "View",
        description: "View organization members",
      },
      {
        name: "invite",
        displayName: "Invite",
        description: "Invite new members",
      },
      { name: "update", displayName: "Edit", description: "Edit member roles" },
      {
        name: "remove",
        displayName: "Remove",
        description: "Remove members from organization",
      },
    ],
  },
  {
    name: "org.roles",
    displayName: "Roles",
    description: "Role and permission management",
    actions: [
      {
        name: "read",
        displayName: "View",
        description: "View roles and permissions",
      },
      {
        name: "create",
        displayName: "Create",
        description: "Create new roles",
      },
      {
        name: "update",
        displayName: "Edit",
        description: "Edit role permissions",
      },
      { name: "delete", displayName: "Delete", description: "Delete roles" },
    ],
  },
];

/**
 * IAM service resource declaration.
 * Used for resource discovery by other services.
 */
export const IAM_SERVICE_RESOURCES: ServiceResourceDeclaration = {
  service: "iam",
  displayName: "Identity & Access",
  resources: ORGANIZATION_RESOURCES,
};

// ============================================================================
// Predefined Roles
// ============================================================================

/**
 * Predefined role names for organization-level access.
 * These roles manage the organization itself (members, billing, settings).
 * Store-level access is granted via custom roles with domain = storeId.
 */
export const PREDEFINED_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type PredefinedRoleName =
  (typeof PREDEFINED_ROLES)[keyof typeof PREDEFINED_ROLES];

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<PredefinedRoleName, string> = {
  owner: "Owner",
  admin: "Administrator",
  member: "Member",
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<PredefinedRoleName, string> = {
  owner: "Full access to all organization resources",
  admin: "Full access except organization deletion and billing",
  member: "Read-only access to organization",
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
 * Predefined role permissions for organization-level resources.
 * These roles manage the organization itself (members, billing, settings).
 * Store-level permissions are assigned via custom roles with domain = storeId.
 *
 * With keyMatch wildcards:
 * - "*" matches any resource
 * - "organization/*" matches "organization", "organization/billing", etc.
 */
export const ROLE_PERMISSIONS: Record<PredefinedRoleName, RolePermissionDef> = {
  owner: {
    allow: [{ resource: "*", actions: ["*"] }],
  },

  admin: {
    allow: [{ resource: "*", actions: ["*"] }],
    deny: [
      { resource: "org", actions: ["delete"] },
      { resource: "org.billing", actions: ["*"] },
    ],
  },

  member: {
    allow: [{ resource: "org", actions: ["read"] }],
  },
};

// ============================================================================
// Cache Configuration
// ============================================================================

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
