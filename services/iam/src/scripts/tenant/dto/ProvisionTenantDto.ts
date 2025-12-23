import type { UserError } from "../../../kernel/BaseScript.js";

export interface ProvisionTenantParams {
  /** Owner user ID - will be assigned the owner role (optional) */
  ownerId?: string;
}

export interface ProvisionTenantResult {
  /** Created organization ID */
  organizationId: string | null;
  /** List of created role names */
  roles: string[];
  userErrors: UserError[];
}
