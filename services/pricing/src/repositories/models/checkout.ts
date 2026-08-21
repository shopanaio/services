import { check, index, jsonb, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { pricingSchema } from "./schema.js";

export const checkoutPreliminaryQuote = pricingSchema.table(
  "checkout_preliminary_quote",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    checkoutId: uuid("checkout_id").notNull(),
    executionId: text("execution_id").notNull(),
    requestDigest: text("request_digest").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("checkout_preliminary_quote_store_id_id_unique").on(table.storeId, table.id),
    unique("checkout_preliminary_quote_attempt_unique").on(
      table.storeId,
      table.checkoutId,
      table.executionId,
    ),
    check(
      "checkout_preliminary_quote_payload_check",
      sql`jsonb_typeof(${table.payload}) = 'object'`,
    ),
    check("checkout_preliminary_quote_text_check", sql`length(${table.requestDigest}) > 0`),
    index("checkout_preliminary_quote_checkout_created_idx").on(
      table.storeId,
      table.checkoutId,
      table.createdAt,
    ),
  ],
);

export const checkoutFinalQuote = pricingSchema.table(
  "checkout_final_quote",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    checkoutId: uuid("checkout_id").notNull(),
    executionId: text("execution_id").notNull(),
    preliminaryQuoteId: uuid("preliminary_quote_id")
      .notNull()
      .references(() => checkoutPreliminaryQuote.id, { onDelete: "restrict" }),
    requestDigest: text("request_digest").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("checkout_final_quote_store_id_id_unique").on(table.storeId, table.id),
    unique("checkout_final_quote_attempt_unique").on(
      table.storeId,
      table.checkoutId,
      table.executionId,
    ),
    check("checkout_final_quote_payload_check", sql`jsonb_typeof(${table.payload}) = 'object'`),
    check("checkout_final_quote_text_check", sql`length(${table.requestDigest}) > 0`),
    index("checkout_final_quote_checkout_created_idx").on(
      table.storeId,
      table.checkoutId,
      table.createdAt,
    ),
  ],
);
