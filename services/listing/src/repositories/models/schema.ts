import { pgSchema } from "drizzle-orm/pg-core";
import {
  CURRENCY_CODES,
  LOCALE_CODES,
} from "@shopana/shared-references";

export const listingSchema = pgSchema("listing");

export const localeCodeEnum = listingSchema.enum(
  "locale_code",
  LOCALE_CODES as [string, ...string[]],
);

export const currencyCodeEnum = listingSchema.enum(
  "currency_code",
  CURRENCY_CODES as [string, ...string[]],
);
