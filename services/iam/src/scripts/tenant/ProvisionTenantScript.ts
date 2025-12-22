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
 * 1. A tenant record in iam.tenant
 * 2. Predefined roles (owner, admin, manager, support, viewer)
 * 3. Role hierarchy
 * 4. Assigns owner role to the specified ownerId
 *
 * The ownerId should be a Better Auth user ID.
 */
export class ProvisionTenantScript extends BaseScript<
  ProvisionTenantParams,
  ProvisionTenantResult
> {
  protected async execute(
    params: ProvisionTenantParams
  ): Promise<ProvisionTenantResult> {
    const { slug, displayName, ownerId } = params;

    try {
      this.logger.info(
        { slug, ownerId },
        "ProvisionTenantScript: Starting tenant provisioning"
      );

      // Use slug as tenantId for the authorization system
      // The actual tenant record will be created by provisionTenantRoles
      const result = await this.repository.authorization.provisionTenantRoles(
        slug,
        ownerId
      );

      if (!result.success) {
        this.logger.error(
          { slug, error: result.error },
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
        { slug, ownerId },
        "ProvisionTenantScript: Tenant provisioned successfully"
      );

      return {
        tenantId: slug,
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
