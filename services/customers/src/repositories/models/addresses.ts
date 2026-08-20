import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  numeric,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { customer } from "./profiles.js";
import { addressValidationStatusEnum, customersSchema } from "./schema.js";

export const customerAddress = customersSchema.table(
  "customer_address",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 64 }),
    prefix: varchar("prefix", { length: 32 }),
    firstName: varchar("first_name", { length: 128 }),
    middleName: varchar("middle_name", { length: 128 }),
    lastName: varchar("last_name", { length: 128 }),
    suffix: varchar("suffix", { length: 32 }),
    companyName: varchar("company_name", { length: 255 }),
    phoneE164: varchar("phone_e164", { length: 32 }),
    address1: varchar("address1", { length: 255 }).notNull(),
    address2: varchar("address2", { length: 255 }),
    city: varchar("city", { length: 128 }).notNull(),
    regionName: varchar("region_name", { length: 128 }),
    regionCode: varchar("region_code", { length: 64 }),
    regionKey: varchar("region_key", { length: 8 }),
    cityKey: varchar("city_key", { length: 160 }).notNull(),
    postalCode: varchar("postal_code", { length: 32 }),
    postalCodeNormalized: varchar("postal_code_normalized", { length: 32 }),
    countryCode: char("country_code", { length: 2 }).notNull(),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    isDefaultBilling: boolean("is_default_billing").notNull().default(false),
    validationStatus: addressValidationStatusEnum("validation_status")
      .notNull()
      .default("UNVALIDATED"),
    validatedAt: timestamp("validated_at", {
      withTimezone: true,
      mode: "string",
    }),
    latitude: numeric("latitude", {
      precision: 9,
      scale: 6,
      mode: "string",
    }),
    longitude: numeric("longitude", {
      precision: 9,
      scale: 6,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check("customer_address_country_code_check", sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
    check(
      "customer_address_phone_e164_check",
      sql`${table.phoneE164} IS NULL OR ${table.phoneE164} ~ '^\\+[1-9][0-9]{6,14}$'`,
    ),
    check(
      "customer_address_coordinates_pair_check",
      sql`(${table.latitude} IS NULL) = (${table.longitude} IS NULL)`,
    ),
    check(
      "customer_address_latitude_check",
      sql`${table.latitude} IS NULL OR ${table.latitude} BETWEEN -90 AND 90`,
    ),
    check(
      "customer_address_longitude_check",
      sql`${table.longitude} IS NULL OR ${table.longitude} BETWEEN -180 AND 180`,
    ),
    check(
      "customer_address_validation_timestamp_check",
      sql`${table.validationStatus} = 'UNVALIDATED' OR ${table.validatedAt} IS NOT NULL`,
    ),
    check(
      "customer_address_deleted_at_check",
      sql`${table.deletedAt} IS NULL OR ${table.deletedAt} >= ${table.createdAt}`,
    ),
    uniqueIndex("customer_address_default_shipping_unique")
      .on(table.customerId)
      .where(sql`${table.isDefaultShipping} = true AND ${table.deletedAt} IS NULL`),
    uniqueIndex("customer_address_default_billing_unique")
      .on(table.customerId)
      .where(sql`${table.isDefaultBilling} = true AND ${table.deletedAt} IS NULL`),
    index("customer_address_store_customer_idx")
      .on(table.storeId, table.customerId, table.createdAt, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_address_customer_idx").on(table.customerId),
    index("customer_address_store_geography_idx")
      .on(table.storeId, table.countryCode, table.regionKey, table.cityKey)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_address_store_country_customer_idx")
      .on(table.storeId, table.countryCode, table.customerId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_address_store_customer_country_idx")
      .on(table.storeId, table.customerId, table.countryCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_address_store_region_customer_idx")
      .on(table.storeId, table.regionKey, table.customerId)
      .where(sql`${table.deletedAt} IS NULL AND ${table.regionKey} IS NOT NULL`),
    index("customer_address_store_customer_region_idx")
      .on(table.storeId, table.customerId, table.regionKey)
      .where(sql`${table.deletedAt} IS NULL AND ${table.regionKey} IS NOT NULL`),
    index("customer_address_store_city_customer_idx")
      .on(table.storeId, table.cityKey, table.customerId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_address_store_customer_city_idx")
      .on(table.storeId, table.customerId, table.cityKey)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_address_store_postal_customer_idx")
      .on(table.storeId, table.postalCodeNormalized, table.customerId)
      .where(sql`${table.deletedAt} IS NULL AND ${table.postalCodeNormalized} IS NOT NULL`),
    index("customer_address_store_customer_postal_idx")
      .on(table.storeId, table.customerId, table.postalCodeNormalized)
      .where(sql`${table.deletedAt} IS NULL AND ${table.postalCodeNormalized} IS NOT NULL`),
  ],
);

export type CustomerAddress = typeof customerAddress.$inferSelect;
export type NewCustomerAddress = typeof customerAddress.$inferInsert;
