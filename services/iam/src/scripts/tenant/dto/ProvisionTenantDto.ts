import type { UserError } from "../../../kernel/BaseScript.js";

export interface ProvisionTenantParams {
  slug: string;
  displayName: string;
}

export interface ProvisionTenantResult {
  tenantId: string | null;
  userErrors: UserError[];
}
