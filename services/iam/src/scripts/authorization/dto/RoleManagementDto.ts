import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * AttachUserRole - Assign a role to a user in an organization
 */
export interface AttachUserRoleParams {
  userId: string;
  organizationId: string;
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
  organizationId: string;
  revokedBy: string;
}

export interface DetachUserRoleResult {
  detached: boolean;
  userErrors: UserError[];
}

/**
 * ListOrgMembers - List all users with roles in an organization
 */
export interface ListOrgMembersParams {
  organizationId: string;
}

export interface OrgMember {
  userId: string;
  userName: string;
  email: string;
  role: string;
  grantedAt?: Date;
  grantedBy?: string;
}

export interface ListOrgMembersResult {
  members: OrgMember[];
  userErrors: UserError[];
}
