import { Injectable } from "@nestjs/common";
import type {
  DomainEvent,
  EventHandlerDelivery,
  EventHandlerResponse,
} from "@shopana/events";
import {
  CatchAllEventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import { PrivacyCleanupScript } from "../scripts/index.js";
import { NotificationIngressService } from "./NotificationIngressService.js";

interface CatchAllEventHandlerParams {
  event: DomainEvent<string, Record<string, unknown>>;
  delivery: EventHandlerDelivery;
}

@Injectable()
export class NotificationEventHandlers extends EventHandlers {
  constructor(
    @InjectBroker("notifications") broker: ServiceBroker,
    private readonly ingress: NotificationIngressService
  ) {
    super(broker);
  }

  @CatchAllEventHandler({ retry: { maxAttempts: 5 } })
  async handleEvent(
    params: CatchAllEventHandlerParams,
    context: BrokerCallContext
  ): Promise<EventHandlerResponse<unknown>> {
    if (
      params.event.eventType === "customerDeleted" ||
      params.event.eventType === "customerRedacted"
    ) {
      return this.cleanupCustomer(params, context);
    }

    if (
      Kernel.getInstance().definitions.forEvent(params.event.eventType)
        .length === 0
    ) {
      return { success: true };
    }

    return this.ingress.enqueue(params, context);
  }

  private async cleanupCustomer(
    params: CatchAllEventHandlerParams,
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
