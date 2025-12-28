import type { RoleDefinition } from "../types.js";

export const STORE_ROLES: Record<string, RoleDefinition> = {
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
};
