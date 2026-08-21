import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  currencyCodeEnum,
  discountCalculationStrategyEnum,
  discountClassEnum,
  discountCodeStatusEnum,
  discountKindEnum,
  discountMethodEnum,
  discountStateEnum,
  pricingSchema,
} from "./schema.js";

export const discount = pricingSchema.table(
  "discount",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    method: discountMethodEnum("method").notNull(),
    calculationStrategy: discountCalculationStrategyEnum("calculation_strategy").notNull(),
    kind: discountKindEnum("kind"),
    discountClass: discountClassEnum("discount_class").notNull(),
    state: discountStateEnum("state").notNull().default("DRAFT"),
    title: varchar("title", { length: 255 }),
    currency: currencyCodeEnum("currency").notNull(),
    priority: integer("priority").notNull().default(0),
    usageLimit: bigint("usage_limit", { mode: "bigint" }),
    appliesOncePerCustomer: boolean("applies_once_per_customer").notNull().default(false),
    appliesOnOneTimePurchase: boolean("applies_on_one_time_purchase").notNull().default(true),
    appliesOnSubscription: boolean("applies_on_subscription").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }),
    createdById: text("created_by_id"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    unique("discount_store_id_id_unique").on(table.storeId, table.id),
    check(
      "discount_title_check",
      sql`${table.title} IS NULL OR length(btrim(${table.title})) BETWEEN 1 AND 255`,
    ),
    check(
      "discount_automatic_title_check",
      sql`${table.method} <> 'AUTOMATIC' OR (${table.title} IS NOT NULL AND length(btrim(${table.title})) > 0)`,
    ),
    check(
      "discount_kind_class_check",
      sql`(${table.calculationStrategy} = 'FUNCTION' AND ${table.kind} IS NULL)
        OR (${table.calculationStrategy} = 'NATIVE' AND ((${table.kind} IN ('AMOUNT_OFF_PRODUCTS', 'BUY_X_GET_Y') AND ${table.discountClass} = 'PRODUCT')
        OR (${table.kind} = 'AMOUNT_OFF_ORDER' AND ${table.discountClass} = 'ORDER')
        OR (${table.kind} = 'FREE_SHIPPING' AND ${table.discountClass} = 'SHIPPING')))`,
    ),
    check("discount_priority_check", sql`${table.priority} >= 0`),
    check(
      "discount_usage_limit_check",
      sql`${table.usageLimit} IS NULL OR ${table.usageLimit} > 0`,
    ),
    check(
      "discount_automatic_usage_check",
      sql`${table.method} = 'CODE' OR (${table.usageLimit} IS NULL AND ${table.appliesOncePerCustomer} = false)`,
    ),
    check(
      "discount_purchase_mode_check",
      sql`${table.appliesOnOneTimePurchase} OR ${table.appliesOnSubscription}`,
    ),
    check(
      "discount_active_interval_check",
      sql`${table.endsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "discount_archive_state_check",
      sql`(${table.state} = 'ARCHIVED' AND ${table.archivedAt} IS NOT NULL)
        OR (${table.state} <> 'ARCHIVED' AND ${table.archivedAt} IS NULL)`,
    ),
    check(
      "discount_archive_time_check",
      sql`${table.archivedAt} IS NULL OR ${table.archivedAt} >= ${table.createdAt}`,
    ),
    check("discount_metadata_object_check", sql`jsonb_typeof(${table.metadata}) = 'object'`),
    index("discount_store_state_schedule_idx").on(
      table.storeId,
      table.state,
      table.startsAt,
      table.endsAt,
      table.id,
    ),
    index("discount_store_active_priority_idx")
      .on(table.storeId, table.priority.desc(), table.startsAt, table.id)
      .where(sql`${table.state} = 'ACTIVE'`),
    index("discount_store_kind_updated_idx").on(
      table.storeId,
      table.kind,
      table.updatedAt.desc(),
      table.id,
    ),
    index("discount_store_archived_idx")
      .on(table.storeId, table.archivedAt.desc(), table.id)
      .where(sql`${table.state} = 'ARCHIVED'`),
  ],
);

export const discountCode = pricingSchema.table(
  "discount_code",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discount.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 255 }).notNull(),
    normalizedCode: varchar("normalized_code", { length: 255 }).generatedAlwaysAs(
      sql`upper(btrim(code))`,
    ),
    status: discountCodeStatusEnum("status").notNull().default("ACTIVE"),
    usageLimit: bigint("usage_limit", { mode: "bigint" }),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    disabledAt: timestamp("disabled_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    unique("discount_code_discount_id_id_unique").on(table.discountId, table.id),
    unique("discount_code_store_discount_id_unique").on(table.storeId, table.discountId, table.id),
    unique("discount_code_store_normalized_unique").on(table.storeId, table.normalizedCode),
    check("discount_code_value_check", sql`length(btrim(${table.code})) BETWEEN 1 AND 255`),
    check(
      "discount_code_usage_limit_check",
      sql`${table.usageLimit} IS NULL OR ${table.usageLimit} > 0`,
    ),
    check(
      "discount_code_status_check",
      sql`(${table.status} = 'ACTIVE' AND ${table.disabledAt} IS NULL)
        OR (${table.status} = 'DISABLED' AND ${table.disabledAt} IS NOT NULL)`,
    ),
    check(
      "discount_code_disabled_time_check",
      sql`${table.disabledAt} IS NULL OR ${table.disabledAt} >= ${table.createdAt}`,
    ),
    check("discount_code_metadata_object_check", sql`jsonb_typeof(${table.metadata}) = 'object'`),
    index("discount_code_discount_status_idx").on(
      table.storeId,
      table.discountId,
      table.status,
      table.createdAt,
      table.id,
    ),
    index("discount_code_active_lookup_idx")
      .on(table.storeId, table.normalizedCode, table.discountId)
      .where(sql`${table.status} = 'ACTIVE'`),
  ],
);

export const discountTag = pricingSchema.table(
  "discount_tag",
  {
    storeId: uuid("store_id").notNull(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discount.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 64 }).notNull(),
    normalizedTag: varchar("normalized_tag", { length: 64 }).generatedAlwaysAs(
      sql`lower(btrim(tag))`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "discount_tag_pkey",
      columns: [table.discountId, table.normalizedTag],
    }),
    check("discount_tag_value_check", sql`length(btrim(${table.tag})) BETWEEN 1 AND 64`),
    index("discount_tag_store_lookup_idx").on(table.storeId, table.normalizedTag, table.discountId),
  ],
);

export type Discount = typeof discount.$inferSelect;
export type NewDiscount = typeof discount.$inferInsert;
export type DiscountCode = typeof discountCode.$inferSelect;
export type NewDiscountCode = typeof discountCode.$inferInsert;
export type DiscountTag = typeof discountTag.$inferSelect;
export type NewDiscountTag = typeof discountTag.$inferInsert;
