import { Injectable } from "@nestjs/common";
import {
  InjectBroker,
  ServiceBroker,
  Workflow,
} from "@shopana/shared-kernel";
import { TemplateDefinitionRegistry } from "../infrastructure/templates/TemplateDefinitionRegistry.js";
import { MaterializationWorkflowBase } from "./MaterializationWorkflowBase.js";
import type {
  IngestEventWorkflowInput,
  MaterializationWorkflowResult,
} from "./types.js";

@Injectable()
export class NotificationIngestEventWorkflow extends MaterializationWorkflowBase {
  constructor(@InjectBroker("notifications") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("ingestEvent", { idempotencyStrategy: "content" })
  async run(
    input: IngestEventWorkflowInput
  ): Promise<MaterializationWorkflowResult> {
    if (
      input.registryVersion !==
      TemplateDefinitionRegistry.VERSION
    ) {
      throw new Error("NOTIFICATION_REGISTRY_VERSION_MISMATCH");
    }
    const { event } = input;
    if (event.context.organizationId.length === 0) {
      throw new Error("EVENT_ORGANIZATION_REQUIRED");
    }
    const snapshot = event.payload.notification;
    if (!snapshot || snapshot.storeId.length === 0) {
      throw new Error("NOTIFICATION_SNAPSHOT_REQUIRED");
    }

    const context = {
      storeId: snapshot.storeId,
      organizationId: event.context.organizationId,
      locale: snapshot.locale,
      defaultLocale: snapshot.locale ?? "en",
      requestId: `notification-event-${event.eventId}`,
    };
    const result: MaterializationWorkflowResult = {
      occurrenceIds: [],
      deliveryIds: [],
      skipped: [],
    };
    const definitions = this.kernel.definitions.forEvent(event.eventType);
    for (const [index, definition] of definitions.entries()) {
      const materialized = await this.materialize({
        context,
        params: {
          storeId: snapshot.storeId,
          organizationId: event.context.organizationId,
          key: definition.key,
          sourceEventId: event.eventId,
          sourceEventType: event.eventType,
          includeEventWebhooks: index === 0,
          sourceService: event.source,
          sourceIdempotencyKey: `${input.registryVersion}:${event.eventId}`,
          subject: event.subject,
          correlationId: event.context.correlationId,
          recipients: snapshot.recipients,
          locale: snapshot.locale,
          data: snapshot.data,
        },
      });
      if (materialized.occurrenceId) {
        result.occurrenceIds.push(materialized.occurrenceId);
      }
      result.deliveryIds.push(...materialized.deliveryIds);
      if (materialized.skippedReason) {
        result.skipped.push({
          key: definition.key,
          reason: materialized.skippedReason,
        });
      }
    }
    for (const deliveryId of result.deliveryIds) {
      await this.startDelivery({
        ...context,
        deliveryId,
      });
    }
    return result;
  }
}
