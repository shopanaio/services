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
import { PREDEFINED_ROLES, ROLE_PERMISSIONS } from "../../constants/index.js";
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

    const ownerRole = PREDEFINED_ROLES.OWNER;
    const domain = createDomain("org", org.id);

    // Add current user as organization member
    await this.repository.organization.addMember({
      organizationId: org.id,
      userId,
    });

    // Assign owner role in Casbin for this organization
    await this.repository.casbin.assignRole({
      organizationId: org.id,
      userId,
      role: ownerRole,
      domain,
    });

    // Add predefined owner policies from ROLE_PERMISSIONS
    const ownerPermissions = ROLE_PERMISSIONS[ownerRole];
    for (const rule of ownerPermissions.allow) {
      for (const action of rule.actions) {
        await this.repository.casbin.addPolicy({
          organizationId: org.id,
          role: ownerRole,
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
