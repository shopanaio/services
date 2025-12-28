import type { RoleDefinition } from "../types.js";

/**
 * Store wildcard roles control what org members can do with stores as entities
 * (list, create, delete stores), NOT access to store contents.
 */
export const STORE_WILDCARD_ROLES: Record<string, RoleDefinition> = {
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
};
