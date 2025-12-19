import { BaseWorkflow, DBOS, type WorkflowServices } from '@shopana/workflows';
import { v7 as uuidv7 } from 'uuid';
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
}

export interface ProjectCreateOutput {
  projectId: string;
  iamTenantId: string;
}

/** IAM tenant setup result */
interface IamTenantSetupResult {
  tenantId: string;
}

/** Extended services for ProjectCreateWorkflow */
export interface ProjectWorkflowServices extends WorkflowServices {
  repository: Repository;
}

/**
 * Durable workflow for project creation.
 *
 * Steps:
 * 1. Generate project ID (UUIDv7)
 * 2. Create project record in database
 * 3. Provision IAM tenant (via broker)
 * 4. Save IAM integration reference
 *
 * @example
 * const workflowID = ProjectCreateWorkflow.workflowID(input.slug);
 * await DBOS.startWorkflow(workflow, { workflowID }).run(input);
 */
export class ProjectCreateWorkflow extends BaseWorkflow<ProjectWorkflowServices> {
  private readonly repository: Repository;

  constructor(services: ProjectWorkflowServices) {
    super(services);
    this.repository = services.repository;
  }

  /**
   * Generate globally unique workflowID from slug.
   * Slug must be unique across all projects.
   */
  static workflowID(slug: string): string {
    return `project:create:${slug}`;
  }

  /**
   * Main workflow - orchestrates project creation
   */
  @DBOS.workflow()
  async run(input: ProjectCreateInput): Promise<ProjectCreateOutput> {
    // Step 0: Generate project ID (must be in step for determinism)
    const projectId = await this.generateProjectId();

    // Step 1: Create project in database (local)
    await this.createProject(projectId, input);

    // Step 2: Provision IAM tenant (external - via broker)
    const iamTenant = await this.provisionIamTenant(input);

    // Step 3: Save IAM integration (local)
    await this.saveIamIntegration(projectId, iamTenant);

    return {
      projectId,
      iamTenantId: iamTenant.tenantId,
    };
  }

  /**
   * Step: Generate UUIDv7 for project ID
   * Must be a step for determinism - result is persisted and reused on recovery
   */
  @DBOS.step()
  async generateProjectId(): Promise<string> {
    return uuidv7();
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
   */
  @DBOS.step()
  async provisionIamTenant(input: ProjectCreateInput): Promise<IamTenantSetupResult> {
    return this.broker.call('iam.provisionTenant', {
      slug: input.slug,
      displayName: input.name,
    });
  }

  /**
   * Step: Save IAM integration (LOCAL - direct repository call)
   * Only stores reference to IAM tenant, credentials are managed by IAM service
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
    });
  }
}
