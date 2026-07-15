import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { customer } from "./profiles.js";
import {
  customersSchema,
  taxExemptionStatusEnum,
  taxIdentifierStatusEnum,
} from "./schema.js";

export const customerTaxIdentifier = customersSchema.table(
  "customer_tax_identifier",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    identifierType: varchar("identifier_type", { length: 64 }).notNull(),
    countryCode: char("country_code", { length: 2 }),
    value: varchar("value", { length: 255 }).notNull(),
    normalizedValue: varchar("normalized_value", { length: 255 }).notNull(),
    status: taxIdentifierStatusEnum("status")
      .notNull()
      .default("unverified"),
    isPrimary: boolean("is_primary").notNull().default(false),
    verifiedAt: timestamp("verified_at", {
      withTimezone: true,
      mode: "string",
    }),
    validFrom: date("valid_from", { mode: "string" }),
    validTo: date("valid_to", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check(
      "customer_tax_identifier_type_check",
      sql`length(btrim(${table.identifierType})) > 0`
    ),
    check(
      "customer_tax_identifier_value_check",
      sql`length(btrim(${table.normalizedValue})) > 0`
    ),
    check(
      "customer_tax_identifier_country_code_check",
      sql`${table.countryCode} IS NULL OR ${table.countryCode} ~ '^[A-Z]{2}$'`
    ),
    check(
      "customer_tax_identifier_verified_at_check",
      sql`${table.status} <> 'verified' OR ${table.verifiedAt} IS NOT NULL`
    ),
    check(
      "customer_tax_identifier_validity_check",
      sql`${table.validTo} IS NULL OR ${table.validFrom} IS NULL OR ${table.validTo} >= ${table.validFrom}`
    ),
    uniqueIndex("customer_tax_identifier_active_unique")
      .on(
        table.customerId,
        table.identifierType,
        sql`COALESCE(${table.countryCode}, '')`,
        table.normalizedValue
      )
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("customer_tax_identifier_primary_unique")
      .on(table.customerId)
      .where(sql`${table.isPrimary} = true AND ${table.deletedAt} IS NULL`),
    index("customer_tax_identifier_store_customer_idx")
      .on(table.storeId, table.customerId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const customerTaxExemption = customersSchema.table(
  "customer_tax_exemption",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 128 }).notNull(),
    countryCode: char("country_code", { length: 2 }),
    regionCode: varchar("region_code", { length: 64 }),
    reason: text("reason"),
    status: taxExemptionStatusEnum("status").notNull().default("active"),
    certificateFileId: uuid("certificate_file_id"),
    validFrom: date("valid_from", { mode: "string" }),
    validTo: date("valid_to", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check(
      "customer_tax_exemption_code_check",
      sql`length(btrim(${table.code})) > 0`
    ),
    check(
      "customer_tax_exemption_country_code_check",
      sql`${table.countryCode} IS NULL OR ${table.countryCode} ~ '^[A-Z]{2}$'`
    ),
    check(
      "customer_tax_exemption_validity_check",
      sql`${table.validTo} IS NULL OR ${table.validFrom} IS NULL OR ${table.validTo} >= ${table.validFrom}`
    ),
    uniqueIndex("customer_tax_exemption_active_unique")
      .on(
        table.customerId,
        table.code,
        sql`COALESCE(${table.countryCode}, '')`,
        sql`COALESCE(${table.regionCode}, '')`
      )
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_tax_exemption_store_customer_idx")
      .on(table.storeId, table.customerId, table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_tax_exemption_certificate_idx")
      .on(table.certificateFileId)
      .where(sql`${table.certificateFileId} IS NOT NULL`),
  ]
);

export type CustomerTaxIdentifier = typeof customerTaxIdentifier.$inferSelect;
export type NewCustomerTaxIdentifier = typeof customerTaxIdentifier.$inferInsert;
export type CustomerTaxExemption = typeof customerTaxExemption.$inferSelect;
export type NewCustomerTaxExemption = typeof customerTaxExemption.$inferInsert;
