import { sql } from "drizzle-orm";
import { index, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { loyaltySchema } from "./schema.js";

export const configMutation = loyaltySchema.table(
  "config_mutation",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    operation: varchar("operation", { length: 96 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    resultKind: varchar("result_kind", { length: 64 }),
    resultId: uuid("result_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("loyalty_config_mutation_identity_unique").on(
      table.storeId,
      table.operation,
      table.idempotencyKey,
    ),
    index("loyalty_config_mutation_created_idx").on(table.storeId, table.createdAt),
  ],
);

export type ConfigMutation = typeof configMutation.$inferSelect;
