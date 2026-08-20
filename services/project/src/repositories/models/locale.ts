import { uuid, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeSchema } from "./schema.js";
import { localeCodeEnum, type LocaleCode } from "./reference.js";

export { localeCodeEnum, type LocaleCode };

export const locale = storeSchema.table(
  "locale",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    code: localeCodeEnum("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("locale_store_code_unique").on(table.storeId, table.code),
    index("idx_locale_store_id").on(table.storeId),
    index("idx_locale_store_active").on(table.storeId, table.isActive),
  ],
);

export type Locale = typeof locale.$inferSelect;
export type NewLocale = typeof locale.$inferInsert;
