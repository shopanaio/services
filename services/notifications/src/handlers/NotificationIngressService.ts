import { Injectable } from "@nestjs/common";
import type {
  EventHandlerDelivery,
  EventHandlerResponse,
} from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { TemplateDefinitionRegistry } from "../infrastructure/templates/TemplateDefinitionRegistry.js";
import { Kernel } from "../kernel/Kernel.js";
import type { NotificationSourceEvent } from "../workflows/types.js";

export interface NotificationHandlerParams {
  event: NotificationSourceEvent;
  delivery: EventHandlerDelivery;
}

@Injectable()
export class NotificationIngressService {
  constructor(
    @InjectBroker("notifications") private readonly broker: ServiceBroker
  ) {}

  async enqueue(
    params: NotificationHandlerParams,
    callContext: BrokerCallContext
  ): Promise<EventHandlerResponse<{ workflowId: string }>> {
    try {
      this.validate(params, callContext);
      const started = await this.broker.startWorkflow(
        "notifications.ingestEvent",
        {
          event: params.event,
          delivery: params.delivery,
          registryVersion: TemplateDefinitionRegistry.VERSION,
        },
        {
          source: "content",
          organizationId: params.event.context.organizationId,
          resourceId: params.event.eventId,
          operation: `notifications.ingestEvent:${TemplateDefinitionRegistry.VERSION}`,
          content: {
            eventId: params.event.eventId,
            eventType: params.event.eventType,
            source: params.event.source,
          },
        }
      );
      return { success: true, data: { workflowId: started.workflowId } };
    } catch (error) {
      const validation = error instanceof NotificationIngressValidationError;
      return {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to durably ingest notification event",
          code: validation
            ? "NOTIFICATION_EVENT_REJECTED"
            : "NOTIFICATION_INGEST_START_FAILED",
          retryable: !validation,
        },
      };
    }
  }

  private validate(
    params: NotificationHandlerParams,
    callContext: BrokerCallContext
  ): void {
    const { event } = params;
    if (
      callContext.caller.kind !== "event" ||
      callContext.caller.service !== event.source
    ) {
      throw new NotificationIngressValidationError(
        "Trusted event caller does not match producer"
      );
    }
    try {
      Kernel.getInstance().definitions.assertEventProducer(
        event.eventType,
        event.source
      );
    } catch (error) {
      throw new NotificationIngressValidationError(
        error instanceof Error ? error.message : "Event producer is not allowed"
      );
    }
    if (
      !event.context?.organizationId ||
      !event.payload?.notification?.storeId ||
      !event.payload.notification.data
    ) {
      throw new NotificationIngressValidationError(
        "Notification event snapshot is incomplete"
      );
    }
    if (!params.delivery?.idempotencyKey) {
      throw new NotificationIngressValidationError(
        "Event handler delivery metadata is required"
      );
    }
  }
}

class NotificationIngressValidationError extends Error {}
