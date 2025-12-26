/**
 * RBAC Constants for Store-level Authorization
 *
 * Defines predefined store roles and their permissions.
 * These roles are created when a store is initialized.
 *
 * STORE ISOLATION:
 * Each store has isolated roles via domain = "store:{storeId}"
 */

export interface RoleDefinition {
  name: string;
  displayName: string;
  description: string;
  permissions: {
    allow: Array<{ resource: string; actions: string[] }>;
    deny?: Array<{ resource: string; actions: string[] }>;
  };
}

/**
 * Store roles ready for createRoles action.
 */
export const STORE_ROLES: RoleDefinition[] = [
  {
    name: "owner",
    displayName: "Owner",
    description: "Full access to all store resources",
    permissions: {
      allow: [{ resource: "*", actions: ["*"] }],
    },
  },
  {
    name: "manager",
    displayName: "Manager",
    description: "Manage products, orders, and settings",
    permissions: {
      allow: [{ resource: "*", actions: ["*"] }],
      deny: [
        { resource: "store", actions: ["delete"] },
        { resource: "store.settings", actions: ["*"] },
        { resource: "store.roles", actions: ["create", "update", "delete"] },
      ],
    },
  },
  {
    name: "viewer",
    displayName: "Viewer",
    description: "Read-only access to store data",
    permissions: {
      allow: [{ resource: "*", actions: ["read"] }],
    },
  },
];
