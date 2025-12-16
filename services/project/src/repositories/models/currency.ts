import {
  uuid,
  varchar,
  boolean,
  real,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { projectSchema } from "./schema.js";
import { project } from "./project.js";

export const currency = projectSchema.table(
  "currency",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 3 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    exchangeRate: real("exchange_rate").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.code] }),
    index("idx_currency_project_id").on(table.projectId),
    index("idx_currency_is_active").on(table.isActive),
  ]
);

export type Currency = typeof currency.$inferSelect;
export type NewCurrency = typeof currency.$inferInsert;
