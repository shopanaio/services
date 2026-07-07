import { Injectable } from "@nestjs/common";
import {
  BatchEventHandler,
  EventHandlers,
  hashContent,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Listing } from "@shopana/broker-types";
import type {
  EventBatchHandlerResponse,
  ProductUpdatedEvent,
} from "@shopana/events";
import {
  isDuplicateWorkflowStartError,
  LISTING_INDEX_ACTIONS_QUEUE,
  LISTING_INDEX_WORKFLOW_TIMEOUT_MS,
} from "../workflows/listingIndexWorkflowHelpers.js";
import {
  buildListingProductEventBatchQueuePartitionKey,
  buildListingProductEventBatchWorkflowId,
  buildListingProductEventBatchWorkflowIdempotencyContext,
  type ListingIndexProductUpdateBatchInput,
} from "../workflows/ListingBatchProductIndexWorkflow.js";

@Injectable()
export class ListingProductBatchEventHandlers extends EventHandlers {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
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

    const failedEventIds: string[] = [];
    const errors: string[] = [];

    // A batch dispatch can contain events for multiple stores; each store gets
    // its own workflow so store-scoped ordering and retry state stay isolated.
    for (const events of groupProductUpdateBatchEvents(params.events).values()) {
      try {
        await this.enqueueProductUpdateBatchWorkflow(events);
      } catch (error) {
        failedEventIds.push(...events.map((event) => event.eventId));
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (failedEventIds.length === 0) {
      return { success: true };
    }

    const message = [...new Set(errors)].join("; ");
    this.logger.error(
      { failedEventIds, error: message },
      "Failed to enqueue productUpdated listing batch sync"
    );

    return {
      success: false,
      error: {
        message,
        retryable: true,
      },
      failedEventIds: [...new Set(failedEventIds)],
    };
  }

  private async enqueueProductUpdateBatchWorkflow(
    events: readonly ProductUpdatedEvent[]
  ): Promise<void> {
    // Several updates for the same product can be claimed in one batch window.
    // The batch workflow should only receive the latest event per product.
    const latestEvents = coalesceLatestProductUpdateEvents(events);
    const firstEvent = latestEvents[0];

    if (!firstEvent) return;

    const storeId = firstEvent.payload.storeId;
    const organizationId = firstEvent.context.organizationId;
    const items = latestEvents.map((event) => {
      const sourceSequence = getEventSequence(event);

      return {
        eventId: event.eventId,
        productId: event.payload.productId,
        sourceSequence,
        meta: buildMeta(event),
      };
    });
    const effectiveIdempotencyKey = hashContent({
      v: 1,
      eventType: "productUpdated",
      organizationId,
      storeId,
      items: items.map((item) => ({
        eventId: item.eventId,
        productId: item.productId,
        sourceSequence: item.sourceSequence,
        idempotencyKey: item.meta.idempotencyKey,
      })),
    });

    // This workflow is a durable handoff point only. The actual batch indexing
    // implementation will hydrate products and write the index later.
    const action: ListingIndexProductUpdateBatchInput = {
      type: "batchProductUpdate",
      organizationId,
      storeId,
      items,
      effectiveIdempotencyKey,
    };
    const idempotencyCtx =
      buildListingProductEventBatchWorkflowIdempotencyContext({
        organizationId,
        storeId,
        eventsHash: effectiveIdempotencyKey,
      });
    const workflowId = buildListingProductEventBatchWorkflowId({
      idempotencyCtx,
    });

    try {
      await this.broker.startWorkflow(
        "listing.batchProductIndex",
        action,
        idempotencyCtx,
        {
          queueName: LISTING_INDEX_ACTIONS_QUEUE,
          enqueueOptions: {
            queuePartitionKey: buildListingProductEventBatchQueuePartitionKey({
              storeId,
              eventsHash: effectiveIdempotencyKey,
            }),
          },
          timeoutMS: LISTING_INDEX_WORKFLOW_TIMEOUT_MS,
          workflowId,
        }
      );
    } catch (error) {
      if (isDuplicateWorkflowStartError(error, workflowId)) return;

      this.logger.error(
        {
          error,
          workflowName: "listing.batchProductIndex",
          workflowId,
          storeId,
          itemCount: items.length,
        },
        "Failed to start listing batch product index workflow"
      );
      throw error;
    }
  }
}

function groupProductUpdateBatchEvents(
  events: readonly ProductUpdatedEvent[]
): Map<string, ProductUpdatedEvent[]> {
  const groups = new Map<string, ProductUpdatedEvent[]>();

  for (const event of events) {
    const key = [event.context.organizationId, event.payload.storeId].join(":");
    const group = groups.get(key);

    if (group) {
      group.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  return groups;
}

function coalesceLatestProductUpdateEvents(
  events: readonly ProductUpdatedEvent[]
): ProductUpdatedEvent[] {
  const latestByProductId = new Map<string, ProductUpdatedEvent>();

  // eventSequence is the monotonic product stream ordering token assigned by
  // events service; the highest sequence is the freshest product state.
  for (const event of events) {
    const current = latestByProductId.get(event.payload.productId);

    if (!current || getEventSequence(event) > getEventSequence(current)) {
      latestByProductId.set(event.payload.productId, event);
    }
  }

  return [...latestByProductId.values()].sort(
    (a, b) => getEventSequence(a) - getEventSequence(b)
  );
}

function getEventSequence(event: ProductUpdatedEvent): number {
  if (
    Number.isInteger(event.eventSequence) &&
    event.eventSequence !== undefined &&
    event.eventSequence > 0
  ) {
    return event.eventSequence;
  }

  throw new Error(
    `Domain event ${event.eventId} is missing a positive eventSequence`
  );
}

function buildMeta(event: ProductUpdatedEvent): Listing.ListingUpdateMeta {
  return {
    contractVersion: Listing.LISTING_UPDATE_CONTRACT_VERSION,
    operationId: `listing:${event.eventType}:${event.eventId}`,
    idempotencyKey: [
      "catalog",
      event.eventType,
      event.payload.storeId,
      "product",
      event.payload.productId,
      event.payload.revision,
      event.eventId,
    ].join(":"),
    occurredAt: event.timestamp,
    source: {
      service: "catalog",
      actor: "system",
      requestId: event.context.correlationId,
      workflowId: event.parentWorkflowId,
    },
  };
}
