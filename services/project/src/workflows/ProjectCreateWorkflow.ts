import { BaseWorkflow, DBOS } from '@shopana/workflows';
import type { CurrencyCode, LocaleCode, ProjectStatus } from '../repositories/models/index.js';

export interface ProjectCreateInput {
  name: string;
  slug: string;
  locales: LocaleCode[];
  defaultCurrency: CurrencyCode;
  status?: ProjectStatus;
  timezone?: string;
  email?: string;
  ownerId: string;
}

export interface ProjectCreateOutput {
  projectId: string;
  iamTenantId: string;
}

/** IAM tenant setup result (black box - implementation agnostic) */
interface IamTenantSetupResult {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Durable workflow for project creation.
 *
 * This workflow orchestrates the creation of a project across multiple services:
 * 1. Creates the project record in the database
 * 2. Provisions IAM tenant for the project (organization + application)
 * 3. Saves IAM integration to project_integration table
 * 4. Links the owner to the project
 *
 * IAM is treated as a black box - the workflow doesn't know the underlying
 * identity provider (Casdoor, Auth0, Keycloak, etc.)
 */
export class ProjectCreateWorkflow extends BaseWorkflow {

  /**
   * Main workflow - orchestrates project creation
   */
  @DBOS.workflow()
  async run(input: ProjectCreateInput): Promise<ProjectCreateOutput> {
    const projectId = crypto.randomUUID();

    // Step 1: Create project in database
    await this.createProject(projectId, input);

    // Step 2: Provision IAM tenant (black box - handles org + app internally)
    const iamTenant = await this.provisionIamTenant(projectId, input);

    // Step 3: Save IAM integration to project_integration table
    await this.saveIamIntegration(projectId, iamTenant);

    // Step 4: Link owner to project
    await this.linkOwnerToProject(projectId, input.ownerId);

    return {
      projectId,
      iamTenantId: iamTenant.tenantId,
    };
  }

  /**
   * Step: Create project in database
   */
  @DBOS.step()
  async createProject(projectId: string, input: ProjectCreateInput) {
    return this.broker.call('project.create', {
      id: projectId,
      name: input.name,
      slug: input.slug,
      locales: input.locales,
      defaultCurrency: input.defaultCurrency,
      status: input.status ?? 'active',
      timezone: input.timezone ?? 'UTC',
      email: input.email,
    });
  }

  /**
   * Step: Provision IAM tenant via IAM service (black box)
   * IAM service handles all identity provider details internally
   */
  @DBOS.step()
  async provisionIamTenant(
    projectId: string,
    input: ProjectCreateInput
  ): Promise<IamTenantSetupResult> {
    return this.broker.call('iam.provisionTenant', {
      projectId,
      slug: input.slug,
      displayName: input.name,
      redirectUri: `https://${input.slug}.shopana.io/callback`,
    });
  }

  /**
   * Step: Save IAM integration to project_integration table
   */
  @DBOS.step()
  async saveIamIntegration(projectId: string, iamTenant: IamTenantSetupResult) {
    return this.broker.call('project.saveIntegration', {
      projectId,
      type: 'iam',
      provider: 'casdoor',
      config: {
        tenantId: iamTenant.tenantId,
      },
      credentials: {
        clientId: iamTenant.clientId,
        clientSecret: iamTenant.clientSecret,
      },
    });
  }

  /**
   * Step: Link owner to project
   */
  @DBOS.step()
  async linkOwnerToProject(projectId: string, ownerId: string) {
    return this.broker.call('project.addMember', {
      projectId,
      userId: ownerId,
      role: 'owner',
    });
  }
}
