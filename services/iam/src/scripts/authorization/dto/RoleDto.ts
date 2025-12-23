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
 * CreateRole - Create a custom role for an organization
 */
export interface CreateRoleParams {
  organizationId: string;
  name: string;
  displayName: string;
  description?: string;
  /** Roles to inherit from */
  inherits?: string[];
  permissions: RolePermission[];

  // Legacy support (deprecated)
  tenantId?: string;
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
  roleName: string;
  displayName?: string;
  description?: string;
  /** Roles to inherit from */
  inherits?: string[];
  permissions?: RolePermission[];

  // Legacy support (deprecated)
  tenantId?: string;
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
  roleName: string;

  // Legacy support (deprecated)
  tenantId?: string;
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

  // Legacy support (deprecated)
  tenantId?: string;
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
  roleName: string;

  // Legacy support (deprecated)
  tenantId?: string;
}

export interface GetRoleResult {
  role: RoleInfo | null;
  userErrors: UserError[];
}
