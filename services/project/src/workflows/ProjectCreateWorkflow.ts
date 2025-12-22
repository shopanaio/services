import { DBOS } from "@shopana/workflows";
import { v7 as uuidv7 } from "uuid";
import { BaseWorkflow } from "./BaseWorkflow.js";
import type {
  CurrencyCode,
  LocaleCode,
  ProjectStatus,
} from "../repositories/models/index.js";

export interface ProjectCreateInput {
  name: string;
  slug: string;
  locales: LocaleCode[];
  currencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  status?: ProjectStatus;
  timezone?: string;
  email?: string;
}

export interface ProjectCreateOutput {
  projectId: string;
}

/** IAM tenant provisioning result */
interface IamProvisionResult {
  tenantId: string;
}

/**
 * Durable workflow for project creation.
 *
 * Steps:
 * 1. Generate project ID (UUIDv7)
 * 2. Create project record in database
 * 3. Provision IAM tenant with same ID (via broker)
 * 4. Save IAM integration reference
 */
export class ProjectCreateWorkflow extends BaseWorkflow {

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

    // Step 2: Provision IAM tenant with same ID as project (external - via broker)
    await this.provisionIamTenant(projectId);

    // Step 3: Save IAM integration (local)
    await this.saveIamIntegration(projectId);

    return { projectId };
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
   * Step: Create project in database (LOCAL - @Executable handles transaction)
   */
  @DBOS.step()
  async createProject(projectId: string, input: ProjectCreateInput) {
    return this.repository.project.create({
      id: projectId,
      name: input.name,
      slug: input.slug,
      locales: input.locales,
      currencies: input.currencies,
      defaultCurrency: input.defaultCurrency,
      status: input.status,
      timezone: input.timezone,
      email: input.email,
    });
  }

  /**
   * Step: Provision IAM tenant (EXTERNAL - via broker)
   * Uses projectId as tenantId - they are the same
   */
  @DBOS.step()
  async provisionIamTenant(projectId: string): Promise<IamProvisionResult> {
    return this.broker.call("iam.provisionTenant", {
      tenantId: projectId,
    });
  }

  /**
   * Step: Save IAM integration (LOCAL - direct repository call)
   * Only stores reference to IAM tenant (same ID as project)
   */
  @DBOS.step()
  async saveIamIntegration(projectId: string) {
    return this.repository.integration.create({
      projectId,
      type: "iam",
      provider: "internal",
      config: {
        tenantId: projectId, // Same as projectId
      },
    });
  }
}
