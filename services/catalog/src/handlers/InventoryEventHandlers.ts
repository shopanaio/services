import { Injectable } from "@nestjs/common";
import {
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { ContextStore } from "@shopana/shared-context";
import type { Catalog } from "@shopana/broker-types";
import type {
  EventHandlerResponse,
  ProductCreatedEvent,
  ProductDeletedEvent,
  ProductUpdatedEvent,
  VariantDeletedEvent,
} from "@shopana/events";
import { Kernel } from "../kernel/Kernel.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Loader } from "../loaders/Loader.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: Array<{
    code: string;
    message: string;
    field?: string[] | null;
  }>;
};

/**
 * Event handlers for Inventory service.
 *
 * After the Catalog/Inventory split:
 * - Listens for variant deleted events from Catalog
 * - Cleans up InventoryItem data when a Variant is deleted
 *
 * Note: InventoryItem creation is now handled by ProductCreateSaga
 * via the inventory.createItem broker action.
 */
@Injectable()
export class InventoryEventHandlers extends EventHandlers {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private async runWithStoreContext<T>(
    params: {
      store: ContextStore;
      userId?: string;
      requestId?: string;
      locale?: string;
    },
    fn: () => Promise<T>
  ): Promise<T> {
    const kernel = this.kernel;
    const ctx = new ServiceContext({
      requestId: params.requestId ?? `event-handler-${Date.now()}`,
      kernel,
      loaders: new Loader(kernel.repository),
      locale: params.locale ?? params.store.defaultLocale,
      store: params.store,
      user: params.userId
        ? { id: params.userId, name: "event-user" }
        : undefined,
    });

    return runWithContext(ctx, fn);
  }

  private async getStoreContext(storeId: string): Promise<ContextStore> {
    const result = await this.broker.call<
      GetStoreByIdResult,
      { id: string }
    >("project.getStoreById", { id: storeId });

    if (!result.store) {
      const message =
        result.userErrors[0]?.message ?? `Store with id "${storeId}" not found`;
      throw new Error(message);
    }

    return result.store;
  }

  @EventHandler("productCreated", { retry: { maxAttempts: 5 } })
  async handleProductCreated(params: {
    event: ProductCreatedEvent;
  }): Promise<EventHandlerResponse> {
    const event = params.event;
    this.logger.debug(
      { eventId: event.eventId, productId: event.payload.productId },
      "Received productCreated event"
    );

    return this.syncCatalogSnapshot({
      eventId: event.eventId,
      requestId: event.context.correlationId,
      storeId: event.payload.storeId,
      organizationId: event.context.tenantId,
      userId: event.context.userId,
      productId: event.payload.productId,
    });
  }

  @EventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdated(params: {
    event: ProductUpdatedEvent;
  }): Promise<EventHandlerResponse> {
    const event = params.event;
    this.logger.debug(
      { eventId: event.eventId, productId: event.payload.productId },
      "Received productUpdated event"
    );

    const variantIds =
      event.payload.product == null && event.payload.variants
        ? Object.keys(event.payload.variants)
        : undefined;

    return this.syncCatalogSnapshot({
      eventId: event.eventId,
      requestId: event.context.correlationId,
      storeId: event.payload.storeId,
      organizationId: event.context.tenantId,
      userId: event.context.userId,
      productId: event.payload.productId,
      variantIds,
    });
  }

  @EventHandler("productDeleted", { retry: { maxAttempts: 5 } })
  async handleProductDeleted(params: {
    event: ProductDeletedEvent;
  }): Promise<EventHandlerResponse> {
    const event = params.event;
    this.logger.debug(
      { eventId: event.eventId, productId: event.payload.productId },
      "Received productDeleted event"
    );

    try {
      const store = await this.getStoreContext(event.payload.storeId);

      await this.runWithStoreContext(
        {
          requestId: event.context.correlationId,
          store,
          userId: event.context.userId,
        },
        async () => {
          await this.kernel.repository.inventoryItem.softDeleteCatalogProjectionByProductId(
            event.payload.productId,
            event.eventId
          );
        }
      );

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { error: message, productId: event.payload.productId },
        "Failed to soft-delete inventory item catalog projection for productDeleted"
      );
      return { success: false, error: { message, retryable: true } };
    }
  }

  /**
   * Handle variant deleted event from Catalog service.
   * Cleans up inventory data for the deleted variant.
   *
   * Note: Due to foreign key cascades, most data (stock, dimensions, weight, cost)
   * will be automatically deleted. This handler is for any additional cleanup.
   */
  @EventHandler("variantDeleted", { retry: { maxAttempts: 5 } })
  async handleVariantDeleted(params: {
    event: VariantDeletedEvent;
  }): Promise<EventHandlerResponse> {
    const event = params.event;
    const { variantId, productId, storeId } = event.payload;

    this.logger.debug(
      { eventId: event.eventId, variantId, productId },
      "Received variantDeleted event"
    );

    try {
      const store = await this.getStoreContext(storeId);

      await this.runWithStoreContext(
        {
          requestId: event.context.correlationId,
          store,
          userId: event.context.userId,
        },
        async () => {
          await this.kernel.repository.inventoryItem.softDeleteCatalogProjectionByVariantId(
            variantId,
            event.eventId
          );
        }
      );

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { error: message, variantId, productId },
        "Failed to soft-delete inventory item catalog projection for variantDeleted"
      );
      return { success: false, error: { message, retryable: true } };
    }
  }

  private async syncCatalogSnapshot(params: {
    eventId: string;
    requestId?: string;
    storeId: string;
    organizationId: string;
    userId?: string;
    productId: string;
    variantIds?: string[];
  }): Promise<EventHandlerResponse> {
    try {
      const store = await this.getStoreContext(params.storeId);

      return await this.runWithStoreContext(
        {
          requestId: params.requestId,
          store,
          userId: params.userId,
        },
        async () => {
          const result = await this.broker.call<
            Catalog.GetInventoryItemProjectionSnapshotResult,
            Catalog.GetInventoryItemProjectionSnapshotParams
          >("catalog.getInventoryItemProjectionSnapshot", {
            storeId: params.storeId,
            organizationId: params.organizationId,
            locale: store.defaultLocale,
            userId: params.userId,
            requestId: params.requestId,
            productId: params.productId,
            variantIds: params.variantIds,
          });

          if (!result.ok) {
            return {
              success: false,
              error: {
                message: result.message,
                code: result.code,
                retryable: result.retryable,
              },
            };
          }

          await this.kernel.repository.inventoryItem.upsertCatalogProjectionSnapshot(
            result.snapshot,
            params.eventId
          );

          return { success: true };
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { error: message, productId: params.productId },
        "Failed to sync inventory item catalog projection snapshot"
      );
      return { success: false, error: { message, retryable: true } };
    }
  }

  /**
   * Handle stock level changes for alerting/notifications.
   * This could trigger low-stock alerts, etc.
   */
  @EventHandler("stockLevelChanged")
  async handleStockLevelChanged(params: {
    event: {
      eventId: string;
      payload: {
        variantId: string;
        warehouseId: string;
        previousLevel: number;
        newLevel: number;
        movementType: string;
      };
    };
  }): Promise<EventHandlerResponse> {
    const { variantId, warehouseId, previousLevel, newLevel, movementType } =
      params.event.payload;

    this.logger.debug(
      `Received stockLevelChanged event: eventId=${params.event.eventId}, variantId=${variantId}, warehouseId=${warehouseId}, ${previousLevel} -> ${newLevel}`
    );

    // TODO: Implement low-stock alerts
    // Check if newLevel is below threshold and trigger notification

    return { success: true };
  }
}
