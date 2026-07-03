import {
  boolean,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema.js";

export const catalogFacetRuntime = catalogSchema.table("facet", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  facetType: varchar("facet_type", { length: 32 }).notNull(),
  lexoRank: varchar("lexo_rank", { length: 64 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

export const catalogFacetValueRuntime = catalogSchema.table("facet_value", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  facetId: uuid("facet_id").notNull(),
  parentId: uuid("parent_id"),
  kind: varchar("kind", { length: 16 }).notNull(),
  handle: text("handle").notNull(),
  sortIndex: integer("sort_index").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  referenceStatus: varchar("reference_status", { length: 32 })
    .notNull()
    .default("VALID"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

export type CatalogFacetRuntime =
  typeof catalogFacetRuntime.$inferSelect;
export type CatalogFacetValueRuntime =
  typeof catalogFacetValueRuntime.$inferSelect;
