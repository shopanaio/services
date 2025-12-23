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
  /** User ID of the creator - will be assigned owner role */
  userId: string;
}

export interface ProjectCreateOutput {
  projectId: string;
  organizationId: string;
}

/** IAM tenant provisioning result */
interface IamProvisionResult {
  organizationId: string | null;
  roles: string[];
  userErrors: Array<{ code: string; message: string }>;
}

/**
 * Durable workflow for project creation.
 *
 * Steps:
 * 1. Generate project ID (UUIDv7)
 * 2. Create project record in database
 * 3. Provision IAM organization (via broker) - returns new organizationId, assigns owner role
 * 4. Save IAM integration reference with returned organizationId
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

    // Step 2: Provision IAM tenant (external - via broker)
    const iamResult = await this.provisionIamTenant(input.userId);

    // Verify tenant was created successfully
    if (!iamResult.organizationId) {
      throw new Error("Failed to provision IAM tenant: " + JSON.stringify(iamResult.userErrors));
    }

    // Step 3: Save IAM integration with returned organizationId
    await this.saveIamIntegration(projectId, iamResult.organizationId);

    return { projectId, organizationId: iamResult.organizationId };
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
   * IAM creates tenant with auto-generated UUIDv7 and returns organizationId
   * Also assigns owner role to the specified user
   */
  @DBOS.step()
  async provisionIamTenant(ownerId: string): Promise<IamProvisionResult> {
    console.log(`[ProjectCreateWorkflow.provisionIamTenant] Calling iam.provisionTenant with ownerId=${ownerId}`);
    const result = await this.broker.call("iam.provisionTenant", { ownerId });
    console.log(`[ProjectCreateWorkflow.provisionIamTenant] Result:`, JSON.stringify(result));
    return result;
  }

  /**
   * Step: Save IAM integration (LOCAL - direct repository call)
   * Stores reference to IAM organization returned by provisioning
   */
  @DBOS.step()
  async saveIamIntegration(projectId: string, organizationId: string) {
    console.log(`[ProjectCreateWorkflow.saveIamIntegration] projectId=${projectId}, organizationId=${organizationId}`);
    const result = await this.repository.integration.create({
      projectId,
      type: "iam",
      provider: "internal",
      config: { organizationId },
    });
    console.log(`[ProjectCreateWorkflow.saveIamIntegration] Created integration:`, JSON.stringify(result));
    return result;
  }
}
