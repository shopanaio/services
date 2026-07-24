import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  notificationChannelEnum,
  notificationDeliveryStatusEnum,
  notificationAttemptStatusEnum,
  notificationOccurrenceStatusEnum,
  notificationPurposeEnum,
  notificationsSchema,
  staffRecipientScopeEnum,
  templateValidationStatusEnum,
  webhookFormatEnum,
  webhookStatusEnum,
} from "./schema.js";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow();

export const notificationDefinitionSettings = notificationsSchema.table(
  "notification_definition_settings",
  {
    storeId: uuid("store_id").notNull(),
    definitionKey: varchar("definition_key", { length: 128 }).notNull(),
    enabled: boolean("enabled").notNull(),
    version: integer("version").notNull().default(1),
    updatedBy: uuid("updated_by"),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("notification_definition_settings_store_key").on(
      table.storeId,
      table.definitionKey
    ),
  ]
);

export const notificationChannelSettings = notificationsSchema.table(
  "notification_channel_settings",
  {
    storeId: uuid("store_id").notNull(),
    definitionKey: varchar("definition_key", { length: 128 }).notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    enabled: boolean("enabled").notNull(),
    senderName: varchar("sender_name", { length: 255 }),
    senderEmail: varchar("sender_email", { length: 320 }),
    replyTo: varchar("reply_to", { length: 320 }),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("notification_channel_settings_store_key_channel").on(
      table.storeId,
      table.definitionKey,
      table.channel
    ),
  ]
);

export const notificationTemplateRevisions = notificationsSchema.table(
  "notification_template_revisions",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    definitionKey: varchar("definition_key", { length: 128 }).notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    locale: varchar("locale", { length: 16 }).notNull(),
    revision: integer("revision").notNull(),
    subjectTemplate: text("subject_template"),
    bodyTemplate: text("body_template").notNull(),
    plainTextTemplate: text("plain_text_template"),
    sourceHash: varchar("source_hash", { length: 64 }).notNull(),
    validationStatus: templateValidationStatusEnum("validation_status")
      .notNull()
      .default("VALID"),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (table) => [
    unique("notification_template_revision_identity").on(
      table.storeId,
      table.definitionKey,
      table.channel,
      table.locale,
      table.revision
    ),
    index("notification_template_revision_lookup_idx").on(
      table.storeId,
      table.definitionKey,
      table.channel,
      table.locale
    ),
  ]
);

export const notificationTemplateActiveRevisions = notificationsSchema.table(
  "notification_template_active_revisions",
  {
    storeId: uuid("store_id").notNull(),
    definitionKey: varchar("definition_key", { length: 128 }).notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    locale: varchar("locale", { length: 16 }).notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => notificationTemplateRevisions.id, {
        onDelete: "restrict",
      }),
    version: integer("version").notNull().default(1),
    updatedBy: uuid("updated_by"),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("notification_template_active_identity").on(
      table.storeId,
      table.definitionKey,
      table.channel,
      table.locale
    ),
  ]
);

