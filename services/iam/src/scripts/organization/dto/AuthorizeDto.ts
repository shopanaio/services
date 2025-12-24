import type { ScopePart } from "../../../casbin/CasbinService.js";

export interface AuthorizeParams {
  userId: string;
  organizationId: string;
  domain: ScopePart[];
  resource: ScopePart[];
  action: string;
}

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
}
