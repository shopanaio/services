import type { UserError } from "../../../kernel/BaseScript.js";

export interface ProvisionTenantParams {
  /** Tenant ID - same as project ID from project service */
  tenantId: string;
  /** Owner user ID - will be assigned the owner role */
  ownerId?: string;
}

export interface ProvisionTenantResult {
  tenantId: string | null;
  /** List of created role names */
  roles: string[];
  userErrors: UserError[];
}
