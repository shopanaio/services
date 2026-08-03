import { pgSchema, uuid, varchar } from "drizzle-orm/pg-core";
import { LOCALE_CODES } from "@shopana/shared-references";

export const onlineStoreSchema = pgSchema("app_shopana_online_store");
export const appsSchema = pgSchema("apps");

export const appInstallationsReference = appsSchema.table("app_installations", {
  id: uuid("id").primaryKey(),
  appCode: varchar("app_code", { length: 128 }).notNull(),
  storeId: uuid("store_id").notNull(),
});

export const localeCodeEnum = onlineStoreSchema.enum(
  "locale_code",
  LOCALE_CODES as [string, ...string[]],
);
