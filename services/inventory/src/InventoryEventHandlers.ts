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
  FileHardDeletedEvent,
  EventHandlerResponse,
} from "@shopana/events";
import { Kernel } from "./kernel/Kernel.js";
import { FileHardDeletedScript } from "./scripts/media/FileHardDeletedScript.js";

@Injectable()
export class InventoryEventHandlers extends EventHandlers {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @EventHandler("productCreated")
  async handleProductCreated(params: {
    event: ProductCreatedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productCreated event"
    );
    return { success: true };
  }

  @EventHandler("productDeleted")
  async handleProductDeleted(params: {
    event: ProductDeletedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productDeleted event"
    );
    return { success: true };
  }

  @EventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdated(params: {
    event: ProductUpdatedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productUpdated event"
    );
    return { success: true };
  }

  @EventHandler("fileHardDeleted", { retry: { maxAttempts: 10 } })
  async handleFileHardDeleted(params: {
    event: FileHardDeletedEvent;
  }): Promise<EventHandlerResponse> {
    const { fileId } = params.event.payload;

    this.logger.debug(
      { eventId: params.event.eventId, fileId },
      "Received fileHardDeleted event"
    );

    try {
      const result = await this.kernel.runScript(FileHardDeletedScript, { fileId });
      this.logger.log(
        { fileId, deletedCount: result.deletedCount },
        "Cleaned up variant_media for hard-deleted file"
      );
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error({ fileId, error: message }, "Failed to clean up variant_media");
      return { success: false, error: { message, retryable: true } };
    }
  }
}
