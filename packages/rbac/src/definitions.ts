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

// ============ Inline types for permission helper ============

type OrgResources = typeof Resources.org;
type StoreResources = typeof Resources.store;

type ResourceActionMap = {
  [K in keyof OrgResources]: OrgResources[K]["actions"][number];
} & {
  [K in keyof StoreResources]: StoreResources[K]["actions"][number];
};

type ResourceKey = keyof ResourceActionMap;

type Permission<R extends ResourceKey> = {
  resource: R;
  actions: ("*" | ResourceActionMap[R])[];
};

// Helper to create typed permission (validates actions at compile time)
function permission<R extends ResourceKey>(
  resource: R,
  actions: ("*" | ResourceActionMap[R])[]
): Permission<R> {
  return { resource, actions };
}

// ============ Role definitions ============

export const Roles = {
  organization: {
    owner: [
      permission(R.org.profile, ["*"]),
      permission(R.org.members, ["*"]),
      permission(R.org.access, ["*"]),
      permission(R.store.profile, ["*"]),
      permission(R.store.access, ["*"]),
    ],
    admin: [
      permission(R.org.profile, ["read", "update"]),
      permission(R.org.members, ["read", "invite", "update", "remove"]),
      permission(R.org.access, ["read", "create", "update", "delete"]),
      permission(R.store.profile, ["read", "update"]),
      permission(R.store.access, ["read", "grant", "revoke"]),
    ],
    member: [
      permission(R.org.profile, ["read"]),
      permission(R.org.members, ["read"]),
    ],
  },
  store: {
    viewer: [permission(R.store.profile, ["read"])],
    editor: [
      permission(R.store.profile, ["read", "update"]),
      permission(R.store.settings, ["read"]),
    ],
    manager: [
      permission(R.store.profile, ["read", "update"]),
      permission(R.store.settings, ["read", "update"]),
    ],
    admin: [
      permission(R.store.profile, ["read", "update"]),
      permission(R.store.settings, ["read", "update"]),
      permission(R.store.access, ["read", "grant", "revoke"]),
    ],
  },
} as const;

// Combined export
export const RBAC = {
  resources: Resources,
  roles: Roles,
} as const;
