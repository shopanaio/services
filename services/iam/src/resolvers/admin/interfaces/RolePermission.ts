/**
 * RolePermission - a single permission entry for a role
 */
export interface RolePermission {
  /** Resource name (e.g., "org.profile", "store.members") */
  resource: string;
  /** Actions (e.g., ["create", "read", "update", "delete"]) */
  actions: string[];
}
