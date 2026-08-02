import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { customer } from "./profiles.js";
import {
  assignmentSourceEnum,
  customerSegmentStatusEnum,
  customerSegmentTypeEnum,
  customersSchema,
} from "./schema.js";

export const customerGroup = customersSchema.table(
  "customer_group",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    revision: integer("revision").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check(
      "customer_group_code_check",
      sql`${table.code} ~ '^[a-z0-9][a-z0-9_-]{0,63}$'`
    ),
    check(
      "customer_group_name_check",
      sql`length(btrim(${table.name})) > 0`
    ),
    check(
      "customer_group_revision_nonnegative_check",
      sql`${table.revision} >= 0`
    ),
    uniqueIndex("customer_group_store_code_unique")
      .on(table.storeId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("customer_group_store_default_unique")
      .on(table.storeId)
      .where(
        sql`${table.isDefault} = true AND ${table.isActive} = true AND ${table.deletedAt} IS NULL`
      ),
    index("customer_group_store_active_idx")
      .on(table.storeId, table.isActive, sql`lower(${table.name})`, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const customerGroupMembership = customersSchema.table(
  "customer_group_membership",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => customerGroup.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    source: assignmentSourceEnum("source").notNull().default("MANUAL"),
    assignedById: text("assigned_by_id"),
    assignedAt: timestamp("assigned_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    unique("customer_group_membership_customer_group_unique").on(
      table.customerId,
      table.groupId
    ),
    check(
      "customer_group_membership_expiry_check",
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt} > ${table.assignedAt}`
    ),
    uniqueIndex("customer_group_membership_primary_unique")
      .on(table.customerId)
      .where(sql`${table.isPrimary} = true AND ${table.expiresAt} IS NULL`),
    index("customer_group_membership_store_group_idx").on(
      table.storeId,
      table.groupId,
      table.customerId
    ),
    index("customer_group_membership_customer_idx").on(table.customerId),
  ]
);

export const customerTag = customersSchema.table(
  "customer_tag",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check(
      "customer_tag_name_check",
      sql`length(btrim(${table.normalizedName})) > 0`
    ),
    uniqueIndex("customer_tag_store_name_unique")
      .on(table.storeId, table.normalizedName)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_tag_store_name_idx")
      .on(table.storeId, table.normalizedName, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const customerTagAssignment = customersSchema.table(
  "customer_tag_assignment",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => customerTag.id, { onDelete: "cascade" }),
    assignedById: text("assigned_by_id"),
    assignedAt: timestamp("assigned_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("customer_tag_assignment_customer_tag_unique").on(
      table.customerId,
      table.tagId
    ),
    index("customer_tag_assignment_store_tag_idx").on(
      table.storeId,
      table.tagId,
      table.customerId
    ),
    index("customer_tag_assignment_customer_idx").on(table.customerId),
  ]
);

export const customerSegment = customersSchema.table(
  "customer_segment",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 7 }),
    type: customerSegmentTypeEnum("type").notNull(),
    status: customerSegmentStatusEnum("status").notNull().default("DRAFT"),
    query: text("query"),
    definition: jsonb("definition").notNull().default(sql`'{}'::jsonb`),
    createdById: text("created_by_id"),
    revision: integer("revision").notNull().default(0),
    definitionRevision: integer("definition_revision").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check(
      "customer_segment_name_check",
      sql`length(btrim(${table.name})) > 0`
    ),
    check(
      "customer_segment_dynamic_definition_check",
      sql`${table.type} <> 'DYNAMIC' OR ${table.query} IS NOT NULL OR ${table.definition} <> '{}'::jsonb`
    ),
    check(
      "customer_segment_color_check",
      sql`${table.color} IS NULL OR ${table.color} ~ '^#[0-9A-Fa-f]{6}$'`
    ),
    check(
      "customer_segment_revision_nonnegative_check",
      sql`${table.revision} >= 0`
    ),
    check(
      "customer_segment_definition_revision_nonnegative_check",
      sql`${table.definitionRevision} >= 0`
    ),
    uniqueIndex("customer_segment_store_name_unique")
      .on(table.storeId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_segment_store_status_idx")
      .on(table.storeId, table.status, table.type, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const customerSegmentMembership = customersSchema.table(
  "customer_segment_membership",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => customerSegment.id, { onDelete: "cascade" }),
    source: assignmentSourceEnum("source").notNull(),
    evaluatedAt: timestamp("evaluated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    evaluatedDefinitionRevision: integer("evaluated_definition_revision"),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    unique("customer_segment_membership_customer_segment_unique").on(
      table.customerId,
      table.segmentId
    ),
    check(
      "customer_segment_membership_expiry_check",
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt} > ${table.evaluatedAt}`
    ),
    check(
      "customer_segment_membership_definition_revision_check",
      sql`(${table.source} = 'RULE' AND ${table.evaluatedDefinitionRevision} IS NOT NULL)
        OR (${table.source} <> 'RULE' AND ${table.evaluatedDefinitionRevision} IS NULL)`
    ),
    check(
      "customer_segment_membership_definition_revision_nonnegative_check",
      sql`${table.evaluatedDefinitionRevision} IS NULL OR ${table.evaluatedDefinitionRevision} >= 0`
    ),
    index("customer_segment_membership_store_segment_idx").on(
      table.storeId,
      table.segmentId,
      table.customerId
    ),
    index("customer_segment_membership_customer_idx").on(table.customerId),
    index("customer_segment_membership_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.expiresAt} IS NOT NULL`),
    index("customer_segment_membership_store_customer_expiry_idx").on(
      table.storeId,
      table.customerId,
      table.expiresAt,
      table.segmentId
    ),
  ]
);

export type CustomerGroup = typeof customerGroup.$inferSelect;
export type NewCustomerGroup = typeof customerGroup.$inferInsert;
export type CustomerGroupMembership = typeof customerGroupMembership.$inferSelect;
export type NewCustomerGroupMembership = typeof customerGroupMembership.$inferInsert;
export type CustomerTag = typeof customerTag.$inferSelect;
export type NewCustomerTag = typeof customerTag.$inferInsert;
export type CustomerTagAssignment = typeof customerTagAssignment.$inferSelect;
export type NewCustomerTagAssignment = typeof customerTagAssignment.$inferInsert;
export type CustomerSegment = typeof customerSegment.$inferSelect;
export type NewCustomerSegment = typeof customerSegment.$inferInsert;
export type CustomerSegmentMembership = typeof customerSegmentMembership.$inferSelect;
export type NewCustomerSegmentMembership = typeof customerSegmentMembership.$inferInsert;
