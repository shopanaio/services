import {
  BaseScript,
  ZodSchema,
  ValidationError,
} from "../../kernel/BaseScript.js";
import {
  organizationCreateInputSchema,
  type OrganizationCreateParams,
  type OrganizationCreateResult,
} from "./dto/OrganizationCreateDto.js";

export class OrganizationCreateScript extends BaseScript<
  OrganizationCreateParams,
  OrganizationCreateResult
> {
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

    // Add current user as organization owner in organization_member table
    await this.repository.organization.addMember({
      organizationId: org.id,
      userId,
      orgRole: "owner",
    });

    // Assign owner role in Casbin for this organization
    await this.repository.casbin.assignRole({
      organizationId: org.id,
      userId,
      role: "owner",
      domain: `org:${org.id}`,
    });

    // Add default owner permissions
    await this.repository.casbin.addPolicy({
      organizationId: org.id,
      role: "owner",
      domain: `org:${org.id}`,
      resource: "*",
      action: "*",
      effect: "allow",
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
