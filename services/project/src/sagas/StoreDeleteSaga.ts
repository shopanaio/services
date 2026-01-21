import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { Media } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";

export interface StoreDeleteInput {
  storeId: string;
  organizationId: string;
  userId?: string;
}

export interface StoreDeleteOutput {
  deletedStoreId: string;
  organizationId: string;
}

/**
 * Saga for store deletion.
 *
 * Steps:
 * 1. Delete store record from database
 * 2. Delete media asset group (cascades to all files)
 * 3. Notify about entity deletion (unlink back-refs)
 * 4. Emit storeDeleted event
 */
@Injectable()
export class StoreDeleteSaga extends BrokerSaga<StoreDeleteInput, StoreDeleteOutput> {
  constructor(@InjectBroker("project") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Saga("storeDelete")
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

  @SagaStep()
  private async deleteStore(storeId: string): Promise<void> {
    await this.kernel.repository.store.delete(storeId);
  }

  @SagaStep({ critical: false })
  private async deleteMediaAssetGroup(storeId: string): Promise<void> {
    try {
      await this.broker.call<Media.DeleteAssetGroupResult, Media.DeleteAssetGroupParams>(
        "media.deleteAssetGroup",
        { ownerType: "store", ownerId: storeId },
      );
      this.logger.debug({ storeId }, "Deleted media asset group for store");
    } catch (error) {
      this.logger.warn({ storeId, error }, "Failed to delete media asset group for store");
    }
  }

  @SagaStep({ critical: false })
  private async notifyEntityDeleted(storeId: string): Promise<void> {
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
      this.logger.warn({ storeId, error }, "Failed to notify entity deletion for store");
    }
  }

  @SagaStep({ critical: false })
  private async emitStoreDeleted(input: StoreDeleteInput): Promise<void> {
    await this.broker.emit("storeDeleted", {
      payload: {
        storeId: input.storeId,
        organizationId: input.organizationId,
      },
      context: {
        tenantId: input.organizationId,
        userId: input.userId,
      },
      subject: { type: "store", id: input.storeId },
      actor: input.userId ? { type: "user", id: input.userId } : undefined,
      emitKey: `store:${input.storeId}`,
    });
  }
}
