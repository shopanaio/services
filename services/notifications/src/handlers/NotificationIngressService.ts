import { Injectable } from "@nestjs/common";
import type { DomainEvent, EventHandlerDelivery, EventHandlerResponse } from "@shopana/events";
import { DBOS, InjectBroker, ServiceBroker, type BrokerCallContext } from "@shopana/shared-kernel";
import { TemplateDefinitionRegistry } from "../infrastructure/templates/TemplateDefinitionRegistry.js";
import type { NotificationSourceEvent } from "../workflows/types.js";

export interface NotificationHandlerParams {
  event: DomainEvent<string, Record<string, unknown>>;
  delivery: EventHandlerDelivery;
}

@Injectable()
export class NotificationIngressService {
  constructor(@InjectBroker("notifications") private readonly broker: ServiceBroker) {}

  async enqueue(
    params: NotificationHandlerParams,
    callContext: BrokerCallContext,
  ): Promise<EventHandlerResponse<{ workflowId: string }>> {
    try {
      const event = this.validate(params, callContext);
      const started = await this.broker.startWorkflow(
        "notifications.ingestEvent",
        {
          event,
          delivery: params.delivery,
          registryVersion: TemplateDefinitionRegistry.VERSION,
        },
        {
          source: "content",
          organizationId: event.context.organizationId,
          resourceId: event.eventId,
          operation: `notifications.ingestEvent:${TemplateDefinitionRegistry.VERSION}`,
          content: {
            eventId: event.eventId,
            eventType: event.eventType,
            source: event.source,
          },
        },
      );
      return { success: true, data: { workflowId: started.workflowId } };
    } catch (error) {
      const validation = error instanceof NotificationIngressValidationError;
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Failed to durably ingest notification event",
          code: validation ? "NOTIFICATION_EVENT_REJECTED" : "NOTIFICATION_INGEST_START_FAILED",
          retryable: !validation,
        },
      };
    }
  }

  private validate(
    params: NotificationHandlerParams,
    callContext: BrokerCallContext,
  ): NotificationSourceEvent {
    const { event } = params;
    if (callContext.caller.kind !== "event") {
      throw new NotificationIngressValidationError(
        "Notification ingress requires a trusted event delivery",
      );
    }
    const notification = event.payload.notification;
    if (
      !event.context?.organizationId ||
      !isRecord(notification) ||
      typeof notification.storeId !== "string" ||
      notification.storeId.length === 0 ||
      !isRecord(notification.data)
    ) {
      throw new NotificationIngressValidationError("Notification event snapshot is incomplete");
    }
    if (!params.delivery?.idempotencyKey) {
      throw new NotificationIngressValidationError("Event handler delivery metadata is required");
    }
    return event as NotificationSourceEvent;
  }
}

class NotificationIngressValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
