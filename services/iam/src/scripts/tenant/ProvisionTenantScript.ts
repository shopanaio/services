import { Application, Organization } from "@zaytra/casdoor-node-client-ext";
import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ProvisionTenantParams,
  ProvisionTenantResult,
} from "./dto/ProvisionTenantDto.js";

/**
 * Provision IAM tenant (black box action)
 *
 * Internally creates:
 * - Casdoor organization for the project
 * - Casdoor application with OAuth2 credentials
 *
 * Callers only see: tenantId
 */
export class ProvisionTenantScript extends BaseScript<
  ProvisionTenantParams,
  ProvisionTenantResult
> {
  protected async execute(
    params: ProvisionTenantParams
  ): Promise<ProvisionTenantResult> {
    const { displayName, slug } = params;

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
        userErrors: [
          {
            code: "APP_CREATE_FAILED",
            message: `Failed to create IAM application: ${appResponse?.msg || JSON.stringify(appResponse)}`,
          },
        ],
      };
    }
    this.logger.debug(`Created IAM application: ${appName}`);

    // Return black box result - no Casdoor-specific details exposed
    return {
      tenantId: orgName, // tenantId is the org name (opaque to caller)
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProvisionTenantResult {
    return {
      tenantId: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during tenant provisioning",
        },
      ],
    };
  }
}
