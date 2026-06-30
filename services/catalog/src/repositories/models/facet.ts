import {
  type AnyPgColumn,
  check,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  primaryKey,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";

export const facet = catalogSchema.table(
  "facet",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    facetType: varchar("facet_type", { length: 32 }).notNull(),
    uiType: varchar("ui_type", { length: 16 }).notNull().default("checkbox"),
    selectionMode: varchar("selection_mode", { length: 16 })
      .notNull()
      .default("multi"),
    lexoRank: varchar("lexo_rank", { length: 64 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("facet_project_id_slug_uniq").on(table.projectId, table.slug),
    index("idx_facet_rank").on(table.projectId, table.lexoRank),
  ]
);

export const facetTranslation = catalogSchema.table(
  "facet_translation",
  {
    facetId: uuid("facet_id")
      .notNull()
      .references(() => facet.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),
    projectId: uuid("project_id").notNull(),
    label: text("label").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.facetId, table.locale] }),
    index("idx_facet_translation_project_locale").on(table.projectId, table.locale),
  ]
);

export const facetSource = catalogSchema.table(
  "facet_source",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    facetId: uuid("facet_id")
      .notNull()
      .references(() => facet.id, { onDelete: "cascade" }),
    facetType: varchar("facet_type", { length: 32 }).notNull(),
    handle: text("handle").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("facet_source_project_facet_handle_uniq").on(
      table.projectId,
      table.facetId,
      table.handle
    ),
    unique("facet_source_project_type_handle_uniq").on(
      table.projectId,
      table.facetType,
      table.handle
    ),
    index("idx_facet_source_project_facet").on(
      table.projectId,
      table.facetId
    ),
    index("idx_facet_source_project_type_handle").on(
      table.projectId,
      table.facetType,
      table.handle
    ),
  ]
);

export const facetSourceTranslation = catalogSchema.table(
  "facet_source_translation",
  {
    facetSourceId: uuid("facet_source_id")
      .notNull()
      .references(() => facetSource.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),
    projectId: uuid("project_id").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.facetSourceId, table.locale] }),
    index("idx_facet_source_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
  ]
);

export const facetSwatch = catalogSchema.table("facet_swatch", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  swatchType: varchar("swatch_type", { length: 32 }).notNull(),
  colorOne: varchar("color_one", { length: 32 }),
  colorTwo: varchar("color_two", { length: 32 }),
  imageId: uuid("image_id"),
  metadata: jsonb("metadata"),
});

export const facetValue = catalogSchema.table(
  "facet_value",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    facetId: uuid("facet_id")
      .notNull()
      .references(() => facet.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => facetValue.id,
      { onDelete: "no action" }
    ),
    kind: varchar("kind", { length: 16 }).notNull(),
    handle: text("handle").notNull(),
    swatchId: uuid("swatch_id").references(() => facetSwatch.id, {
      onDelete: "set null",
    }),
    sortIndex: integer("sort_index").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("facet_value_kind_check", sql`${table.kind} IN ('source', 'display')`),
    check(
      "facet_value_display_root_check",
      sql`${table.kind} <> 'display' OR ${table.parentId} IS NULL`
    ),
    uniqueIndex("facet_value_source_project_facet_handle_uniq")
      .on(table.projectId, table.facetId, table.handle)
      .where(sql`kind = 'source'`),
    uniqueIndex("facet_value_root_project_facet_handle_uniq")
      .on(table.projectId, table.facetId, table.handle)
      .where(sql`parent_id IS NULL`),
    index("idx_facet_value_project_facet_visible_order")
      .on(table.projectId, table.facetId, table.sortIndex, table.id)
      .where(sql`parent_id IS NULL`),
    index("idx_facet_value_project_parent")
      .on(table.projectId, table.parentId)
      .where(sql`parent_id IS NOT NULL`),
    index("idx_facet_value_project_facet_source_handle")
      .on(table.projectId, table.facetId, table.handle)
      .where(sql`kind = 'source'`),
  ]
);

export const facetValueTranslation = catalogSchema.table(
  "facet_value_translation",
  {
    facetValueId: uuid("facet_value_id")
      .notNull()
      .references(() => facetValue.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),
    projectId: uuid("project_id").notNull(),
    label: text("label").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.facetValueId, table.locale] }),
    index("idx_facet_value_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
  ]
);

export type Facet = typeof facet.$inferSelect;
export type NewFacet = typeof facet.$inferInsert;
export type FacetTranslation = typeof facetTranslation.$inferSelect;
export type NewFacetTranslation = typeof facetTranslation.$inferInsert;
export type FacetSource = typeof facetSource.$inferSelect;
export type NewFacetSource = typeof facetSource.$inferInsert;
export type FacetSourceTranslation = typeof facetSourceTranslation.$inferSelect;
export type NewFacetSourceTranslation = typeof facetSourceTranslation.$inferInsert;
export type FacetSwatch = typeof facetSwatch.$inferSelect;
export type NewFacetSwatch = typeof facetSwatch.$inferInsert;
export type FacetValueKind = "source" | "display";
export type FacetValue = typeof facetValue.$inferSelect;
export type NewFacetValue = typeof facetValue.$inferInsert;
export type FacetValueTranslation = typeof facetValueTranslation.$inferSelect;
export type NewFacetValueTranslation = typeof facetValueTranslation.$inferInsert;
