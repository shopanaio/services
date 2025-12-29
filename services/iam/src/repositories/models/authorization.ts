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
// Organization table
// Organization is the top-level entity for multi-tenancy
// Users belong to organizations, and organizations contain projects
// ============================================================================

export const organization = iamSchema.table(
  "organization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** URL-friendly identifier (e.g., "my-org") */
    name: varchar("name", { length: 128 }).notNull(),
    /** Human-readable display name (e.g., "My Organization") */
    displayName: varchar("display_name", { length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("idx_organization_name").on(table.name)]
);

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;

// ============================================================================
// Organization Member table
// Links users to organizations with org-level roles
// ============================================================================

export const organizationMember = iamSchema.table(
  "organization_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 128 }).notNull(),
    /** Organization owner flag. Only one member per org can have is_owner=true */
    isOwner: boolean("is_owner").notNull().default(false),
    invitedBy: varchar("invited_by", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_org_member_org").on(table.organizationId),
    index("idx_org_member_user").on(table.userId),
    uniqueIndex("idx_org_member_unique").on(table.organizationId, table.userId),
  ]
);

export type OrganizationMember = typeof organizationMember.$inferSelect;
export type NewOrganizationMember = typeof organizationMember.$inferInsert;

// ============================================================================
// Registered Resources table
// Services register their resources at startup for permission management
// ============================================================================

export const registeredResource = iamSchema.table(
  "registered_resource",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    service: varchar("service", { length: 64 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    displayName: varchar("display_name", { length: 256 }),
    actions: text("actions").notNull(), // JSON array of action names
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_registered_resource_unique").on(table.service, table.name),
    index("idx_registered_resource_service").on(table.service),
  ]
);

export type RegisteredResource = typeof registeredResource.$inferSelect;
export type NewRegisteredResource = typeof registeredResource.$inferInsert;

// ============================================================================
// Role table
// Roles are scoped to organizations
// ============================================================================

export const role = iamSchema.table(
  "role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Domain scope: "org" for organization-level, or "store:{id}" for store-level
    domain: varchar("domain", { length: 128 }).notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 256 }),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_role_org").on(table.organizationId),
    index("idx_role_domain").on(table.organizationId, table.domain),
    // Same role name can exist in different domains
    uniqueIndex("idx_role_org_domain_name").on(
      table.organizationId,
      table.domain,
      table.name
    ),
  ]
);

export type Role = typeof role.$inferSelect;
export type NewRole = typeof role.$inferInsert;

// ============================================================================
// User-Role table (user-role assignment per organization + domain)
// Domain allows scoping roles to specific projects within an organization
// ============================================================================

export const userRole = iamSchema.table(
  "user_role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 128 }).notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    // Domain scope: "org" for organization-level, or "store:{id}" for store-level
    domain: varchar("domain", { length: 256 }).notNull(),
    grantedBy: varchar("granted_by", { length: 128 }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_user_role_org_user").on(table.organizationId, table.userId),
    index("idx_user_role_user").on(table.userId),
    index("idx_user_role_domain").on(table.domain),
    // Unique constraint: one role per user per domain per organization
    uniqueIndex("idx_user_role_unique").on(
      table.organizationId,
      table.userId,
      table.domain
    ),
  ]
);

export type UserRole = typeof userRole.$inferSelect;
export type NewUserRole = typeof userRole.$inferInsert;

// ============================================================================
// Casbin Rule table (policies storage)
// New format with domain support:
// - Policies (ptype='p'): v0=role, v1=domain, v2=resource, v3=action, v4=effect, v5=orgId
// - Groupings (ptype='g'): v0=user, v1=role, v2=domain, v3=orgId
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
    // Explicit organization_id column for efficient filtering
    organizationId: uuid("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    index("idx_casbin_rule_ptype").on(table.ptype),
    index("idx_casbin_rule_org").on(table.organizationId),
    index("idx_casbin_rule_v0").on(table.v0),
    index("idx_casbin_rule_v1").on(table.v1), // domain index
    // Composite index for efficient org+domain filtering
    index("idx_casbin_rule_org_domain").on(table.organizationId, table.v1),
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
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    parentRoleId: uuid("parent_role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    childRoleId: uuid("child_role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_role_hierarchy_unique").on(
      table.organizationId,
      table.parentRoleId,
      table.childRoleId
    ),
  ]
);

export type RoleHierarchy = typeof roleHierarchy.$inferSelect;
export type NewRoleHierarchy = typeof roleHierarchy.$inferInsert;
