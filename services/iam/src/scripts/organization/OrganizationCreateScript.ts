import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
} from "../../kernel/BaseScript.js";
import {
  organizationCreateInputSchema,
  type OrganizationCreateParams,
  type OrganizationCreateResult,
} from "./dto/OrganizationCreateDto.js";
import { Roles, RolesMeta } from "@shopana/rbac";
import { ORG_DOMAIN } from "../../casbin/CasbinService.js";

export class OrganizationCreateScript extends BaseScript<
  OrganizationCreateParams,
  OrganizationCreateResult
> {
  @Transactional()
  @ZodSchema(organizationCreateInputSchema)
  protected async execute(
    params: OrganizationCreateParams
  ): Promise<OrganizationCreateResult> {
    const { name, displayName } = params;
    const userId = this.currentUser.id;

    // Create organization in database
    const result = await this.repository.organization.create({
      name,
      displayName,
    });

    if (!result.success || !result.organization) {
      return {
        organization: null,
        userErrors: [
          {
            code: "ORGANIZATION_CREATE_FAILED",
            message: result.error || "Failed to create organization",
          },
        ],
      };
    }

    const org = result.organization;

    const adminRoleName = "admin";
    const domain = ORG_DOMAIN;

    // Create predefined roles from @shopana/rbac
    const createdRoles: Record<string, { id: string }> = {};
    for (const roleName of Object.keys(Roles.organization) as Array<
      keyof typeof Roles.organization
    >) {
      const meta = RolesMeta.organization[roleName];
      const role = await this.repository.organization.createRole({
        organizationId: org.id,
        domain,
        name: roleName,
        displayName: meta.displayName,
        description: meta.description,
        isSystem: true,
      });
      createdRoles[roleName] = role;

      // Add policies for this role
      const permissions = Roles.organization[roleName];
      for (const permission of permissions) {
        await this.repository.casbin.addPolicy({
          organizationId: org.id,
          role: roleName,
          domain,
          resource: permission.resource,
          action: permission.action,
        });
      }
    }

    // Add current user as organization member and owner
    await this.repository.organization.addMember({
      organizationId: org.id,
      userId,
      isOwner: true, // Creator is the owner
    });

    // Create user role assignment in user_role table (assign admin role to creator)
    await this.repository.organization.createUserRole({
      organizationId: org.id,
      userId,
      roleId: createdRoles[adminRoleName].id,
      domain,
      grantedBy: userId,
    });

    // Assign admin role in Casbin for this organization
    await this.repository.casbin.assignRole({
      organizationId: org.id,
      userId,
      role: adminRoleName,
      domain,
    });

    return {
      organization: org,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): OrganizationCreateResult {
    return {
      organization: null,
      userErrors:
        error instanceof ValidationError
          ? error.errors
          : [
              {
                code: "INTERNAL_ERROR",
                message: "An unexpected error occurred",
              },
            ],
    };
  }
}
