import { z } from "zod";
import { ZodSchema } from "@shopana/shared-kernel";
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
  @ZodSchema(z.object({ input: OrganizationCreateInputSchema() }))
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
  @ZodSchema(z.object({ input: OrganizationUpdateInputSchema() }))
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
   */
  async organizationDelete(args: { id: string }) {
    const { id } = args;

    // TODO: Implement organization delete script
    return {
      deletedOrganizationId: null,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "Organization deletion is not implemented yet",
          field: null,
        },
      ],
    };
  }

  /**
   * Invite a member to the organization with roles.
   */
  @ZodSchema(z.object({ input: MemberInviteInputSchema() }))
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
   */
  async memberRemove(args: { memberId: string }) {
    const { memberId } = args;

    // TODO: Implement member remove script
    return {
      removedMemberId: null,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "Member removal is not implemented yet",
          field: null,
        },
      ],
    };
  }

  /**
   * Change member's role in the organization.
   */
  @ZodSchema(z.object({ input: MemberRoleChangeInputSchema() }))
  async memberRoleChange(args: { input: MemberRoleChangeInput }) {
    const { input } = args;

    // TODO: Implement member role change script
    return {
      member: null,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "Member role change is not implemented yet",
          field: null,
        },
      ],
    };
  }

  /**
   * Remove member's access to a specific domain.
   */
  @ZodSchema(z.object({ input: MemberAccessRemoveInputSchema() }))
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
