import { Injectable } from "@nestjs/common";
import type {
  CustomerDeletedEvent,
  EventHandlerDelivery,
  EventHandlerResponse,
} from "@shopana/events";
import {
  EventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import { PrivacyCleanupScript } from "../scripts/index.js";

interface CustomerDeletedHandlerParams {
  event: CustomerDeletedEvent;
  delivery: EventHandlerDelivery;
}

@Injectable()
export class PrivacyEventHandlers extends EventHandlers {
  constructor(@InjectBroker("notifications") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("customerDeleted", { retry: { maxAttempts: 5 } })
  async customerDeleted(
    params: CustomerDeletedHandlerParams,
    context: BrokerCallContext
  ): Promise<EventHandlerResponse<{ occurrencesPurged: number }>> {
    try {
      if (
        context.caller.kind !== "event" ||
        context.caller.service !== "customers" ||
        params.event.source !== "customers" ||
        !params.delivery.idempotencyKey
      ) {
        return {
          success: false,
          error: {
            message: "Untrusted customer deletion event",
            code: "NOTIFICATION_PRIVACY_EVENT_REJECTED",
            retryable: false,
          },
        };
      }
      const result = await Kernel.getInstance().runScript(
        PrivacyCleanupScript,
        {
          operation: "purgeCustomer",
          customerId: params.event.payload.customerId,
        },
        {
          storeId: params.event.payload.storeId,
          organizationId: params.event.context.organizationId,
          requestId: params.delivery.idempotencyKey,
        }
      );
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Notification privacy cleanup failed",
          code: "NOTIFICATION_PRIVACY_CLEANUP_FAILED",
          retryable: true,
        },
      };
    }
  }
}
