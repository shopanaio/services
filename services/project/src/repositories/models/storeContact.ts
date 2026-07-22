import { sql } from "drizzle-orm";
import {
  check,
  index,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { storeSchema } from "./schema.js";

/** Customer-visible legal/contact address configured for a store. */
export const storeAddress = storeSchema.table(
  "store_address",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    companyName: varchar("company_name", { length: 255 }),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    addressLine1: varchar("address_line_1", { length: 255 }),
    addressLine2: varchar("address_line_2", { length: 255 }),
    city: varchar("city", { length: 128 }),
    administrativeArea: varchar("administrative_area", { length: 128 }),
    postalCode: varchar("postal_code", { length: 32 }),
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
    uniqueIndex("store_address_store_unique").on(table.storeId),
    check(
      "store_address_country_code_format_check",
      sql`${table.countryCode} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "store_address_company_name_not_blank_check",
      sql`${table.companyName} IS NULL OR btrim(${table.companyName}) <> ''`,
    ),
    check(
      "store_address_line_1_not_blank_check",
      sql`${table.addressLine1} IS NULL OR btrim(${table.addressLine1}) <> ''`,
    ),
    check(
      "store_address_line_2_not_blank_check",
      sql`${table.addressLine2} IS NULL OR btrim(${table.addressLine2}) <> ''`,
    ),
    check(
      "store_address_city_not_blank_check",
      sql`${table.city} IS NULL OR btrim(${table.city}) <> ''`,
    ),
    check(
      "store_address_administrative_area_not_blank_check",
      sql`${table.administrativeArea} IS NULL OR btrim(${table.administrativeArea}) <> ''`,
    ),
    check(
      "store_address_postal_code_not_blank_check",
      sql`${table.postalCode} IS NULL OR btrim(${table.postalCode}) <> ''`,
    ),
  ],
);

/** Ordered list of canonical E.164 phone numbers shown for the store. */
export const storePhone = storeSchema.table(
  "store_phone",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    phoneNumber: varchar("phone_number", { length: 16 }).notNull(),
    position: smallint("position").notNull().default(0),
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
    uniqueIndex("store_phone_store_number_unique").on(
      table.storeId,
      table.phoneNumber,
    ),
    index("store_phone_store_position_idx").on(
      table.storeId,
      table.position,
      table.id,
    ),
    check(
      "store_phone_number_e164_check",
      sql`${table.phoneNumber} ~ '^[+][1-9][0-9]{1,14}$'`,
    ),
    check("store_phone_position_check", sql`${table.position} >= 0`),
  ],
);

export type StoreAddress = typeof storeAddress.$inferSelect;
export type NewStoreAddress = typeof storeAddress.$inferInsert;
export type StorePhone = typeof storePhone.$inferSelect;
export type NewStorePhone = typeof storePhone.$inferInsert;
