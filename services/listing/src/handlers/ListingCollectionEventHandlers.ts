import { Injectable } from "@nestjs/common";
import {
  buildIdempotencyKey,
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
  type IdempotencyContext,
} from "@shopana/shared-kernel";
import type {
  CollectionCreatedEvent,
  CollectionDeletedEvent,
  CollectionUpdatedEvent,
  EventHandlerResponse,
} from "@shopana/events";
import type { ListingCollectionProjectionWorkflowInput } from "../workflows/ListingCollectionProjectionWorkflow.js";

type CollectionEvent = CollectionCreatedEvent | CollectionUpdatedEvent | CollectionDeletedEvent;

@Injectable()
export class ListingCollectionEventHandlers extends EventHandlers {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("collectionCreated", { retry: { maxAttempts: 5 } })
  handleCreated(params: { event: CollectionCreatedEvent }): Promise<EventHandlerResponse> {
    return this.enqueue(params.event);
  }

  @EventHandler("collectionUpdated", { retry: { maxAttempts: 5 } })
  handleUpdated(params: { event: CollectionUpdatedEvent }): Promise<EventHandlerResponse> {
    return this.enqueue(params.event);
  }

  @EventHandler("collectionDeleted", { retry: { maxAttempts: 5 } })
  handleDeleted(params: { event: CollectionDeletedEvent }): Promise<EventHandlerResponse> {
    return this.enqueue(params.event);
  }

  private async enqueue(event: CollectionEvent): Promise<EventHandlerResponse> {
    const eventSequence = event.eventSequence;
    if (!Number.isSafeInteger(eventSequence) || (eventSequence ?? 0) <= 0) {
      return {
        success: false,
        error: {
          code: "INVALID_COLLECTION_EVENT_SEQUENCE",
          message: "Collection event sequence must be a positive safe integer",
          retryable: false,
        },
      };
    }
    if (!Number.isSafeInteger(event.payload.listingRevision) || event.payload.listingRevision < 0) {
      return {
        success: false,
        error: {
          code: "INVALID_COLLECTION_LISTING_REVISION",
          message: "Collection listing revision must be a non-negative safe integer",
          retryable: false,
        },
      };
    }
    const input: ListingCollectionProjectionWorkflowInput = {
      organizationId: event.context.organizationId,
      storeId: event.payload.storeId,
      collectionId: event.payload.collectionId,
      eventListingRevision: event.payload.listingRevision,
      eventSequence: eventSequence!,
      requestId: event.context.correlationId,
    };
    const idempotencyContext: IdempotencyContext = {
      source: "content",
      organizationId: event.context.organizationId,
      resourceId: `collection:${event.payload.collectionId}`,
      operation: "listing.syncCollectionProjection",
      contentHash: event.eventId,
    };
    const workflowName = "listing.syncCollectionProjection";
    try {
      await this.broker.startWorkflow(workflowName, input, idempotencyContext, {
        workflowId: buildIdempotencyKey(workflowName, idempotencyContext),
        queueName: "listing_index_actions",
        enqueueOptions: {
          queuePartitionKey: `${event.payload.storeId}:collection:${event.payload.collectionId}`,
        },
        timeoutMS: 120_000,
      });
      this.logger.debug(
        {
          operation: "accepted",
          listingRevision: event.payload.listingRevision,
        },
        "Collection projection event accepted",
      );
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists|duplicate/i.test(message)) {
        return { success: true };
      }
      this.logger.error(
        { error, collectionId: event.payload.collectionId },
        "Failed to enqueue collection projection",
      );
      return {
        success: false,
        error: { message, retryable: true },
      };
    }
  }
}
