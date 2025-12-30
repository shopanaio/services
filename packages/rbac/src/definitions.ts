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
      description: "Organization profile",
    },
    "org.members": {
      actions: Actions,
      description: "Organization members",
    },
    "org.roles": {
      actions: Actions,
      description: "Role management",
    },
    "org.stores": {
      actions: Actions,
      description: "Store management",
    },
    "org.access": {
      actions: Actions,
      description: "Member access to stores",
    },
  },
  store: {
    "store.profile": {
      actions: Actions,
      description: "Store profile",
    },
    "store.members": {
      actions: Actions,
      description: "Store members",
    },
    "store.roles": {
      actions: Actions,
      description: "Role management",
    },
    "store.access": {
      actions: Actions,
      description: "Member permissions in store",
    },
    "store.inventory": {
      actions: Actions,
      description: "Store inventory management",
    },
    "store.orders": {
      actions: Actions,
      description: "Store order management",
    },
    "store.listing": {
      actions: Actions,
      description: "Store listing management",
    },
    "store.reviews": {
      actions: Actions,
      description: "Store reviews management",
    },
    "store.search": {
      actions: Actions,
      description: "Store search management",
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
    viewer: [
      { resource: "store.profile", action: "read" },
    ],
    manager: [
      { resource: "store.profile", action: "write" },
      { resource: "store.inventory", action: "write" },
      { resource: "store.listing", action: "write" },
      { resource: "store.orders", action: "write" },
    ],
    admin: [
      { resource: "store.profile", action: "admin" },
      { resource: "store.members", action: "admin" },
      { resource: "store.roles", action: "admin" },
      { resource: "store.access", action: "admin" },
      { resource: "store.inventory", action: "admin" },
      { resource: "store.listing", action: "admin" },
      { resource: "store.orders", action: "admin" },
      { resource: "store.reviews", action: "admin" },
      { resource: "store.search", action: "admin" },
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
