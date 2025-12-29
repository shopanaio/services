import { ZodResolver } from "@shopana/type-resolver";
import { IAMType } from "./IAMType.js";
import { OrganizationResolver } from "./OrganizationResolver.js";
import { MemberResolver } from "./MemberResolver.js";
import { OrganizationCreateScript } from "../../scripts/organization/OrganizationCreateScript.js";
import { MemberInviteScript } from "../../scripts/organization/MemberInviteScript.js";
import type {
  OrganizationCreateInput,
  OrganizationUpdateInput,
  MemberInviteInput,
  MemberRoleChangeInput,
  MemberAccessRemoveInput,
} from "./generated/types.js";
import {
  OrganizationCreateInputSchema,
  OrganizationUpdateInputSchema,
  MemberInviteInputSchema,
  MemberRoleChangeInputSchema,
  MemberAccessRemoveInputSchema,
} from "./generated/schemas.js";

/**
 * OrganizationMutation namespace resolver.
 * Handles organization and member operations.
 */
export class OrganizationMutationResolver extends IAMType<
  Record<string, never>
> {
  /**
   * Create a new organization.
   */
  @ZodResolver(OrganizationCreateInputSchema())
  async organizationCreate(args: { input: OrganizationCreateInput }) {
    const { input } = args;
    const result = await this.ctx.kernel.runScript(
      OrganizationCreateScript,
      input
    );

    return {
      organization: result.organization
        ? new OrganizationResolver(result.organization.id, this.ctx)
        : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field ? [e.field] : null,
      })),
    };
  }

  /**
   * Update organization name.
   */
  @ZodResolver(OrganizationUpdateInputSchema())
  async organizationUpdate(args: { input: OrganizationUpdateInput }) {
    const { input } = args;

    // TODO: Implement organization update script
    return {
      organization: null,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "Organization update is not implemented yet",
          field: null,
        },
      ],
    };
  }

  /**
   * Soft delete organization.
   * Only the organization owner can delete the organization.
   */
  async organizationDelete(args: { id: string }) {
    const { id } = args;
    const { currentUser, kernel } = this.ctx;

    if (!currentUser?.id) {
      return {
        deletedOrganizationId: null,
        userErrors: [
          {
            code: "NOT_AUTHENTICATED",
            message: "Not authenticated",
            field: null,
          },
        ],
      };
    }

    // Check if user is owner
    const isOwner = await kernel.repository.organization.isOwner(
      id,
      currentUser.id
    );

    if (!isOwner) {
      return {
        deletedOrganizationId: null,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: "Only the organization owner can delete the organization",
            field: null,
          },
        ],
      };
    }

    // Delete organization
    const deleted = await kernel.repository.organization.delete(id);

    if (!deleted) {
      return {
        deletedOrganizationId: null,
        userErrors: [
          {
            code: "NOT_FOUND",
            message: "Organization not found",
            field: null,
          },
        ],
      };
    }

    return {
      deletedOrganizationId: id,
      userErrors: [],
    };
  }

  /**
   * Transfer organization ownership to another admin.
   * Only the current owner can transfer ownership.
   */
  async ownershipTransfer(args: {
    input: { organizationId: string; newOwnerId: string };
  }) {
    const { input } = args;
    const { currentUser, kernel } = this.ctx;

    if (!currentUser?.id) {
      return {
        success: false,
        userErrors: [
          {
            code: "NOT_AUTHENTICATED",
            message: "Not authenticated",
            field: null,
          },
        ],
      };
    }

    // Check if current user is owner
    const isOwner = await kernel.repository.organization.isOwner(
      input.organizationId,
      currentUser.id
    );

    if (!isOwner) {
      return {
        success: false,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: "Only the organization owner can transfer ownership",
            field: null,
          },
        ],
      };
    }

    // Check if new owner is an admin
    const newOwnerRole = await kernel.repository.organization.findUserRole(
      input.organizationId,
      input.newOwnerId,
      "org"
    );

    if (!newOwnerRole) {
      return {
        success: false,
        userErrors: [
          {
            code: "INVALID_TARGET",
            message: "New owner must be a member of the organization",
            field: ["newOwnerId"],
          },
        ],
      };
    }

    // Get role details to check if admin
    const roleRecord = await kernel.repository.organization.findRole(
      input.organizationId,
      "org",
      "admin"
    );

    if (!roleRecord || newOwnerRole.roleId !== roleRecord.id) {
      return {
        success: false,
        userErrors: [
          {
            code: "INVALID_TARGET",
            message:
              "New owner must have admin role in the organization",
            field: ["newOwnerId"],
          },
        ],
      };
    }

    // Transfer ownership
    const result = await kernel.repository.organization.transferOwnership(
      input.organizationId,
      input.newOwnerId
    );

    if (!result.success) {
      return {
        success: false,
        userErrors: [
          {
            code: "TRANSFER_FAILED",
            message: result.error ?? "Failed to transfer ownership",
            field: null,
          },
        ],
      };
    }

    return {
      success: true,
      userErrors: [],
    };
  }

  /**
   * Invite a member to the organization with roles.
   */
  @ZodResolver(MemberInviteInputSchema())
  async memberInvite(args: { input: MemberInviteInput }) {
    const { input } = args;
    const result = await this.ctx.kernel.runScript(MemberInviteScript, {
      organizationId: input.organizationId,
      email: input.email,
      roles: input.roles,
    });

    return {
      member: result.member
        ? new MemberResolver(
            {
              userId: result.member.userId,
              role: result.member.role,
              domain: result.member.domain,
              organizationId: result.member.organizationId,
            },
            this.ctx
          )
        : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field ? [e.field] : null,
      })),
    };
  }

  /**
   * Remove member from organization and revoke all roles.
   * Owner cannot be removed.
   */
  async memberRemove(args: {
    input: { organizationId: string; userId: string };
  }) {
    const { input } = args;
    const { kernel } = this.ctx;

    // Check if member is owner
    const isTargetOwner = await kernel.repository.organization.isOwner(
      input.organizationId,
      input.userId
    );

    if (isTargetOwner) {
      return {
        removedMemberId: null,
        userErrors: [
          {
            code: "CANNOT_REMOVE_OWNER",
            message:
              "Cannot remove organization owner. Transfer ownership first.",
            field: null,
          },
        ],
      };
    }

    // Remove member
    const removed = await kernel.repository.organization.removeMember(
      input.organizationId,
      input.userId
    );

    if (!removed) {
      return {
        removedMemberId: null,
        userErrors: [
          {
            code: "NOT_FOUND",
            message: "Member not found",
            field: null,
          },
        ],
      };
    }

    return {
      removedMemberId: input.userId,
      userErrors: [],
    };
  }

  /**
   * Change member's role in the organization.
   * Owner's role cannot be changed - use ownershipTransfer instead.
   */
  @ZodResolver(MemberRoleChangeInputSchema())
  async memberRoleChange(args: { input: MemberRoleChangeInput }) {
    const { input } = args;
    const { kernel } = this.ctx;

    // Check if target user is owner - owner's role cannot be changed
    const isTargetOwner = await kernel.repository.organization.isOwner(
      input.organizationId,
      input.userId
    );

    if (isTargetOwner) {
      return {
        member: null,
        userErrors: [
          {
            code: "CANNOT_CHANGE_OWNER_ROLE",
            message:
              "Cannot change organization owner's role. Transfer ownership first.",
            field: null,
          },
        ],
      };
    }

    // Find the target role
    const targetRole = await kernel.repository.organization.findRole(
      input.organizationId,
      input.domain,
      input.role
    );

    if (!targetRole) {
      return {
        member: null,
        userErrors: [
          {
            code: "ROLE_NOT_FOUND",
            message: `Role '${input.role}' not found in domain '${input.domain}'`,
            field: ["role"],
          },
        ],
      };
    }

    // Find existing user role
    const existingUserRole = await kernel.repository.organization.findUserRole(
      input.organizationId,
      input.userId,
      input.domain
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

    // Update user role
    await kernel.repository.organization.updateUserRole(
      existingUserRole.id,
      targetRole.id
    );

    // Return updated member
    return {
      member: new MemberResolver(
        {
          userId: input.userId,
          role: input.role,
          domain: input.domain,
          organizationId: input.organizationId,
        },
        this.ctx
      ),
      userErrors: [],
    };
  }

  /**
   * Remove member's access to a specific domain.
   */
  @ZodResolver(MemberAccessRemoveInputSchema())
  async memberAccessRemove(args: { input: MemberAccessRemoveInput }) {
    const { input } = args;

    // TODO: Implement member access remove script
    return {
      success: false,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "Member access removal is not implemented yet",
          field: null,
        },
      ],
    };
  }
}
