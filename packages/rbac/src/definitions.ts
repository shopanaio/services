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
    "org.access": {
      actions: ["read", "create", "update", "delete"],
      description: "Role management",
    },
  },
  store: {
    "store.profile": {
      actions: ["read", "update"],
      description: "Store profile",
    },
    "store.settings": {
      actions: ["read", "update"],
      description: "Store configuration",
    },
    "store.access": {
      actions: ["read", "grant", "revoke"],
      description: "Access control",
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
    actions: ("*" | ResourceActionMap[K])[];
  };
}[keyof ResourceActionMap];

type RoleDefinitions = {
  organization: Record<string, ValidPermission[]>;
  store: Record<string, ValidPermission[]>;
};

// ============ Role definitions ============

export const Roles = {
  organization: {
    owner: [
      { resource: "org.profile", actions: ["*"] },
      { resource: "org.members", actions: ["*"] },
      { resource: "org.access", actions: ["*"] },
      { resource: "store.profile", actions: ["*"] },
      { resource: "store.access", actions: ["*"] },
    ],
    admin: [
      { resource: "org.profile", actions: ["read", "update"] },
      { resource: "org.members", actions: ["read", "invite", "update", "remove"] },
      { resource: "org.access", actions: ["read", "create", "update", "delete"] },
      { resource: "store.profile", actions: ["read", "update"] },
      { resource: "store.access", actions: ["read", "grant", "revoke"] },
    ],
    member: [
      { resource: "org.profile", actions: ["read"] },
      { resource: "org.members", actions: ["read"] },
    ],
  },
  store: {
    viewer: [{ resource: "store.profile", actions: ["read"] }],
    editor: [
      { resource: "store.profile", actions: ["read", "update"] },
      { resource: "store.settings", actions: ["read"] },
    ],
    manager: [
      { resource: "store.profile", actions: ["read", "update"] },
      { resource: "store.settings", actions: ["read", "update"] },
    ],
    admin: [
      { resource: "store.profile", actions: ["read", "update"] },
      { resource: "store.settings", actions: ["read", "update"] },
      { resource: "store.access", actions: ["read", "grant", "revoke"] },
    ],
  },
} as const satisfies RoleDefinitions;

// Combined export
export const RBAC = {
  resources: Resources,
  roles: Roles,
} as const;
