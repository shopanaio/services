import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ProvisionTenantParams,
  ProvisionTenantResult,
} from "./dto/ProvisionTenantDto.js";

/**
 * Provision IAM tenant (stub - pending migration to node-casbin)
 *
 * This script will be fully implemented during the node-casbin migration.
 * For now, it returns a stub response.
 *
 * @see docs/migration-node-casbin.md
 */
export class ProvisionTenantScript extends BaseScript<
  ProvisionTenantParams,
  ProvisionTenantResult
> {
  protected async execute(
    params: ProvisionTenantParams
  ): Promise<ProvisionTenantResult> {
    const { slug } = params;

    // Stub implementation - will be replaced with node-casbin
    console.warn(
      `[ProvisionTenantScript] Tenant provisioning not implemented - migration to node-casbin pending. Slug: ${slug}`
    );

    return {
      tenantId: null,
      roles: [],
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message:
            "Tenant provisioning is pending migration to node-casbin. See docs/migration-node-casbin.md",
        },
      ],
    };
  }

  protected handleError(_error: unknown): ProvisionTenantResult {
    return {
      tenantId: null,
      roles: [],
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during tenant provisioning",
        },
      ],
    };
  }
}
