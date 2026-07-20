import { check, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization } from "./authorization.js";
import { iamSchema } from "./schema.js";

export type ResourceManagementMode = "organization" | "service";

/** Generic authoritative management state for protected IAM resources. */
export const resourceManagement = iamSchema.table(
  "resource_management",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    resourceKind: varchar("resource_kind", { length: 64 }).notNull(),
    resourceId: uuid("resource_id").notNull(),
    managementMode: varchar("management_mode", { length: 32 })
      .$type<ResourceManagementMode>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("resource_management_kind_not_empty", sql`${table.resourceKind} <> ''`),
    check(
      "resource_management_mode_check",
      sql`${table.managementMode} IN ('organization', 'service')`
    ),
    uniqueIndex("uq_resource_management_resource").on(
      table.organizationId,
      table.resourceKind,
      table.resourceId
    ),
  ]
);

export type ResourceManagement = typeof resourceManagement.$inferSelect;
export type NewResourceManagement = typeof resourceManagement.$inferInsert;
