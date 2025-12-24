import {
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeSchema } from "./schema";
import { store } from "./store";

export const apiKey = storeSchema.table(
  "api_key",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => store.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    key: varchar("key", { length: 64 }).notNull(),
    createdById: uuid("created_by_id").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    isBanned: boolean("is_banned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("api_key_key_unique")
      .on(table.key)
      .where(sql`deleted_at IS NULL`),
    index("idx_api_key_store_id").on(table.storeId),
    index("idx_api_key_created_by_id").on(table.createdById),
    index("idx_api_key_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
  ]
);

export type ApiKey = typeof apiKey.$inferSelect;
export type NewApiKey = typeof apiKey.$inferInsert;
