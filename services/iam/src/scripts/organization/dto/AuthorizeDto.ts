import type { Domain, Resource } from "../../../casbin/CasbinService.js";

export interface AuthorizeParams {
  userId: string;
  organizationId: string;
  /** Domain scope. Defaults to "org" if not provided. */
  domain?: Domain;
  resource: Resource;
  action: string;
}

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
}
