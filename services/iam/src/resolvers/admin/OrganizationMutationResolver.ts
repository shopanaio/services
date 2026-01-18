import { ZodResolver } from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { IAMType } from "./IAMType.js";
import { OrganizationResolver } from "./OrganizationResolver.js";
import { MemberResolver } from "./MemberResolver.js";
import { OrganizationCreateScript } from "../../scripts/organization/OrganizationCreateScript.js";
import { OrganizationUpdateScript } from "../../scripts/organization/OrganizationUpdateScript.js";
import { OrganizationDeleteScript } from "../../scripts/organization/OrganizationDeleteScript.js";
import { OwnershipTransferScript } from "../../scripts/organization/OwnershipTransferScript.js";
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
   */
  @ZodResolver(OrganizationCreateInputSchema())
  async organizationCreate(args: { input: OrganizationCreateInput }) {
    const { input } = args;
    const result = await this.$ctx.kernel.runScript(
      OrganizationCreateScript,
      input
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
   */
  @ZodResolver(OrganizationUpdateInputSchema())
  async organizationUpdate(args: { input: OrganizationUpdateInput }) {
    const { input } = args;
    const { kernel } = this.$ctx;
    const organizationId = decodeGlobalIdByType(
      input.id,
      GlobalIdEntity.Organization
    );

    // Update name/displayName via script
    const result = await kernel.runScript(OrganizationUpdateScript, {
      organizationId,
      name: input.name ?? undefined,
      displayName: input.displayName ?? undefined,
    });

    if (result.userErrors.length > 0) {
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

    const previousLogoId = result.organization?.logoId ?? null;

    // Handle logo update separately if provided
    if (input.logoId !== undefined) {
      let logoId: string | null = null;
      if (input.logoId) {
        try {
          logoId = decodeGlobalIdByType(input.logoId, GlobalIdEntity.File);
        } catch {
          logoId = input.logoId;
        }
      }

      const updated = await kernel.repository.organization.updateLogo(
        organizationId,
        logoId
      );

      if (!updated) {
        return {
          organization: null,
          userErrors: [
            {
              code: "UPDATE_FAILED",
              message: "Failed to update logo",
              field: ["logoId"],
            },
          ],
        };
      }

      await this.syncLogoBackRefs(organizationId, previousLogoId, logoId);
    }

    return {
      organization: new OrganizationResolver(organizationId, this.$ctx),
      userErrors: [],
    };
  }

  /**
   * Soft delete organization.
   * Only the organization owner can delete the organization.
   */
  async organizationDelete(args: { id: string }) {
    const organizationId = decodeGlobalIdByType(
      args.id,
      GlobalIdEntity.Organization
    );
    const result = await this.$ctx.kernel.runScript(OrganizationDeleteScript, {
      organizationId,
    });

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

  private async syncLogoBackRefs(
    organizationId: string,
    previousLogoId: string | null,
    nextLogoId: string | null
  ): Promise<void> {
    try {
      if (previousLogoId === nextLogoId) {
        return;
      }

      const broker = this.$ctx.kernel.getServices().broker;
      const entityRef = {
        service: "iam",
        entityType: "organization",
        entityId: organizationId,
      };
      const role = "logo";
      const tasks: Array<Promise<unknown>> = [];

      if (nextLogoId) {
        tasks.push(
          broker.call("media.fileLink", {
            fileId: nextLogoId,
            entityRef,
            role,
          })
        );
      }

      if (previousLogoId) {
        tasks.push(
          broker.call("media.fileUnlink", {
            fileId: previousLogoId,
            entityRef,
            role,
          })
        );
      }

      if (tasks.length === 0) {
        return;
      }

      const results = await Promise.allSettled(tasks);
      const failures = results.filter((result) => result.status === "rejected");

      if (failures.length > 0) {
        this.$ctx.kernel.getServices().logger.warn(
          {
            organizationId,
            failedCount: failures.length,
            errors: failures.map((failure) => failure.reason),
          },
          "Organization logo backrefs sync failed"
        );
      }
    } catch (error) {
      this.$ctx.kernel.getServices().logger.warn(
        { organizationId, error },
        "Organization logo backrefs sync failed"
      );
    }
  }
}
