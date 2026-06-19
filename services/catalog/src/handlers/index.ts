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
import { Kernel } from "../kernel/Kernel.js";
import { FileHardDeletedScript } from "../scripts/media/FileHardDeletedScript.js";
import {
  DeleteProductIndexScript,
  SyncProductIndexScript,
  SyncVariantIndexScript,
} from "../scripts/search-index/index.js";

@Injectable()
export class CatalogEventHandlers extends EventHandlers {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
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
    try {
      const context = {
        storeId: params.event.payload.storeId,
        organizationId: params.event.context.tenantId,
        userId: params.event.context.userId,
        locale: "uk",
      };
      await this.kernel.runScript(
        SyncProductIndexScript,
        { productId: params.event.payload.productId },
        context
      );
      await this.kernel.runScript(
        SyncVariantIndexScript,
        { productId: params.event.payload.productId },
        context
      );
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { error: message, productId: params.event.payload.productId },
        "Failed to sync search indexes for productCreated"
      );
      return { success: false, error: { message, retryable: true } };
    }
  }

  @EventHandler("productDeleted")
  async handleProductDeleted(params: {
    event: ProductDeletedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productDeleted event"
    );
    try {
      await this.kernel.runScript(
        DeleteProductIndexScript,
        { productId: params.event.payload.productId },
        {
          storeId: params.event.payload.storeId,
          organizationId: params.event.context.tenantId,
          userId: params.event.context.userId,
          locale: "uk",
        }
      );
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { error: message, productId: params.event.payload.productId },
        "Failed to delete search indexes for productDeleted"
      );
      return { success: false, error: { message, retryable: true } };
    }
  }

  @EventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdated(params: {
    event: ProductUpdatedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productUpdated event"
    );
    try {
      const variantIds = params.event.payload.variants
        ? Object.keys(params.event.payload.variants)
        : undefined;
      const context = {
        storeId: params.event.payload.storeId,
        organizationId: params.event.context.tenantId,
        userId: params.event.context.userId,
        locale: "uk",
      };

      await this.kernel.runScript(
        SyncProductIndexScript,
        { productId: params.event.payload.productId },
        context
      );
      await this.kernel.runScript(
        SyncVariantIndexScript,
        {
          productId: params.event.payload.productId,
          variantIds,
        },
        context
      );
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { error: message, productId: params.event.payload.productId },
        "Failed to sync search indexes for productUpdated"
      );
      return { success: false, error: { message, retryable: true } };
    }
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
        { fileId, deletedProductMediaCount: result.deletedProductMediaCount },
        "Cleaned up product media registry for hard-deleted file"
      );
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { fileId, error: message },
        "Failed to clean up product media registry"
      );
      return { success: false, error: { message, retryable: true } };
    }
  }
}
