import {
  uuid,
  varchar,
  text,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";
import { product } from "./products";

// ─────────────────────────────────────────────────────────────────────────────
// Product SEO
// ─────────────────────────────────────────────────────────────────────────────
// SEO and Open Graph metadata for products
// Locale-specific: different SEO data for different markets/languages

export const productSeo = inventorySchema.table(
  "product_seo",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    // SEO fields (for search engines)
    seoTitle: varchar("seo_title", { length: 70 }),
    seoDescription: varchar("seo_description", { length: 160 }),

    // Open Graph fields (for social media)
    ogTitle: varchar("og_title", { length: 95 }),
    ogDescription: text("og_description"),
    ogImageId: uuid("og_image_id"),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.locale] }),
    index("idx_product_seo_project").on(table.projectId),
    index("idx_product_seo_project_locale").on(table.projectId, table.locale),
  ]
);

export type ProductSeo = typeof productSeo.$inferSelect;
export type NewProductSeo = typeof productSeo.$inferInsert;
