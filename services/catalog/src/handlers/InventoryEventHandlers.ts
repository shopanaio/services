import { Injectable } from "@nestjs/common";
import {
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { EventHandlerResponse } from "@shopana/events";

/**
 * Event handlers for Inventory service.
 *
 * Event handlers for inventory-side events that are not part of the
 * product/variant catalog lifecycle.
 */
@Injectable()
export class InventoryEventHandlers extends EventHandlers {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
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
