import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import type { Domain } from "../../casbin/CasbinService.js";
import {
  memberRoleChangeInputSchema,
  type MemberRoleChangeParams,
  type MemberRoleChangeResult,
} from "./dto/MemberRoleChangeDto.js";

/**
 * MemberRoleChangeScript - Change member's role in the organization
 *
 * Owner's role cannot be changed - use OwnershipTransferScript instead.
 */
export class MemberRoleChangeScript extends BaseScript<
  MemberRoleChangeParams,
  MemberRoleChangeResult
> {
  @Transactional()
  @ZodSchema(memberRoleChangeInputSchema)
  @Policy({
    resource: "org.members",
    action: "write",
    organizationId: (
      self: MemberRoleChangeScript,
      params: MemberRoleChangeParams
    ) => params.organizationId,
  })
  protected async execute(
    params: MemberRoleChangeParams
  ): Promise<MemberRoleChangeResult> {
    const { organizationId, userId, domain, role } = params;

    // Check if target user is owner - owner's role cannot be changed
    const isTargetOwner = await this.repository.organization.isOwner(
      organizationId,
      userId
    );

    if (isTargetOwner) {
      return {
        member: null,
        userErrors: [
          {
            code: "CANNOT_CHANGE_OWNER_ROLE",
            message:
              "Cannot change organization owner's role. Transfer ownership first.",
            field: ["userId"],
          },
        ],
      };
    }

    // Find the target role
    const targetRole = await this.repository.organization.findRole(
      organizationId,
      domain,
      role
    );

    if (!targetRole) {
      return {
        member: null,
        userErrors: [
          {
            code: "ROLE_NOT_FOUND",
            message: `Role '${role}' not found in domain '${domain}'`,
            field: ["role"],
          },
        ],
      };
    }

    // Find existing user role
    const existingUserRole = await this.repository.organization.findUserRole(
      organizationId,
      userId,
      domain
    );

    if (!existingUserRole) {
      return {
        member: null,
        userErrors: [
          {
            code: "MEMBER_NOT_FOUND",
            message: "User does not have a role in this domain",
            field: ["userId"],
          },
        ],
      };
    }

    // Get old role name for casbin update
    const oldRole = await this.repository.organization.findRoleById(
      organizationId,
      existingUserRole.roleId
    );

    // Update user role in database
    await this.repository.organization.updateUserRole(
      existingUserRole.id,
      targetRole.id
    );

    // Update casbin - remove old role and assign new one
    if (oldRole) {
      await this.repository.casbin.removeRole({
        organizationId,
        userId,
        role: oldRole.name,
        domain: domain as Domain,
      });
    }

    await this.repository.casbin.assignRole({
      organizationId,
      userId,
      role,
      domain: domain as Domain,
    });

    return {
      member: {
        userId,
        role,
        domain,
        organizationId,
      },
      userErrors: [],
    };
  }

  protected handleError(error: unknown): MemberRoleChangeResult {
    if (error instanceof ValidationError) {
      return {
        member: null,
        userErrors: error.errors,
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        member: null,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: error.message,
            field: [],
          },
        ],
      };
    }

    this.logger.error({ error }, "MemberRoleChangeScript failed");

    return {
      member: null,
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
