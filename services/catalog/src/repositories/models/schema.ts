import { pgSchema } from "drizzle-orm/pg-core";
import {
  CURRENCY_CODES,
  LOCALE_CODES,
} from "@shopana/shared-references";

export const catalogSchema = pgSchema("catalog");

export const localeCodeEnum = catalogSchema.enum(
  "locale_code",
  LOCALE_CODES as [string, ...string[]],
);

export const currencyCodeEnum = catalogSchema.enum(
  "currency_code",
  CURRENCY_CODES as [string, ...string[]],
);
