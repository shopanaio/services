import {
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projectSchema } from "./schema.js";
import {
  weightUnitEnum,
  dimensionUnitEnum,
  type WeightUnit,
  type DimensionUnit,
} from "./reference.js";
import { locale, localeCodeEnum, type LocaleCode } from "./locale.js";
import { currency, currencyCodeEnum, type CurrencyCode } from "./currency.js";

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

export const projectStatusEnum = projectSchema.enum("project_status", [
  "active",
  "inactive",
]);

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
