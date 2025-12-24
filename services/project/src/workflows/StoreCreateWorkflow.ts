import { DBOS } from "@shopana/workflows";
import { v7 as uuidv7 } from "uuid";
import { BaseWorkflow } from "./BaseWorkflow.js";
import type {
  CurrencyCode,
  LocaleCode,
  StoreStatus,
} from "../repositories/models/index.js";

export interface StoreCreateInput {
  name: string;
  slug: string;
  locales: LocaleCode[];
  currencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  status?: StoreStatus;
  timezone?: string;
  email?: string;
  /** User ID of the creator - will be assigned owner role */
  userId: string;
}

export interface StoreCreateOutput {
  storeId: string;
  organizationId: string;
}

/** IAM tenant provisioning result */
interface IamProvisionResult {
  organizationId: string | null;
  roles: string[];
  userErrors: Array<{ code: string; message: string }>;
}

/**
 * Durable workflow for store creation.
 *
 * Steps:
 * 1. Generate store ID (UUIDv7)
 * 2. Create store record in database
 * 3. Provision IAM organization (via broker) - returns new organizationId, assigns owner role
 * 4. Save IAM integration reference with returned organizationId
 */
export class StoreCreateWorkflow extends BaseWorkflow {

  /**
   * Generate globally unique workflowID from slug.
   * Slug must be unique across all stores.
   */
  static workflowID(slug: string): string {
    return `store:create:${slug}`;
  }

  /**
   * Main workflow - orchestrates store creation
   */
  @DBOS.workflow()
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    // Step 0: Generate store ID (must be in step for determinism)
    const storeId = await this.generateStoreId();

    // Step 1: Provision IAM tenant first to get organizationId
    const iamResult = await this.provisionIamTenant(input.userId);

    // Verify tenant was created successfully
    if (!iamResult.organizationId) {
      throw new Error("Failed to provision IAM tenant: " + JSON.stringify(iamResult.userErrors));
    }

    // Step 2: Create store in database with organizationId
    await this.createStore(storeId, input, iamResult.organizationId);

    // Step 3: Save IAM integration with returned organizationId
    await this.saveIamIntegration(storeId, iamResult.organizationId);

    return { storeId, organizationId: iamResult.organizationId };
  }

  /**
   * Step: Generate UUIDv7 for store ID
   * Must be a step for determinism - result is persisted and reused on recovery
   */
  @DBOS.step()
  async generateStoreId(): Promise<string> {
    return uuidv7();
  }

  /**
   * Step: Create store in database (LOCAL - @Executable handles transaction)
   */
  @DBOS.step()
  async createStore(storeId: string, input: StoreCreateInput, organizationId: string) {
    return this.repository.store.create({
      id: storeId,
      organizationId,
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
    console.log(`[StoreCreateWorkflow.provisionIamTenant] Calling iam.provisionTenant with ownerId=${ownerId}`);
    const result = await this.broker.call("iam.provisionTenant", { ownerId });
    console.log(`[StoreCreateWorkflow.provisionIamTenant] Result:`, JSON.stringify(result));
    return result;
  }

  /**
   * Step: Save IAM integration (LOCAL - direct repository call)
   * Stores reference to IAM organization returned by provisioning
   */
  @DBOS.step()
  async saveIamIntegration(storeId: string, organizationId: string) {
    console.log(`[StoreCreateWorkflow.saveIamIntegration] storeId=${storeId}, organizationId=${organizationId}`);
    const result = await this.repository.integration.create({
      storeId,
      type: "iam",
      provider: "internal",
      config: { organizationId },
    });
    console.log(`[StoreCreateWorkflow.saveIamIntegration] Created integration:`, JSON.stringify(result));
    return result;
  }
}
