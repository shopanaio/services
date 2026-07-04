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
  VariantDeletedEvent,
  FileHardDeletedEvent,
  EventBatchHandlerResponse,
  EventHandlerResponse,
} from "@shopana/events";
import { Kernel } from "../kernel/Kernel.js";
import { FileHardDeletedScript } from "../scripts/media/FileHardDeletedScript.js";
import { CategoryProductsCountRefreshScript } from "../scripts/category/index.js";
import {
  ListingProductIdsByVariantIdsScript,
  ListingSnapshotBuildScript,
} from "../listing-sync/ListingSnapshotBuildScript.js";
import {
  ListingSyncPublisher,
  listingSourceRevisionFromEvent,
  listingSourceRevisionFromEvents,
} from "../listing-sync/ListingSyncPublisher.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: Array<{
    code: string;
    message: string;
    field?: string[] | null;
  }>;
};

type StockLevelChangedEvent = DomainEvent<
  "stockLevelChanged",
  {
    storeId?: string;
    projectId?: string;
    variantId: string;
    warehouseId: string;
    previousLevel?: number;
    newLevel?: number;
    movementType?: string;
  }
>;

type ListingAwareProductDeletedEvent = ProductDeletedEvent & {
  payload: ProductDeletedEvent["payload"] & {
    revision?: number;
    deletedAt?: string;
    entityType?: "product" | "bundle";
  };
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

  private get listingSync(): ListingSyncPublisher {
    return new ListingSyncPublisher(this.broker);
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
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productCreated event"
    );

    try {
      const store = await this.getStoreContext(params.event.payload.storeId);
      await this.syncListingItemForProductEvent({
        event: params.event,
        store,
        productId: params.event.payload.productId,
        missingProductIsFailure: true,
      });
      return { success: true };
    } catch (error) {
      return this.handleSingleError(
        error,
        "Failed to handle productCreated event",
        params.event.payload.productId
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
      "Received productCreated event batch"
    );

    return this.toBatchResponse(
      await this.syncProductEventBatch({
        events: params.events,
        productIdOf: (event) => event.payload.productId,
        storeIdOf: (event) => event.payload.storeId,
        missingProductIsFailure: true,
      }),
      "Product created batch failed"
    );
  }

  @EventHandler("productDeleted", { retry: { maxAttempts: 5 } })
  async handleProductDeleted(params: {
    event: ListingAwareProductDeletedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productDeleted event"
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

      try {
        await this.deleteListingItemForProductDeletedEvent(params.event, store);
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
        params.event.payload.productId
      );
    }
  }

  @BatchEventHandler("productDeleted", { retry: { maxAttempts: 5 } })
  async handleProductDeletedBatch(params: {
    events: ListingAwareProductDeletedEvent[];
    payloads: ListingAwareProductDeletedEvent["payload"][];
  }): Promise<EventBatchHandlerResponse> {
    this.logger.debug(
      {
        eventCount: params.events.length,
        productIds: params.payloads.map((payload) => payload.productId),
      },
      "Received productDeleted event batch"
    );

    return this.toBatchResponse(
      await this.deleteProductEventBatch(params.events),
      "Product deleted batch failed"
    );
  }

  @EventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdated(params: {
    event: ProductUpdatedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      { eventId: params.event.eventId, productId: params.event.payload.productId },
      "Received productUpdated event"
    );

    const errors: string[] = [];

    try {
      const store = await this.getStoreContext(params.event.payload.storeId);

      try {
        await this.refreshProductUpdatedCategoryCounts([params.event], store);
      } catch (error) {
        errors.push(errorMessage(error));
      }

      try {
        await this.syncListingItemForProductEvent({
          event: params.event,
          store,
          productId: params.event.payload.productId,
          missingProductIsFailure: false,
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
        "Failed to handle productUpdated event",
        params.event.payload.productId
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
      "Received productUpdated event batch"
    );

    const result = await this.syncProductUpdatedEvents(params.events);
    return this.toBatchResponse(result, "Product updated batch failed");
  }

  @EventHandler("variantDeleted", { retry: { maxAttempts: 5 } })
  async handleVariantDeleted(params: {
    event: VariantDeletedEvent;
  }): Promise<EventHandlerResponse> {
    this.logger.debug(
      {
        eventId: params.event.eventId,
        productId: params.event.payload.productId,
        variantId: params.event.payload.variantId,
      },
      "Received variantDeleted event"
    );

    try {
      const store = await this.getStoreContext(params.event.payload.storeId);
      await this.syncListingItemForProductEvent({
        event: params.event,
        store,
        productId: params.event.payload.productId,
        missingProductIsFailure: false,
      });
      return { success: true };
    } catch (error) {
      return this.handleSingleError(
        error,
        "Failed to handle variantDeleted event",
        params.event.payload.productId
      );
    }
  }

  @BatchEventHandler("variantDeleted", { retry: { maxAttempts: 5 } })
  async handleVariantDeletedBatch(params: {
    events: VariantDeletedEvent[];
    payloads: VariantDeletedEvent["payload"][];
  }): Promise<EventBatchHandlerResponse> {
    this.logger.debug(
      {
        eventCount: params.events.length,
        productIds: params.payloads.map((payload) => payload.productId),
        variantIds: params.payloads.map((payload) => payload.variantId),
      },
      "Received variantDeleted event batch"
    );

    return this.toBatchResponse(
      await this.syncProductEventBatch({
        events: params.events,
        productIdOf: (event) => event.payload.productId,
        storeIdOf: (event) => event.payload.storeId,
        missingProductIsFailure: false,
      }),
      "Variant deleted batch failed"
    );
  }

  @EventHandler("stockLevelChanged", { retry: { maxAttempts: 5 } })
  async handleStockLevelChanged(params: {
    event: StockLevelChangedEvent;
  }): Promise<EventHandlerResponse> {
    const debugStoreId = stockEventStoreId(params.event);

    this.logger.debug(
      {
        eventId: params.event.eventId,
        variantId: params.event.payload.variantId,
        storeId: debugStoreId,
      },
      "Received stockLevelChanged event"
    );

    try {
      const storeId = requireStockEventStoreId(params.event);
      const store = await this.getStoreContext(storeId);
      const productIdsByVariantId = await this.getProductIdsByVariantIds(
        store,
        [params.event.payload.variantId],
        params.event.context.userId
      );
      const productId = productIdsByVariantId[params.event.payload.variantId];
      if (!productId) {
        this.logger.warn(
          {
            eventId: params.event.eventId,
            variantId: params.event.payload.variantId,
          },
          "Skipping listing sync for stock event with missing variant"
        );
        return { success: true };
      }

      await this.syncListingItemForProductEvent({
        event: params.event,
        store,
        productId,
        missingProductIsFailure: false,
      });
      return { success: true };
    } catch (error) {
      return this.handleSingleError(
        error,
        "Failed to handle stockLevelChanged event",
        params.event.payload.variantId
      );
    }
  }

  @BatchEventHandler("stockLevelChanged", { retry: { maxAttempts: 5 } })
  async handleStockLevelChangedBatch(params: {
    events: StockLevelChangedEvent[];
    payloads: StockLevelChangedEvent["payload"][];
  }): Promise<EventBatchHandlerResponse> {
    this.logger.debug(
      {
        eventCount: params.events.length,
        variantIds: params.payloads.map((payload) => payload.variantId),
      },
      "Received stockLevelChanged event batch"
    );

    return this.toBatchResponse(
      await this.syncStockEventBatch(params.events),
      "Stock level changed batch failed"
    );
  }

  private async syncProductUpdatedEvents(
    events: readonly ProductUpdatedEvent[]
  ): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = { failedEventIds: [], errors: [] };

    for (const storeEvents of groupEventsByStore(events, (event) => event.payload.storeId).values()) {
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
        await this.refreshProductUpdatedCategoryCounts(storeEvents, store);
      } catch (error) {
        markFailed(result, storeEvents, error);
      }

      mergeBatchResult(
        result,
        await this.syncProductEventBatchForStore({
          events: storeEvents,
          store,
          productIdOf: (event) => event.payload.productId,
          missingProductIsFailure: false,
        })
      );
    }

    this.logBatchFailures(result, "Failed to handle productUpdated batch");
    return dedupeBatchResult(result);
  }

  private async syncProductEventBatch<TEvent extends DomainEvent>(input: {
    events: readonly TEvent[];
    productIdOf: (event: TEvent) => string;
    storeIdOf: (event: TEvent) => string;
    missingProductIsFailure: boolean;
  }): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = { failedEventIds: [], errors: [] };

    for (const storeEvents of groupEventsByStore(input.events, input.storeIdOf).values()) {
      const firstEvent = storeEvents[0];
      if (!firstEvent) continue;

      let store: ContextStore;
      try {
        store = await this.getStoreContext(input.storeIdOf(firstEvent));
      } catch (error) {
        markFailed(result, storeEvents, error);
        continue;
      }

      mergeBatchResult(
        result,
        await this.syncProductEventBatchForStore({
          events: storeEvents,
          store,
          productIdOf: input.productIdOf,
          missingProductIsFailure: input.missingProductIsFailure,
        })
      );
    }

    this.logBatchFailures(result, "Failed to sync listing batch");
    return dedupeBatchResult(result);
  }

  private async syncProductEventBatchForStore<TEvent extends DomainEvent>(input: {
    events: readonly TEvent[];
    store: ContextStore;
    productIdOf: (event: TEvent) => string;
    missingProductIsFailure: boolean;
  }): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = { failedEventIds: [], errors: [] };
    const eventsByProductId = groupEventsByProduct(input.events, input.productIdOf);
    const productIds = [...eventsByProductId.keys()];
    if (productIds.length === 0) {
      return result;
    }

    try {
      const buildResult = await this.buildListingSnapshots({
        store: input.store,
        productIds,
        sourceRevisionsByProductId: Object.fromEntries(
          [...eventsByProductId.entries()].map(([productId, productEvents]) => [
            productId,
            listingSourceRevisionFromEvents(productEvents),
          ])
        ),
        userId: input.events.find((event) => event.context.userId)?.context.userId,
      });

      if (buildResult.missingProductIds.length > 0) {
        for (const productId of buildResult.missingProductIds) {
          const productEvents = eventsByProductId.get(productId) ?? [];
          if (input.missingProductIsFailure) {
            markFailed(
              result,
              productEvents,
              new Error(`Product ${productId} not found for listing sync`)
            );
          } else {
            this.logger.warn(
              {
                productId,
                eventIds: productEvents.map((event) => event.eventId),
              },
              "Skipping listing sync for missing product"
            );
          }
        }
      }

      if (buildResult.snapshots.length === 0) {
        return result;
      }

      const listingResult = await this.listingSync.syncItems({
        events: input.events,
        projectId: input.store.id,
        items: buildResult.snapshots,
      });

      const acceptedProductIds = new Set(
        listingResult.results.map((item) => item.itemRef.id)
      );
      if (
        listingResult.status !== "completed" ||
        acceptedProductIds.size !== buildResult.snapshots.length
      ) {
        for (const snapshot of buildResult.snapshots) {
          if (acceptedProductIds.has(snapshot.id)) continue;
          markFailed(
            result,
            eventsByProductId.get(snapshot.id) ?? [],
            new Error(`Listing sync was not accepted for product ${snapshot.id}`)
          );
        }
      }
    } catch (error) {
      markFailed(result, input.events, error);
    }

    return result;
  }

  private async deleteProductEventBatch(
    events: readonly ListingAwareProductDeletedEvent[]
  ): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = { failedEventIds: [], errors: [] };

    for (const storeEvents of groupEventsByStore(events, (event) => event.payload.storeId).values()) {
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

      const settled = await Promise.allSettled(
        storeEvents.map((event) =>
          this.deleteListingItemForProductDeletedEvent(event, store)
        )
      );
      for (const [index, item] of settled.entries()) {
        if (item.status === "fulfilled") continue;
        const event = storeEvents[index];
        if (event) {
          markFailed(result, [event], item.reason);
        }
      }
    }

    this.logBatchFailures(result, "Failed to handle productDeleted batch");
    return dedupeBatchResult(result);
  }

  private async syncStockEventBatch(
    events: readonly StockLevelChangedEvent[]
  ): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = { failedEventIds: [], errors: [] };

    for (const storeEvents of groupEventsByStore(events, stockEventStoreId).values()) {
      const firstEvent = storeEvents[0];
      if (!firstEvent) continue;

      let store: ContextStore;
      try {
        store = await this.getStoreContext(requireStockEventStoreId(firstEvent));
      } catch (error) {
        markFailed(result, storeEvents, error);
        continue;
      }

      try {
        const productIdsByVariantId = await this.getProductIdsByVariantIds(
          store,
          unique(storeEvents.map((event) => event.payload.variantId)),
          storeEvents.find((event) => event.context.userId)?.context.userId
        );
        const productIdOf = (event: StockLevelChangedEvent) =>
          productIdsByVariantId[event.payload.variantId] ?? "";
        const eventsWithProduct = storeEvents.filter((event) => productIdOf(event));
        const eventsWithoutProduct = storeEvents.filter((event) => !productIdOf(event));

        for (const event of eventsWithoutProduct) {
          this.logger.warn(
            { eventId: event.eventId, variantId: event.payload.variantId },
            "Skipping listing sync for stock event with missing variant"
          );
        }

        mergeBatchResult(
          result,
          await this.syncProductEventBatchForStore({
            events: eventsWithProduct,
            store,
            productIdOf,
            missingProductIsFailure: false,
          })
        );
      } catch (error) {
        markFailed(result, storeEvents, error);
      }
    }

    this.logBatchFailures(result, "Failed to handle stockLevelChanged batch");
    return dedupeBatchResult(result);
  }

  private async syncListingItemForProductEvent(input: {
    event: DomainEvent;
    store: ContextStore;
    productId: string;
    missingProductIsFailure: boolean;
  }): Promise<void> {
    const sourceRevision = listingSourceRevisionFromEvent(input.event);
    const buildResult = await this.buildListingSnapshots({
      store: input.store,
      productIds: [input.productId],
      sourceRevisionsByProductId: { [input.productId]: sourceRevision },
      userId: input.event.context.userId,
    });
    const snapshot = buildResult.snapshots[0];

    if (!snapshot) {
      const message = `Product ${input.productId} not found for listing sync`;
      if (input.missingProductIsFailure) {
        throw new Error(message);
      }
      this.logger.warn(
        { eventId: input.event.eventId, productId: input.productId },
        message
      );
      return;
    }

    await this.listingSync.syncItem({
      event: input.event,
      projectId: input.store.id,
      item: snapshot,
    });
  }

  private async deleteListingItemForProductDeletedEvent(
    event: ListingAwareProductDeletedEvent,
    store: ContextStore
  ): Promise<void> {
    await this.listingSync.deleteItem({
      event,
      projectId: store.id,
      itemRef: {
        entityType: event.payload.entityType ?? "product",
        id: event.payload.productId,
      },
      sourceRevision: listingSourceRevisionFromEvent(event),
      deletedAt: event.payload.deletedAt ?? event.timestamp,
      reason: "deleted",
    });
  }

  private async buildListingSnapshots(input: {
    store: ContextStore;
    productIds: string[];
    sourceRevisionsByProductId: Record<string, number>;
    userId?: string;
  }) {
    return this.kernel.runScript(
      ListingSnapshotBuildScript,
      {
        productIds: input.productIds,
        sourceRevisionsByProductId: input.sourceRevisionsByProductId,
      },
      {
        storeId: input.store.id,
        organizationId: input.store.organizationId,
        userId: input.userId,
        locale: input.store.defaultLocale,
        defaultLocale: input.store.defaultLocale,
      }
    );
  }

  private async getProductIdsByVariantIds(
    store: ContextStore,
    variantIds: string[],
    userId?: string
  ): Promise<Record<string, string>> {
    const result = await this.kernel.runScript(
      ListingProductIdsByVariantIdsScript,
      { variantIds },
      {
        storeId: store.id,
        organizationId: store.organizationId,
        userId,
        locale: store.defaultLocale,
        defaultLocale: store.defaultLocale,
      }
    );

    return result.productIdsByVariantId;
  }

  private async refreshProductUpdatedCategoryCounts(
    events: readonly ProductUpdatedEvent[],
    store: ContextStore
  ): Promise<void> {
    const categoryIds = events.flatMap((event) => {
      const categories = event.payload.product?.categories;
      if (!categories?.changed || categories.reason !== "assignment") {
        return [];
      }

      return categories.categoryIds ?? [];
    });

    await this.refreshCategoryProductCounts({
      categoryIds,
      store,
      userId: events.find((event) => event.context.userId)?.context.userId,
    });
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
      }
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
      const message = errorMessage(error);
      this.logger.error(
        { fileId, error: message },
        "Failed to clean up product media registry"
      );
      return { success: false, error: { message, retryable: true } };
    }
  }

  private handleSingleError(
    error: unknown,
    logMessage: string,
    subjectId: string
  ): EventHandlerResponse {
    const message = errorMessage(error);
    this.logger.error({ error: message, subjectId }, logMessage);
    return { success: false, error: { message, retryable: true } };
  }

  private toBatchResponse(
    result: BatchProcessingResult,
    fallbackMessage: string
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

  private logBatchFailures(
    result: BatchProcessingResult,
    message: string
  ): void {
    if (result.failedEventIds.length === 0) return;

    this.logger.error(
      {
        failedEventIds: unique(result.failedEventIds),
        errors: unique(result.errors),
      },
      message
    );
  }
}

