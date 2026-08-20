import { index, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { discount } from "./discounts.js";
import { discountClassEnum, pricingSchema } from "./schema.js";

export const discountCombinationClass = pricingSchema.table(
  "discount_combination_class",
  {
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discount.id, { onDelete: "cascade" }),
    combinesWithClass: discountClassEnum("combines_with_class").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "discount_combination_class_pkey",
      columns: [table.discountId, table.combinesWithClass],
    }),
    index("discount_combination_class_store_lookup_idx").on(
      table.storeId,
      table.combinesWithClass,
      table.discountId,
    ),
  ],
);

export type DiscountCombinationClass = typeof discountCombinationClass.$inferSelect;
export type NewDiscountCombinationClass = typeof discountCombinationClass.$inferInsert;
