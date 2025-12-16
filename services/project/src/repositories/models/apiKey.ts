import {
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projectSchema } from "./schema.js";
import { project } from "./project.js";

export const apiKey = projectSchema.table(
  "api_key",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    keyPrefix: varchar("key_prefix", { length: 8 }).notNull(),
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
    uniqueIndex("api_key_key_hash_key")
      .on(table.keyHash)
      .where(sql`deleted_at IS NULL`),
    index("idx_api_key_project_id").on(table.projectId),
    index("idx_api_key_created_by_id").on(table.createdById),
    index("idx_api_key_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
  ]
);

export type ApiKey = typeof apiKey.$inferSelect;
export type NewApiKey = typeof apiKey.$inferInsert;
