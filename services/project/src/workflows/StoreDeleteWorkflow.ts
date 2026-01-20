import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  ServiceBroker,
  Workflow,
  Step,
} from "@shopana/shared-kernel";
import type { Media } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";

export interface StoreDeleteInput {
  /** Store ID to delete */
  storeId: string;
  /** Organization ID the store belongs to */
  organizationId: string;
  /** User ID who initiated deletion (optional) */
  userId?: string;
}

export interface StoreDeleteOutput {
  deletedStoreId: string;
  organizationId: string;
}

/**
 * Durable workflow for store deletion.
 *
 * Steps:
 * 1. Delete store record from database
 * 2. Delete media asset group (cascades to all files)
 * 3. Notify about entity deletion (unlink back-refs)
 */
@Injectable()
export class StoreDeleteWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("project") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  /**
   * Generate globally unique workflowID from store ID.
   */
  static workflowID(storeId: string): string {
    return `store:delete:${storeId}`;
  }

  /**
   * Main workflow - orchestrates store deletion
   */
  @Workflow("storeDelete")
  async run(input: StoreDeleteInput): Promise<StoreDeleteOutput> {
    const { storeId, organizationId } = input;

    // Step 1: Delete store from database
    await this.deleteStore(storeId);

    // Step 2: Delete media asset group (cascades to all files)
    await this.deleteMediaAssetGroup(storeId);

    // Step 3: Notify about entity deletion (unlink back-refs)
    await this.notifyEntityDeleted(storeId);

    // Step 4: Emit storeDeleted event
    await this.emitStoreDeleted(input);

    return { deletedStoreId: storeId, organizationId };
  }

  /**
   * Step: Delete store from database
   */
  @Step()
  async deleteStore(storeId: string): Promise<void> {
    await this.kernel.repository.store.delete(storeId);
  }

  /**
   * Step: Delete media asset group for this store
   */
  @Step()
  async deleteMediaAssetGroup(storeId: string): Promise<void> {
    try {
      await this.broker.call<Media.DeleteAssetGroupResult, Media.DeleteAssetGroupParams>(
        "media.deleteAssetGroup",
        {
          ownerType: "store",
          ownerId: storeId,
        },
      );
      this.logger.debug({ storeId }, "Deleted media asset group for store");
    } catch (error) {
      // Log but don't fail the workflow - asset group deletion is best-effort
      this.logger.warn(
        { storeId, error },
        "Failed to delete media asset group for store"
      );
    }
  }

  /**
   * Step: Notify about entity deletion to unlink back-refs
   */
  @Step()
  async notifyEntityDeleted(storeId: string): Promise<void> {
    try {
      await this.broker.call<Media.EntityDeletedResult, Media.EntityDeletedParams>(
        "media.entityDeleted",
        {
          entityRef: {
            service: "project",
            entityType: "store",
            entityId: storeId,
          },
        },
      );
      this.logger.debug({ storeId }, "Notified entity deletion for store");
    } catch (error) {
      this.logger.warn(
        { storeId, error },
        "Failed to notify entity deletion for store"
      );
    }
  }

  /**
   * Step: Emit storeDeleted event
   */
  @Step()
  async emitStoreDeleted(input: StoreDeleteInput): Promise<void> {
    await this.broker.emit("storeDeleted", {
      payload: {
        storeId: input.storeId,
        organizationId: input.organizationId,
      },
      context: {
        tenantId: input.organizationId,
        userId: input.userId,
      },
      source: "project",
      subject: { type: "store", id: input.storeId },
      related: [{ type: "organization", id: input.organizationId }],
      actor: input.userId
        ? { type: "user", id: input.userId }
        : { type: "service", id: "project" },
      emitKey: `store:${input.storeId}`,
    });
  }
}
