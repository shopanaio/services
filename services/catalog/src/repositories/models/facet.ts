import {
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

export const facetGroup = catalogSchema.table(
  "facet_group",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("facet_group_project_id_sort_index_uniq").on(
      table.projectId,
      table.sortIndex
    ),
  ]
);

export const facetGroupTranslation = catalogSchema.table(
  "facet_group_translation",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => facetGroup.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),
    projectId: uuid("project_id").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.locale] }),
    index("idx_facet_group_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
  ]
);

export const facet = catalogSchema.table(
  "facet",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    groupId: uuid("group_id").references(() => facetGroup.id, {
      onDelete: "set null",
    }),
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

export const facetSourceHandle = catalogSchema.table(
  "facet_source_handle",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    facetId: uuid("facet_id")
      .notNull()
      .references(() => facet.id, { onDelete: "cascade" }),
    facetType: varchar("facet_type", { length: 32 }).notNull(),
    sourceHandle: text("source_handle").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("facet_source_handle_project_facet_source_uniq").on(
      table.projectId,
      table.facetId,
      table.sourceHandle
    ),
    unique("facet_source_handle_project_type_source_uniq").on(
      table.projectId,
      table.facetType,
      table.sourceHandle
    ),
    index("idx_facet_source_handle_project_facet").on(
      table.projectId,
      table.facetId
    ),
    index("idx_facet_source_handle_project_type_source").on(
      table.projectId,
      table.facetType,
      table.sourceHandle
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
    slug: varchar("slug", { length: 255 }).notNull(),
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
  (table) => [unique("facet_value_facet_id_slug_uniq").on(table.facetId, table.slug)]
);

export const facetValueSourceHandle = catalogSchema.table(
  "facet_value_source_handle",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    facetId: uuid("facet_id")
      .notNull()
      .references(() => facet.id, { onDelete: "cascade" }),
    facetValueId: uuid("facet_value_id")
      .notNull()
      .references(() => facetValue.id, { onDelete: "cascade" }),
    facetType: varchar("facet_type", { length: 32 }).notNull(),
    sourceHandle: text("source_handle").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("facet_value_source_handle_project_facet_source_uniq").on(
      table.projectId,
      table.facetId,
      table.sourceHandle
    ),
    unique("facet_value_source_handle_project_type_source_uniq").on(
      table.projectId,
      table.facetType,
      table.sourceHandle
    ),
    unique("facet_value_source_handle_value_source_uniq").on(
      table.facetValueId,
      table.sourceHandle
    ),
    index("idx_facet_value_source_handle_project_value").on(
      table.projectId,
      table.facetValueId
    ),
    index("idx_facet_value_source_handle_project_type_source").on(
      table.projectId,
      table.facetType,
      table.sourceHandle
    ),
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

export type FacetGroup = typeof facetGroup.$inferSelect;
export type NewFacetGroup = typeof facetGroup.$inferInsert;
export type FacetGroupTranslation = typeof facetGroupTranslation.$inferSelect;
export type NewFacetGroupTranslation = typeof facetGroupTranslation.$inferInsert;
export type Facet = typeof facet.$inferSelect;
export type NewFacet = typeof facet.$inferInsert;
export type FacetTranslation = typeof facetTranslation.$inferSelect;
export type NewFacetTranslation = typeof facetTranslation.$inferInsert;
export type FacetSourceHandle = typeof facetSourceHandle.$inferSelect;
export type NewFacetSourceHandle = typeof facetSourceHandle.$inferInsert;
export type FacetSwatch = typeof facetSwatch.$inferSelect;
export type NewFacetSwatch = typeof facetSwatch.$inferInsert;
export type FacetValue = typeof facetValue.$inferSelect;
export type NewFacetValue = typeof facetValue.$inferInsert;
export type FacetValueSourceHandle = typeof facetValueSourceHandle.$inferSelect;
export type NewFacetValueSourceHandle = typeof facetValueSourceHandle.$inferInsert;
export type FacetValueTranslation = typeof facetValueTranslation.$inferSelect;
export type NewFacetValueTranslation = typeof facetValueTranslation.$inferInsert;
