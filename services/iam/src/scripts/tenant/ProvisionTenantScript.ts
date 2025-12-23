import { BaseScript } from "../../kernel/BaseScript.js";
import { PREDEFINED_ROLES } from "../../constants/index.js";
import type {
  ProvisionTenantParams,
  ProvisionTenantResult,
} from "./dto/ProvisionTenantDto.js";

/**
 * ProvisionTenantScript - Create a new organization with predefined roles
 *
 * This script creates:
 * 1. An organization record in iam.tenant (ID auto-generated)
 * 2. Predefined roles (owner, admin, manager, support, viewer)
 * 3. Optionally assigns owner role to the specified ownerId
 *
 * Returns the created organizationId to be stored by the caller.
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
        "ProvisionTenantScript: Starting organization provisioning"
      );

      const result = await this.repository.authorization.provisionTenantRoles(
        ownerId
      );

      if (!result.success || !result.organizationId) {
        this.logger.error(
          { error: result.error },
          "ProvisionTenantScript: Failed to provision organization roles"
        );

        return {
          organizationId: null,
          roles: [],
          userErrors: [
            {
              code: "PROVISION_FAILED",
              message: result.error ?? "Failed to provision organization roles",
            },
          ],
        };
      }

      this.logger.info(
        { organizationId: result.organizationId, ownerId },
        "ProvisionTenantScript: Organization provisioned successfully"
      );

      return {
        organizationId: result.organizationId,
        roles: Object.values(PREDEFINED_ROLES),
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "ProvisionTenantScript: Unexpected error during provisioning"
      );

      return {
        organizationId: null,
        roles: [],
        userErrors: [
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred during organization provisioning",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): ProvisionTenantResult {
    return {
      organizationId: null,
      roles: [],
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during organization provisioning",
        },
      ],
    };
  }
}
