/**
 * RBAC Definitions - all domains, resources, and actions in one place
 */

// Resource definitions with actions and descriptions
export const Resources = {
  org: {
    "org.profile": {
      actions: ["read", "update", "delete"],
      description: "Organization profile",
    },
    "org.members": {
      actions: ["read", "invite", "update", "remove"],
      description: "Organization members",
    },
    "org.roles": {
      actions: ["read", "create", "update", "delete"],
      description: "Role management",
    },
    "org.stores": {
      actions: ["create", "read", "list", "update", "delete"],
      description: "Store management",
    },
    "org.access": {
      actions: ["read", "grant", "revoke"],
      description: "Member access to stores",
    },
  },
  store: {
    "store.profile": {
      actions: ["read", "update", "delete"],
      description: "Store members",
    },
    "store.members": {
      actions: ["read", "invite", "update", "remove"],
      description: "Store members",
    },
    "store.roles": {
      actions: ["read", "create", "update", "delete"],
      description: "Role management",
    },
    "store.access": {
      actions: ["read", "grant", "revoke"],
      description: "Member permissions in store",
    },
  },
} as const;

// ============ Types for validation ============

type ResourceActionMap = {
  [K in keyof typeof Resources.org]: (typeof Resources.org)[K]["actions"][number];
} & {
  [K in keyof typeof Resources.store]: (typeof Resources.store)[K]["actions"][number];
};

// Union type of all valid permissions (validates resource + actions match)
type ValidPermission = {
  [K in keyof ResourceActionMap]: {
    resource: K;
    actions: ResourceActionMap[K][];
  };
}[keyof ResourceActionMap];

export type RoleDefinitions = {
  organization: Record<string, ValidPermission[]>;
  store: Record<string, ValidPermission[]>;
};

// ============ Role definitions ============

export const Roles = {
  organization: {
    admin: [
      { resource: "org.profile", actions: ["read", "update", "delete"] },
      { resource: "org.members", actions: ["read", "invite", "update", "remove"] },
      { resource: "org.roles", actions: ["read", "create", "update", "delete"] },
      { resource: "org.stores", actions: ["create", "read", "list", "update", "delete"] },
      { resource: "org.access", actions: ["read", "grant", "revoke"] },
      { resource: "store.profile", actions: ["read", "update", "delete"] },
      { resource: "store.members", actions: ["read", "invite", "update", "remove"] },
      { resource: "store.roles", actions: ["read", "create", "update", "delete"] },
      { resource: "store.access", actions: ["read", "grant", "revoke"] },
    ],
    member: [
      { resource: "org.profile", actions: ["read"] },
      { resource: "org.members", actions: ["read"] },
    ],
  },
  store: {
    viewer: [{ resource: "store.profile", actions: ["read"] }],
    editor: [{ resource: "store.profile", actions: ["read", "update"] }],
    manager: [{ resource: "store.profile", actions: ["read", "update"] }],
    admin: [
      { resource: "store.profile", actions: ["read", "update"] },
      { resource: "store.members", actions: ["read", "invite", "update", "remove"] },
      { resource: "store.roles", actions: ["read", "create", "update", "delete"] },
      { resource: "store.access", actions: ["read", "grant", "revoke"] },
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
    editor: {
      displayName: "Editor",
      description: "Can view and edit store content",
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
