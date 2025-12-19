import {
  uuid,
  varchar,
  boolean,
  bigint,
  integer,
  real,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  foreignKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projectSchema } from "./schema.js";
import {
  weightUnitEnum,
  dimensionUnitEnum,
  currencyCodeEnum,
  localeCodeEnum,
  type WeightUnit,
  type DimensionUnit,
  type CurrencyCode,
  type LocaleCode,
} from "./reference";

export const projectStatusEnum = projectSchema.enum("project_status", [
  "active",
  "inactive",
]);

export {
  weightUnitEnum,
  dimensionUnitEnum,
  currencyCodeEnum,
  localeCodeEnum,
  type WeightUnit,
  type DimensionUnit,
  type CurrencyCode,
  type LocaleCode,
};

// Locale table (defined first to break circular reference)
export const locale = projectSchema.table(
  "locale",
  {
    projectId: uuid("project_id")
      .notNull()
      .references((): AnyPgColumn => project.id, { onDelete: "cascade" }),
    code: localeCodeEnum("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.code] }),
    index("idx_locale_project_id").on(table.projectId),
    index("idx_locale_is_active").on(table.isActive),
  ]
);

// Currency table (defined first to break circular reference)
export const currency = projectSchema.table(
  "currency",
  {
    projectId: uuid("project_id")
      .notNull()
      .references((): AnyPgColumn => project.id, { onDelete: "cascade" }),
    code: currencyCodeEnum("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    exchangeRateAmount: bigint("exchange_rate_amount", { mode: "bigint" })
      .notNull()
      .default(sql`1`),
    exchangeRateScale: integer("exchange_rate_scale").notNull(),
    exchangeRate: real("exchange_rate").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.code] }),
    index("idx_currency_project_id").on(table.projectId),
    index("idx_currency_is_active").on(table.isActive),
  ]
);

// Project table (main table with FK constraints to locale and currency)
export const project = projectSchema.table(
  "project",
  {
    id: uuid("id").primaryKey(),
    externalSystem: varchar("external_system", { length: 64 }),
    externalId: varchar("external_id", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    status: projectStatusEnum("status").notNull().default("active"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    email: varchar("email", { length: 255 }),
    defaultLocale: localeCodeEnum("default_locale").notNull(),
    baseCurrency: currencyCodeEnum("base_currency").notNull(),
    defaultCurrency: currencyCodeEnum("default_currency").notNull(),
    defaultWeightUnit: weightUnitEnum("default_weight_unit").notNull(),
    defaultDimensionUnit: dimensionUnitEnum("default_dimension_unit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("project_slug_key")
      .on(table.slug)
      .where(sql`deleted_at IS NULL`),
    index("idx_project_status").on(table.status),
    index("idx_project_created_at").on(table.createdAt),
    index("idx_project_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
    index("idx_project_external").on(table.externalSystem, table.externalId),
    foreignKey({
      columns: [table.id, table.defaultLocale],
      foreignColumns: [locale.projectId, locale.code],
      name: "project_id_default_locale_locale_project_id_code_fk",
    }),
    foreignKey({
      columns: [table.id, table.baseCurrency],
      foreignColumns: [currency.projectId, currency.code],
      name: "project_id_base_currency_currency_project_id_code_fk",
    }),
    foreignKey({
      columns: [table.id, table.defaultCurrency],
      foreignColumns: [currency.projectId, currency.code],
      name: "project_id_default_currency_currency_project_id_code_fk",
    }),
  ]
);

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type ProjectStatus = "active" | "inactive";

export type Locale = typeof locale.$inferSelect;
export type NewLocale = typeof locale.$inferInsert;

export type Currency = typeof currency.$inferSelect;
export type NewCurrency = typeof currency.$inferInsert;
