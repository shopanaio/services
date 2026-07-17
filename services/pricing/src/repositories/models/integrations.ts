import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { discount } from "./discounts.js";
import {
  externalSyncDirectionEnum,
  externalSyncStatusEnum,
  pricingSchema,
} from "./schema.js";

export const discountExternalReference = pricingSchema.table(
  "discount_external_reference",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discount.id, { onDelete: "cascade" }),
    externalSystem: varchar("external_system", { length: 64 }).notNull(),
    externalType: varchar("external_type", { length: 64 })
      .notNull()
      .default("discount"),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    externalUrl: text("external_url"),
    direction: externalSyncDirectionEnum("direction").notNull(),
    syncStatus: externalSyncStatusEnum("sync_status")
      .notNull()
      .default("PENDING"),
    etag: text("etag"),
    contentChecksum: varchar("content_checksum", { length: 128 }),
    lastSyncedAt: timestamp("last_synced_at", {
      withTimezone: true,
      mode: "string",
    }),
    lastError: text("last_error"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check(
      "discount_external_reference_system_check",
      sql`length(btrim(${table.externalSystem})) > 0`,
    ),
    check(
      "discount_external_reference_type_check",
      sql`length(btrim(${table.externalType})) > 0`,
    ),
    check(
      "discount_external_reference_id_check",
      sql`length(btrim(${table.externalId})) > 0`,
    ),
    check(
      "discount_external_reference_sync_check",
      sql`${table.syncStatus} <> 'SYNCED' OR ${table.lastSyncedAt} IS NOT NULL`,
    ),
    check(
      "discount_external_reference_failure_check",
      sql`${table.syncStatus} <> 'FAILED' OR ${table.lastError} IS NOT NULL`,
    ),
    check(
      "discount_external_reference_metadata_object_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
    check(
      "discount_external_reference_deleted_at_check",
      sql`${table.deletedAt} IS NULL OR ${table.deletedAt} >= ${table.createdAt}`,
    ),
    uniqueIndex("discount_external_reference_lookup_unique")
      .on(
        table.storeId,
        table.externalSystem,
        table.externalType,
        table.externalId,
      )
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("discount_external_reference_discount_unique")
      .on(table.discountId, table.externalSystem, table.externalType)
      .where(sql`${table.deletedAt} IS NULL`),
    index("discount_external_reference_sync_queue_idx")
      .on(table.storeId, table.syncStatus, table.updatedAt, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export type DiscountExternalReference =
  typeof discountExternalReference.$inferSelect;
export type NewDiscountExternalReference =
  typeof discountExternalReference.$inferInsert;