export const staffNotificationRecipients = notificationsSchema.table(
  "staff_notification_recipients",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    userId: uuid("user_id"),
    name: varchar("name", { length: 255 }).notNull(),
    emailCiphertext: text("email_ciphertext").notNull(),
    emailHash: varchar("email_hash", { length: 64 }).notNull(),
    locale: varchar("locale", { length: 16 }).notNull().default("en"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    scope: staffRecipientScopeEnum("scope")
      .notNull()
      .default("ALL_ORDERS"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("staff_notification_recipient_store_email").on(
      table.storeId,
      table.emailHash
    ),
    index("staff_notification_recipient_store_enabled_idx").on(
      table.storeId,
      table.enabled
    ),
  ]
);

export const staffNotificationRecipientEvents = notificationsSchema.table(
  "staff_notification_recipient_events",
  {
    storeId: uuid("store_id").notNull(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => staffNotificationRecipients.id, {
        onDelete: "cascade",
      }),
    definitionKey: varchar("definition_key", { length: 128 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => [
    unique("staff_notification_recipient_event_identity").on(
      table.recipientId,
      table.definitionKey
    ),
    index("staff_notification_recipient_event_lookup_idx").on(
      table.storeId,
      table.definitionKey,
      table.enabled
    ),
  ]
);

export const notificationOccurrences = notificationsSchema.table(
  "notification_occurrences",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    definitionKey: varchar("definition_key", { length: 128 }).notNull(),
    sourceEventId: varchar("source_event_id", { length: 128 }),
    sourceEventType: varchar("source_event_type", { length: 128 }),
    sourceService: varchar("source_service", { length: 64 }).notNull(),
    sourceIdempotencyKey: varchar("source_idempotency_key", {
      length: 255,
    }).notNull(),
    subjectType: varchar("subject_type", { length: 64 }).notNull(),
    subjectId: varchar("subject_id", { length: 255 }).notNull(),
    correlationId: varchar("correlation_id", { length: 128 }).notNull(),
    dataSnapshot: text("data_snapshot").notNull(),
    piiPurgedAt: timestamp("pii_purged_at", {
      withTimezone: true,
      mode: "string",
    }),
    status: notificationOccurrenceStatusEnum("status")
      .notNull()
      .default("PENDING"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("notification_occurrence_idempotency").on(
      table.storeId,
      table.sourceIdempotencyKey,
      table.definitionKey
    ),
    index("notification_occurrence_store_created_idx").on(
      table.storeId,
      table.createdAt
    ),
    index("notification_occurrence_retention_idx").on(
      table.piiPurgedAt,
      table.createdAt
    ),
  ]
);

export const notificationRecipients = notificationsSchema.table(
  "notification_recipients",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    occurrenceId: uuid("occurrence_id")
      .notNull()
      .references(() => notificationOccurrences.id, { onDelete: "cascade" }),
    recipientRef: varchar("recipient_ref", { length: 255 }).notNull(),
    customerId: uuid("customer_id"),
    userId: uuid("user_id"),
    emailCiphertext: text("email_ciphertext"),
    phoneCiphertext: text("phone_ciphertext"),
    addressHash: varchar("address_hash", { length: 64 }),
    locale: varchar("locale", { length: 16 }),
    displayName: varchar("display_name", { length: 255 }),
    suppressionResult: varchar("suppression_result", { length: 64 }),
    createdAt: createdAt(),
  },
  (table) => [
    unique("notification_recipient_occurrence_ref").on(
      table.occurrenceId,
      table.recipientRef
    ),
    index("notification_recipient_store_occurrence_idx").on(
      table.storeId,
      table.occurrenceId
    ),
  ]
);

export const notificationDeliveries = notificationsSchema.table(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    occurrenceId: uuid("occurrence_id")
      .notNull()
      .references(() => notificationOccurrences.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => notificationRecipients.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    purpose: notificationPurposeEnum("purpose")
      .notNull()
      .default("BUSINESS"),
    status: notificationDeliveryStatusEnum("status")
      .notNull()
      .default("PENDING"),
    providerCode: varchar("provider_code", { length: 128 }),
    providerSlotId: uuid("provider_slot_id"),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    templateRevisionId: uuid("template_revision_id"),
    templateSourceVersion: varchar("template_source_version", { length: 64 }),
    locale: varchar("locale", { length: 16 }),
    contentHash: varchar("content_hash", { length: 64 }),
    renderedContent: text("rendered_content"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", {
      withTimezone: true,
      mode: "string",
    }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorKind: varchar("last_error_kind", { length: 64 }),
    lastErrorCode: varchar("last_error_code", { length: 128 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("notification_delivery_identity").on(
      table.occurrenceId,
      table.recipientId,
      table.channel
    ),
    unique("notification_delivery_idempotency_key").on(table.idempotencyKey),
    index("notification_delivery_operational_idx").on(
      table.storeId,
      table.status,
      table.nextAttemptAt
    ),
  ]
);

export const notificationDeliveryAttempts = notificationsSchema.table(
  "notification_delivery_attempts",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => notificationDeliveries.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    workflowId: varchar("workflow_id", { length: 255 }).notNull(),
    providerCode: varchar("provider_code", { length: 128 }),
    providerSlotId: uuid("provider_slot_id"),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", {
      withTimezone: true,
      mode: "string",
    }),
    status: notificationAttemptStatusEnum("status")
      .notNull()
      .default("STARTED"),
    errorKind: varchar("error_kind", { length: 64 }),
    errorCode: varchar("error_code", { length: 128 }),
    providerResponseCode: varchar("provider_response_code", { length: 128 }),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    diagnostics: jsonb("diagnostics")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (table) => [
    unique("notification_delivery_attempt_identity").on(
      table.deliveryId,
      table.attemptNumber
    ),
    index("notification_delivery_attempt_store_delivery_idx").on(
      table.storeId,
      table.deliveryId
    ),
  ]
);

export const webhookSubscriptions = notificationsSchema.table(
  "webhook_subscriptions",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    format: webhookFormatEnum("format").notNull(),
    url: text("url").notNull(),
    apiVersion: varchar("api_version", { length: 32 }).notNull(),
    status: webhookStatusEnum("status").notNull().default("ACTIVE"),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("webhook_subscription_store_event_url").on(
      table.storeId,
      table.eventType,
      table.url
    ),
    index("webhook_subscription_store_status_idx").on(
      table.storeId,
      table.status
    ),
  ]
);

export const webhookStoreSecretVersions = notificationsSchema.table(
  "webhook_store_secret_versions",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    version: integer("version").notNull(),
    secretCiphertext: text("secret_ciphertext").notNull(),
    active: boolean("active").notNull().default(true),
    graceExpiresAt: timestamp("grace_expires_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (table) => [
    unique("webhook_store_secret_version_identity").on(
      table.storeId,
      table.version
    ),
    index("webhook_store_secret_active_idx").on(
      table.storeId,
      table.active
    ),
  ]
);

export const notificationAuditEvents = notificationsSchema.table(
  "notification_audit_events",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    actorId: uuid("actor_id"),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 255 }).notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("notification_audit_store_created_idx").on(
      table.storeId,
      table.createdAt
    ),
  ]
);

export type NotificationDefinitionSetting =
  typeof notificationDefinitionSettings.$inferSelect;
export type NotificationChannelSetting =
  typeof notificationChannelSettings.$inferSelect;
export type NotificationTemplateRevision =
  typeof notificationTemplateRevisions.$inferSelect;
export type StaffNotificationRecipient =
  typeof staffNotificationRecipients.$inferSelect;
export type NotificationOccurrence = typeof notificationOccurrences.$inferSelect;
export type NotificationRecipient = typeof notificationRecipients.$inferSelect;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NotificationDeliveryAttempt =
  typeof notificationDeliveryAttempts.$inferSelect;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type WebhookStoreSecretVersion =
  typeof webhookStoreSecretVersions.$inferSelect;
