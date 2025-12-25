import type { PermissionEffect } from "./PermissionEffect.js";

/**
 * RolePermission - a single permission entry for a role
 */
export interface RolePermission {
  /** Resource name (e.g., "product", "order", "*") */
  resource: string;
  /** Actions (e.g., ["create", "read", "update", "delete"] or ["*"]) */
  actions: string[];
  /** Permission effect */
  effect: PermissionEffect;
}
