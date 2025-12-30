import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import { AuthorizationError } from "@shopana/shared-kernel";
import {
  organizationDeleteInputSchema,
  type OrganizationDeleteParams,
  type OrganizationDeleteResult,
} from "./dto/OrganizationDeleteDto.js";

/**
 * OrganizationDeleteScript - Soft delete organization
 *
 * Only the organization owner can delete the organization.
 */
export class OrganizationDeleteScript extends BaseScript<
  OrganizationDeleteParams,
  OrganizationDeleteResult
> {
  @Transactional()
  @ZodSchema(organizationDeleteInputSchema)
  protected async execute(
    params: OrganizationDeleteParams
  ): Promise<OrganizationDeleteResult> {
    const { organizationId } = params;
    const currentUserId = this.currentUser.id;

    // Check if user is owner
    const isOwner = await this.repository.organization.isOwner(
      organizationId,
      currentUserId
    );

    if (!isOwner) {
      return {
        deletedOrganizationId: null,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: "Only the organization owner can delete the organization",
            field: ["organizationId"],
          },
        ],
      };
    }

    // Delete organization
    const deleted = await this.repository.organization.delete(organizationId);

    if (!deleted) {
      return {
        deletedOrganizationId: null,
        userErrors: [
          {
            code: "NOT_FOUND",
            message: "Organization not found",
            field: ["organizationId"],
          },
        ],
      };
    }

    return {
      deletedOrganizationId: organizationId,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): OrganizationDeleteResult {
    if (error instanceof ValidationError) {
      return {
        deletedOrganizationId: null,
        userErrors: error.errors,
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        deletedOrganizationId: null,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: error.message,
            field: ["organizationId"],
          },
        ],
      };
    }

    this.logger.error({ error }, "OrganizationDeleteScript failed");

    return {
      deletedOrganizationId: null,
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
