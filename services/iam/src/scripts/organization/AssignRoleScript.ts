import {
  ZodSchema,
  Policy,
  AuthorizationError,
} from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  assignRoleInputSchema,
  type AssignRoleParams,
  type AssignRoleResult,
} from "./dto/AssignRoleDto.js";

export class AssignRoleScript extends BaseScript<
  AssignRoleParams,
  AssignRoleResult
> {
  @ZodSchema(assignRoleInputSchema)
  @Policy({
    resource: "org.roles",
    action: "update",
    organizationId: (params) => (params as AssignRoleParams).organizationId,
  })
  protected async execute(
    params: AssignRoleParams
  ): Promise<AssignRoleResult> {
    const { userId, organizationId, domain, roleName } = params;

    // Find role by name in the domain
    const role = await this.repository.organization.findRole(
      organizationId,
      domain,
      roleName
    );

    if (!role) {
      return {
        success: false,
        error: `Role "${roleName}" not found in domain "${domain}"`,
      };
    }

    // Create user role assignment in database
    await this.repository.organization.createUserRole({
      organizationId,
      userId,
      roleId: role.id,
      domain,
      grantedBy: this.userId ?? userId,
    });

    // Assign role in Casbin
    await this.repository.casbin.assignRole({
      organizationId,
      userId,
      role: roleName,
      domain,
    });

    this.logger.debug(
      { userId, organizationId, domain, roleName },
      "AssignRoleScript: Role assigned successfully"
    );

    return { success: true };
  }

  protected handleError(error: unknown): AssignRoleResult {
    if (error instanceof AuthorizationError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign role",
    };
  }
}
