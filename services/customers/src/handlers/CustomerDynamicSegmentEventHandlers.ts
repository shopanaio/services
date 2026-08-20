import { Injectable } from "@nestjs/common";
import type {
  CustomerCreatedEvent,
  CustomerDeletedEvent,
  CustomerMergedEvent,
  CustomerStatisticsUpdatedEvent,
  CustomerUpdatedEvent,
  EventHandlerDelivery,
  EventHandlerResponse,
} from "@shopana/events";
import type { SegmentDependency } from "@shopana/customer-segment-dsl";
import { EventHandler, EventHandlers, InjectBroker, ServiceBroker } from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import { CustomerDynamicSegmentEnqueueScript } from "../scripts/classification/CustomerDynamicSegmentEnqueueScript.js";
import {
  CustomerDynamicSegmentCleanupScript,
  CustomerDynamicSegmentMergeScript,
} from "../scripts/classification/CustomerDynamicSegmentLifecycleScripts.js";

@Injectable()
export class CustomerDynamicSegmentEventHandlers extends EventHandlers {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("customerCreated", { retry: { maxAttempts: 5 } })
  handleCustomerCreated(params: {
    event: CustomerCreatedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ invalidatedMemberships: number }>> {
    return this.enqueue(
      params.event.payload.storeId,
      params.event.context.organizationId,
      params.event.payload.customerId,
      params.event.eventId,
      new Set<SegmentDependency>(["customer.any"]),
      new Date(params.event.timestamp).toISOString(),
      params.delivery.idempotencyKey,
    );
  }

  @EventHandler("customerDeleted", { retry: { maxAttempts: 5 } })
  async handleCustomerDeleted(params: {
    event: CustomerDeletedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ cleaned: boolean }>> {
    try {
      await Kernel.getInstance().runScript(
        CustomerDynamicSegmentCleanupScript,
        { customerId: params.event.payload.customerId },
        {
          storeId: params.event.payload.storeId,
          organizationId: params.event.context.organizationId,
          requestId: params.delivery.idempotencyKey,
        },
      );
      return { success: true, data: { cleaned: true } };
    } catch (error) {
      return failure(error, "DYNAMIC_SEGMENT_CUSTOMER_CLEANUP_FAILED");
    }
  }

  @EventHandler("customerMerged", { retry: { maxAttempts: 5 } })
  async handleCustomerMerged(params: {
    event: CustomerMergedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ invalidatedMemberships: number }>> {
    const { event, delivery } = params;
    try {
      const enqueuedSegments = await Kernel.getInstance().runScript(
        CustomerDynamicSegmentMergeScript,
        {
          sourceCustomerId: event.payload.sourceCustomerId,
          targetCustomerId: event.payload.targetCustomerId,
          sourceEventId: event.eventId,
          effectiveAt: event.payload.completedAt,
        },
        {
          storeId: event.payload.storeId,
          organizationId: event.context.organizationId,
          requestId: delivery.idempotencyKey,
        },
      );
      await this.startMaintenance(
        event.payload.storeId,
        event.context.organizationId,
        event.payload.targetCustomerId,
        event.eventId,
        delivery.idempotencyKey,
      );
      return { success: true, data: { invalidatedMemberships: enqueuedSegments } };
    } catch (error) {
      return failure(error, "DYNAMIC_SEGMENT_CUSTOMER_MERGE_FAILED");
    }
  }

  @EventHandler("customerUpdated", { retry: { maxAttempts: 5 } })
  handleCustomerUpdated(params: {
    event: CustomerUpdatedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ invalidatedMemberships: number }>> {
    const dependencies = new Set<SegmentDependency>();
    let failClosed = params.event.payload.reasons.length === 0;
    for (const reason of params.event.payload.reasons) {
      if (isSegmentDependency(reason)) dependencies.add(reason);
      else failClosed = true;
    }
    if (failClosed) dependencies.add("customer.any");
    return this.enqueue(
      params.event.payload.storeId,
      params.event.context.organizationId,
      params.event.payload.customerId,
      params.event.eventId,
      dependencies,
      new Date(params.event.timestamp).toISOString(),
      params.delivery.idempotencyKey,
    );
  }

  @EventHandler("customerStatisticsUpdated", { retry: { maxAttempts: 5 } })
  handleCustomerStatisticsUpdated(params: {
    event: CustomerStatisticsUpdatedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ invalidatedMemberships: number }>> {
    const dependencies = new Set<SegmentDependency>();
    let failClosed = params.event.payload.reasons.length === 0;
    for (const reason of params.event.payload.reasons) {
      if (reason === "order" || reason === "rebuild") dependencies.add("statistics.order");
      if (reason === "checkout" || reason === "rebuild") dependencies.add("statistics.checkout");
      if (reason === "refund" || reason === "rebuild") dependencies.add("statistics.refund");
      if (!["order", "checkout", "refund", "rebuild"].includes(reason)) failClosed = true;
    }
    if (failClosed) dependencies.add("customer.any");
    return this.enqueue(
      params.event.payload.storeId,
      params.event.context.organizationId,
      params.event.payload.customerId,
      params.event.eventId,
      dependencies,
      params.event.payload.updatedAt,
      params.delivery.idempotencyKey,
    );
  }

  private async enqueue(
    storeId: string,
    organizationId: string,
    customerId: string,
    sourceEventId: string,
    dependencies: ReadonlySet<SegmentDependency>,
    effectiveAt: string,
    requestId: string,
  ): Promise<EventHandlerResponse<{ invalidatedMemberships: number }>> {
    try {
      const enqueuedSegments = await Kernel.getInstance().runScript(
        CustomerDynamicSegmentEnqueueScript,
        {
          customerId,
          dependencies: [...dependencies],
          sourceEventId,
          effectiveAt,
        },
        { storeId, organizationId, requestId },
      );
      await this.startMaintenance(storeId, organizationId, customerId, sourceEventId, requestId);
      return { success: true, data: { invalidatedMemberships: enqueuedSegments } };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: "DYNAMIC_SEGMENT_INVALIDATION_FAILED",
          retryable: true,
        },
      };
    }
  }

  private startMaintenance(
    storeId: string,
    organizationId: string,
    customerId: string,
    sourceEventId: string,
    requestId: string,
  ): Promise<unknown> {
    return this.broker.startWorkflow(
      "customers.customerSegmentMaintenance",
      { context: { storeId, organizationId, requestId } },
      {
        source: "content",
        resourceId: `${storeId}:${customerId}`,
        operation: "customerSegmentReevaluation",
        contentHash: sourceEventId,
      },
    );
  }
}

function failure(error: unknown, code: string): EventHandlerResponse<never> {
  return {
    success: false,
    error: {
      message: error instanceof Error ? error.message : String(error),
      code,
      retryable: true,
    },
  };
}

function isSegmentDependency(value: string): value is SegmentDependency {
  return [
    "profile",
    "contact",
    "company",
    "status",
    "address",
    "consent",
    "tag",
    "group",
    "taxIdentifier",
    "taxExemption",
  ].includes(value);
}