function groupEventsByStore<TEvent extends DomainEvent>(
  events: readonly TEvent[],
  storeIdOf: (event: TEvent) => string
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

function groupEventsByProduct<TEvent extends DomainEvent>(
  events: readonly TEvent[],
  productIdOf: (event: TEvent) => string
): Map<string, TEvent[]> {
  const groups = new Map<string, TEvent[]>();

  for (const event of events) {
    const productId = productIdOf(event);
    if (!productId) continue;
    const group = groups.get(productId) ?? [];
    group.push(event);
    groups.set(productId, group);
  }

  return groups;
}

function markFailed(
  result: BatchProcessingResult,
  events: readonly DomainEvent[],
  error: unknown
): void {
  result.failedEventIds.push(...events.map((event) => event.eventId));
  result.errors.push(errorMessage(error));
}

function mergeBatchResult(
  target: BatchProcessingResult,
  source: BatchProcessingResult
): void {
  target.failedEventIds.push(...source.failedEventIds);
  target.errors.push(...source.errors);
}

function dedupeBatchResult(result: BatchProcessingResult): BatchProcessingResult {
  return {
    failedEventIds: unique(result.failedEventIds),
    errors: unique(result.errors),
  };
}

function stockEventStoreId(event: StockLevelChangedEvent): string {
  return event.payload.storeId ?? event.payload.projectId ?? "";
}

function requireStockEventStoreId(event: StockLevelChangedEvent): string {
  const storeId = stockEventStoreId(event);
  if (!storeId) {
    throw new Error("stockLevelChanged payload requires storeId or projectId");
  }
  return storeId;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
