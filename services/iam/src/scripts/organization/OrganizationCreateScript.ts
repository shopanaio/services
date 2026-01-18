import {
  BaseScript,
  ZodSchema,
  Transactional,
  ValidationError,
  AuthorizationError,
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

    const roleKeys = Object.keys(Roles.organization) as Array<
      keyof typeof Roles.organization
    >;
    // Batch create all roles in single INSERT
    const roleInputs = roleKeys.map((roleName) => {
      const meta = RolesMeta.organization[roleName];
      return {
        organizationId: org.id,
        domain,
        name: roleName,
        displayName: meta.displayName,
        description: meta.description,
        isSystem: true,
      };
    });

    const createdRolesArray = await this.repository.organization.createRoles(
      roleInputs
    );

    const createdRoles = createdRolesArray.reduce((acc, role) => {
      acc[role.name] = role;
      return acc;
    }, {} as Record<string, (typeof createdRolesArray)[number]>);

    // Batch add all policies in single INSERT
    const allPolicies: Array<{
      role: string;
      domain: typeof ORG_DOMAIN;
      resource: string;
      action: string;
    }> = [];

    for (const roleName of Object.keys(Roles.organization) as Array<
      keyof typeof Roles.organization
    >) {
      const permissions = Roles.organization[roleName];
      for (const permission of permissions) {
        allPolicies.push({
          role: roleName,
          domain,
          resource: permission.resource,
          action: permission.action,
        });
      }
    }

    await this.repository.casbin.addPolicies({
      organizationId: org.id,
      policies: allPolicies,
    });

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

    // Note: Media asset group is created by OrganizationCreateWorkflow
    // after this transaction commits successfully

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
          : error instanceof AuthorizationError
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
