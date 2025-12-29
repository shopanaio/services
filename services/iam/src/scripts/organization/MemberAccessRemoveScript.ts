import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import type { Domain } from "../../casbin/CasbinService.js";
import {
  memberAccessRemoveInputSchema,
  type MemberAccessRemoveParams,
  type MemberAccessRemoveResult,
} from "./dto/MemberAccessRemoveDto.js";

/**
 * MemberAccessRemoveScript - Remove member's access to a specific domain
 *
 * This removes the user's role in a specific domain (e.g., a store),
 * without removing them from the organization entirely.
 */
export class MemberAccessRemoveScript extends BaseScript<
  MemberAccessRemoveParams,
  MemberAccessRemoveResult
> {
  @Transactional()
  @ZodSchema(memberAccessRemoveInputSchema)
  @Policy({
    resource: "org.members",
    action: "update",
    organizationId: (
      self: MemberAccessRemoveScript,
      params: MemberAccessRemoveParams
    ) => params.organizationId,
  })
  protected async execute(
    params: MemberAccessRemoveParams
  ): Promise<MemberAccessRemoveResult> {
    const { organizationId, userId, domain } = params;

    // Find existing user role in this domain
    const existingUserRole = await this.repository.organization.findUserRole(
      organizationId,
      userId,
      domain
    );

    if (!existingUserRole) {
      return {
        success: false,
        userErrors: [
          {
            code: "NOT_FOUND",
            message: "User does not have access to this domain",
          },
        ],
      };
    }

    // Get role name for casbin removal
    const role = await this.repository.organization.findRoleById(
      organizationId,
      existingUserRole.roleId
    );

    // Remove user role from database
    await this.repository.organization.deleteUserRole(existingUserRole.id);

    // Remove from casbin
    if (role) {
      await this.repository.casbin.removeRole({
        organizationId,
        userId,
        role: role.name,
        domain: domain as Domain,
      });
    }

    return {
      success: true,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): MemberAccessRemoveResult {
    if (error instanceof ValidationError) {
      return {
        success: false,
        userErrors: error.errors,
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        success: false,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: error.message,
          },
        ],
      };
    }

    this.logger.error({ error }, "MemberAccessRemoveScript failed");

    return {
      success: false,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      ],
    };
  }
}
