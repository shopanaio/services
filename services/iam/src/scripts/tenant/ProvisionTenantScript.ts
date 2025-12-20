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
 * Callers only see: tenantId, clientId, clientSecret
 */
export class ProvisionTenantScript extends BaseScript<
  ProvisionTenantParams,
  ProvisionTenantResult
> {
  protected async execute(
    params: ProvisionTenantParams
  ): Promise<ProvisionTenantResult> {
    const { slug, displayName, redirectUri } = params;

    const orgName = slug;
    const appName = `${slug}-app`;
    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomUUID();

    // Step 1: Create Casdoor organization
    const organization = {
      owner: "admin",
      name: orgName,
      displayName: displayName,
      websiteUrl: `https://${slug}.shopana.io`,
      favicon: "",
      enableSoftDeletion: true,
    };

    const orgResult = await this.repository.client.sdk.addOrganization(
      organization as any
    );
    if ((orgResult.data as any) !== "Affected") {
      return {
        tenantId: null,
        clientId: null,
        clientSecret: null,
        userErrors: [
          {
            code: "ORG_CREATE_FAILED",
            message: `Failed to create IAM organization: ${orgResult.data}`,
          },
        ],
      };
    }
    this.logger.debug(`Created IAM organization: ${orgName}`);

    // Step 2: Create Casdoor application
    const application = {
      owner: "admin",
      name: appName,
      displayName: `${displayName} App`,
      organization: orgName,
      clientId,
      clientSecret,
      enablePassword: true,
      enableSignUp: true,
      redirectUris: redirectUri ? [redirectUri] : [],
      providers: [],
      signupItems: [
        { name: "ID", visible: false, required: true, rule: "Random" },
        { name: "Username", visible: true, required: true, rule: "None" },
        { name: "Display name", visible: true, required: true, rule: "None" },
        { name: "Password", visible: true, required: true, rule: "None" },
        {
          name: "Confirm password",
          visible: true,
          required: true,
          rule: "None",
        },
        { name: "Email", visible: true, required: true, rule: "None" },
      ],
    };

    const appResult = await this.repository.client.sdk.addApplication(
      application as any
    );
    if ((appResult.data as any) !== "Affected") {
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
        clientId: null,
        clientSecret: null,
        userErrors: [
          {
            code: "APP_CREATE_FAILED",
            message: `Failed to create IAM application: ${appResult.data}`,
          },
        ],
      };
    }
    this.logger.debug(`Created IAM application: ${appName}`);

    // Return black box result - no Casdoor-specific details exposed
    return {
      tenantId: orgName, // tenantId is the org name (opaque to caller)
      clientId,
      clientSecret,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProvisionTenantResult {
    return {
      tenantId: null,
      clientId: null,
      clientSecret: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during tenant provisioning",
        },
      ],
    };
  }
}
