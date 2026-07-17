import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { discount } from "./discounts.js";
import { pricingSchema } from "./schema.js";

export const discountRevision = pricingSchema.table(
  "discount_revision",
  {
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discount.id, { onDelete: "restrict" }),
    revision: integer("revision").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    changeReason: text("change_reason"),
    createdById: text("created_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "discount_revision_pkey",
      columns: [table.discountId, table.revision],
    }),
    check("discount_revision_revision_check", sql`${table.revision} >= 0`),
    check(
      "discount_revision_snapshot_object_check",
      sql`jsonb_typeof(${table.snapshot}) = 'object'`,
    ),
    check(
      "discount_revision_change_reason_check",
      sql`${table.changeReason} IS NULL OR length(btrim(${table.changeReason})) > 0`,
    ),
    index("discount_revision_store_created_idx").on(
      table.storeId,
      table.createdAt.desc(),
      table.discountId,
      table.revision.desc(),
    ),
  ],
);

export const discountEvent = pricingSchema.table(
  "discount_event",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    sequence: bigint("sequence", { mode: "bigint" })
      .notNull()
      .generatedAlwaysAsIdentity(),
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discount.id, { onDelete: "restrict" }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    revision: integer("revision").notNull(),
    actorId: text("actor_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("discount_event_sequence_unique").on(table.sequence),
    unique("discount_event_idempotency_unique").on(
      table.storeId,
      table.idempotencyKey,
    ),
    check(
      "discount_event_type_check",
      sql`length(btrim(${table.eventType})) BETWEEN 1 AND 64 AND ${table.eventType} ~ '^[A-Z][A-Z0-9_]*$'`,
    ),
    check("discount_event_revision_check", sql`${table.revision} >= 0`),
    check(
      "discount_event_idempotency_check",
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
    check(
      "discount_event_payload_object_check",
      sql`jsonb_typeof(${table.payload}) = 'object'`,
    ),
    index("discount_event_discount_timeline_idx").on(
      table.storeId,
      table.discountId,
      table.occurredAt.desc(),
      table.sequence.desc(),
    ),
    index("discount_event_store_sequence_idx").on(
      table.storeId,
      table.sequence,
    ),
  ],
);

export type DiscountRevision = typeof discountRevision.$inferSelect;
export type NewDiscountRevision = typeof discountRevision.$inferInsert;
export type DiscountEvent = typeof discountEvent.$inferSelect;
export type NewDiscountEvent = typeof discountEvent.$inferInsert;
