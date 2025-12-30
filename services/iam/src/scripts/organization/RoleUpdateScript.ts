import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import type { Domain } from "../../casbin/CasbinService.js";
import {
  roleUpdateInputSchema,
  type RoleUpdateParams,
  type RoleUpdateResult,
} from "./dto/RoleUpdateDto.js";

/**
 * RoleUpdateScript - Update an existing role's display name, description, or permissions
 */
export class RoleUpdateScript extends BaseScript<
  RoleUpdateParams,
  RoleUpdateResult
> {
  @Transactional()
  @ZodSchema(roleUpdateInputSchema)
  @Policy({
    resource: "org.roles",
    action: "update",
    organizationId: (self: RoleUpdateScript, params: RoleUpdateParams) =>
      params.organizationId,
  })
  protected async execute(params: RoleUpdateParams): Promise<RoleUpdateResult> {
    const { organizationId, id, displayName, description, permissions } = params;

    // Find the role
    const existingRole = await this.repository.organization.findRoleById(
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
            field: ["id"],
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
            field: ["id"],
          },
        ],
      };
    }

    // Update the role metadata
    const updatedRole = await this.repository.organization.updateRole(
      organizationId,
      id,
      {
        displayName,
        description,
      }
    );

    // Update permissions if provided
    if (permissions) {
      // Remove all existing policies for this role
      await this.repository.casbin.removeRolePolicies({
        organizationId,
        role: existingRole.name,
        domain: existingRole.domain as Domain,
      });

      // Add new policies
      for (const permission of permissions) {
        for (const action of permission.actions) {
          await this.repository.casbin.addPolicy({
            organizationId,
            role: existingRole.name,
            domain: existingRole.domain as Domain,
            resource: permission.resource,
            action,
          });
        }
      }
    }

    return {
      role: updatedRole
        ? {
            organizationId,
            domain: updatedRole.domain,
            name: updatedRole.name,
          }
        : null,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): RoleUpdateResult {
    if (error instanceof ValidationError) {
      return {
        role: null,
        userErrors: error.errors,
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        role: null,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: error.message,
            field: ["organizationId"],
          },
        ],
      };
    }

    this.logger.error({ error }, "RoleUpdateScript failed");

    return {
      role: null,
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
