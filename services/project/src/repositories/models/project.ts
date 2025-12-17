import {
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  foreignKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projectSchema } from "./schema";
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
  (t) => ({
    projectId: t
      .uuid("project_id")
      .notNull()
      .references((): AnyPgColumn => project.id, { onDelete: "cascade" }),
    code: t.varchar("code", { length: 10 }).notNull(),
    isActive: t.boolean("is_active").notNull().default(true),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => [
    primaryKey({ columns: [table.projectId, table.code] }),
    index("idx_locale_project_id").on(table.projectId),
    index("idx_locale_is_active").on(table.isActive),
  ]
);

// Currency table (defined first to break circular reference)
export const currency = projectSchema.table(
  "currency",
  (t) => ({
    projectId: t
      .uuid("project_id")
      .notNull()
      .references((): AnyPgColumn => project.id, { onDelete: "cascade" }),
    code: t.varchar("code", { length: 3 }).notNull(),
    isActive: t.boolean("is_active").notNull().default(true),
    exchangeRateAmount: t
      .bigint("exchange_rate_amount", { mode: "bigint" })
      .notNull()
      .default(sql`1`),
    exchangeRateScale: t
      .integer("exchange_rate_scale")
      .notNull()
      .default(0),
    exchangeRate: t.real("exchange_rate").notNull().default(1),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
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
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    status: projectStatusEnum("status").notNull().default("active"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    email: varchar("email", { length: 255 }),
    defaultLocale: localeCodeEnum("default_locale").notNull().default("en"),
    baseCurrency: currencyCodeEnum("base_currency").notNull().default("USD"),
    defaultCurrency: currencyCodeEnum("default_currency")
      .notNull()
      .default("USD"),
    defaultWeightUnit: weightUnitEnum("default_weight_unit")
      .notNull()
      .default("g"),
    defaultDimensionUnit: dimensionUnitEnum("default_dimension_unit")
      .notNull()
      .default("mm"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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
