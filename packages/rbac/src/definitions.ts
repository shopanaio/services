/**
 * RBAC Definitions - all domains, resources, and actions in one place
 */

export const RBAC = {
  resources: {
    // Organization resources (domain: "org")
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
      "store.profile": {
        actions: ["list", "create", "delete"],
        description: "Store management (list, create, delete stores)",
      },
      "store.access": {
        actions: ["read", "grant", "revoke"],
        description: "Access control for any store",
      },
    },
    // Store resources (domain: "store:{id}")
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
  },

  roles: {
    // Org roles
    organization: {
      owner: [
        { resource: "org.profile", actions: ["read", "update", "delete"] },
        { resource: "org.members", actions: ["read", "invite", "update", "remove"] },
        { resource: "org.access", actions: ["read", "create", "update", "delete"] },
        { resource: "store.profile", actions: ["list", "create", "delete"] },
        { resource: "store.access", actions: ["read", "grant", "revoke"] },
      ],
      admin: [
        { resource: "org.profile", actions: ["read", "update"] },
        { resource: "org.members", actions: ["read", "invite", "update", "remove"] },
        { resource: "org.access", actions: ["read", "create", "update", "delete"] },
        { resource: "store.profile", actions: ["list", "create", "delete"] },
        { resource: "store.access", actions: ["read", "grant", "revoke"] },
      ],
      member: [
        { resource: "org.profile", actions: ["read"] },
        { resource: "org.members", actions: ["read"] },
      ],
    },

    // Store roles (domain: "store:{id}")
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
  },
} as const;
