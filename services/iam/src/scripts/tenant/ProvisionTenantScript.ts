import { Application, Organization } from "@zaytra/casdoor-node-client-ext";
import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ProvisionTenantParams,
  ProvisionTenantResult,
} from "./dto/ProvisionTenantDto.js";
import { PREDEFINED_ROLES, getTenantOrg } from "../../constants/index.js";

/**
 * Provision IAM tenant (black box action)
 *
 * TENANT ISOLATION:
 * Each tenant gets its own Casdoor Organization with:
 * - Organization: org-{slug}
 * - Application: app-{slug}
 * - Model: model-rbac (owned by tenant org)
 * - Enforcer: enforcer-main (owned by tenant org)
 * - Roles: owner, admin, manager, support, viewer (simple names)
 * - Permissions: owned by tenant org
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

    // Tenant organization name: org-{slug}
    const tenantOrg = getTenantOrg(slug);
    const appName = `app-${slug}`;

    // Step 1: Create Casdoor organization for tenant
    const organization: Organization = {
      owner: this.repository.adminOrganization,
      name: tenantOrg,
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
    this.logger.debug(`Created IAM organization: ${tenantOrg}`);

    // Step 2: Create Model for this tenant
    const modelResult = await this.repository.authorization.ensureModelExists(tenantOrg);
    if (!modelResult.success) {
      // Rollback: delete the organization
      await this.rollbackOrganization(tenantOrg);
      return {
        tenantId: null,
        roles: [],
        userErrors: [
          {
            code: "MODEL_CREATE_FAILED",
            message: `Failed to create model: ${modelResult.error}`,
          },
        ],
      };
    }
    this.logger.debug(`Created Model for tenant: ${tenantOrg}`);

    // Step 3: Create Enforcer for this tenant
    const enforcerResult = await this.repository.authorization.ensureEnforcerExists(tenantOrg);
    if (!enforcerResult.success) {
      // Rollback: delete the organization
      await this.rollbackOrganization(tenantOrg);
      return {
        tenantId: null,
        roles: [],
        userErrors: [
          {
            code: "ENFORCER_CREATE_FAILED",
            message: `Failed to create enforcer: ${enforcerResult.error}`,
          },
        ],
      };
    }
    this.logger.debug(`Created Enforcer for tenant: ${tenantOrg}`);

    // Step 4: Create Casdoor application
    const application: Application = {
      owner: tenantOrg,
      name: appName,
      createdTime: new Date().toISOString(),
      displayName: `${displayName} App`,
      logo: "",
      homepageUrl: "",
      description: "",
      organization: tenantOrg,
      enablePassword: true,
      enableSignUp: true,
    };

    const appResult = await this.repository.client.sdk.addApplication(
      application
    );
    const appResponse = appResult.data as any;
    if (appResponse?.status !== "ok" || appResponse?.data !== "Affected") {
      // Rollback: delete the organization
      await this.rollbackOrganization(tenantOrg);
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

    // Step 5: Create predefined roles and permissions
    const rolesResult = await this.repository.authorization.provisionTenantRoles(
      tenantOrg,
      ownerId
    );

    if (!rolesResult.success) {
      // Rollback: delete application and organization
      await this.rollbackApplication(tenantOrg, appName);
      await this.rollbackOrganization(tenantOrg);

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
    this.logger.debug(`Created predefined roles for tenant: ${tenantOrg}`);

    // Return simple role names (not prefixed with projectId anymore)
    const roleNames = Object.values(PREDEFINED_ROLES);

    // Return black box result - no Casdoor-specific details exposed
    return {
      tenantId: tenantOrg, // tenantId is the tenant org name
      roles: roleNames,
      userErrors: [],
    };
  }

  /**
   * Rollback helper: delete organization
   */
  private async rollbackOrganization(tenantOrg: string): Promise<void> {
    try {
      await this.repository.client.sdk.deleteOrganization({
        owner: "admin",
        name: tenantOrg,
      } as any);
    } catch (e) {
      this.logger.warn(`Failed to rollback organization ${tenantOrg}: ${e}`);
    }
  }

  /**
   * Rollback helper: delete application
   */
  private async rollbackApplication(tenantOrg: string, appName: string): Promise<void> {
    try {
      await this.repository.client.sdk.deleteApplication({
        owner: tenantOrg,
        name: appName,
      } as any);
    } catch (e) {
      this.logger.warn(`Failed to rollback application ${appName}: ${e}`);
    }
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
