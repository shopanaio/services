import { ZodResolver } from "@shopana/type-resolver";
import { IAMType } from "./IAMType.js";
import { RoleResolver } from "./RoleResolver.js";
import type { Domain } from "../../casbin/CasbinService.js";
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
    const { organizationId, domain, name, displayName, description, permissions } = input;

    // Check if role with same name already exists in this domain
    const existingRole = await this.ctx.kernel.repository.organization.findRole(
      organizationId,
      domain,
      name
    );

    if (existingRole) {
      return {
        role: null,
        userErrors: [
          {
            code: "DUPLICATE",
            message: "Role with this name already exists in this domain",
            field: "name",
          },
        ],
      };
    }

    // Create the role in database (custom roles are never system roles)
    const createdRole = await this.ctx.kernel.repository.organization.createRole({
      organizationId,
      domain,
      name,
      displayName,
      description: description ?? undefined,
      isSystem: false,
    });

    // Add casbin policies for permissions
    for (const permission of permissions) {
      for (const action of permission.actions) {
        await this.ctx.kernel.repository.casbin.addPolicy({
          organizationId,
          role: name,
          domain: domain as Domain,
          resource: permission.resource,
          action,
        });
      }
    }

    return {
      role: new RoleResolver(
        { organizationId, domain, name },
        this.ctx
      ),
      userErrors: [],
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
