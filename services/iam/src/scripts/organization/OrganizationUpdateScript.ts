import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import {
  organizationUpdateInputSchema,
  type OrganizationUpdateParams,
  type OrganizationUpdateResult,
} from "./dto/OrganizationUpdateDto.js";

/**
 * OrganizationUpdateScript - Update organization details
 *
 * Only organization owner can update the organization.
 */
export class OrganizationUpdateScript extends BaseScript<
  OrganizationUpdateParams,
  OrganizationUpdateResult
> {
  @Transactional()
  @ZodSchema(organizationUpdateInputSchema)
  @Policy({
    resource: "org.settings",
    action: "update",
    organizationId: (
      self: OrganizationUpdateScript,
      params: OrganizationUpdateParams
    ) => params.organizationId,
  })
  protected async execute(
    params: OrganizationUpdateParams
  ): Promise<OrganizationUpdateResult> {
    const { organizationId, name, displayName } = params;

    // Find organization
    const org = await this.repository.organization.findById(organizationId);

    if (!org) {
      return {
        organization: null,
        userErrors: [
          {
            code: "NOT_FOUND",
            message: "Organization not found",
            field: ["organizationId"],
          },
        ],
      };
    }

    // Update organization
    const updated = await this.repository.organization.update(organizationId, {
      name,
      displayName,
    });

    if (!updated) {
      return {
        organization: null,
        userErrors: [
          {
            code: "UPDATE_FAILED",
            message: "Failed to update organization",
            field: ["organizationId"],
          },
        ],
      };
    }

    return {
      organization: updated,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): OrganizationUpdateResult {
    if (error instanceof ValidationError) {
      return {
        organization: null,
        userErrors: error.errors,
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        organization: null,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: error.message,
            field: ["organizationId"
          },
        ],
      };
    }

    this.logger.error({ error }, "OrganizationUpdateScript failed");

    return {
      organization: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          field: [],
        },
      ],
    };
  }
}
