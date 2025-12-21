import { Application, Organization } from "@zaytra/casdoor-node-client-ext";
import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ProvisionTenantParams,
  ProvisionTenantResult,
} from "./dto/ProvisionTenantDto.js";
import { PREDEFINED_ROLES } from "../../constants/index.js";

/**
 * Provision IAM tenant (black box action)
 *
 * Internally creates:
 * - Casdoor organization for the project
 * - Casdoor application with OAuth2 credentials
 * - Predefined roles (owner, admin, manager, support, viewer)
 * - Casbin policies for each role
 * - Owner role assignment to the project creator
 *
 * Callers only see: tenantId, roles
 */
export class ProvisionTenantScript extends BaseScript<
  ProvisionTenantParams,
  ProvisionTenantResult
> {
  protected async execute(
    params: ProvisionTenantParams
  ): Promise<ProvisionTenantResult> {
    const { displayName, slug, ownerId } = params;

    const orgName = slug;
    const appName = `app-${slug}`;

    // Step 1: Create Casdoor organization
    const organization: Organization = {
      owner: this.repository.organization,
      name: orgName,
      createdTime: new Date().toISOString(),
      displayName,
      websiteUrl: "",
      passwordType: "plain",
      initScore: 0,
      enableSoftDeletion: true,
      isProfilePublic: false,
    };

    const orgResult = await this.repository.client.sdk.addOrganization(
      organization
    );
    const orgResponse = orgResult.data as any;
    if (orgResponse?.status !== "ok" || orgResponse?.data !== "Affected") {
      return {
        tenantId: null,
        roles: [],
        userErrors: [
          {
            code: "ORG_CREATE_FAILED",
            message: `Failed to create IAM organization: ${orgResponse?.msg || JSON.stringify(orgResponse)}`,
          },
        ],
      };
    }
    this.logger.debug(`Created IAM organization: ${orgName}`);

    // Step 2: Create Casdoor application
    const application: Application = {
      owner: this.repository.organization,
      name: appName,
      createdTime: new Date().toISOString(),
      displayName: `${displayName} App`,
      logo: "",
      homepageUrl: "",
      description: "",
      organization: orgName,
      enablePassword: true,
      enableSignUp: true,
    };

    const appResult = await this.repository.client.sdk.addApplication(
      application
    );
    const appResponse = appResult.data as any;
    if (appResponse?.status !== "ok" || appResponse?.data !== "Affected") {
      // Rollback: delete the organization we just created
      try {
        await this.repository.client.sdk.deleteOrganization({
          owner: "admin",
          name: orgName,
        } as any);
      } catch (e) {
        this.logger.warn(`Failed to rollback organization ${orgName}: ${e}`);
      }
      return {
        tenantId: null,
        roles: [],
        userErrors: [
          {
            code: "APP_CREATE_FAILED",
            message: `Failed to create IAM application: ${appResponse?.msg || JSON.stringify(appResponse)}`,
          },
        ],
      };
    }
    this.logger.debug(`Created IAM application: ${appName}`);

    // Step 3: Create predefined roles and permissions
    const projectId = orgName; // projectId is the same as orgName
    const rolesResult = await this.repository.authorization.provisionProjectRoles(
      projectId,
      ownerId
    );

    if (!rolesResult.success) {
      // Rollback: delete application and organization
      try {
        await this.repository.client.sdk.deleteApplication({
          owner: this.repository.organization,
          name: appName,
        } as any);
        await this.repository.client.sdk.deleteOrganization({
          owner: "admin",
          name: orgName,
        } as any);
      } catch (e) {
        this.logger.warn(`Failed to rollback on roles error: ${e}`);
      }

      return {
        tenantId: null,
        roles: [],
        userErrors: [
          {
            code: "ROLES_CREATE_FAILED",
            message: `Failed to create roles: ${rolesResult.error}`,
          },
        ],
      };
    }
    this.logger.debug(`Created predefined roles for project: ${projectId}`);

    // Build role names
    const roleNames = Object.values(PREDEFINED_ROLES).map(
      (role) => `${projectId}-${role}`
    );

    // Return black box result - no Casdoor-specific details exposed
    return {
      tenantId: orgName, // tenantId is the org name (opaque to caller)
      roles: roleNames,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProvisionTenantResult {
    return {
      tenantId: null,
      roles: [],
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during tenant provisioning",
        },
      ],
    };
  }
}
