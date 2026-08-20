import { sql } from "drizzle-orm";
import { boolean, check, index, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { discount } from "./discounts.js";
import { pricingSchema } from "./schema.js";

export const discountChannel = pricingSchema.table(
  "discount_channel",
  {
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discount.id, { onDelete: "cascade" }),
    channelCode: varchar("channel_code", { length: 64 }).notNull(),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "discount_channel_pkey",
      columns: [table.discountId, table.channelCode],
    }),
    check("discount_channel_code_check", sql`${table.channelCode} ~ '^[A-Z][A-Z0-9_:-]{1,63}$'`),
    index("discount_channel_store_lookup_idx").on(
      table.storeId,
      table.channelCode,
      table.discountId,
    ),
    index("discount_channel_featured_idx")
      .on(table.storeId, table.channelCode, table.discountId)
      .where(sql`${table.isFeatured} = true`),
  ],
);

export type DiscountChannel = typeof discountChannel.$inferSelect;
export type NewDiscountChannel = typeof discountChannel.$inferInsert;
