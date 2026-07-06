import { Injectable } from "@nestjs/common";
import {
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Listing } from "@shopana/broker-types";
import type {
  EventHandlerResponse,
  ProductCreatedEvent,
  ProductDeletedEvent,
  ProductUpdatedEvent,
} from "@shopana/events";
import {
  buildListingIndexEffectiveIdempotencyKey,
  buildListingIndexPayloadHash,
  buildListingIndexQueuePartitionKey,
  buildListingIndexWorkflowId,
  buildListingIndexWorkflowIdempotencyContext,
  buildListingIndexWorkflowName,
  isDuplicateWorkflowStartError,
  LISTING_INDEX_ACTIONS_QUEUE,
  LISTING_INDEX_WORKFLOW_TIMEOUT_MS,
  type ListingIndexActionType,
} from "../workflows/listingIndexWorkflowHelpers.js";
import type {
  ListingIndexQueuedDeleteAction,
  ListingIndexQueuedSyncAction,
} from "../scripts/listingIndexActionTypes.js";

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

    try {
      await this.enqueueSyncWorkflow(params.event, undefined);
      return { success: true };
    } catch (error) {
      return this.handleError(error, "Failed to enqueue productCreated listing sync");
    }
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

    try {
      await this.enqueueSyncWorkflow(
        params.event,
        params.event.payload.revision
      );
      return { success: true };
    } catch (error) {
      return this.handleError(error, "Failed to enqueue productUpdated listing sync");
    }
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

    try {
      await this.enqueueDeleteWorkflow(params.event);
      return { success: true };
    } catch (error) {
      return this.handleError(error, "Failed to enqueue productDeleted listing sync");
    }
  }

  private async enqueueSyncWorkflow(
    event: ProductCreatedEvent | ProductUpdatedEvent,
    expectedRevision: number | undefined
  ): Promise<void> {
    const sourceSequence = this.getEventSequence(event);
    const itemRef: Listing.ListingSellableItemRef = {
      entityType: "product",
      id: event.payload.productId,
    };
    const meta = this.buildMeta({
      eventId: event.eventId,
      eventType: event.eventType,
      storeId: event.payload.storeId,
      productId: event.payload.productId,
      revision: expectedRevision,
      timestamp: event.timestamp,
      requestId: event.context.correlationId,
      workflowId: event.parentWorkflowId,
    });
    const action: ListingIndexQueuedSyncAction = {
      type: "syncSellableItem",
      params: {
        meta,
        storeId: event.payload.storeId,
        itemRef,
        sourceSequence,
        expectedRevision,
      },
      organizationId: event.context.organizationId,
      effectiveIdempotencyKey: buildListingIndexEffectiveIdempotencyKey({
        rawIdempotencyKey: meta.idempotencyKey,
        storeId: event.payload.storeId,
        entityType: itemRef.entityType,
        itemId: itemRef.id,
        actionType: "syncSellableItem",
        sourceSequence,
      }),
    };

    await this.startIndexWorkflow(action, "syncSellableItem", sourceSequence);
  }

  private async enqueueDeleteWorkflow(event: ProductDeletedEvent): Promise<void> {
    const sourceSequence = this.getEventSequence(event);
    const itemRef: Listing.ListingSellableItemRef = {
      entityType: event.payload.entityType ?? "product",
      id: event.payload.productId,
    };
    if (event.payload.revision === undefined) {
      this.logger.warn(
        {
          eventId: event.eventId,
          productId: event.payload.productId,
          storeId: event.payload.storeId,
        },
        "Product deleted event is missing revision; using stale-safe revision fallback"
      );
    }

    const meta = this.buildMeta({
      eventId: event.eventId,
      eventType: event.eventType,
      storeId: event.payload.storeId,
      productId: event.payload.productId,
      revision: event.payload.revision,
      timestamp: event.timestamp,
      requestId: event.context.correlationId,
      workflowId: event.parentWorkflowId,
    });
    const params: Listing.DeleteSellableItemParams = {
      meta,
      storeId: event.payload.storeId,
      itemRef,
      sourceSequence,
      deletedAt: event.payload.deletedAt ?? event.timestamp,
      reason: "deleted",
    };
    const action: ListingIndexQueuedDeleteAction = {
      type: "deleteSellableItem",
      params,
      organizationId: event.context.organizationId,
      effectiveIdempotencyKey: buildListingIndexEffectiveIdempotencyKey({
        rawIdempotencyKey: meta.idempotencyKey,
        storeId: event.payload.storeId,
        entityType: itemRef.entityType,
        itemId: itemRef.id,
        actionType: "deleteSellableItem",
        sourceSequence,
      }),
      payloadHash: buildListingIndexPayloadHash({
        type: "deleteSellableItem",
        params,
      }),
    };

    await this.startIndexWorkflow(action, "deleteSellableItem", sourceSequence);
  }

  private async startIndexWorkflow(
    action: ListingIndexQueuedSyncAction | ListingIndexQueuedDeleteAction,
    actionType: ListingIndexActionType,
    sourceSequence: number
  ): Promise<void> {
    const itemRef =
      action.type === "syncSellableItem"
        ? action.params.itemRef
        : action.params.itemRef;
    const idempotencyCtx = buildListingIndexWorkflowIdempotencyContext({
      organizationId: action.organizationId,
      storeId: action.params.storeId,
      entityType: itemRef.entityType,
      itemId: itemRef.id,
      actionType,
      effectiveIdempotencyKey: action.effectiveIdempotencyKey,
    });
    const workflowName = buildListingIndexWorkflowName(actionType);
    const workflowId = buildListingIndexWorkflowId({
      workflowName,
      idempotencyCtx,
    });

    try {
      await this.broker.startWorkflow(
        workflowName,
        action,
        idempotencyCtx,
        {
          queueName: LISTING_INDEX_ACTIONS_QUEUE,
          enqueueOptions: {
            queuePartitionKey: buildListingIndexQueuePartitionKey({
              storeId: action.params.storeId,
              entityType: itemRef.entityType,
              itemId: itemRef.id,
            }),
          },
          timeoutMS: LISTING_INDEX_WORKFLOW_TIMEOUT_MS,
          workflowId,
        }
      );
    } catch (error) {
      if (isDuplicateWorkflowStartError(error, workflowId)) {
        return;
      }

      this.logger.error(
        {
          error,
          workflowName,
          workflowId,
          storeId: action.params.storeId,
          itemRef,
          sourceSequence,
        },
        "Failed to start listing index workflow"
      );
      throw error;
    }
  }

  private buildMeta(input: {
    eventId: string;
    eventType: string;
    storeId: string;
    productId: string;
    revision: number | undefined;
    timestamp: string;
    requestId?: string;
    workflowId?: string;
  }): Listing.ListingUpdateMeta {
    const revisionPart = input.revision === undefined ? "unknown" : input.revision;

    return {
      contractVersion: Listing.LISTING_UPDATE_CONTRACT_VERSION,
      operationId: `listing:${input.eventType}:${input.eventId}`,
      idempotencyKey: [
        "catalog",
        input.eventType,
        input.storeId,
        "product",
        input.productId,
        revisionPart,
        input.eventId,
      ].join(":"),
      occurredAt: input.timestamp,
      source: {
        service: "catalog",
        actor: "system",
        requestId: input.requestId,
        workflowId: input.workflowId,
      },
    };
  }

  private getEventSequence(
    event: ProductCreatedEvent | ProductUpdatedEvent | ProductDeletedEvent
  ): number {
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

  private handleError(error: unknown, logMessage: string): EventHandlerResponse {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error({ error: message }, logMessage);

    return {
      success: false,
      error: {
        message,
        retryable: true,
      },
    };
  }
}
