/**
 * RBAC Definitions - all domains, resources, and actions in one place
 */
export const RBAC = {
  domains: {
    org: "org",
    storeWildcard: "store:*",
  },

  resources: {
    // Org resources (domain: "org")
    org: {
      "org.profile": {
        actions: ["read", "update", "delete"],
        description: "Organization profile",
      },
      "org.members": {
        actions: ["read", "invite", "update", "remove"],
        description: "Organization members",
      },
      "org.billing": {
        actions: ["read", "update"],
        description: "Billing and payments",
      },
      "org.roles": {
        actions: ["read", "create", "update", "delete"],
        description: "Role management",
      },
    },

    // Store resources (domain: "store:{id}")
    store: {
      "store.profile": {
        actions: ["read", "update"],
        description: "Store profile",
      },
      "store.products": {
        actions: ["read", "create", "update", "delete"],
        description: "Product catalog",
      },
      "store.orders": {
        actions: ["read", "create", "update", "delete"],
        description: "Order management",
      },
      "store.inventory": {
        actions: ["read", "create", "update", "delete"],
        description: "Inventory management",
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

    // Store wildcard resources (domain: "store:*")
    storeWildcard: {
      "store.profile": {
        actions: ["list", "create", "delete"],
        description: "Store management (list, create, delete stores)",
      },
      "store.access": {
        actions: ["read", "grant", "revoke"],
        description: "Access control for any store",
      },
    },
  },

  roles: {
    // Org roles (domain: "org")
    org: {
      owner: {
        permissions: [
          { resource: "org.profile", actions: ["read", "update", "delete"] },
          { resource: "org.members", actions: ["read", "invite", "update", "remove"] },
          { resource: "org.billing", actions: ["read", "update"] },
          { resource: "org.roles", actions: ["read", "create", "update", "delete"] },
        ],
      },
      admin: {
        permissions: [
          { resource: "org.profile", actions: ["read", "update"] },
          { resource: "org.members", actions: ["read", "invite", "update", "remove"] },
          { resource: "org.billing", actions: ["read", "update"] },
          { resource: "org.roles", actions: ["read", "create", "update", "delete"] },
        ],
      },
      member: {
        permissions: [
          { resource: "org.profile", actions: ["read"] },
          { resource: "org.members", actions: ["read"] },
        ],
      },
    },

    // Store roles (domain: "store:{id}")
    store: {
      viewer: {
        permissions: [
          { resource: "store.profile", actions: ["read"] },
          { resource: "store.products", actions: ["read"] },
          { resource: "store.orders", actions: ["read"] },
          { resource: "store.inventory", actions: ["read"] },
        ],
      },
      editor: {
        permissions: [
          { resource: "store.profile", actions: ["read"] },
          { resource: "store.products", actions: ["read", "create", "update", "delete"] },
          { resource: "store.orders", actions: ["read", "update"] },
          { resource: "store.inventory", actions: ["read", "update"] },
        ],
      },
      manager: {
        permissions: [
          { resource: "store.profile", actions: ["read", "update"] },
          { resource: "store.products", actions: ["read", "create", "update", "delete"] },
          { resource: "store.orders", actions: ["read", "create", "update", "delete"] },
          { resource: "store.inventory", actions: ["read", "create", "update", "delete"] },
          { resource: "store.settings", actions: ["read", "update"] },
        ],
      },
      admin: {
        permissions: [
          { resource: "store.profile", actions: ["read", "update"] },
          { resource: "store.products", actions: ["read", "create", "update", "delete"] },
          { resource: "store.orders", actions: ["read", "create", "update", "delete"] },
          { resource: "store.inventory", actions: ["read", "create", "update", "delete"] },
          { resource: "store.settings", actions: ["read", "update"] },
          { resource: "store.access", actions: ["read", "grant", "revoke"] },
        ],
      },
    },

    // Store wildcard roles (domain: "store:*")
    storeWildcard: {
      owner: {
        permissions: [
          { resource: "store.profile", actions: ["list", "create", "delete"] },
          { resource: "store.access", actions: ["read", "grant", "revoke"] },
        ],
      },
      admin: {
        permissions: [
          { resource: "store.profile", actions: ["list", "create", "delete"] },
          { resource: "store.access", actions: ["read", "grant", "revoke"] },
        ],
      },
      member: {
        permissions: [
          { resource: "store.profile", actions: ["list"] },
        ],
      },
    },
  },
} as const;
