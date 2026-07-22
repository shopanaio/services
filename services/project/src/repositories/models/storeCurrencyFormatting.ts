import { sql } from "drizzle-orm";
import {
  check,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { storeSchema } from "./schema.js";

export const currencyDisplayEnum = storeSchema.enum("currency_display", [
  "symbol",
  "narrowSymbol",
  "code",
  "name",
]);

export const currencySignEnum = storeSchema.enum("currency_sign", [
  "standard",
  "accounting",
]);

export const currencyGroupingEnum = storeSchema.enum("currency_grouping", [
  "auto",
  "always",
  "min2",
  "never",
]);

export const currencySignDisplayEnum = storeSchema.enum(
  "currency_sign_display",
  ["auto", "always", "exceptZero", "negative", "never"],
);

export const currencyRoundingModeEnum = storeSchema.enum(
  "currency_rounding_mode",
  [
    "ceil",
    "floor",
    "expand",
    "trunc",
    "halfCeil",
    "halfFloor",
    "halfExpand",
    "halfTrunc",
    "halfEven",
  ],
);

export const currencyTrailingZeroDisplayEnum = storeSchema.enum(
  "currency_trailing_zero_display",
  ["auto", "stripIfInteger"],
);

/** Intl.NumberFormat options; currency and locale remain canonical Store fields. */
export const storeCurrencyFormatting = storeSchema.table(
  "store_currency_formatting",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    currencyDisplay: currencyDisplayEnum("currency_display")
      .notNull()
      .default("symbol"),
    currencySign: currencySignEnum("currency_sign")
      .notNull()
      .default("standard"),
    grouping: currencyGroupingEnum("grouping").notNull().default("auto"),
    signDisplay: currencySignDisplayEnum("sign_display")
      .notNull()
      .default("auto"),
    minimumFractionDigits: smallint("minimum_fraction_digits")
      .notNull()
      .default(2),
    maximumFractionDigits: smallint("maximum_fraction_digits")
      .notNull()
      .default(2),
    roundingMode: currencyRoundingModeEnum("rounding_mode")
      .notNull()
      .default("halfExpand"),
    trailingZeroDisplay: currencyTrailingZeroDisplayEnum(
      "trailing_zero_display",
    )
      .notNull()
      .default("auto"),
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
    uniqueIndex("store_currency_formatting_store_unique").on(table.storeId),
    check(
      "store_currency_formatting_minimum_fraction_digits_check",
      sql`${table.minimumFractionDigits} BETWEEN 0 AND 100`,
    ),
    check(
      "store_currency_formatting_maximum_fraction_digits_check",
      sql`${table.maximumFractionDigits} BETWEEN 0 AND 100`,
    ),
    check(
      "store_currency_formatting_fraction_digits_order_check",
      sql`${table.minimumFractionDigits} <= ${table.maximumFractionDigits}`,
    ),
  ],
);

export type StoreCurrencyFormatting =
  typeof storeCurrencyFormatting.$inferSelect;
export type NewStoreCurrencyFormatting =
  typeof storeCurrencyFormatting.$inferInsert;
export type CurrencyDisplay = (typeof currencyDisplayEnum.enumValues)[number];
export type CurrencySign = (typeof currencySignEnum.enumValues)[number];
export type CurrencyGrouping = (typeof currencyGroupingEnum.enumValues)[number];
export type CurrencySignDisplay =
  (typeof currencySignDisplayEnum.enumValues)[number];
export type CurrencyRoundingMode =
  (typeof currencyRoundingModeEnum.enumValues)[number];
export type CurrencyTrailingZeroDisplay =
  (typeof currencyTrailingZeroDisplayEnum.enumValues)[number];
