import { BaseWorkflow, DBOS, type WorkflowServices } from '@shopana/workflows';
import type { Repository } from '../repositories/Repository.js';
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

/** Extended services for ProjectCreateWorkflow */
export interface ProjectWorkflowServices extends WorkflowServices {
  repository: Repository;
}

/**
 * Durable workflow for project creation.
 *
 * This workflow orchestrates the creation of a project across multiple services:
 * 1. Creates the project record in database (local - via repository)
 * 2. Provisions IAM tenant (external - via broker)
 * 3. Saves IAM integration (local - via repository)
 * 4. Links the owner to project (local - via repository)
 *
 * Local operations use repository directly.
 * External services (IAM) are called via broker.
 */
export class ProjectCreateWorkflow extends BaseWorkflow<ProjectWorkflowServices> {
  private readonly repository: Repository;

  constructor(services: ProjectWorkflowServices) {
    super(services);
    this.repository = services.repository;
  }

  /**
   * Main workflow - orchestrates project creation
   */
  @DBOS.workflow()
  async run(input: ProjectCreateInput): Promise<ProjectCreateOutput> {
    const projectId = crypto.randomUUID();

    // Step 1: Create project in database (local)
    await this.createProject(projectId, input);

    // Step 2: Provision IAM tenant (external - via broker)
    const iamTenant = await this.provisionIamTenant(projectId, input);

    // Step 3: Save IAM integration (local)
    await this.saveIamIntegration(projectId, iamTenant);

    // Step 4: Link owner to project (local)
    await this.linkOwnerToProject(projectId, input.ownerId);

    return {
      projectId,
      iamTenantId: iamTenant.tenantId,
    };
  }

  /**
   * Step: Create project in database (LOCAL - direct repository call)
   */
  @DBOS.step()
  async createProject(projectId: string, input: ProjectCreateInput) {
    return this.repository.project.create({
      id: projectId,
      name: input.name,
      slug: input.slug,
      locales: input.locales,
      defaultCurrency: input.defaultCurrency,
      status: input.status,
      timezone: input.timezone,
      email: input.email,
    });
  }

  /**
   * Step: Provision IAM tenant (EXTERNAL - via broker)
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
   * Step: Save IAM integration (LOCAL - direct repository call)
   */
  @DBOS.step()
  async saveIamIntegration(projectId: string, iamTenant: IamTenantSetupResult) {
    return this.repository.integration.create({
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
   * Step: Link owner to project (LOCAL - direct repository call)
   * TODO: Implement project_member table and repository
   */
  @DBOS.step()
  async linkOwnerToProject(projectId: string, ownerId: string) {
    // TODO: await this.repository.member.add({ projectId, userId: ownerId, role: 'owner' });
    this.logger.info(`Linking owner ${ownerId} to project ${projectId}`);
    return { success: true };
  }
}
