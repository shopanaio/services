import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import type { Domain } from "../../casbin/CasbinService.js";
import {
  roleDeleteInputSchema,
  type RoleDeleteParams,
  type RoleDeleteResult,
} from "./dto/RoleDeleteDto.js";

/**
 * RoleDeleteScript - Delete a custom role from the organization
 *
 * System roles cannot be deleted.
 */
export class RoleDeleteScript extends BaseScript<
  RoleDeleteParams,
  RoleDeleteResult
> {
  @Transactional()
  @ZodSchema(roleDeleteInputSchema)
  @Policy({
    resource: "org.roles",
    action: "delete",
    organizationId: (self: RoleDeleteScript, params: RoleDeleteParams) =>
      params.organizationId,
  })
  protected async execute(params: RoleDeleteParams): Promise<RoleDeleteResult> {
    const { organizationId, id } = params;

    // Find the role
    const existingRole = await this.repository.organization.findRoleById(
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
          },
        ],
      };
    }

    // Remove all casbin policies for this role
    await this.repository.casbin.removeRolePolicies({
      organizationId,
      role: existingRole.name,
      domain: existingRole.domain as Domain,
    });

    // Delete the role from database
    const deleted = await this.repository.organization.deleteRole(
      organizationId,
      id
    );

    return {
      deletedRoleName: deleted?.name ?? null,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): RoleDeleteResult {
    if (error instanceof ValidationError) {
      return {
        deletedRoleName: null,
        userErrors: error.errors,
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        deletedRoleName: null,
        userErrors: [
          {
            code: "FORBIDDEN",
            message: error.message,
          },
        ],
      };
    }

    this.logger.error({ error }, "RoleDeleteScript failed");

    return {
      deletedRoleName: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      ],
    };
  }
}
