import { Injectable } from "@nestjs/common";
import {
  BatchEventHandler,
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { ContextStore } from "@shopana/shared-context";
import type {
  DomainEvent,
  ProductCreatedEvent,
  ProductDeletedEvent,
  ProductUpdatedEvent,
  FileHardDeletedEvent,
  EventBatchHandlerResponse,
  EventHandlerResponse,
} from "@shopana/events";
import { Kernel } from "../kernel/Kernel.js";
import { FileHardDeletedScript } from "../scripts/media/FileHardDeletedScript.js";
import { CategoryProductsCountRefreshScript } from "../scripts/category/index.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: Array<{
    code: string;
    message: string;
    field?: string[] | null;
  }>;
};

type BatchProcessingResult = {
  failedEventIds: string[];
  errors: string[];
};

@Injectable()
export class CatalogEventHandlers extends EventHandlers {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private async getStoreContext(storeId: string): Promise<ContextStore> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: storeId },
    );

    if (!result.store) {
      const message = result.userErrors[0]?.message ?? `Store with id "${storeId}" not found`;
      throw new Error(message);
    }

    return result.store;
  }

  @EventHandler("productCreated", { retry: { maxAttempts: 5 } })
  async handleProductCreated(params: {
    event: ProductCreatedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productCreated event",
    );

    try {
      return { success: true };
    } catch (error) {
      return this.handleSingleError(
        error,
        "Failed to handle productCreated event",
        params.event.payload.productId,
      );
    }
  }

  @BatchEventHandler("productCreated", { retry: { maxAttempts: 5 } })
  async handleProductCreatedBatch(params: {
    events: ProductCreatedEvent[];
    payloads: ProductCreatedEvent["payload"][];
  }): Promise<EventBatchHandlerResponse> {
    this.logger.debug(
      {
        eventCount: params.events.length,
        productIds: params.payloads.map((payload) => payload.productId),
      },
      "Received productCreated event batch",
    );

    const result: BatchProcessingResult = { failedEventIds: [], errors: [] };

    return this.toBatchResponse(result, "Product created batch failed");
  }

  @EventHandler("productDeleted", { retry: { maxAttempts: 5 } })
  async handleProductDeleted(params: {
    event: ProductDeletedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productDeleted event",
    );

    const errors: string[] = [];

    try {
      const store = await this.getStoreContext(params.event.payload.storeId);

      try {
        await this.refreshCategoryProductCounts({
          categoryIds: params.event.payload.categoryIds,
          store,
          userId: params.event.context.userId,
        });
      } catch (error) {
        errors.push(errorMessage(error));
      }

      if (errors.length > 0) {
        throw new Error(unique(errors).join("; "));
      }

      return { success: true };
    } catch (error) {
      return this.handleSingleError(
        error,
        "Failed to handle productDeleted event",
        params.event.payload.productId,
      );
    }
  }

  @BatchEventHandler("productDeleted", { retry: { maxAttempts: 5 } })
  async handleProductDeletedBatch(params: {
    events: ProductDeletedEvent[];
    payloads: ProductDeletedEvent["payload"][];
  }): Promise<EventBatchHandlerResponse> {
    this.logger.debug(
      {
        eventCount: params.events.length,
        productIds: params.payloads.map((payload) => payload.productId),
      },
      "Received productDeleted event batch",
    );

    const result = await this.deleteProductEventBatch(params.events);

    return this.toBatchResponse(result, "Product deleted batch failed");
  }

  @EventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdated(params: {
    event: ProductUpdatedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productUpdated event",
    );

    const errors: string[] = [];

    try {
      const store = await this.getStoreContext(params.event.payload.storeId);

      void store;

      if (errors.length > 0) {
        throw new Error(unique(errors).join("; "));
      }

      return { success: true };
    } catch (error) {
      return this.handleSingleError(
        error,
        "Failed to handle productUpdated event",
        params.event.payload.productId,
      );
    }
  }

  @BatchEventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdatedBatch(params: {
    events: ProductUpdatedEvent[];
    payloads: ProductUpdatedEvent["payload"][];
  }): Promise<EventBatchHandlerResponse> {
    this.logger.debug(
      {
        eventCount: params.events.length,
        productIds: params.payloads.map((payload) => payload.productId),
      },
      "Received productUpdated event batch",
    );

    const result = await this.processProductUpdatedEvents(params.events);
    return this.toBatchResponse(result, "Product updated batch failed");
  }

  private async processProductUpdatedEvents(
    events: readonly ProductUpdatedEvent[],
  ): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = { failedEventIds: [], errors: [] };

    for (const storeEvents of groupEventsByStore(
      events,
      (event) => event.payload.storeId,
    ).values()) {
      const firstEvent = storeEvents[0];
      if (!firstEvent) continue;

      let store: ContextStore;
      try {
        store = await this.getStoreContext(firstEvent.payload.storeId);
      } catch (error) {
        markFailed(result, storeEvents, error);
        continue;
      }

      void store;
    }

    this.logBatchFailures(result, "Failed to handle productUpdated batch");
    return dedupeBatchResult(result);
  }

  private async deleteProductEventBatch(
    events: readonly ProductDeletedEvent[],
  ): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = { failedEventIds: [], errors: [] };

    for (const storeEvents of groupEventsByStore(
      events,
      (event) => event.payload.storeId,
    ).values()) {
      const firstEvent = storeEvents[0];
      if (!firstEvent) continue;

      let store: ContextStore;
      try {
        store = await this.getStoreContext(firstEvent.payload.storeId);
      } catch (error) {
        markFailed(result, storeEvents, error);
        continue;
      }

      try {
        await this.refreshCategoryProductCounts({
          categoryIds: storeEvents.flatMap((event) => event.payload.categoryIds ?? []),
          store,
          userId: storeEvents.find((event) => event.context.userId)?.context.userId,
        });
      } catch (error) {
        markFailed(result, storeEvents, error);
      }
    }

    this.logBatchFailures(result, "Failed to handle productDeleted batch");
    return dedupeBatchResult(result);
  }

  private async refreshCategoryProductCounts(params: {
    categoryIds: readonly string[] | undefined;
    store: ContextStore;
    userId?: string;
  }): Promise<void> {
    const categoryIds = unique(params.categoryIds ?? []);
    if (categoryIds.length === 0) return;

    const result = await this.kernel.runScript(
      CategoryProductsCountRefreshScript,
      { categoryIds },
      {
        storeId: params.store.id,
        organizationId: params.store.organizationId,
        userId: params.userId,
        locale: params.store.defaultLocale,
        defaultLocale: params.store.defaultLocale,
        defaultCurrency: params.store.currencyCode,
        locales: [...params.store.locales],
        currencies: [params.store.currencyCode],
      },
    );

    if (!result.success) {
      throw new Error("Failed to refresh category product counts");
    }
  }

  @EventHandler("fileHardDeleted", { retry: { maxAttempts: 10 } })
  async handleFileHardDeleted(params: {
    event: FileHardDeletedEvent;
  }): Promise<EventHandlerResponse> {
    const { fileId } = params.event.payload;

    this.logger.debug({ eventId: params.event.eventId, fileId }, "Received fileHardDeleted event");

    try {
      const result = await this.kernel.runScript(FileHardDeletedScript, { fileId });
      this.logger.log(
        { fileId, deletedProductMediaCount: result.deletedProductMediaCount },
        "Cleaned up product media registry for hard-deleted file",
      );
      return { success: true };
    } catch (error) {
      const message = errorMessage(error);
      this.logger.error({ fileId, error: message }, "Failed to clean up product media registry");
      return { success: false, error: { message, retryable: true } };
    }
  }

  private handleSingleError(
    error: unknown,
    logMessage: string,
    subjectId: string,
  ): EventHandlerResponse {
    const message = errorMessage(error);
    this.logger.error({ error: message, subjectId }, logMessage);
    return { success: false, error: { message, retryable: true } };
  }

  private toBatchResponse(
    result: BatchProcessingResult,
    fallbackMessage: string,
  ): EventBatchHandlerResponse {
    const normalized = dedupeBatchResult(result);
    if (normalized.failedEventIds.length === 0) {
      return { success: true };
    }

    return {
      success: false,
      error: {
        message: normalized.errors.join("; ") || fallbackMessage,
        retryable: true,
      },
      failedEventIds: normalized.failedEventIds,
    };
  }

  private logBatchFailures(result: BatchProcessingResult, message: string): void {
    if (result.failedEventIds.length === 0) return;

    this.logger.error(
      {
        failedEventIds: unique(result.failedEventIds),
        errors: unique(result.errors),
      },
      message,
    );
  }
}

function groupEventsByStore<TEvent extends DomainEvent>(
  events: readonly TEvent[],
  storeIdOf: (event: TEvent) => string,
): Map<string, TEvent[]> {
  const groups = new Map<string, TEvent[]>();

  for (const event of events) {
    const storeId = storeIdOf(event);
    const group = groups.get(storeId) ?? [];
    group.push(event);
    groups.set(storeId, group);
  }

  return groups;
}

function markFailed(
  result: BatchProcessingResult,
  events: readonly DomainEvent[],
  error: unknown,
): void {
  result.failedEventIds.push(...events.map((event) => event.eventId));
  result.errors.push(errorMessage(error));
}

function dedupeBatchResult(result: BatchProcessingResult): BatchProcessingResult {
  return {
    failedEventIds: unique(result.failedEventIds),
    errors: unique(result.errors),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
