import { sql } from "drizzle-orm";
import {
  check,
  index,
  inet,
  jsonb,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { customer } from "./profiles.js";
import {
  consentChannelEnum,
  consentOptInLevelEnum,
  consentStateEnum,
  customersSchema,
} from "./schema.js";

export const customerConsent = customersSchema.table(
  "customer_consent",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    channel: consentChannelEnum("channel").notNull(),
    state: consentStateEnum("state").notNull().default("NOT_SUBSCRIBED"),
    optInLevel: consentOptInLevelEnum("opt_in_level").notNull().default("UNKNOWN"),
    contactPoint: varchar("contact_point", { length: 320 }).notNull(),
    source: varchar("source", { length: 64 }).notNull().default("unknown"),
    sourceLocationId: uuid("source_location_id"),
    sourceIp: inet("source_ip"),
    userAgent: text("user_agent"),
    consentedAt: timestamp("consented_at", {
      withTimezone: true,
      mode: "string",
    }),
    withdrawnAt: timestamp("withdrawn_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("customer_consent_contact_point_check", sql`length(btrim(${table.contactPoint})) > 0`),
    check(
      "customer_consent_state_timestamps_check",
      sql`(${table.state} <> 'SUBSCRIBED' OR (${table.consentedAt} IS NOT NULL AND ${table.withdrawnAt} IS NULL))
        AND (${table.state} <> 'UNSUBSCRIBED' OR ${table.withdrawnAt} IS NOT NULL)`,
    ),
    check(
      "customer_consent_withdrawal_order_check",
      sql`${table.withdrawnAt} IS NULL OR ${table.consentedAt} IS NULL OR ${table.withdrawnAt} >= ${table.consentedAt}`,
    ),
    unique("customer_consent_customer_channel_unique").on(table.customerId, table.channel),
    index("customer_consent_store_state_idx").on(
      table.storeId,
      table.channel,
      table.state,
      table.customerId,
    ),
    index("customer_consent_store_customer_channel_idx").on(
      table.storeId,
      table.customerId,
      table.channel,
    ),
    index("customer_consent_customer_idx").on(table.customerId),
  ],
);

export const customerConsentEvent = customersSchema.table(
  "customer_consent_event",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    consentId: uuid("consent_id")
      .notNull()
      .references(() => customerConsent.id, { onDelete: "cascade" }),
    channel: consentChannelEnum("channel").notNull(),
    previousState: consentStateEnum("previous_state"),
    newState: consentStateEnum("new_state").notNull(),
    optInLevel: consentOptInLevelEnum("opt_in_level").notNull().default("UNKNOWN"),
    contactPoint: varchar("contact_point", { length: 320 }).notNull(),
    source: varchar("source", { length: 64 }).notNull().default("unknown"),
    sourceLocationId: uuid("source_location_id"),
    sourceIp: inet("source_ip"),
    userAgent: text("user_agent"),
    actorType: varchar("actor_type", { length: 32 }).notNull().default("system"),
    actorId: text("actor_id"),
    requestId: text("request_id"),
    idempotencyKey: text("idempotency_key"),
    evidence: jsonb("evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "customer_consent_event_contact_point_check",
      sql`length(btrim(${table.contactPoint})) > 0`,
    ),
    uniqueIndex("customer_consent_event_idempotency_unique")
      .on(table.storeId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("customer_consent_event_customer_time_idx").on(
      table.customerId,
      table.occurredAt.desc(),
      table.id,
    ),
    index("customer_consent_event_store_channel_time_idx").on(
      table.storeId,
      table.channel,
      table.occurredAt.desc(),
      table.id,
    ),
  ],
);

export type CustomerConsent = typeof customerConsent.$inferSelect;
export type NewCustomerConsent = typeof customerConsent.$inferInsert;
export type CustomerConsentEvent = typeof customerConsentEvent.$inferSelect;
export type NewCustomerConsentEvent = typeof customerConsentEvent.$inferInsert;
