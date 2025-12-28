import type { Domain, Resource } from "@src/casbin/CasbinService.js";
import {
  Transactional,
  ZodSchema,
  Policy,
  AuthorizationError,
} from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  createRolesInputSchema,
  type CreateRolesParams,
  type CreateRolesResult,
  type RoleConfig,
} from "./dto/CreateRolesDto.js";

export class CreateRolesScript extends BaseScript<
  CreateRolesParams,
  CreateRolesResult
> {
  @Transactional()
  @ZodSchema(createRolesInputSchema)
  @Policy<CreateRolesParams>({
    resource: "org.roles",
    action: "create",
    organizationId: (_self, params) => params.organizationId,
  })
  protected async execute(
    params: CreateRolesParams
  ): Promise<CreateRolesResult> {
    const { organizationId, domain, roles } = params;

    // Create all roles and policies for the domain
    for (const roleConfig of roles) {
      await this.createRole(organizationId, domain, roleConfig);
      await this.addPoliciesForRole(organizationId, domain, roleConfig);
    }

    this.logger.debug(
      {
        organizationId,
        domain,
        rolesCreated: roles.map((r) => r.name),
      },
      "CreateRolesScript: Roles created successfully"
    );

    return { success: true };
  }

  private async createRole(
    organizationId: string,
    domain: Domain,
    roleConfig: RoleConfig
  ): Promise<{ id: string }> {
    return this.repository.organization.createRole({
      organizationId,
      domain,
      name: roleConfig.name,
      displayName: roleConfig.displayName,
      description: roleConfig.description,
      isSystem: true,
    });
  }

  private async addPoliciesForRole(
    organizationId: string,
    domain: Domain,
    roleConfig: RoleConfig
  ): Promise<void> {
    for (const permission of roleConfig.permissions) {
      for (const action of permission.actions) {
        await this.repository.casbin.addPolicy({
          organizationId,
          role: roleConfig.name,
          domain,
          resource: permission.resource as Resource,
          action,
        });
      }
    }
  }

  protected handleError(error: unknown): CreateRolesResult {
    if (error instanceof AuthorizationError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create roles",
    };
  }
}
