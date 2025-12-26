import type { Domain, Resource } from "@src/casbin/CasbinService.js";
import {
  BaseScript,
  Transactional,
  ZodSchema,
  Policy,
  AuthorizationError,
} from "../../kernel/BaseScript.js";
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
    organizationId: (params: CreateRolesParams) => params.organizationId,
  })
  protected async execute(
    params: CreateRolesParams
  ): Promise<CreateRolesResult> {
    const { userId, organizationId, domain, roles } = params;

    const createdRoles: Record<string, { id: string }> = {};
    const ownerRoleName = "owner";

    // Create predefined roles for the domain
    for (const roleConfig of roles) {
      const role = await this.createRole(organizationId, domain, roleConfig);
      createdRoles[roleConfig.name] = role;

      await this.addPoliciesForRole(organizationId, domain, roleConfig);
    }

    // Assign owner role to the user
    if (createdRoles[ownerRoleName]) {
      await this.assignOwnerRole(
        userId,
        organizationId,
        domain,
        createdRoles[ownerRoleName].id
      );
    }

    this.logger.debug(
      {
        userId,
        organizationId,
        domain,
        rolesCreated: Object.keys(createdRoles),
      },
      "CreateRolesScript: Roles initialized successfully"
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

  private async assignOwnerRole(
    userId: string,
    organizationId: string,
    domain: Domain,
    roleId: string
  ): Promise<void> {
    // Create user role assignment in database
    await this.repository.organization.createUserRole({
      organizationId,
      userId,
      roleId,
      domain,
      grantedBy: userId,
    });

    // Assign owner role in Casbin
    await this.repository.casbin.assignRole({
      organizationId,
      userId,
      role: "owner",
      domain,
    });
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
