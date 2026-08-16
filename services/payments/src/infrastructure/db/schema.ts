import { sql } from "drizzle-orm";
import { bigint, check, index, integer, jsonb, pgSchema, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const paymentsSchema = pgSchema("payments");
export const providerAccountStatus = paymentsSchema.enum("provider_account_status", ["CONFIGURING", "READY", "ACTIVE", "INACTIVE", "DEGRADED", "SUSPENDED"]);
export const providerMode = paymentsSchema.enum("provider_mode", ["TEST", "LIVE"]);
export const captureMode = paymentsSchema.enum("capture_mode", ["AUTOMATIC", "MANUAL"]);
export const customizationStatus = paymentsSchema.enum("customization_status", ["ACTIVE", "DISABLED"]);
export const customizationFailureMode = paymentsSchema.enum("customization_failure_mode", ["REQUIRED", "OPTIONAL"]);
export const paymentCollectionState = paymentsSchema.enum("payment_collection_state", ["OPEN", "PENDING", "PARTIALLY_AUTHORIZED", "AUTHORIZED", "PARTIALLY_PAID", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED"]);
export const paymentSessionKind = paymentsSchema.enum("payment_session_kind", ["SALE", "AUTHORIZATION"]);
export const paymentSessionState = paymentsSchema.enum("payment_session_state", ["CREATED", "PROCESSING", "REQUIRES_ACTION", "REQUIRES_CONFIRMATION", "PENDING", "AUTHORIZED", "PARTIALLY_CAPTURED", "CAPTURED", "VOIDED", "PARTIALLY_REFUNDED", "REFUNDED", "FAILED", "EXPIRED", "CANCELLED"]);
export const paymentOperationType = paymentsSchema.enum("payment_operation_type", ["SALE", "AUTHORIZE", "CONFIRM", "CANCEL", "CAPTURE", "VOID", "REFUND", "RECONCILE"]);
export const paymentOperationState = paymentsSchema.enum("payment_operation_state", ["REQUESTED", "PROCESSING", "REQUIRES_ACTION", "REQUIRES_CONFIRMATION", "PENDING", "SUCCEEDED", "FAILED", "EXPIRED"]);
export const paymentDisputeState = paymentsSchema.enum("payment_dispute_state", ["NEEDS_RESPONSE", "UNDER_REVIEW", "WON", "LOST", "ACCEPTED", "CLOSED"]);

export const paymentProviderAccount = paymentsSchema.table("provider_account", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`), organizationId: uuid("organization_id").notNull(), storeId: uuid("store_id").notNull(), installationId: uuid("installation_id").notNull(),
  appCode: text("app_code").notNull(), appVersion: text("app_version").notNull(), providerCode: text("provider_code").notNull(), displayName: text("display_name").notNull(),
  status: providerAccountStatus("status").notNull(), mode: providerMode("mode").notNull(), captureMode: captureMode("capture_mode").notNull(), capabilities: jsonb("capabilities").notNull(),
  configurationRevision: text("configuration_revision").notNull(), supportedCurrencyCodes: jsonb("supported_currency_codes").notNull(), supportedCountryCodes: jsonb("supported_country_codes").notNull(),
  supportedSessionKinds: jsonb("supported_session_kinds").notNull(), supportedOperations: jsonb("supported_operations").notNull(), enabledMethodKeys: jsonb("enabled_method_keys").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [unique("provider_account_store_installation_unique").on(table.storeId, table.installationId), index("provider_account_active_idx").on(table.storeId, table.id)]);

export const paymentCustomization = paymentsSchema.table("payment_customization", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`), storeId: uuid("store_id").notNull(), status: customizationStatus("status").notNull(), policyRevision: text("policy_revision").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [unique("payment_customization_store_id_id_unique").on(table.storeId, table.id)]);

export const paymentCustomizationBinding = paymentsSchema.table("payment_customization_binding", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`), storeId: uuid("store_id").notNull(), customizationId: uuid("customization_id").notNull(), installationId: uuid("installation_id").notNull(), functionKey: text("function_key").notNull(),
  contractVersion: integer("contract_version").notNull(), precedence: integer("precedence").notNull(), activationSequence: bigint("activation_sequence", { mode: "number" }).notNull(), failureMode: customizationFailureMode("failure_mode").notNull(),
  configurationSnapshot: jsonb("configuration_snapshot").notNull(), configurationRevision: text("configuration_revision").notNull(), routeRevision: text("route_revision").notNull(), status: customizationStatus("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("payment_customization_binding_active_idx").on(table.storeId, table.precedence, table.activationSequence, table.id)]);

export const checkoutMethodSnapshot = paymentsSchema.table("checkout_method_snapshot", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`), storeId: uuid("store_id").notNull(), checkoutId: uuid("checkout_id").notNull(), basedOnCheckoutVersion: integer("based_on_checkout_version").notNull(), targetCheckoutVersion: integer("target_checkout_version").notNull(),
  finalQuoteRevision: text("final_quote_revision").notNull(), deliveryRevision: text("delivery_revision").notNull(), discoveryRevision: text("discovery_revision").notNull(), customizationRevision: text("customization_revision").notNull(), paymentRevision: text("payment_revision").notNull(),
  payload: jsonb("payload").notNull(), retainUntil: timestamp("retain_until", { withTimezone: true, mode: "string" }).notNull(), createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [unique("checkout_method_snapshot_target_unique").on(table.storeId, table.checkoutId, table.targetCheckoutVersion), check("checkout_method_snapshot_version_check", sql`${table.targetCheckoutVersion} = ${table.basedOnCheckoutVersion} + 1`), index("checkout_method_snapshot_expiry_idx").on(table.retainUntil)]);

export const paymentMethodHandleIdentity = paymentsSchema.table("payment_method_handle", {
  storeId: uuid("store_id").notNull(), checkoutId: uuid("checkout_id").notNull(), methodHandle: text("method_handle").notNull(), semanticRevision: text("semantic_revision").notNull(), createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [unique("payment_method_handle_identity_unique").on(table.storeId, table.checkoutId, table.methodHandle)]);

export const checkoutMethodBinding = paymentsSchema.table("checkout_method_binding", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`), snapshotId: uuid("snapshot_id").notNull(), storeId: uuid("store_id").notNull(), checkoutId: uuid("checkout_id").notNull(), basedOnCheckoutVersion: integer("based_on_checkout_version").notNull(), targetCheckoutVersion: integer("target_checkout_version").notNull(),
  methodHandle: text("method_handle").notNull(), method: jsonb("method").notNull(), providerAccountId: uuid("provider_account_id").notNull(), providerCode: text("provider_code").notNull(), providerMethodKey: text("provider_method_key").notNull(),
  configurationRevision: text("configuration_revision").notNull(), providerDiscoveryRevision: text("provider_discovery_revision").notNull(), discoveryRoute: jsonb("discovery_route").notNull(), semanticRevision: text("semantic_revision").notNull(), createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [unique("checkout_method_binding_target_handle_unique").on(table.storeId, table.checkoutId, table.targetCheckoutVersion, table.methodHandle), index("checkout_method_binding_resolve_idx").on(table.storeId, table.checkoutId, table.targetCheckoutVersion, table.methodHandle)]);

export const checkoutMethodExecution = paymentsSchema.table("checkout_method_execution", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`), snapshotId: uuid("snapshot_id").notNull(), storeId: uuid("store_id").notNull(), sequence: integer("sequence").notNull(), kind: text("kind").notNull(), ownerId: text("owner_id").notNull(), status: text("status").notNull(), classification: text("classification"), revision: text("revision"), audit: jsonb("audit").notNull(), createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const paymentCollection = paymentsSchema.table("payment_collection", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`), organizationId: uuid("organization_id").notNull(), storeId: uuid("store_id").notNull(), checkoutId: uuid("checkout_id").notNull(), orderId: uuid("order_id").notNull(),
  state: paymentCollectionState("state").notNull(), revision: integer("revision").notNull(), idempotencyKey: text("idempotency_key").notNull(), requestHash: text("request_hash").notNull(), payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [unique("payment_collection_store_id_unique").on(table.storeId, table.id), unique("payment_collection_order_unique").on(table.storeId, table.orderId), unique("payment_collection_idempotency_unique").on(table.storeId, table.idempotencyKey), index("payment_collection_checkout_idx").on(table.storeId, table.checkoutId)]);

export const paymentSession = paymentsSchema.table("payment_session", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`), paymentCollectionId: uuid("payment_collection_id").notNull(), organizationId: uuid("organization_id").notNull(), storeId: uuid("store_id").notNull(), checkoutId: uuid("checkout_id").notNull(), orderId: uuid("order_id").notNull(),
  attemptSequence: integer("attempt_sequence").notNull(), kind: paymentSessionKind("kind").notNull(), state: paymentSessionState("state").notNull(), providerAccountId: uuid("provider_account_id").notNull(), methodHandle: text("method_handle").notNull(), providerReference: text("provider_reference"), revision: integer("revision").notNull(), idempotencyKey: text("idempotency_key").notNull(), requestHash: text("request_hash").notNull(), payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [unique("payment_session_store_id_unique").on(table.storeId, table.id), unique("payment_session_attempt_unique").on(table.paymentCollectionId, table.attemptSequence), unique("payment_session_idempotency_unique").on(table.paymentCollectionId, table.idempotencyKey), index("payment_session_collection_idx").on(table.storeId, table.paymentCollectionId, table.attemptSequence)]);

export const paymentOperation = paymentsSchema.table("payment_operation", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`), paymentSessionId: uuid("payment_session_id").notNull(), storeId: uuid("store_id").notNull(), type: paymentOperationType("type").notNull(), state: paymentOperationState("state").notNull(), revision: integer("revision").notNull(), idempotencyKey: text("idempotency_key").notNull(), requestHash: text("request_hash").notNull(), payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [unique("payment_operation_store_id_unique").on(table.storeId, table.id), unique("payment_operation_idempotency_unique").on(table.paymentSessionId, table.idempotencyKey), index("payment_operation_session_idx").on(table.storeId, table.paymentSessionId, table.createdAt)]);

/** Idempotent inbox for asynchronous completions and provider webhooks. */
export const paymentProviderEvent = paymentsSchema.table("payment_provider_event", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  storeId: uuid("store_id").notNull(),
  providerAccountId: uuid("provider_account_id").notNull(),
  providerEventId: text("provider_event_id").notNull(),
  eventHash: text("event_hash").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  unique("payment_provider_event_identity_unique").on(table.storeId, table.providerAccountId, table.providerEventId),
  index("payment_provider_event_account_idx").on(table.storeId, table.providerAccountId, table.occurredAt),
]);

export const paymentDispute = paymentsSchema.table("payment_dispute", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  storeId: uuid("store_id").notNull(),
  paymentCollectionId: uuid("payment_collection_id").notNull(),
  paymentSessionId: uuid("payment_session_id").notNull(),
  providerAccountId: uuid("provider_account_id").notNull(),
  providerDisputeReference: text("provider_dispute_reference").notNull(),
  providerReference: text("provider_reference").notNull(),
  state: paymentDisputeState("state").notNull(),
  revision: integer("revision").notNull(),
  payload: jsonb("payload").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
}, (table) => [
  unique("payment_dispute_provider_identity_unique").on(table.storeId, table.providerAccountId, table.providerDisputeReference),
  index("payment_dispute_session_idx").on(table.storeId, table.paymentSessionId, table.updatedAt),
]);

/** Events are inserted in the same transaction as payment state transitions. */
export const paymentEventOutbox = paymentsSchema.table("payment_event_outbox", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  organizationId: uuid("organization_id").notNull(),
  storeId: uuid("store_id").notNull(),
  operationId: uuid("operation_id"),
  eventKey: text("event_key").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  correlationId: text("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  emittedAt: timestamp("emitted_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  unique("payment_event_outbox_key_unique").on(table.eventKey),
  index("payment_event_outbox_pending_idx").on(table.storeId, table.createdAt),
  index("payment_event_outbox_operation_idx").on(table.operationId, table.createdAt),
]);
