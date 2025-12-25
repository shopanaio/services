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
import {
  PREDEFINED_ROLES,
  ROLE_PERMISSIONS,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  type PredefinedRoleName,
} from "../../constants/index.js";
import { createDomain } from "../../casbin/CasbinService.js";

export class OrganizationCreateScript extends BaseScript<
  OrganizationCreateParams,
  OrganizationCreateResult
> {
  @Transactional()
  @ZodSchema(organizationCreateInputSchema)
  protected async execute(
    params: OrganizationCreateParams
  ): Promise<OrganizationCreateResult> {
    const { name, slug } = params;
    const userId = this.currentUser.id;

    // Create organization in database
    const result = await this.repository.organization.create({
      name,
      slug,
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

    const ownerRoleName = PREDEFINED_ROLES.OWNER;
    const domain = createDomain("org", org.id);

    // Create predefined roles in the role table
    const createdRoles: Record<string, { id: string }> = {};
    for (const roleName of Object.values(PREDEFINED_ROLES)) {
      const role = await this.repository.organization.createRole({
        organizationId: org.id,
        domain,
        name: roleName,
        displayName: ROLE_DISPLAY_NAMES[roleName as PredefinedRoleName],
        description: ROLE_DESCRIPTIONS[roleName as PredefinedRoleName],
        isSystem: true,
      });
      createdRoles[roleName] = role;
    }

    // Add current user as organization member
    await this.repository.organization.addMember({
      organizationId: org.id,
      userId,
    });

    // Create user role assignment in user_role table
    await this.repository.organization.createUserRole({
      organizationId: org.id,
      userId,
      roleId: createdRoles[ownerRoleName].id,
      domain,
      grantedBy: userId,
    });

    // Assign owner role in Casbin for this organization
    await this.repository.casbin.assignRole({
      organizationId: org.id,
      userId,
      role: ownerRoleName,
      domain,
    });

    // Add predefined owner policies from ROLE_PERMISSIONS
    const ownerPermissions = ROLE_PERMISSIONS[ownerRoleName];
    for (const rule of ownerPermissions.allow) {
      for (const action of rule.actions) {
        await this.repository.casbin.addPolicy({
          organizationId: org.id,
          role: ownerRoleName,
          domain,
          resource: rule.resource as "*",
          action,
          effect: "allow",
        });
      }
    }

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
