import type { UserError } from "../../../kernel/BaseScript.js";
import type { ScopePart } from "../../../casbin/CasbinService.js";

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

/**
 * GetMembersForDomain - Get members with access to a specific domain (e.g., project)
 */
export interface GetMembersForDomainParams {
  organizationId: string;
  domain: ScopePart[]; // e.g., [["project", "abc-123"]]
}

export interface DomainMember {
  userId: string;
  role: string;
  roleDisplayName?: string | null;
  roleIsSystem?: boolean;
  grantedAt?: Date;
  grantedBy?: string;
}

export interface GetMembersForDomainResult {
  members: DomainMember[];
  userErrors: UserError[];
}

/**
 * ChangeRoleForDomain - Change a user's role in a specific domain (e.g., project)
 */
export interface ChangeRoleForDomainParams {
  organizationId: string;
  userId: string;
  domain: ScopePart[]; // e.g., [["project", "abc-123"]]
  newRole: string;
  grantedBy?: string;
}

export interface ChangeRoleForDomainResult {
  success: boolean;
  grantedAt?: Date;
  userErrors: UserError[];
}

/**
 * RemoveMemberFromDomain - Remove a user from a specific domain (e.g., project)
 */
export interface RemoveMemberFromDomainParams {
  organizationId: string;
  userId: string;
  domain: ScopePart[]; // e.g., [["project", "abc-123"]]
}

export interface RemoveMemberFromDomainResult {
  success: boolean;
  userErrors: UserError[];
}
