import {
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  uuid,
  varchar,
  serial,
} from "drizzle-orm/pg-core";
import { iamSchema } from "./schema.js";

// ============================================================================
// Tenant table
// Note: slug and display name are stored in project service (project.project table)
// Tenant ID equals Project ID - created when project is provisioned
// ============================================================================

export const tenant = iamSchema.table(
  "tenant",
  {
    id: uuid("id").primaryKey(), // Same as project.id from project service
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;

// ============================================================================
// Role table
// ============================================================================

export const role = iamSchema.table(
  "role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 256 }),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_role_tenant").on(table.tenantId),
    uniqueIndex("idx_role_tenant_name").on(table.tenantId, table.name),
  ]
);

export type Role = typeof role.$inferSelect;
export type NewRole = typeof role.$inferInsert;

// ============================================================================
// User-Role table (user-role assignment per tenant)
// ============================================================================

export const userRole = iamSchema.table(
  "user_role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 128 }).notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    grantedBy: varchar("granted_by", { length: 128 }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_role_tenant_user").on(table.tenantId, table.userId),
    index("idx_user_role_user").on(table.userId),
    uniqueIndex("idx_user_role_unique").on(table.tenantId, table.userId),
  ]
);

export type UserRole = typeof userRole.$inferSelect;
export type NewUserRole = typeof userRole.$inferInsert;

// ============================================================================
// Casbin Rule table (policies storage)
// ============================================================================

export const casbinRule = iamSchema.table(
  "casbin_rule",
  {
    id: serial("id").primaryKey(),
    ptype: varchar("ptype", { length: 10 }).notNull(),
    v0: varchar("v0", { length: 256 }),
    v1: varchar("v1", { length: 256 }),
    v2: varchar("v2", { length: 256 }),
    v3: varchar("v3", { length: 256 }),
    v4: varchar("v4", { length: 256 }),
    v5: varchar("v5", { length: 256 }),
  },
  (table) => [
    index("idx_casbin_rule_ptype").on(table.ptype),
    index("idx_casbin_rule_tenant").on(table.v4),
    index("idx_casbin_rule_v0").on(table.v0),
  ]
);

export type CasbinRule = typeof casbinRule.$inferSelect;
export type NewCasbinRule = typeof casbinRule.$inferInsert;

// ============================================================================
// Role Hierarchy table
// ============================================================================

export const roleHierarchy = iamSchema.table(
  "role_hierarchy",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    parentRoleId: uuid("parent_role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    childRoleId: uuid("child_role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_role_hierarchy_unique").on(
      table.tenantId,
      table.parentRoleId,
      table.childRoleId
    ),
  ]
);

export type RoleHierarchy = typeof roleHierarchy.$inferSelect;
export type NewRoleHierarchy = typeof roleHierarchy.$inferInsert;
