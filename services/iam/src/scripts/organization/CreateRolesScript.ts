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
  @Policy({
    resource: "org.roles",
    action: "create",
    organizationId: (params) => (params as CreateRolesParams).organizationId,
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
    // Add allow policies
    for (const rule of roleConfig.permissions.allow) {
      for (const action of rule.actions) {
        await this.repository.casbin.addPolicy({
          organizationId,
          role: roleConfig.name,
          domain,
          resource: rule.resource as Resource,
          action,
          effect: "allow",
        });
      }
    }

    // Add deny policies if any
    if (roleConfig.permissions.deny) {
      for (const rule of roleConfig.permissions.deny) {
        for (const action of rule.actions) {
          await this.repository.casbin.addPolicy({
            organizationId,
            role: roleConfig.name,
            domain,
            resource: rule.resource as Resource,
            action,
            effect: "deny",
          });
        }
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
