import { ZodResolver } from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { IAMType } from "./IAMType.js";
import { RoleResolver } from "./RoleResolver.js";
import type {
  RoleCreateParams,
  RoleCreateResult,
} from "../../scripts/organization/dto/RoleCreateDto.js";
import type {
  RoleUpdateParams,
  RoleUpdateResult,
} from "../../scripts/organization/dto/RoleUpdateDto.js";
import type {
  RoleDeleteParams,
  RoleDeleteResult,
} from "../../scripts/organization/dto/RoleDeleteDto.js";
import type {
  RoleCreateInput,
  RoleUpdateInput,
  RoleDeleteInput,
} from "./generated/types.js";
import {
  RoleCreateInputSchema,
  RoleUpdateInputSchema,
  RoleDeleteInputSchema,
} from "./generated/schemas.js";

/**
 * RoleMutation namespace resolver.
 * Handles role CRUD operations.
 */
export class RoleMutationResolver extends IAMType<Record<string, never>> {
  /**
   * Create a new role with permissions for the organization.
   */
  @ZodResolver(RoleCreateInputSchema())
  async roleCreate(args: { input: RoleCreateInput }) {
    const { input } = args;
    const organizationId = decodeGlobalIdByType(
      input.organizationId,
      GlobalIdEntity.Organization
    );

    const workflowInput: RoleCreateParams = {
      organizationId,
      domain: input.domain,
      name: input.name,
      displayName: input.displayName,
      description: input.description ?? undefined,
      permissions: input.permissions,
    };
    const result = await this.runAdminWorkflow<
      RoleCreateResult,
      RoleCreateParams
    >(
      "iam.roleCreate",
      "roleCreate",
      `${organizationId}:${input.domain}:${input.name}`,
      workflowInput,
    );

    return {
      role: result.role
        ? new RoleResolver(
            {
              organizationId: result.role.organizationId,
              domain: result.role.domain,
              name: result.role.name,
            },
            this.$ctx
          )
        : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field ?? null,
      })),
    };
  }

  /**
   * Update an existing role's display name, description, or permissions.
   */
  @ZodResolver(RoleUpdateInputSchema())
  async roleUpdate(args: { input: RoleUpdateInput }) {
    const { input } = args;
    const organizationId = decodeGlobalIdByType(
      input.organizationId,
      GlobalIdEntity.Organization
    );
    const id = decodeGlobalIdByType(input.id, GlobalIdEntity.Role);
    const workflowInput: RoleUpdateParams = {
      organizationId,
      id,
      displayName: input.displayName ?? undefined,
      description: input.description ?? undefined,
      permissions: input.permissions ?? undefined,
    };
    const result = await this.runAdminWorkflow<
      RoleUpdateResult,
      RoleUpdateParams
    >(
      "iam.roleUpdate",
      "roleUpdate",
      id,
      workflowInput,
    );

    // Invalidate role cache after update
    if (result.role) {
      const cacheKey = `iam:role:${result.role.organizationId}:${result.role.domain}:${result.role.name}`;
      await (this.$ctx.kernel.cache as any).del(cacheKey);
    }

    return {
      role: result.role
        ? new RoleResolver(
            {
              organizationId: result.role.organizationId,
              domain: result.role.domain,
              name: result.role.name,
            },
            this.$ctx
          )
        : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field ?? null,
      })),
    };
  }

  /**
   * Delete a custom role from the organization.
   */
  @ZodResolver(RoleDeleteInputSchema())
  async roleDelete(args: { input: RoleDeleteInput }) {
    const { input } = args;
    const organizationId = decodeGlobalIdByType(
      input.organizationId,
      GlobalIdEntity.Organization
    );
    const id = decodeGlobalIdByType(input.id, GlobalIdEntity.Role);
    const workflowInput: RoleDeleteParams = { organizationId, id };
    const result = await this.runAdminWorkflow<
      RoleDeleteResult,
      RoleDeleteParams
    >(
      "iam.roleDelete",
      "roleDelete",
      id,
      workflowInput,
    );

    return {
      deletedRoleName: result.deletedRoleName,
      userErrors: result.userErrors.map((e) => ({
        code: e.code ?? "UNKNOWN_ERROR",
        message: e.message,
        field: e.field ?? null,
      })),
    };
  }
}
