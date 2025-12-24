import { v7 as uuidv7 } from "uuid";
import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ProvisionTenantParams,
  ProvisionTenantResult,
} from "./dto/ProvisionTenantDto.js";

export class ProvisionTenantScript extends BaseScript<
  ProvisionTenantParams,
  ProvisionTenantResult
> {
  protected async execute(
    params: ProvisionTenantParams
  ): Promise<ProvisionTenantResult> {
    const { ownerId } = params;

    // Generate new organization ID
    const organizationId = uuidv7();

    // Assign owner role to the user in this new organization
    // Using org:organizationId as domain for org-level role
    await this.repository.casbin.assignRole({
      organizationId,
      userId: ownerId,
      role: "owner",
      domain: [["org", organizationId]],
    });

    return {
      organizationId,
      roles: ["owner"],
      userErrors: [],
    };
  }

  protected handleError(error: unknown): ProvisionTenantResult {
    return {
      organizationId: null,
      roles: [],
      userErrors: [
        {
          code: "PROVISION_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to provision tenant",
        },
      ],
    };
  }
}
