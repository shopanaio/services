import { Injectable } from "@nestjs/common";
import type {
  DomainEvent,
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
  event: DomainEvent<"customerDeleted", Record<string, unknown>>;
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
      const storeId = readRequiredString(params.event.payload, "storeId");
      const result = await Kernel.getInstance().runScript(
        PrivacyCleanupScript,
        {
          operation: "purgeCustomer",
          customerId: params.event.subject.id,
        },
        {
          storeId,
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

function readRequiredString(
  payload: Record<string, unknown>,
  key: string
): string {
  const value = payload[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Event payload field ${key} is required`);
  }
  return value;
}
