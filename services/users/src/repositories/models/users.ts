import {
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersSchema } from "./schema";

export const user = usersSchema.table(
  "user",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("user_project_id_email_key")
      .on(table.projectId, table.email)
      .where(sql`deleted_at IS NULL`),
    index("idx_user_project_id").on(table.projectId),
    index("idx_user_created_at").on(table.createdAt),
    index("idx_user_updated_at").on(table.updatedAt),
    index("idx_user_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
  ]
);

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
