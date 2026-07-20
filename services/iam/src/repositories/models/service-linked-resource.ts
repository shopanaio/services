import {
  check,
  index,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization } from "./authorization.js";
import { iamSchema } from "./schema.js";

export const serviceLinkedResource = iamSchema.table(
  "service_linked_resource",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    resourceKind: varchar("resource_kind", { length: 64 }).notNull(),
    resourceId: uuid("resource_id").notNull(),
    linkedService: varchar("linked_service", { length: 64 }).notNull(),
    linkedOwnerType: varchar("linked_owner_type", { length: 64 }).notNull(),
    linkedOwnerId: uuid("linked_owner_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check("service_linked_resource_kind_not_empty", sql`${table.resourceKind} <> ''`),
    check("service_linked_service_not_empty", sql`${table.linkedService} <> ''`),
    check(
      "service_linked_owner_type_not_empty",
      sql`${table.linkedOwnerType} <> ''`
    ),
    uniqueIndex("uq_service_linked_resource_active")
      .on(table.organizationId, table.resourceKind, table.resourceId)
      .where(sql`deleted_at IS NULL`),
    index("idx_service_linked_owner_active")
      .on(
        table.organizationId,
        table.linkedService,
        table.linkedOwnerType,
        table.linkedOwnerId
      )
      .where(sql`deleted_at IS NULL`),
  ]
);

export type ServiceLinkedResource = typeof serviceLinkedResource.$inferSelect;
export type NewServiceLinkedResource = typeof serviceLinkedResource.$inferInsert;
