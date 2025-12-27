import { DBOS } from "@shopana/workflows";
import { v7 as uuidv7 } from "uuid";
import { BaseWorkflow } from "./BaseWorkflow.js";
import type {
  CurrencyCode,
  LocaleCode,
  StoreStatus,
} from "../repositories/models/index.js";
import { STORE_ROLES } from "../constants/index.js";

export interface StoreCreateInput {
  /** URL-friendly identifier (e.g., "my-store") */
  name: string;
  /** Human-readable display name (e.g., "My Store") */
  displayName: string;
  locales: LocaleCode[];
  currencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  status?: StoreStatus;
  timezone?: string;
  email?: string;
  /** Organization ID where the store will be created */
  organizationId: string;
  /** User ID of the store creator (will be assigned owner role) */
  userId: string;
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
 * 2. Create store record in database with organizationId
 */
export class StoreCreateWorkflow extends BaseWorkflow {

  /**
   * Generate globally unique workflowID from name.
   * Name must be unique across all stores.
   */
  static workflowID(name: string): string {
    return `store:create:${name}`;
  }

  /**
   * Main workflow - orchestrates store creation
   */
  @DBOS.workflow()
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const { organizationId, userId } = input;

    // Step 1: Generate store ID (must be in step for determinism)
    const storeId = await this.generateStoreId();

    // Step 2: Create store in database with organizationId
    await this.createStore(storeId, input, organizationId);

    // Step 3: Create store roles
    await this.createRoles(storeId, organizationId, userId);

    // Step 4: Assign owner role to creator
    await this.assignOwnerRole(storeId, organizationId, userId);

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
      displayName: input.displayName,
      locales: input.locales,
      currencies: input.currencies,
      defaultCurrency: input.defaultCurrency,
      status: input.status,
      timezone: input.timezone,
      email: input.email,
    });
  }

  /**
   * Step: Create roles for store domain
   */
  @DBOS.step()
  async createRoles(storeId: string, organizationId: string, userId: string) {
    const result = await this.broker.call("iam.createRoles", {
      userId,
      organizationId,
      domain: `store:${storeId}`,
      roles: STORE_ROLES,
    }) as { success: boolean; error?: string };

    if (!result.success) {
      throw new Error(result.error || "Failed to create store roles");
    }
  }

  /**
   * Step: Assign owner role to store creator
   */
  @DBOS.step()
  async assignOwnerRole(storeId: string, organizationId: string, userId: string) {
    const result = await this.broker.call("iam.assignRole", {
      userId,
      organizationId,
      domain: `store:${storeId}`,
      roleName: "owner",
    }) as { success: boolean; error?: string };

    if (!result.success) {
      throw new Error(result.error || "Failed to assign owner role");
    }
  }
}
