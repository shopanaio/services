import { pgSchema } from "drizzle-orm/pg-core";
import {
  CURRENCY_CODES,
  LOCALE_CODES,
} from "@shopana/shared-references";

export const catalogSchema = pgSchema("catalog");

export const priceAdjustmentOperationEnum = catalogSchema.enum(
  "price_adjustment_operation",
  ["DECREASE", "INCREASE"],
);

export const priceAdjustmentValueTypeEnum = catalogSchema.enum(
  "price_adjustment_value_type",
  ["PERCENTAGE", "FIXED_AMOUNT"],
);

export const componentPriceStrategyEnum = catalogSchema.enum(
  "component_price_strategy",
  ["BASE", "ADJUSTMENT", "OVERRIDE", "FREE"],
);

export const componentTargetKindEnum = catalogSchema.enum(
  "component_target_kind",
  ["CONFIGURATION", "GROUP", "ITEM"],
);

export const comparisonValueTypeEnum = catalogSchema.enum(
  "comparison_value_type",
  ["BOOLEAN", "DECIMAL", "ENUM", "INTEGER", "TEXT"],
);

export const comparisonCardinalityEnum = catalogSchema.enum(
  "comparison_cardinality",
  ["SINGLE", "MULTIPLE"],
);

export const localeCodeEnum = catalogSchema.enum(
  "locale_code",
  LOCALE_CODES as [string, ...string[]],
);

export const currencyCodeEnum = catalogSchema.enum(
  "currency_code",
  CURRENCY_CODES as [string, ...string[]],
);
