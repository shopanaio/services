/**
 * RBAC Definitions - all domains, resources, and actions in one place
 */

// Resource keys - type-safe references
export const R = {
  org: {
    profile: "org.profile",
    members: "org.members",
    access: "org.access",
  },
  store: {
    profile: "store.profile",
    settings: "store.settings",
    access: "store.access",
  },
} as const;

// Resource definitions with actions and descriptions
export const Resources = {
  org: {
    [R.org.profile]: {
      actions: ["read", "update", "delete"],
      description: "Organization profile",
    },
    [R.org.members]: {
      actions: ["read", "invite", "update", "remove"],
      description: "Organization members",
    },
    [R.org.access]: {
      actions: ["read", "create", "update", "delete"],
      description: "Role management",
    },
  },
  store: {
    [R.store.profile]: {
      actions: ["read", "update"],
      description: "Store profile",
    },
    [R.store.settings]: {
      actions: ["read", "update"],
      description: "Store configuration",
    },
    [R.store.access]: {
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
      { resource: R.org.profile, actions: ["*"] },
      { resource: R.org.members, actions: ["*"] },
      { resource: R.org.access, actions: ["*"] },
      { resource: R.store.profile, actions: ["*"] },
      { resource: R.store.access, actions: ["*"] },
    ],
    admin: [
      { resource: R.org.profile, actions: ["read", "update"] },
      { resource: R.org.members, actions: ["read", "invite", "update", "remove"] },
      { resource: R.org.access, actions: ["read", "create", "update", "delete"] },
      { resource: R.store.profile, actions: ["read", "update"] },
      { resource: R.store.access, actions: ["read", "grant", "revoke"] },
    ],
    member: [
      { resource: R.org.profile, actions: ["read"] },
      { resource: R.org.members, actions: ["read"] },
    ],
  },
  store: {
    viewer: [{ resource: R.store.profile, actions: ["read"] }],
    editor: [
      { resource: R.store.profile, actions: ["read", "update"] },
      { resource: R.store.settings, actions: ["read"] },
    ],
    manager: [
      { resource: R.store.profile, actions: ["read", "update"] },
      { resource: R.store.settings, actions: ["read", "update"] },
    ],
    admin: [
      { resource: R.store.profile, actions: ["read", "update"] },
      { resource: R.store.settings, actions: ["read", "update"] },
      { resource: R.store.access, actions: ["read", "grant", "revoke"] },
    ],
  },
} as const satisfies RoleDefinitions;

// Combined export
export const RBAC = {
  resources: Resources,
  roles: Roles,
} as const;
