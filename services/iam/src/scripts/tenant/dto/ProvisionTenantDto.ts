import type { UserError } from "../../../kernel/BaseScript.js";

export interface ProvisionTenantParams {
  slug: string;
  displayName: string;
  /** Owner user ID - will be assigned the owner role */
  ownerId: string;
}

export interface ProvisionTenantResult {
  tenantId: string | null;
  /** List of created role names */
  roles: string[];
  userErrors: UserError[];
}
