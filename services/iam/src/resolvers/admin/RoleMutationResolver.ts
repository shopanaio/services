import { ZodResolver } from "@shopana/type-resolver";
import { IAMType } from "./IAMType.js";
import { RoleResolver } from "./RoleResolver.js";
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

    // TODO: Implement role creation script
    // const result = await this.ctx.kernel.runScript(RoleCreateScript, input);

    return {
      role: null,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "Role creation is not implemented yet",
          field: null,
        },
      ],
    };
  }

  /**
   * Update an existing role's display name, description, or permissions.
   */
  @ZodResolver(RoleUpdateInputSchema())
  async roleUpdate(args: { input: RoleUpdateInput }) {
    const { input } = args;
    const { organizationId, id, displayName, description, permissions } = input;

    // Find the role
    const existingRole = await this.ctx.kernel.repository.organization.findRoleById(
      organizationId,
      id
    );

    if (!existingRole) {
      return {
        role: null,
        userErrors: [
          {
            code: "NOT_FOUND",
            message: "Role not found",
            field: "id",
          },
        ],
      };
    }

    // Check if it's a system role
    if (existingRole.isSystem) {
      return {
        role: null,
        userErrors: [
          {
            code: "SYSTEM_ROLE",
            message: "Cannot modify system role",
            field: null,
          },
        ],
      };
    }

    // Update the role
    const updatedRole = await this.ctx.kernel.repository.organization.updateRole(
      organizationId,
      id,
      {
        displayName: displayName ?? undefined,
        description: description ?? undefined,
      }
    );

    // TODO: Handle permissions update via casbin policies

    return {
      role: updatedRole ? new RoleResolver(updatedRole, this.ctx) : null,
      userErrors: [],
    };
  }

  /**
   * Delete a custom role from the organization.
   */
  @ZodResolver(RoleDeleteInputSchema())
  async roleDelete(args: { input: RoleDeleteInput }) {
    const { input } = args;
    const { organizationId, id } = input;

    // Find the role
    const existingRole = await this.ctx.kernel.repository.organization.findRoleById(
      organizationId,
      id
    );

    if (!existingRole) {
      return {
        deletedRoleName: null,
        userErrors: [
          {
            code: "NOT_FOUND",
            message: "Role not found",
            field: "id",
          },
        ],
      };
    }

    // Check if it's a system role
    if (existingRole.isSystem) {
      return {
        deletedRoleName: null,
        userErrors: [
          {
            code: "SYSTEM_ROLE",
            message: "Cannot delete system role",
            field: null,
          },
        ],
      };
    }

    // Delete the role
    const deleted = await this.ctx.kernel.repository.organization.deleteRole(
      organizationId,
      id
    );

    // TODO: Also delete associated casbin policies

    return {
      deletedRoleName: deleted?.name ?? null,
      userErrors: [],
    };
  }
}
