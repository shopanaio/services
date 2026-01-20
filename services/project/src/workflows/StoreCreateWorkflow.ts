import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  ServiceBroker,
  Workflow,
  Step,
} from "@shopana/shared-kernel";
import { v7 as uuidv7 } from "uuid";
import { Kernel } from "../kernel/Kernel.js";
import type {
  CurrencyCode,
  LocaleCode,
  StoreStatus,
} from "../repositories/models/index.js";
import { Roles, RolesMeta } from "@shopana/rbac";

/** Convert @shopana/rbac Roles.store to RoleConfig[] format for iam.createRoles */
function buildStoreRoles() {
  return (Object.keys(Roles.store) as Array<keyof typeof Roles.store>).map(
    (roleName) => {
      const permissions = Roles.store[roleName];
      const meta = RolesMeta.store[roleName];
      return {
        name: roleName,
        displayName: meta.displayName,
        description: meta.description,
        permissions: permissions.map((p) => ({
          resource: p.resource,
          action: p.action,
        })),
      };
    }
  );
}

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
 * 3. Create store roles
 * 4. Assign admin role to creator
 * 5. Create media asset group
 */
@Injectable()
export class StoreCreateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("project") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

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
  @Workflow("storeCreate")
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const { organizationId, userId } = input;

    // Step 1: Generate store ID (must be in step for determinism)
    const storeId = await this.generateStoreId();

    // Step 2: Create store in database with organizationId
    await this.createStore(storeId, input, organizationId);

    // Step 3: Create store roles
    await this.createRoles(storeId, organizationId, userId);

    // Step 4: Assign admin role to creator
    await this.assignAdminRole(storeId, organizationId, userId);

    // Step 5: Create media asset group for this store
    await this.createMediaAssetGroup(storeId);

    return { storeId, organizationId };
  }

  /**
   * Step: Generate UUIDv7 for store ID
   */
  @Step()
  async generateStoreId(): Promise<string> {
    return uuidv7();
  }

  /**
   * Step: Create store in database
   */
  @Step()
  async createStore(
    storeId: string,
    input: StoreCreateInput,
    organizationId: string
  ) {
    return this.kernel.repository.store.create({
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
  @Step()
  async createRoles(storeId: string, organizationId: string, userId: string) {
    const result = (await this.broker.call("iam.createRoles", {
      userId,
      organizationId,
      domain: `store:${storeId}`,
      roles: buildStoreRoles(),
    })) as { success: boolean; error?: string };

    if (!result.success) {
      throw new Error(result.error || "Failed to create store roles");
    }
  }

  /**
   * Step: Assign admin role to store creator
   */
  @Step()
  async assignAdminRole(
    storeId: string,
    organizationId: string,
    userId: string
  ) {
    const result = (await this.broker.call("iam.assignRole", {
      userId,
      organizationId,
      domain: `store:${storeId}`,
      roleName: "admin",
    })) as { success: boolean; error?: string };

    if (!result.success) {
      throw new Error(result.error || "Failed to assign admin role");
    }
  }

  /**
   * Step: Create media asset group for this store
   */
  @Step()
  async createMediaAssetGroup(storeId: string) {
    await this.broker.call("media.createAssetGroup", {
      ownerType: "store",
      ownerId: storeId,
    });
  }
}
