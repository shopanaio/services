import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { customer } from "./profiles.js";
import { customersSchema } from "./schema.js";

/**
 * A named, private product collection owned by one customer. Names are stored
 * together with their application-normalized NFKC/lowercase representation.
 */
export const customerWishlist = customersSchema.table(
  "customer_wishlist",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 512 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "customer_wishlist_name_check",
      sql`${table.name} = btrim(${table.name})
        AND char_length(${table.name}) BETWEEN 1 AND 128`,
    ),
    check(
      "customer_wishlist_normalized_name_check",
      sql`${table.normalizedName} = btrim(${table.normalizedName})
        AND char_length(${table.normalizedName}) BETWEEN 1 AND 512`,
    ),
    check("customer_wishlist_updated_at_check", sql`${table.updatedAt} >= ${table.createdAt}`),
    uniqueIndex("customer_wishlist_customer_name_unique").on(
      table.customerId,
      table.normalizedName,
    ),
    uniqueIndex("customer_wishlist_customer_default_unique")
      .on(table.customerId)
      .where(sql`${table.isDefault} = true`),
    index("customer_wishlist_store_customer_created_idx").on(
      table.storeId,
      table.customerId,
      table.createdAt,
      table.id,
    ),
  ],
);

/**
 * A Catalog product saved in a wishlist. Product IDs are cross-service
 * references and deliberately do not have a database foreign key.
 */
export const customerWishlistItem = customersSchema.table(
  "customer_wishlist_item",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    wishlistId: uuid("wishlist_id")
      .notNull()
      .references(() => customerWishlist.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull(),
    addedAt: timestamp("added_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("customer_wishlist_item_wishlist_product_unique").on(table.wishlistId, table.productId),
    index("customer_wishlist_item_store_product_idx").on(table.storeId, table.productId),
    index("customer_wishlist_item_wishlist_added_idx").on(
      table.wishlistId,
      table.addedAt.desc(),
      table.id.desc(),
    ),
  ],
);

export type CustomerWishlist = typeof customerWishlist.$inferSelect;
export type NewCustomerWishlist = typeof customerWishlist.$inferInsert;
export type CustomerWishlistItem = typeof customerWishlistItem.$inferSelect;
export type NewCustomerWishlistItem = typeof customerWishlistItem.$inferInsert;
