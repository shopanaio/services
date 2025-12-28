import type { RoleDefinition } from "../types.js";

export const ORG_ROLES: Record<string, RoleDefinition> = {
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
};
