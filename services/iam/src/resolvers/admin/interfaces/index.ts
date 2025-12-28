/**
 * Admin domain interfaces for IAM service
 */

// Core entities
export type { User } from "./User.js";
export type { Organization } from "./Organization.js";
export type { OrganizationMember } from "./OrganizationMember.js";

// RBAC
export type { Role } from "./Role.js";
export type { UserRole } from "./UserRole.js";
export type { RolePermission } from "./RolePermission.js";

// Views
export type { Member } from "./Member.js";
export type { Membership } from "./Membership.js";
export type { ResourceDefinition } from "./ResourceDefinition.js";

// Auth
export type { AuthToken } from "./AuthToken.js";
export type { AuthorizeResult } from "./AuthorizeResult.js";
