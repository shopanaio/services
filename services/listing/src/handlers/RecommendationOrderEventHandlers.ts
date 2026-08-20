import { Injectable } from "@nestjs/common";
import {
  buildIdempotencyKey,
  EventHandler,
  EventHandlers,
  hashContent,
  InjectBroker,
  ServiceBroker,
  type IdempotencyContext,
} from "@shopana/shared-kernel";
import type {
  EventHandlerResponse,
  OrderSaleCommittedEvent,
  OrderSaleReversedEvent,
} from "@shopana/events";
import {
  RECOMMENDATION_INGESTION_QUEUE,
  type RecommendationOrderIngestInput,
} from "../workflows/RecommendationWorkflows.js";
import { isDuplicateWorkflowStartError } from "../workflows/listingIndexWorkflowHelpers.js";

@Injectable()
export class RecommendationOrderEventHandlers extends EventHandlers {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @EventHandler("orderSaleCommitted", { retry: { maxAttempts: 5 } })
  handleCommitted(input: { event: OrderSaleCommittedEvent }): Promise<EventHandlerResponse> {
    return this.enqueue(input.event);
  }

  @EventHandler("orderSaleReversed", { retry: { maxAttempts: 5 } })
  handleReversed(input: { event: OrderSaleReversedEvent }): Promise<EventHandlerResponse> {
    return this.enqueue(input.event);
  }

  private async enqueue(
    event: OrderSaleCommittedEvent | OrderSaleReversedEvent,
  ): Promise<EventHandlerResponse> {
    const workflowInput: RecommendationOrderIngestInput = {
      context: {
        storeId: event.payload.storeId,
        organizationId: event.context.organizationId,
        requestId: `recommendation-ingest:${event.eventId}`,
      },
      event,
    };
    const idempotency: IdempotencyContext = {
      source: "content",
      organizationId: event.context.organizationId,
      resourceId: event.payload.orderId,
      operation: `listing.${event.eventType}`,
      contentHash: hashContent({ version: 1, event }),
    };
    const workflowId = buildIdempotencyKey("listing.recommendationOrderFactIngest", idempotency);
    try {
      await this.broker.startWorkflow(
        "listing.recommendationOrderFactIngest",
        workflowInput,
        idempotency,
        {
          workflowId,
          queueName: RECOMMENDATION_INGESTION_QUEUE,
          enqueueOptions: {
            queuePartitionKey: `${event.payload.storeId}:${event.payload.orderId}`,
          },
        },
      );
      return { success: true };
    } catch (error) {
      if (isDuplicateWorkflowStartError(error, workflowId)) return { success: true };
      this.logger.error({ error, eventId: event.eventId, storeId: event.payload.storeId }, "Failed to enqueue recommendation sale ingestion");
      return {
        success: false,
        error: { message: "Recommendation ingestion enqueue failed", retryable: true },
      };
    }
  }
}
