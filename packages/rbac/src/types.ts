/**
 * RBAC Types - public types for external use
 */

// Domain types
export type OrgDomain = "org";
export type StoreDomain = `store:${string}`;
export type Domain = OrgDomain | StoreDomain;

// Role names
export type OrgRoleName = "admin" | "member";
export type StoreRoleName = "viewer" | "manager" | "admin";

// Generic permission (for runtime)
export type Permission = {
  resource: string;
  actions: string[];
};

// Policy for access check
export type Policy = {
  subject: string;
  domain: Domain;
  resource: string;
  action: string;
};
