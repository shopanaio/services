import {
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projectSchema } from "./schema.js";
import {
  weightUnitEnum,
  dimensionUnitEnum,
  type WeightUnit,
  type DimensionUnit,
} from "./reference.js";

export const projectStatusEnum = projectSchema.enum("project_status", [
  "active",
  "inactive",
]);

export { weightUnitEnum, dimensionUnitEnum, type WeightUnit, type DimensionUnit };

export const project = projectSchema.table(
  "project",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    status: projectStatusEnum("status").notNull().default("active"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    country: varchar("country", { length: 2 }).notNull().default("UA"),
    phoneNumber: varchar("phone_number", { length: 32 }),
    email: varchar("email", { length: 255 }),
    defaultLocale: varchar("default_locale", { length: 10 }).notNull().default("uk"),
    defaultCurrency: varchar("default_currency", { length: 3 }).notNull().default("UAH"),
    weightUnit: weightUnitEnum("weight_unit").notNull().default("kg"),
    dimensionUnit: dimensionUnitEnum("dimension_unit").notNull().default("cm"),
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
  ]
);

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type ProjectStatus = "active" | "inactive";
