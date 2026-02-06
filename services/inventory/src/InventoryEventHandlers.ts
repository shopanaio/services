import { Injectable } from "@nestjs/common";
import {
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { EventHandlerResponse } from "@shopana/events";
import { Kernel } from "./kernel/Kernel.js";

// Event payload types (events come from Catalog service)
interface VariantCreatedEvent {
  eventId: string;
  payload: {
    variantId: string;
    productId: string;
    projectId: string;
  };
}

interface VariantDeletedEvent {
  eventId: string;
  payload: {
    variantId: string;
    productId: string;
  };
}

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
      `Received variantCreated event: eventId=${params.event.eventId}, variantId=${variantId}, productId=${productId}`
    );

    try {
      // Create InventoryItem for this variant
      const item = await this.kernel.repository.inventoryItem.upsertByVariantId(variantId, {
        trackInventory: false,
      });

      this.logger.log(
        `Created InventoryItem for new variant: variantId=${variantId}, inventoryItemId=${item.id}`
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
      `Received variantDeleted event: eventId=${params.event.eventId}, variantId=${variantId}, productId=${productId}`
    );

    // Note: InventoryItem and related data will be cascade-deleted
    // via database foreign keys. This handler can be used for:
    // - Logging/audit
    // - Additional cleanup (e.g., external systems)
    // - Analytics updates

    this.logger.log(
      `Variant deleted - inventory data will be cascade deleted: variantId=${variantId}`
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
      `Received stockLevelChanged event: eventId=${params.event.eventId}, variantId=${variantId}, warehouseId=${warehouseId}, ${previousLevel} -> ${newLevel}`
    );

    // TODO: Implement low-stock alerts
    // Check if newLevel is below threshold and trigger notification

    return { success: true };
  }
}
