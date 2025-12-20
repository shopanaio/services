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
    const organization = {
      owner: this.repository.organization,
      name: orgName,
      displayName,
      enableSoftDeletion: true,
    } as Organization;

    const orgResult = await this.repository.client.sdk.addOrganization(
      organization
    );
    console.log(orgResult, "res");
    if ((orgResult.data as any) !== "Affected") {
      return {
        tenantId: null,
        userErrors: [
          {
            code: "ORG_CREATE_FAILED",
            message: `Failed to create IAM organization: ${JSON.stringify(
              orgResult.data
            )}`,
          },
        ],
      };
    }
    this.logger.debug(`Created IAM organization: ${orgName}`);

    // Step 2: Create Casdoor application
    const application: Partial<Application> = {
      owner: this.repository.organization,
      name: appName,
      displayName: `${displayName} App`,
      organization: orgName,
      enablePassword: true,
      enableSignUp: true,
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
        userErrors: [
          {
            code: "APP_CREATE_FAILED",
            message: `Failed to create IAM application: ${JSON.stringify(
              appResult.data
            )}`,
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
