import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Permission definition for a role
 */
export interface RolePermission {
  resource: string;
  actions: string[];
  effect: "Allow" | "Deny";
  /** Optional domain scope for the permission */
  domain?: string;
}

/**
 * Role info returned from queries
 */
export interface RoleInfo {
  /** Unique identifier (UUID for custom roles, name for system roles) */
  id?: string;
  /** Domain scope: "*" for global, storeId for store-specific */
  domain?: string;
  name: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  permissions: RolePermission[];
  createdAt?: Date;
}

/**
 * CreateRole - Create a custom role for an organization
 */
export interface CreateRoleParams {
  organizationId: string;
  /** Domain scope: "*" for global, storeId for store-specific (default: "*") */
  domain?: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: RolePermission[];
}

export interface CreateRoleResult {
  role: RoleInfo | null;
  userErrors: UserError[];
}

/**
 * UpdateRole - Update role metadata and permissions
 */
export interface UpdateRoleParams {
  organizationId: string;
  /** Domain scope: "*" for global, storeId for store-specific (default: "*") */
  domain?: string;
  roleName: string;
  displayName?: string;
  description?: string;
  permissions?: RolePermission[];
}

export interface UpdateRoleResult {
  role: RoleInfo | null;
  userErrors: UserError[];
}

/**
 * DeleteRole - Delete a custom role
 */
export interface DeleteRoleParams {
  organizationId: string;
  /** Domain scope: "*" for global, storeId for store-specific (default: "*") */
  domain?: string;
  roleName: string;
}

export interface DeleteRoleResult {
  deleted: boolean;
  userErrors: UserError[];
}

/**
 * ListRoles - List all roles for an organization
 */
export interface ListRolesParams {
  organizationId: string;
}

export interface ListRolesResult {
  roles: RoleInfo[];
  userErrors: UserError[];
}

/**
 * GetRole - Get a single role by name
 */
export interface GetRoleParams {
  organizationId: string;
  /** Domain scope: "*" for global, storeId for store-specific (default: "*") */
  domain?: string;
  roleName: string;
}

export interface GetRoleResult {
  role: RoleInfo | null;
  userErrors: UserError[];
}
