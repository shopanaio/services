import { BaseScript } from "../../kernel/BaseScript.js";
import { PREDEFINED_ROLES } from "../../constants/index.js";
import type {
  ProvisionTenantParams,
  ProvisionTenantResult,
} from "./dto/ProvisionTenantDto.js";

/**
 * ProvisionTenantScript - Create a new tenant with predefined roles
 *
 * This script creates:
 * 1. A tenant record in iam.tenant (ID auto-generated)
 * 2. Predefined roles (owner, admin, manager, support, viewer)
 * 3. Role hierarchy
 * 4. Optionally assigns owner role to the specified ownerId
 *
 * Returns the created tenantId to be stored by the caller (e.g., project service).
 * The ownerId should be a Better Auth user ID.
 */
export class ProvisionTenantScript extends BaseScript<
  ProvisionTenantParams,
  ProvisionTenantResult
> {
  protected async execute(
    params: ProvisionTenantParams
  ): Promise<ProvisionTenantResult> {
    const { ownerId } = params;

    try {
      this.logger.info(
        { ownerId },
        "ProvisionTenantScript: Starting tenant provisioning"
      );

      const result = await this.repository.authorization.provisionTenantRoles(
        ownerId
      );

      if (!result.success || !result.tenantId) {
        this.logger.error(
          { error: result.error },
          "ProvisionTenantScript: Failed to provision tenant roles"
        );

        return {
          tenantId: null,
          roles: [],
          userErrors: [
            {
              code: "PROVISION_FAILED",
              message: result.error ?? "Failed to provision tenant roles",
            },
          ],
        };
      }

      this.logger.info(
        { tenantId: result.tenantId, ownerId },
        "ProvisionTenantScript: Tenant provisioned successfully"
      );

      return {
        tenantId: result.tenantId,
        roles: Object.values(PREDEFINED_ROLES),
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "ProvisionTenantScript: Unexpected error during provisioning"
      );

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
