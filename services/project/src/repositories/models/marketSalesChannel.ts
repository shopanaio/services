import { index, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { market } from "./market.js";
import { salesChannel } from "./salesChannel.js";
import { storeSchema } from "./schema.js";

/** Sales channels through which a market can be served. */
export const marketSalesChannel = storeSchema.table(
  "market_sales_channel",
  {
    storeId: uuid("store_id").notNull(),
    marketId: uuid("market_id")
      .notNull()
      .references(() => market.id, { onDelete: "cascade" }),
    salesChannelId: uuid("sales_channel_id")
      .notNull()
      .references(() => salesChannel.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.marketId, table.salesChannelId],
      name: "market_sales_channel_pkey",
    }),
    index("market_sales_channel_store_channel_idx").on(
      table.storeId,
      table.salesChannelId,
      table.marketId
    ),
  ]
);

export type MarketSalesChannel = typeof marketSalesChannel.$inferSelect;
export type NewMarketSalesChannel = typeof marketSalesChannel.$inferInsert;
