import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { storeSchema } from "./schema.js";

export const automaticFulfillmentModeEnum = storeSchema.enum(
  "automatic_fulfillment_mode",
  ["all_line_items", "gift_cards_only", "disabled"],
);

/** Checkout, order-numbering, fulfillment and archival policy for one store. */
export const storeOrderSettings = storeSchema.table(
  "store_order_settings",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    orderNumberPrefix: varchar("order_number_prefix", { length: 16 })
      .notNull()
      .default("#"),
    orderNumberSuffix: varchar("order_number_suffix", { length: 16 }),
    requireCheckoutConfirmation: boolean("require_checkout_confirmation")
      .notNull()
      .default(true),
    automaticFulfillmentMode: automaticFulfillmentModeEnum(
      "automatic_fulfillment_mode",
    )
      .notNull()
      .default("disabled"),
    automaticallyArchiveOrders: boolean("automatically_archive_orders")
      .notNull()
      .default(true),
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
    uniqueIndex("store_order_settings_store_unique").on(table.storeId),
    check(
      "store_order_settings_prefix_no_control_characters_check",
      sql`${table.orderNumberPrefix} !~ '[[:cntrl:]]'`,
    ),
    check(
      "store_order_settings_suffix_no_control_characters_check",
      sql`${table.orderNumberSuffix} IS NULL OR ${table.orderNumberSuffix} !~ '[[:cntrl:]]'`,
    ),
  ],
);

export type StoreOrderSettings = typeof storeOrderSettings.$inferSelect;
export type NewStoreOrderSettings = typeof storeOrderSettings.$inferInsert;
export type AutomaticFulfillmentMode =
  (typeof automaticFulfillmentModeEnum.enumValues)[number];
