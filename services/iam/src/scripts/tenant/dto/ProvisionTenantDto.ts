import type { UserError } from "../../../kernel/BaseScript.js";

export interface ProvisionTenantParams {
  projectId: string;
  slug: string;
  displayName: string;
  redirectUri?: string;
}

export interface ProvisionTenantResult {
  tenantId: string | null;
  clientId: string | null;
  clientSecret: string | null;
  userErrors: UserError[];
}
