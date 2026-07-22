import {
  check,
  integer,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeSchema } from "./schema.js";
import {
  weightUnitEnum,
  dimensionUnitEnum,
  type WeightUnit,
  type DimensionUnit,
} from "./reference.js";
import { localeCodeEnum, type LocaleCode } from "./locale.js";
import { currencyCodeEnum, type CurrencyCode } from "./reference.js";

export {
  weightUnitEnum,
  dimensionUnitEnum,
  localeCodeEnum,
  currencyCodeEnum,
  type WeightUnit,
  type DimensionUnit,
  type LocaleCode,
  type CurrencyCode,
};

export const storeStatusEnum = storeSchema.enum("store_status", [
  "active",
  "inactive",
]);

export const unitSystemEnum = storeSchema.enum("unit_system", [
  "metric",
  "imperial",
]);

export const store = storeSchema.table(
  "store",
  {
    id: uuid("id").primaryKey(),
    // Organization that owns this store (from IAM)
    organizationId: uuid("organization_id").notNull(),
    applicationId: uuid("application_id").notNull(),
    externalSystem: varchar("external_system", { length: 64 }),
    externalId: varchar("external_id", { length: 255 }),
    /** URL/subdomain-safe store slug (kept as `name` in the public model). */
    name: varchar("name", { length: 63 }).notNull(),
    /** Human-readable store name shown to customers. */
    displayName: varchar("display_name", { length: 255 }).notNull(),
    status: storeStatusEnum("status").notNull().default("active"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    email: varchar("email", { length: 255 }),
    defaultLocale: localeCodeEnum("default_locale").notNull(),
    currencyCode: currencyCodeEnum("currency_code").notNull(),
    unitSystem: unitSystemEnum("unit_system").notNull().default("metric"),
    defaultWeightUnit: weightUnitEnum("default_weight_unit").notNull(),
    defaultDimensionUnit: dimensionUnitEnum("default_dimension_unit").notNull(),
    revision: integer("revision").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "store_name_format_check",
      sql`${table.name} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check(
      "store_display_name_not_blank_check",
      sql`btrim(${table.displayName}) <> ''`,
    ),
    check(
      "store_timezone_not_blank_check",
      sql`btrim(${table.timezone}) <> ''`,
    ),
    check(
      "store_email_not_blank_check",
      sql`${table.email} IS NULL OR btrim(${table.email}) <> ''`,
    ),
    check(
      "store_external_identity_pair_check",
      sql`(${table.externalSystem} IS NULL) = (${table.externalId} IS NULL)`,
    ),
    uniqueIndex("store_name_key")
      .on(table.name)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_store_status").on(table.status),
    index("idx_store_created_at").on(table.createdAt),
    index("idx_store_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
    uniqueIndex("store_external_identity_key")
      .on(table.externalSystem, table.externalId)
      .where(
        sql`${table.externalSystem} IS NOT NULL AND ${table.externalId} IS NOT NULL AND ${table.deletedAt} IS NULL`,
      ),
    index("idx_store_organization").on(table.organizationId),
    index("idx_store_application").on(table.applicationId),
    index("idx_store_revision").on(table.id, table.revision),
  ]
);

export type StoreRecord = typeof store.$inferSelect;
export type NewStore = typeof store.$inferInsert;
export type StoreStatus = "active" | "inactive";
export type UnitSystem = (typeof unitSystemEnum.enumValues)[number];
