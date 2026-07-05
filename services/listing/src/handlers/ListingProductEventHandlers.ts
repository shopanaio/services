import { Injectable } from "@nestjs/common";
import {
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type {
  EventHandlerResponse,
  ProductCreatedEvent,
  ProductDeletedEvent,
  ProductUpdatedEvent,
} from "@shopana/events";

@Injectable()
export class ListingProductEventHandlers extends EventHandlers {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("productCreated", { retry: { maxAttempts: 5 } })
  async handleProductCreated(params: {
    event: ProductCreatedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      {
        eventId: params.event.eventId,
        productId: params.event.payload.productId,
        storeId: params.event.payload.storeId,
      },
      "Received productCreated event"
    );

    return { success: true };
  }

  @EventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdated(params: {
    event: ProductUpdatedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      {
        eventId: params.event.eventId,
        productId: params.event.payload.productId,
        storeId: params.event.payload.storeId,
        revision: params.event.payload.revision,
        reasons: params.event.payload.reasons,
      },
      "Received productUpdated event"
    );

    return { success: true };
  }

  @EventHandler("productDeleted", { retry: { maxAttempts: 5 } })
  async handleProductDeleted(params: {
    event: ProductDeletedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      {
        eventId: params.event.eventId,
        productId: params.event.payload.productId,
        storeId: params.event.payload.storeId,
        revision: params.event.payload.revision,
        entityType: params.event.payload.entityType,
      },
      "Received productDeleted event"
    );

    return { success: true };
  }
}
