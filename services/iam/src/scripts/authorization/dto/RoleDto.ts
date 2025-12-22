import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Permission definition for a role
 */
export interface RolePermission {
  resource: string;
  actions: string[];
  effect: "Allow" | "Deny";
}

/**
 * Role info returned from queries
 */
export interface RoleInfo {
  name: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  /** Roles this role inherits from (for hierarchy) */
  inherits: string[];
  permissions: RolePermission[];
  createdAt?: Date;
}

/**
 * CreateRole - Create a custom role for a tenant
 */
export interface CreateRoleParams {
  tenantId: string; // Tenant identifier (project slug)
  name: string;
  displayName: string;
  description?: string;
  /** Roles to inherit from */
  inherits?: string[];
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
  tenantId: string; // Tenant identifier (project slug)
  roleName: string;
  displayName?: string;
  description?: string;
  /** Roles to inherit from */
  inherits?: string[];
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
  tenantId: string; // Tenant identifier (project slug)
  roleName: string;
}

export interface DeleteRoleResult {
  deleted: boolean;
  userErrors: UserError[];
}

/**
 * ListRoles - List all roles for a tenant
 */
export interface ListRolesParams {
  tenantId: string; // Tenant identifier (project slug)
}

export interface ListRolesResult {
  roles: RoleInfo[];
  userErrors: UserError[];
}

/**
 * GetRole - Get a single role by name
 */
export interface GetRoleParams {
  tenantId: string; // Tenant identifier (project slug)
  roleName: string;
}

export interface GetRoleResult {
  role: RoleInfo | null;
  userErrors: UserError[];
}
