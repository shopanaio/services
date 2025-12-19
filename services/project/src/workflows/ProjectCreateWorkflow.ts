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
  casdoorOrganizationId: string;
}

/**
 * Durable workflow for project creation.
 *
 * This workflow orchestrates the creation of a project across multiple services:
 * 1. Creates the project record in the database
 * 2. Creates a Casdoor organization for the project (IAM)
 * 3. Creates a Casdoor application for the project
 * 4. Links the owner to the project
 * 5. Updates the project with Casdoor data
 *
 * If any step fails, the workflow can be retried and will continue from the
 * last successful checkpoint, ensuring consistency across services.
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

    // Step 2: Create Casdoor organization (IAM)
    const casdoorOrg = await this.createCasdoorOrganization(input);

    // Step 3: Create Casdoor application
    const casdoorApp = await this.createCasdoorApplication(input, casdoorOrg.name);

    // Step 4: Link owner to project
    await this.linkOwnerToProject(projectId, input.ownerId);

    // Step 5: Update project with Casdoor data
    await this.updateProjectWithCasdoorData(projectId, casdoorOrg, casdoorApp);

    return {
      projectId,
      casdoorOrganizationId: casdoorOrg.name,
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
   * Step: Create Casdoor organization via IAM service
   */
  @DBOS.step()
  async createCasdoorOrganization(input: ProjectCreateInput): Promise<{ name: string }> {
    return this.broker.call('iam.createOrganization', {
      name: input.slug,
      displayName: input.name,
      owner: 'admin',
      websiteUrl: `https://${input.slug}.shopana.io`,
      enableSoftDeletion: true,
    });
  }

  /**
   * Step: Create Casdoor application
   */
  @DBOS.step()
  async createCasdoorApplication(
    input: ProjectCreateInput,
    organizationName: string
  ): Promise<{ name: string; clientId: string }> {
    return this.broker.call('iam.createApplication', {
      name: `${input.slug}-app`,
      displayName: `${input.name} Application`,
      organization: organizationName,
      enablePassword: true,
      enableSignUp: true,
      redirectUris: [`https://${input.slug}.shopana.io/callback`],
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

  /**
   * Step: Update project with Casdoor data
   */
  @DBOS.step()
  async updateProjectWithCasdoorData(
    projectId: string,
    casdoorOrg: { name: string },
    casdoorApp: { name: string; clientId: string }
  ) {
    return this.broker.call('project.update', {
      id: projectId,
      casdoorOrganization: casdoorOrg.name,
      casdoorApplication: casdoorApp.name,
      casdoorClientId: casdoorApp.clientId,
    });
  }
}
