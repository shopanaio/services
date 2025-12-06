import {
  uuid,
  varchar,
  text,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { inventorySchema } from "./schema";

export const product = inventorySchema.table(
  "product",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_product_project_id").on(table.projectId),
    index("idx_product_created_at").on(table.createdAt),
    index("idx_product_updated_at").on(table.updatedAt),
    index("idx_product_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
  ]
);

export const variant = inventorySchema.table(
  "variant",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    id: uuid("id").primaryKey(),
    sku: varchar("sku", { length: 64 }),
    externalSystem: varchar("external_system", { length: 32 }),
    externalId: text("external_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    unique("variant_project_id_sku_key").on(table.projectId, table.sku),
    unique("variant_project_id_external_system_external_id_key").on(
      table.projectId,
      table.externalSystem,
      table.externalId
    ),
    index("idx_variant_project_id").on(table.projectId),
    index("idx_variant_product_id").on(table.productId),
    index("idx_variant_created_at").on(table.createdAt),
    index("idx_variant_updated_at").on(table.updatedAt),
    index("idx_variant_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
    index("idx_variant_sku")
      .on(table.projectId, table.sku)
      .where(sql`sku IS NOT NULL`),
  ]
);

export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;
export type Variant = typeof variant.$inferSelect;
export type NewVariant = typeof variant.$inferInsert;
