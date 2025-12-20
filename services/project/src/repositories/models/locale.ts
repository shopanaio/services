import {
  uuid,
  boolean,
  timestamp,
  index,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { projectSchema } from "./schema.js";
import { localeCodeEnum, type LocaleCode } from "./reference.js";

export { localeCodeEnum, type LocaleCode };

export const locale = projectSchema.table(
  "locale",
  {
    projectId: uuid("project_id").notNull(),
    code: localeCodeEnum("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.code] }),
    index("idx_locale_project_id").on(table.projectId),
    index("idx_locale_is_active").on(table.isActive),
  ]
);

export type Locale = typeof locale.$inferSelect;
export type NewLocale = typeof locale.$inferInsert;
