import { ZodResolver } from "@shopana/type-resolver";
import { hashContent } from "@shopana/shared-kernel";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { IAMType } from "./IAMType.js";
import { OrganizationResolver } from "./OrganizationResolver.js";
import { MemberResolver } from "./MemberResolver.js";
import { OwnershipTransferScript } from "../../scripts/organization/OwnershipTransferScript.js";
import type {
  OrganizationCreateParams,
  OrganizationCreateResult,
  OrganizationDeleteParams,
  OrganizationDeleteResult,
  OrganizationUpdateWorkflowInput,
} from "../../workflows/index.js";
import type { OrganizationUpdateResult } from "../../scripts/organization/dto/OrganizationUpdateDto.js";
import { MemberInviteScript } from "../../scripts/organization/MemberInviteScript.js";
import { MemberRemoveScript } from "../../scripts/organization/MemberRemoveScript.js";
import { MemberRoleChangeScript } from "../../scripts/organization/MemberRoleChangeScript.js";
import { MemberAccessRemoveScript } from "../../scripts/organization/MemberAccessRemoveScript.js";
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
   * Uses OrganizationCreateWorkflow to ensure media asset group is created after DB commit.
   */
  @ZodResolver(OrganizationCreateInputSchema())
  async organizationCreate(args: { input: OrganizationCreateInput }) {
    const { input } = args;
    const broker = this.$ctx.kernel.getServices().broker;

    const result = await broker.runWorkflow<OrganizationCreateResult, OrganizationCreateParams>(
      "iam.organizationCreate",
      input,
      {
        source: "content",
        resourceId: input.name,
        operation: "organizationCreate",
        contentHash: hashContent({ name: input.name }),
      }
    );

    return {
      organization: result.organization
        ? new OrganizationResolver(result.organization.id, this.$ctx)
        : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field,
      })),
    };
  }

  /**
   * Update organization (name, displayName, logo).
   * Uses OrganizationUpdateWorkflow to ensure logo back-refs are synced after DB commit.
   */
  @ZodResolver(OrganizationUpdateInputSchema())
  async organizationUpdate(args: { input: OrganizationUpdateInput }) {
    const { input } = args;
    const { kernel } = this.$ctx;
    const broker = kernel.getServices().broker;
    const organizationId = decodeGlobalIdByType(
      input.id,
      GlobalIdEntity.Organization
    );

    // Get previous logo ID for back-ref cleanup
    const existingOrg = await kernel.repository.organization.findById(organizationId);
    const previousLogoId = existingOrg?.logoId ?? null;

    // Decode logo ID if provided
    let nextLogoId: string | null | undefined;
    if (input.logoId !== undefined) {
      if (input.logoId) {
        try {
          nextLogoId = decodeGlobalIdByType(input.logoId, GlobalIdEntity.File);
        } catch {
          nextLogoId = input.logoId;
        }
      } else {
        nextLogoId = null;
      }
    }

    const result = await broker.runWorkflow<OrganizationUpdateResult, OrganizationUpdateWorkflowInput>(
      "iam.organizationUpdate",
      {
        organizationId,
        name: input.name ?? undefined,
        displayName: input.displayName ?? undefined,
        logoId: nextLogoId,
        previousLogoId,
        nextLogoId,
      },
      {
        source: "content",
        resourceId: organizationId,
        operation: "organizationUpdate",
        contentHash: hashContent({ organizationId }),
      }
    );

    return {
      organization: result.organization
        ? new OrganizationResolver(result.organization.id, this.$ctx)
        : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field,
      })),
    };
  }

  /**
   * Soft delete organization.
   * Only the organization owner can delete the organization.
   * Uses OrganizationDeleteWorkflow to ensure cleanup happens after DB commit.
   */
  async organizationDelete(args: { id: string }) {
    const organizationId = decodeGlobalIdByType(
      args.id,
      GlobalIdEntity.Organization
    );
    const broker = this.$ctx.kernel.getServices().broker;

    const result = await broker.runWorkflow<OrganizationDeleteResult, OrganizationDeleteParams>(
      "iam.organizationDelete",
      { organizationId },
      {
        source: "content",
        resourceId: organizationId,
        operation: "organizationDelete",
        contentHash: hashContent({ organizationId }),
      }
    );

    return {
      deletedOrganizationId: result.deletedOrganizationId
        ? encodeGlobalIdByType(
            result.deletedOrganizationId,
            GlobalIdEntity.Organization
          )
        : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field,
      })),
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
    const organizationId = decodeGlobalIdByType(
      input.organizationId,
      GlobalIdEntity.Organization
    );
    const newOwnerId = decodeGlobalIdByType(
      input.newOwnerId,
      GlobalIdEntity.User
    );
    const result = await this.$ctx.kernel.runScript(OwnershipTransferScript, {
      organizationId,
      newOwnerId,
    });

    return {
      success: result.success,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field,
      })),
    };
  }

  /**
   * Invite a member to the organization with roles.
   */
  @ZodResolver(MemberInviteInputSchema())
  async memberInvite(args: { input: MemberInviteInput }) {
    const { input } = args;
    const organizationId = decodeGlobalIdByType(
      input.organizationId,
      GlobalIdEntity.Organization
    );
    const result = await this.$ctx.kernel.runScript(MemberInviteScript, {
      organizationId,
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
            this.$ctx
          )
        : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field,
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
    const organizationId = decodeGlobalIdByType(
      input.organizationId,
      GlobalIdEntity.Organization
    );
    const userId = decodeGlobalIdByType(input.userId, GlobalIdEntity.User);
    const result = await this.$ctx.kernel.runScript(MemberRemoveScript, {
      organizationId,
      userId,
    });

    return {
      removedMemberId: result.removedMemberId
        ? encodeGlobalIdByType(result.removedMemberId, GlobalIdEntity.Member)
        : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field,
      })),
    };
  }

  /**
   * Change member's role in the organization.
   * Owner's role cannot be changed - use ownershipTransfer instead.
   */
  @ZodResolver(MemberRoleChangeInputSchema())
  async memberRoleChange(args: { input: MemberRoleChangeInput }) {
    const { input } = args;
    const organizationId = decodeGlobalIdByType(
      input.organizationId,
      GlobalIdEntity.Organization
    );
    const userId = decodeGlobalIdByType(input.userId, GlobalIdEntity.User);

    const result = await this.$ctx.kernel.runScript(MemberRoleChangeScript, {
      organizationId,
      userId,
      domain: input.domain,
      role: input.role,
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
            this.$ctx
          )
        : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field,
      })),
    };
  }

  /**
   * Remove member's access to a specific domain.
   */
  @ZodResolver(MemberAccessRemoveInputSchema())
  async memberAccessRemove(args: { input: MemberAccessRemoveInput }) {
    const { input } = args;
    const organizationId = decodeGlobalIdByType(
      input.organizationId,
      GlobalIdEntity.Organization
    );
    const userId = decodeGlobalIdByType(input.userId, GlobalIdEntity.User);

    const result = await this.$ctx.kernel.runScript(MemberAccessRemoveScript, {
      organizationId,
      userId,
      domain: input.domain,
    });

    return {
      success: result.success,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field,
      })),
    };
  }

}
