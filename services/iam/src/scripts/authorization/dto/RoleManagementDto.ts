import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * AttachUserRole - Assign a role to a user for a tenant
 */
export interface AttachUserRoleParams {
  userId: string;
  tenantId: string; // Tenant identifier (project slug)
  roleName: string;
  grantedBy: string;
}

export interface AttachUserRoleResult {
  attached: boolean;
  userErrors: UserError[];
}

/**
 * DetachUserRole - Remove a role from a user
 */
export interface DetachUserRoleParams {
  userId: string;
  tenantId: string; // Tenant identifier (project slug)
  revokedBy: string;
}

export interface DetachUserRoleResult {
  detached: boolean;
  userErrors: UserError[];
}

/**
 * ListTenantMembers - List all users with roles in a tenant
 */
export interface ListTenantMembersParams {
  tenantId: string; // Tenant identifier (project slug)
}

export interface TenantMember {
  userId: string;
  userName: string;
  email: string;
  role: string;
  grantedAt?: Date;
  grantedBy?: string;
}

export interface ListTenantMembersResult {
  members: TenantMember[];
  userErrors: UserError[];
}
