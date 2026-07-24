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
    this.kernel.definitions.assertEventProducer(event.eventType, event.source);
    if (event.context.organizationId.length === 0) {
      throw new Error("EVENT_ORGANIZATION_REQUIRED");
    }
    const snapshot = event.payload.notification;
    if (!snapshot || snapshot.storeId.length === 0) {
      throw new Error("NOTIFICATION_SNAPSHOT_REQUIRED");
    }
    const store = readStoreSnapshot(snapshot.data);
    if (store.id !== snapshot.storeId) {
      throw new Error("NOTIFICATION_STORE_SNAPSHOT_MISMATCH");
    }

    const context = {
      storeId: snapshot.storeId,
      organizationId: event.context.organizationId,
      locale: snapshot.locale,
      defaultLocale: store.defaultLocale,
      requestId: `notification-event-${event.eventId}`,
      displayName: store.displayName,
      timezone: store.timezone,
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

function readStoreSnapshot(data: Record<string, unknown>): {
  id: string;
  displayName: string;
  defaultLocale: string;
  timezone: string;
} {
  const store = data.store;
  if (!store || typeof store !== "object" || Array.isArray(store)) {
    throw new Error("NOTIFICATION_DATA_STORE_REQUIRED");
  }
  const values = store as Record<string, unknown>;
  for (const key of ["id", "displayName", "defaultLocale", "timezone"]) {
    if (typeof values[key] !== "string" || values[key].length === 0) {
      throw new Error(`NOTIFICATION_DATA_STORE_${key.toUpperCase()}_REQUIRED`);
    }
  }
  return values as {
    id: string;
    displayName: string;
    defaultLocale: string;
    timezone: string;
  };
}
