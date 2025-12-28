/**
 * RBAC Definitions - all domains, resources, and actions in one place
 */

export const RBAC = {
  resources: {
    // Organization resources (domain: "org8n")
    "org8n": {
      "org8n.profile": {
        actions: ["read", "update", "delete"],
        description: "Organization profile",
      },
      "org8n.members": {
        actions: ["read", "invite", "update", "remove"],
        description: "Organization members",
      },
      "org8n.billing": {
        actions: ["read", "update"],
        description: "Billing and payments",
      },
      "org8n.roles": {
        actions: ["read", "create", "update", "delete"],
        description: "Role management",
      },
    },

    // Store wildcard resources (domain: "store:*") - for org owner/admin
    "store:*": {
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
    "store:{id}": {
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
  },

  roles: {
    // Org roles - include both "org8n" and "store:*" permissions
    "org8n": {
      owner: {
        "org8n": [
          { resource: "org8n.profile", actions: ["read", "update", "delete"] },
          { resource: "org8n.members", actions: ["read", "invite", "update", "remove"] },
          { resource: "org8n.billing", actions: ["read", "update"] },
          { resource: "org8n.roles", actions: ["read", "create", "update", "delete"] },
        ],
        "store:*": [
          { resource: "store.profile", actions: ["list", "create", "delete"] },
          { resource: "store.access", actions: ["read", "grant", "revoke"] },
        ],
      },
      admin: {
        "org8n": [
          { resource: "org8n.profile", actions: ["read", "update"] },
          { resource: "org8n.members", actions: ["read", "invite", "update", "remove"] },
          { resource: "org8n.billing", actions: ["read", "update"] },
          { resource: "org8n.roles", actions: ["read", "create", "update", "delete"] },
        ],
        "store:*": [
          { resource: "store.profile", actions: ["list", "create", "delete"] },
          { resource: "store.access", actions: ["read", "grant", "revoke"] },
        ],
      },
      member: {
        "org8n": [
          { resource: "org8n.profile", actions: ["read"] },
          { resource: "org8n.members", actions: ["read"] },
        ],
        "store:*": [{ resource: "store.profile", actions: ["list"] }],
      },
    },

    // Store roles (domain: "store:{id}")
    "store:{id}": {
      viewer: [
        { resource: "store.profile", actions: ["read"] },
        { resource: "store.products", actions: ["read"] },
        { resource: "store.orders", actions: ["read"] },
        { resource: "store.inventory", actions: ["read"] },
      ],
      editor: [
        { resource: "store.profile", actions: ["read"] },
        { resource: "store.products", actions: ["read", "create", "update", "delete"] },
        { resource: "store.orders", actions: ["read", "update"] },
        { resource: "store.inventory", actions: ["read", "update"] },
      ],
      manager: [
        { resource: "store.profile", actions: ["read", "update"] },
        { resource: "store.products", actions: ["read", "create", "update", "delete"] },
        { resource: "store.orders", actions: ["read", "create", "update", "delete"] },
        { resource: "store.inventory", actions: ["read", "create", "update", "delete"] },
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
