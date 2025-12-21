import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * AttachUserRole - Assign a role to a user for a project
 */
export interface AttachUserRoleParams {
  userId: string;
  projectId: string;
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
  projectId: string;
  revokedBy: string;
}

export interface DetachUserRoleResult {
  detached: boolean;
  userErrors: UserError[];
}

/**
 * ListProjectMembers - List all users with roles in a project
 */
export interface ListProjectMembersParams {
  projectId: string;
}

export interface ProjectMember {
  userId: string;
  userName: string;
  email: string;
  role: string;
  grantedAt?: Date;
  grantedBy?: string;
}

export interface ListProjectMembersResult {
  members: ProjectMember[];
  userErrors: UserError[];
}
