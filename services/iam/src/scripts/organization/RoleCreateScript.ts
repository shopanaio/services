import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import type { Domain } from "../../casbin/CasbinService.js";
import {
  roleCreateInputSchema,
  type RoleCreateParams,
  type RoleCreateResult,
} from "./dto/RoleCreateDto.js";

/**
 * RoleCreateScript - Create a new role with permissions for the organization
 */
export class RoleCreateScript extends BaseScript<
  RoleCreateParams,
  RoleCreateResult
> {
  @Transactional()
  @ZodSchema(roleCreateInputSchema)
  @Policy({
    resource: "org.roles",
    action: "create",
    organizationId: (self: RoleCreateScript, params: RoleCreateParams) =>
      params.organizationId,
  })
  protected async execute(
    params: RoleCreateParams
  ): Promise<RoleCreateResult> {
    const { organizationId, domain, name, displayName, description, permissions } =
      params;

    // Check if role with same name already exists in this domain
    const existingRole = await this.repository.organization.findRole(
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
    await this.repository.organization.createRole({
      organizationId,
      domain,
      name,
      displayName,
      description,
      isSystem: false,
    });

    // Add casbin policies for permissions
    for (const permission of permissions) {
      for (const action of permission.actions) {
        await this.repository.casbin.addPolicy({
          organizationId,
          role: name,
          domain: domain as Domain,
          resource: permission.resource,
          action,
        });
      }
    }

    return {
      role: { organizationId, domain, name },
      userErrors: [],
    };
  }

  protected handleError(error: unknown): RoleCreateResult {
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
          },
        ],
      };
    }

    this.logger.error({ error }, "RoleCreateScript failed");

    return {
      role: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      ],
    };
  }
}
