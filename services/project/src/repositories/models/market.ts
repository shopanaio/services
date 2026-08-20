import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { currencyCodeEnum, localeCodeEnum } from "./reference.js";
import { storeSchema } from "./schema.js";

export const marketStatusEnum = storeSchema.enum("market_status", ["active", "inactive"]);

/**
 * Commercial context available to storefront customers.
 *
 * Currency and locale membership are validated by the application layer. The
 * columns intentionally do not use composite foreign keys containing store_id:
 * store_id is a tenant scope, not part of entity identity.
 */
export const market = storeSchema.table(
  "market",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    status: marketStatusEnum("status").notNull().default("active"),
    defaultCurrencyCode: currencyCodeEnum("default_currency_code").notNull(),
    defaultLocaleCode: localeCodeEnum("default_locale_code").notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    taxIncluded: boolean("tax_included").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    check("market_code_format_check", sql`${table.code} ~ '^[a-z][a-z0-9_-]{0,63}$'`),
    check("market_name_not_blank_check", sql`btrim(${table.name}) <> ''`),
    check("market_timezone_not_blank_check", sql`btrim(${table.timezone}) <> ''`),
    uniqueIndex("market_store_code_unique")
      .on(table.storeId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("market_store_default_unique")
      .on(table.storeId)
      .where(sql`${table.isDefault} = true AND ${table.deletedAt} IS NULL`),
    index("market_store_status_idx").on(table.storeId, table.status, table.id),
    index("market_store_currency_idx").on(table.storeId, table.defaultCurrencyCode, table.id),
    index("market_deleted_at_idx")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
  ],
);

/** ISO 3166-1 alpha-2 countries served by a market. */
export const marketCountry = storeSchema.table(
  "market_country",
  {
    storeId: uuid("store_id").notNull(),
    marketId: uuid("market_id")
      .notNull()
      .references(() => market.id, { onDelete: "cascade" }),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.marketId, table.countryCode],
      name: "market_country_pkey",
    }),
    check("market_country_code_format_check", sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
    uniqueIndex("market_country_primary_unique")
      .on(table.marketId)
      .where(sql`${table.isPrimary} = true`),
    index("market_country_store_country_idx").on(table.storeId, table.countryCode, table.marketId),
  ],
);

/** Locales enabled for a market; the default is stored on market itself. */
export const marketLocale = storeSchema.table(
  "market_locale",
  {
    storeId: uuid("store_id").notNull(),
    marketId: uuid("market_id")
      .notNull()
      .references(() => market.id, { onDelete: "cascade" }),
    localeCode: localeCodeEnum("locale_code").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.marketId, table.localeCode],
      name: "market_locale_pkey",
    }),
    index("market_locale_store_locale_idx").on(table.storeId, table.localeCode, table.marketId),
  ],
);

/** Currencies in which customers can shop within a market. */
export const marketCurrency = storeSchema.table(
  "market_currency",
  {
    storeId: uuid("store_id").notNull(),
    marketId: uuid("market_id")
      .notNull()
      .references(() => market.id, { onDelete: "cascade" }),
    currencyCode: currencyCodeEnum("currency_code").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.marketId, table.currencyCode],
      name: "market_currency_pkey",
    }),
    index("market_currency_store_currency_idx").on(
      table.storeId,
      table.currencyCode,
      table.marketId,
    ),
  ],
);

export type Market = typeof market.$inferSelect;
export type NewMarket = typeof market.$inferInsert;
export type MarketStatus = (typeof marketStatusEnum.enumValues)[number];

export type MarketCountry = typeof marketCountry.$inferSelect;
export type NewMarketCountry = typeof marketCountry.$inferInsert;

export type MarketLocale = typeof marketLocale.$inferSelect;
export type NewMarketLocale = typeof marketLocale.$inferInsert;

export type MarketCurrency = typeof marketCurrency.$inferSelect;
export type NewMarketCurrency = typeof marketCurrency.$inferInsert;
