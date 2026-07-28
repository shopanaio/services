import type {
  NotificationChannel,
  NotificationDefinitionKey,
  NotificationPurpose,
  NotificationRecipientSnapshot,
} from "@shopana/broker-types";
import type { DomainEvent, EventHandlerDelivery } from "@shopana/events";

export interface NotificationSnapshotPayload {
  storeId: string;
  locale?: string;
  recipients?: readonly NotificationRecipientSnapshot[];
  data: Record<string, unknown>;
}

export type NotificationSourceEvent = DomainEvent<
  string,
  Record<string, unknown> & { notification: NotificationSnapshotPayload }
>;

export interface IngestEventWorkflowInput {
  event: NotificationSourceEvent;
  delivery: EventHandlerDelivery;
  registryVersion: string;
}

export interface EnqueueWorkflowInput {
  storeId: string;
  organizationId: string;
  key: NotificationDefinitionKey;
  recipients?: readonly NotificationRecipientSnapshot[];
  locale?: string;
  data: Record<string, unknown>;
  idempotencyKey: string;
  subject: { type: string; id: string };
  correlationId: string;
  sourceService: string;
  purpose?: NotificationPurpose;
  forcedChannels?: readonly NotificationChannel[];
}

export interface MaterializationWorkflowResult {
  occurrenceIds: string[];
  deliveryIds: string[];
  skipped: Array<{
    key: NotificationDefinitionKey;
    reason: "DISABLED" | "NO_RECIPIENT";
  }>;
}

export interface DeliveryWorkflowInput {
  storeId: string;
  organizationId: string;
  deliveryId: string;
  locale?: string;
  defaultLocale?: string;
  displayName?: string;
  timezone?: string;
  email?: string | null;
}
