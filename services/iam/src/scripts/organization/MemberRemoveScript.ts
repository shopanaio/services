import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import {
  memberRemoveInputSchema,
  type MemberRemoveParams,
  type MemberRemoveResult,
} from "./dto/MemberRemoveDto.js";

/**
 * MemberRemoveScript - Remove member from organization and revoke all roles
 *
 * Owner cannot be removed.
 */
export class MemberRemoveScript extends BaseScript<
  MemberRemoveParams,
  MemberRemoveResult
> {
  @Transactional()
  @ZodSchema(memberRemoveInputSchema)
  @Policy({
    resource: "org.members",
    action: "admin",
    organizationId: (self: MemberRemoveScript, params: MemberRemoveParams) =>
      params.organizationId,
  })
  protected async execute(
    params: MemberRemoveParams
  ): Promise<MemberRemoveResult> {
    const { organizationId, userId } = params;

    // Check if member is owner
    const isTargetOwner = await this.repository.organization.isOwner(
      organizationId,
      userId
    );

    if (isTargetOwner) {
      return {
        removedMemberId: null,
        userErrors: [
          {
            code: "CANNOT_REMOVE_OWNER",
            message:
              "Cannot remove organization owner. Transfer ownership first.",
            field: [],
          },
        ],
      };
    }

    // Remove member from organizationMember table
    const removed = await this.repository.organization.removeMember(
      organizationId,
      userId
    );

    if (!removed) {
      return {
        removedMemberId: null,
        userErrors: [
          {
            code: "NOT_FOUND",
            message: "Member not found",
            field: [],
          },
        ],
      };
    }

    // Remove all roles from casbin (org domain)
    await this.repository.casbin.removeAllRolesInDomain({
      organizationId,
      userId,
      domain: "org",
    });

    // Find and delete userRole record
    const userRole = await this.repository.organization.findUserRole(
      organizationId,
      userId,
      "org"
    );
    if (userRole) {
      await this.repository.organization.deleteUserRole(userRole.id);
    }

    return {
      removedMemberId: userId,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): MemberRemoveResult {
    if (error instanceof ValidationError) {
      return {
        removedMemberId: null,
        userErrors: error.errors,
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        removedMemberId: null,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: error.message,
            field: [],
          },
        ],
      };
    }

    this.logger.error({ error }, "MemberRemoveScript failed");

    return {
      removedMemberId: null,
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
