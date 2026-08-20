import { pgSchema } from "drizzle-orm/pg-core";
import {
  WeightUnit as WeightUnitEnum,
  DimensionUnit as DimensionUnitEnum,
  CurrencyCode as CurrencyCodeEnum,
  LocaleCode as LocaleCodeEnum,
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  CURRENCY_CODES,
  LOCALE_CODES,
} from "@shopana/shared-references";
import { storeSchema } from "./schema.js";

export const referenceSchema = pgSchema("reference");

export const weightUnitEnum = referenceSchema.enum(
  "weight_unit",
  WEIGHT_UNITS as [string, ...string[]],
);

export const dimensionUnitEnum = referenceSchema.enum(
  "dimension_unit",
  DIMENSION_UNITS as [string, ...string[]],
);

export const currencyCodeEnum = storeSchema.enum(
  "currency_code",
  CURRENCY_CODES as [CurrencyCodeEnum, ...CurrencyCodeEnum[]],
);

export const localeCodeEnum = storeSchema.enum(
  "locale_code",
  LOCALE_CODES as [LocaleCodeEnum, ...LocaleCodeEnum[]],
);

export type WeightUnit = WeightUnitEnum;
export type DimensionUnit = DimensionUnitEnum;
export type CurrencyCode = CurrencyCodeEnum;
export type LocaleCode = LocaleCodeEnum;

export {
  WeightUnitEnum,
  DimensionUnitEnum,
  CurrencyCodeEnum,
  LocaleCodeEnum,
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  CURRENCY_CODES,
  LOCALE_CODES,
};
