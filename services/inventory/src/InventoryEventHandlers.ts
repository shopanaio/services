import { Injectable } from "@nestjs/common";
import {
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type {
  ProductCreatedEvent,
  ProductDeletedEvent,
  ProductUpdatedEvent,
  EventHandlerResponse,
} from "@shopana/events";

@Injectable()
export class InventoryEventHandlers extends EventHandlers {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("productCreated")
  async handleProductCreated(params: {
    event: ProductCreatedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productCreated event"
    );
    return { ok: true };
  }

  @EventHandler("productDeleted")
  async handleProductDeleted(params: {
    event: ProductDeletedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productDeleted event"
    );
    return { ok: true };
  }

  @EventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdated(params: {
    event: ProductUpdatedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productUpdated event"
    );
    return { ok: true };
  }
}
