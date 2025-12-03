import {
  pgTable,
  uuid,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { variant } from "./products";

// ─────────────────────────────────────────────────────────────────────────────
// Variant Media (many-to-many)
// ─────────────────────────────────────────────────────────────────────────────
// Links variants to media files (stored in separate Media service).
// file_id references external Media service, no FK constraint.

export const variantMedia = pgTable(
  "variant_media",
  {
    projectId: uuid("project_id").notNull(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").notNull(), // External reference to Media service
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.variantId, table.fileId] }),
    index("idx_variant_media_project").on(table.projectId),
    index("idx_variant_media_variant").on(table.variantId),
    index("idx_variant_media_file").on(table.fileId),
    index("idx_variant_media_sort").on(table.variantId, table.sortIndex),
  ]
);

export type VariantMedia = typeof variantMedia.$inferSelect;
export type NewVariantMedia = typeof variantMedia.$inferInsert;
