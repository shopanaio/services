import {
  uuid,
  boolean,
  bigint,
  integer,
  real,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projectSchema } from "./schema.js";
import { currencyCodeEnum, type CurrencyCode } from "./reference.js";

export { currencyCodeEnum, type CurrencyCode };

export const currency = projectSchema.table(
  "currency",
  {
    projectId: uuid("project_id").notNull(),
    code: currencyCodeEnum("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    exchangeRateAmount: bigint("exchange_rate_amount", { mode: "bigint" })
      .notNull()
      .default(sql`1`),
    exchangeRateScale: integer("exchange_rate_scale").notNull(),
    exchangeRate: real("exchange_rate").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.code] }),
    index("idx_currency_project_id").on(table.projectId),
    index("idx_currency_is_active").on(table.isActive),
  ]
);

export type Currency = typeof currency.$inferSelect;
export type NewCurrency = typeof currency.$inferInsert;
