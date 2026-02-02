import { Injectable } from "@nestjs/common";
import {
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type {
  VariantCreatedEvent,
  VariantDeletedEvent,
  EventHandlerResponse,
} from "@shopana/events";
import { Kernel } from "./kernel/Kernel.js";

/**
 * Event handlers for Inventory service.
 *
 * After the Catalog/Inventory split:
 * - Listens for variant created/deleted events from Catalog
 * - Auto-creates InventoryItem when a Variant is created
 * - Cleans up InventoryItem data when a Variant is deleted
 */
@Injectable()
export class InventoryEventHandlers extends EventHandlers {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  /**
   * Handle variant created event from Catalog service.
   * Creates a corresponding InventoryItem for the new variant.
   */
  @EventHandler("variantCreated")
  async handleVariantCreated(params: {
    event: VariantCreatedEvent;
  }): Promise<EventHandlerResponse> {
    const { variantId, productId, projectId } = params.event.payload;

    this.logger.debug(
      { eventId: params.event.eventId, variantId, productId },
      "Received variantCreated event"
    );

    try {
      // Create InventoryItem for this variant
      const item = await this.kernel.repository.inventoryItem.getOrCreate(variantId);

      this.logger.info(
        { variantId, inventoryItemId: item.id },
        "Created InventoryItem for new variant"
      );

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { variantId, error: message },
        "Failed to create InventoryItem"
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
  @EventHandler("variantDeleted")
  async handleVariantDeleted(params: {
    event: VariantDeletedEvent;
  }): Promise<EventHandlerResponse> {
    const { variantId, productId } = params.event.payload;

    this.logger.debug(
      { eventId: params.event.eventId, variantId, productId },
      "Received variantDeleted event"
    );

    // Note: InventoryItem and related data will be cascade-deleted
    // via database foreign keys. This handler can be used for:
    // - Logging/audit
    // - Additional cleanup (e.g., external systems)
    // - Analytics updates

    this.logger.info(
      { variantId },
      "Variant deleted - inventory data will be cascade deleted"
    );

    return { success: true };
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
      { eventId: params.event.eventId, variantId, warehouseId, previousLevel, newLevel },
      "Received stockLevelChanged event"
    );

    // TODO: Implement low-stock alerts
    // Check if newLevel is below threshold and trigger notification

    return { success: true };
  }
}
