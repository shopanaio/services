import type { Domain, Resource } from "../../../casbin/CasbinService.js";

export interface AuthorizeParams {
  userId: string;
  organizationId: string;
  domain: Domain;
  resource: Resource;
  action: string;
}

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
}
