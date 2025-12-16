import {
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projectSchema } from "./schema.js";
import { project } from "./project.js";

export const locale = projectSchema.table(
  "locale",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 10 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.code] }),
    index("idx_locale_project_id").on(table.projectId),
    index("idx_locale_is_active").on(table.isActive),
  ]
);

export type Locale = typeof locale.$inferSelect;
export type NewLocale = typeof locale.$inferInsert;
