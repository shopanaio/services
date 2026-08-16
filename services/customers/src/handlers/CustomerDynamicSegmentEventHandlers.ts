import { Injectable } from "@nestjs/common";
import type {
  CustomerStatisticsUpdatedEvent,
  CustomerUpdatedEvent,
  EventHandlerDelivery,
  EventHandlerResponse,
} from "@shopana/events";
import {
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import { CustomerDynamicSegmentInvalidateScript } from "../scripts/classification/CustomerDynamicSegmentInvalidateScript.js";

@Injectable()
export class CustomerDynamicSegmentEventHandlers extends EventHandlers {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("customerUpdated", { retry: { maxAttempts: 5 } })
  handleCustomerUpdated(params: {
    event: CustomerUpdatedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ invalidatedMemberships: number }>> {
    return this.invalidate(
      params.event.payload.storeId,
      params.event.context.organizationId,
      params.event.payload.customerId,
      params.delivery.idempotencyKey,
    );
  }

  @EventHandler("customerStatisticsUpdated", { retry: { maxAttempts: 5 } })
  handleCustomerStatisticsUpdated(params: {
    event: CustomerStatisticsUpdatedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ invalidatedMemberships: number }>> {
    return this.invalidate(
      params.event.payload.storeId,
      params.event.context.organizationId,
      params.event.payload.customerId,
      params.delivery.idempotencyKey,
    );
  }

  private async invalidate(
    storeId: string,
    organizationId: string,
    customerId: string,
    requestId: string,
  ): Promise<EventHandlerResponse<{ invalidatedMemberships: number }>> {
    try {
      const invalidatedMemberships = await Kernel.getInstance().runScript(
        CustomerDynamicSegmentInvalidateScript,
        { customerIds: [customerId] },
        { storeId, organizationId, requestId },
      );
      return { success: true, data: { invalidatedMemberships } };
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
}
