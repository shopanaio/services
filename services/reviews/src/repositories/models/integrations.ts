import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { contentItem } from "./content.js";
import {
  externalSyncDirectionEnum,
  externalSyncStatusEnum,
  reviewsSchema,
} from "./schema.js";

export const contentExternalReference = reviewsSchema.table(
  "content_external_reference",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    externalSystem: varchar("external_system", { length: 64 }).notNull(),
    externalType: varchar("external_type", { length: 64 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    externalUrl: text("external_url"),
    direction: externalSyncDirectionEnum("direction").notNull(),
    syncStatus: externalSyncStatusEnum("sync_status").notNull().default("PENDING"),
    etag: text("etag"),
    contentChecksum: varchar("content_checksum", { length: 128 }),
    lastSyncedAt: timestamp("last_synced_at", {
      withTimezone: true,
      mode: "string",
    }),
    lastError: text("last_error"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("content_external_reference_lookup_unique")
      .on(
        table.storeId,
        table.externalSystem,
        table.externalType,
        table.externalId
      )
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("content_external_reference_content_unique")
      .on(table.contentId, table.externalSystem, table.externalType)
      .where(sql`${table.deletedAt} IS NULL`),
    index("content_external_reference_sync_queue_idx")
      .on(table.storeId, table.syncStatus, table.updatedAt, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export type ContentExternalReference =
  typeof contentExternalReference.$inferSelect;
export type NewContentExternalReference =
  typeof contentExternalReference.$inferInsert;
