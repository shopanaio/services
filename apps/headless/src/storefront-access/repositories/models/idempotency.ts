import {
  index,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { headlessSchema } from "./schema.js";

export const storefrontMutationIdempotency = headlessSchema.table(
  "storefront_mutation_idempotency",
  {
    installationId: uuid("installation_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    operation: varchar("operation", { length: 64 }).notNull(),
    clientMutationId: varchar("client_mutation_id", {
      length: 255,
    }).notNull(),
    resourceId: uuid("resource_id").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.installationId,
        table.operation,
        table.clientMutationId,
      ],
      name: "storefront_mutation_idempotency_pkey",
    }),
    index("storefront_mutation_idempotency_tenant_idx").on(
      table.organizationId,
      table.storeId,
      table.createdAt,
    ),
  ],
);
