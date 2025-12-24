import {
  uuid,
  boolean,
  timestamp,
  index,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { storeSchema } from "./schema.js";
import { localeCodeEnum, type LocaleCode } from "./reference.js";

export { localeCodeEnum, type LocaleCode };

export const locale = storeSchema.table(
  "locale",
  {
    storeId: uuid("store_id").notNull(),
    code: localeCodeEnum("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.storeId, table.code] }),
    index("idx_locale_store_id").on(table.storeId),
    index("idx_locale_is_active").on(table.isActive),
  ]
);

export type Locale = typeof locale.$inferSelect;
export type NewLocale = typeof locale.$inferInsert;
