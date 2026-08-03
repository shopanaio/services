import { pgSchema } from "drizzle-orm/pg-core";
import { LOCALE_CODES } from "@shopana/shared-references";

export const onlineStoreSchema = pgSchema("app_shopana_online_store");

export const localeCodeEnum = onlineStoreSchema.enum(
  "locale_code",
  LOCALE_CODES as [string, ...string[]],
);
