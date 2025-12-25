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
  /** Organization ID where the store will be created */
  organizationId: string;
}

export interface StoreCreateOutput {
  storeId: string;
  organizationId: string;
}

/**
 * Durable workflow for store creation.
 *
 * Steps:
 * 1. Generate store ID (UUIDv7)
 * 2. Create store record in database
 * 3. Save IAM integration reference with organizationId
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
    const { organizationId } = input;

    // Step 1: Generate store ID (must be in step for determinism)
    const storeId = await this.generateStoreId();

    // Step 2: Create store in database with organizationId
    await this.createStore(storeId, input, organizationId);

    // Step 3: Save IAM integration with organizationId
    await this.saveIamIntegration(storeId, organizationId);

    return { storeId, organizationId };
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
