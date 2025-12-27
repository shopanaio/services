import {
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeSchema } from "./schema.js";
import {
  weightUnitEnum,
  dimensionUnitEnum,
  type WeightUnit,
  type DimensionUnit,
} from "./reference.js";
import { locale, localeCodeEnum, type LocaleCode } from "./locale.js";
import { currency, currencyCodeEnum, type CurrencyCode } from "./currency.js";

export {
  weightUnitEnum,
  dimensionUnitEnum,
  localeCodeEnum,
  currencyCodeEnum,
  type WeightUnit,
  type DimensionUnit,
  type LocaleCode,
  type CurrencyCode,
};

export const storeStatusEnum = storeSchema.enum("store_status", [
  "active",
  "inactive",
]);

export const store = storeSchema.table(
  "store",
  {
    id: uuid("id").primaryKey(),
    // Organization that owns this store (from IAM)
    organizationId: uuid("organization_id").notNull(),
    externalSystem: varchar("external_system", { length: 64 }),
    externalId: varchar("external_id", { length: 255 }),
    /** URL-friendly identifier (e.g., "my-store") */
    name: varchar("name", { length: 255 }).notNull(),
    /** Human-readable display name (e.g., "My Store") */
    displayName: varchar("display_name", { length: 255 }).notNull(),
    status: storeStatusEnum("status").notNull().default("active"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    email: varchar("email", { length: 255 }),
    defaultLocale: localeCodeEnum("default_locale").notNull(),
    baseCurrency: currencyCodeEnum("base_currency").notNull(),
    defaultCurrency: currencyCodeEnum("default_currency").notNull(),
    defaultWeightUnit: weightUnitEnum("default_weight_unit").notNull(),
    defaultDimensionUnit: dimensionUnitEnum("default_dimension_unit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("store_name_key")
      .on(table.name)
      .where(sql`deleted_at IS NULL`),
    index("idx_store_status").on(table.status),
    index("idx_store_created_at").on(table.createdAt),
    index("idx_store_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
    index("idx_store_external").on(table.externalSystem, table.externalId),
    index("idx_store_organization").on(table.organizationId),
    foreignKey({
      columns: [table.id, table.defaultLocale],
      foreignColumns: [locale.storeId, locale.code],
      name: "store_id_default_locale_locale_store_id_code_fk",
    }),
    foreignKey({
      columns: [table.id, table.baseCurrency],
      foreignColumns: [currency.storeId, currency.code],
      name: "store_id_base_currency_currency_store_id_code_fk",
    }),
    foreignKey({
      columns: [table.id, table.defaultCurrency],
      foreignColumns: [currency.storeId, currency.code],
      name: "store_id_default_currency_currency_store_id_code_fk",
    }),
  ]
);

export type StoreRecord = typeof store.$inferSelect;
export type NewStore = typeof store.$inferInsert;
export type StoreStatus = "active" | "inactive";
