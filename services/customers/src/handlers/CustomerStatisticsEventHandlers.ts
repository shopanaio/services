import { Injectable } from "@nestjs/common";
import type {
  CheckoutCustomerActivityRecordedEvent,
  EventHandlerDelivery,
  EventHandlerResponse,
  OrderCancelledEvent,
  OrderCompletedEvent,
  OrderCreatedEvent,
  OrderRefundedEvent,
} from "@shopana/events";
import {
  EventHandler,
  EventHandlers,
  hashContent,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { CustomerStatisticsProjectionWorkflowInput } from "../workflows/CustomerStatisticsProjectionWorkflow.js";

type OrderProjectionEvent = OrderCreatedEvent | OrderCompletedEvent | OrderCancelledEvent;

abstract class CustomerStatisticsEventHandlers extends EventHandlers {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected async project(
    event: OrderProjectionEvent | CheckoutCustomerActivityRecordedEvent | OrderRefundedEvent,
    params: CustomerStatisticsProjectionWorkflowInput["params"],
  ): Promise<EventHandlerResponse<{ customerId: string }>> {
    try {
      const input: CustomerStatisticsProjectionWorkflowInput = {
        params,
        context: {
          storeId: event.payload.storeId,
          organizationId: event.context.organizationId,
          requestId: `event-${event.eventId}`,
        },
      };
      await this.broker.startWorkflow(
        "customers.customerStatisticsProject",
        input,
        {
          source: "content",
          resourceId: `${event.payload.storeId}:${params.customerId}`,
          operation: "customerStatisticsProject",
          contentHash: hashContent(event),
        },
        {
          queueName: "customer_statistics_projection",
          enqueueOptions: {
            queuePartitionKey: `${event.payload.storeId}:${params.customerId}`,
          },
        },
      );
      return {
        success: true,
        data: { customerId: params.customerId },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { eventId: event.eventId, eventType: event.eventType, error: message },
        "Failed to update customer statistics projection",
      );
      return {
        success: false,
        error: {
          message,
          code: "CUSTOMER_STATISTICS_PROJECTION_FAILED",
          retryable: !message.startsWith("Projection "),
        },
      };
    }
  }
}

@Injectable()
export class OrderEventHandlers extends CustomerStatisticsEventHandlers {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("orderCreated", { retry: { maxAttempts: 10 } })
  handleOrderCreated(params: { event: OrderCreatedEvent; delivery: EventHandlerDelivery }) {
    return this.projectOrder(params.event, "OPEN");
  }

  @EventHandler("orderCompleted", { retry: { maxAttempts: 10 } })
  handleOrderCompleted(params: { event: OrderCompletedEvent; delivery: EventHandlerDelivery }) {
    return this.projectOrder(params.event, "COMPLETED");
  }

  @EventHandler("orderCancelled", { retry: { maxAttempts: 10 } })
  handleOrderCancelled(params: { event: OrderCancelledEvent; delivery: EventHandlerDelivery }) {
    return this.projectOrder(params.event, "CANCELLED");
  }

  private projectOrder(event: OrderProjectionEvent, status: "OPEN" | "COMPLETED" | "CANCELLED") {
    return this.project(event, {
      operation: "ORDER",
      customerId: event.payload.customerId,
      orderId: event.payload.orderId,
      revision: event.payload.orderRevision,
      status,
      currencyCode: event.payload.currencyCode,
      totalAmountMinor: event.payload.totalAmountMinor,
      createdAt: event.payload.createdAt,
      completedAt: event.eventType === "orderCompleted" ? event.payload.completedAt : null,
      cancelledAt: event.eventType === "orderCancelled" ? event.payload.cancelledAt : null,
      occurredAt: event.payload.occurredAt,
    });
  }
}

@Injectable()
export class CheckoutEventHandlers extends CustomerStatisticsEventHandlers {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("checkoutCustomerActivityRecorded", {
    retry: { maxAttempts: 10 },
  })
  handleCheckoutCustomerActivity(params: {
    event: CheckoutCustomerActivityRecordedEvent;
    delivery: EventHandlerDelivery;
  }) {
    const { event } = params;
    return this.project(event, {
      operation: "CHECKOUT",
      customerId: event.payload.customerId,
      checkoutId: event.payload.checkoutId,
      version: event.payload.checkoutVersion,
      occurredAt: event.payload.occurredAt,
    });
  }
}

@Injectable()
export class RefundEventHandlers extends CustomerStatisticsEventHandlers {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("orderRefunded", { retry: { maxAttempts: 10 } })
  handleOrderRefunded(params: { event: OrderRefundedEvent; delivery: EventHandlerDelivery }) {
    const { event } = params;
    return this.project(event, {
      operation: "REFUND",
      customerId: event.payload.customerId,
      refundId: event.payload.refundId,
      orderId: event.payload.orderId,
      revision: event.payload.refundRevision,
      currencyCode: event.payload.currencyCode,
      amountMinor: event.payload.refundedAmountMinor,
      occurredAt: event.payload.refundedAt,
    });
  }
}
