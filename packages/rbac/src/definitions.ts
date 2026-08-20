/**
 * RBAC Definitions - all domains, resources, and actions in one place
 *
 * Action hierarchy (enforced by Casbin g2):
 *   read  ←  write  ←  admin
 *
 * - "admin" includes "write" and "read"
 * - "write" includes "read"
 * - "read" is read-only
 */

// Unified actions for all resources
export const Actions = ["read", "write", "admin"] as const;
export type Action = (typeof Actions)[number];

// Resource definitions with unified actions
export const Resources = {
  org: {
    "org.profile": {
      actions: Actions,
      displayName: "Profile",
      description: "Organization profile",
    },
    "org.members": {
      actions: Actions,
      displayName: "Members",
      description: "Organization members",
    },
    "org.roles": {
      actions: Actions,
      displayName: "Roles",
      description: "Role management",
    },
    "org.stores": {
      actions: Actions,
      displayName: "Stores",
      description: "Store management",
    },
    "org.access": {
      actions: Actions,
      displayName: "Access",
      description: "Member access to stores",
    },
    "org.applications": {
      actions: Actions,
      displayName: "Applications",
      description: "Application metadata and lifecycle",
    },
    "org.application-auth": {
      actions: Actions,
      displayName: "Application authentication",
      description: "Application realm authentication configuration",
    },
    "org.application-auth-providers": {
      actions: Actions,
      displayName: "Application authentication providers",
      description: "Application social provider configuration and credentials",
    },
    "org.application-oauth-clients": {
      actions: Actions,
      displayName: "Application OAuth clients",
      description: "Application OAuth client lifecycle and secrets",
    },
    "org.application-users": {
      actions: Actions,
      displayName: "Application users",
      description: "Application user security administration",
    },
  },
  store: {
    "store.profile": {
      actions: Actions,
      displayName: "Profile",
      description: "Store profile",
    },
    "store.members": {
      actions: Actions,
      displayName: "Members",
      description: "Store members",
    },
    "store.roles": {
      actions: Actions,
      displayName: "Roles",
      description: "Role management",
    },
    "store.access": {
      actions: Actions,
      displayName: "Access",
      description: "Member permissions in store",
    },
    "store.data": {
      actions: Actions,
      displayName: "Data",
      description: "Store data management",
    },
    "store.apps": {
      actions: Actions,
      displayName: "Apps",
      description: "Store App installations and sales channels",
    },
  },
} as const;

// ============ Types for validation ============

type OrgResource = keyof typeof Resources.org;
type StoreResource = keyof typeof Resources.store;
type AllResource = OrgResource | StoreResource;

// Permission with resource and action
export type Permission = {
  resource: AllResource;
  action: Action;
};

export type RoleDefinitions = {
  organization: Record<string, Permission[]>;
  store: Record<string, Permission[]>;
};

// ============ Role definitions ============
// Note: Due to action hierarchy, "write" includes "read", "admin" includes "write" + "read"

export const Roles = {
  organization: {
    admin: [
      { resource: "org.profile", action: "write" }, // write (not admin - delete is owner-only)
      { resource: "org.members", action: "admin" },
      { resource: "org.roles", action: "admin" },
      { resource: "org.stores", action: "admin" },
      { resource: "org.access", action: "admin" },
      { resource: "org.applications", action: "admin" },
      { resource: "org.application-auth", action: "admin" },
      { resource: "org.application-auth-providers", action: "admin" },
      { resource: "org.application-oauth-clients", action: "admin" },
      { resource: "org.application-users", action: "admin" },
      { resource: "store.profile", action: "admin" },
      { resource: "store.members", action: "admin" },
      { resource: "store.roles", action: "admin" },
      { resource: "store.access", action: "admin" },
    ],
    member: [
      { resource: "org.profile", action: "read" },
      { resource: "org.members", action: "read" },
    ],
  },
  store: {
    viewer: [{ resource: "store.profile", action: "read" }],
    manager: [
      { resource: "store.profile", action: "write" },
      { resource: "store.data", action: "write" },
    ],
    admin: [
      { resource: "store.profile", action: "write" }, // write (not admin - delete requires org permission)
      { resource: "store.members", action: "admin" },
      { resource: "store.roles", action: "admin" },
      { resource: "store.access", action: "admin" },
      { resource: "store.data", action: "admin" },
      { resource: "store.apps", action: "admin" },
    ],
  },
} as const satisfies RoleDefinitions;

// ============ Role metadata ============

export type RoleMeta = {
  displayName: string;
  description: string;
};

export const RolesMeta = {
  organization: {
    admin: {
      displayName: "Administrator",
      description: "Full access to organization and all stores",
    },
    member: {
      displayName: "Member",
      description: "Basic organization member with read-only access",
    },
  },
  store: {
    viewer: {
      displayName: "Viewer",
      description: "Read-only access to store",
    },
    manager: {
      displayName: "Manager",
      description: "Can manage store settings and content",
    },
    admin: {
      displayName: "Administrator",
      description: "Full access to store management",
    },
  },
} as const satisfies {
  organization: Record<keyof typeof Roles.organization, RoleMeta>;
  store: Record<keyof typeof Roles.store, RoleMeta>;
};

// Combined export
export const RBAC = {
  resources: Resources,
  roles: Roles,
  rolesMeta: RolesMeta,
} as const;
