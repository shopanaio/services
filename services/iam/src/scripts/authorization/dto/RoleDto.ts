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
  permissions: RolePermission[];
  memberCount: number;
}

/**
 * CreateRole - Create a custom role for a project
 */
export interface CreateRoleParams {
  projectId: string;
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
  projectId: string;
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
  projectId: string;
  roleName: string;
}

export interface DeleteRoleResult {
  deleted: boolean;
  userErrors: UserError[];
}

/**
 * ListRoles - List all roles for a project
 */
export interface ListRolesParams {
  projectId: string;
}

export interface ListRolesResult {
  roles: RoleInfo[];
  userErrors: UserError[];
}

/**
 * GetRole - Get a single role by name
 */
export interface GetRoleParams {
  projectId: string;
  roleName: string;
}

export interface GetRoleResult {
  role: RoleInfo | null;
  userErrors: UserError[];
}
