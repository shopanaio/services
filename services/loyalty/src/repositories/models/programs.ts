import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  debtPolicyEnum,
  earningActionTypeEnum,
  earningTriggerTypeEnum,
  loyaltySchema,
  programStatusEnum,
  programVersionStatusEnum,
  refundPolicyEnum,
  restoredPointsExpiryPolicyEnum,
  roundingModeEnum,
} from "./schema.js";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow();

export const programs = loyaltySchema.table(
  "program",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: programStatusEnum("status").notNull().default("DRAFT"),
    isDefault: boolean("is_default").notNull().default(false),
    defaultCurrencyCode: varchar("default_currency_code", {
      length: 3,
    }).notNull(),
    revision: integer("revision").notNull().default(1),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    unique("loyalty_program_store_code_unique").on(table.storeId, table.code),
    unique("loyalty_program_id_store_unique").on(table.id, table.storeId),
    uniqueIndex("loyalty_program_one_default_per_store_idx")
      .on(table.storeId)
      .where(sql`${table.isDefault} AND ${table.archivedAt} IS NULL`),
    index("loyalty_program_store_status_idx").on(
      table.storeId,
      table.status,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    check(
      "loyalty_program_code_check",
      sql`${table.code} ~ '^[a-z][a-z0-9_-]{1,63}$'`,
    ),
    check("loyalty_program_name_check", sql`btrim(${table.name}) <> ''`),
    check(
      "loyalty_program_currency_check",
      sql`${table.defaultCurrencyCode} ~ '^[A-Z]{3}$'`,
    ),
    check("loyalty_program_revision_check", sql`${table.revision} > 0`),
    check(
      "loyalty_program_metadata_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
    check(
      "loyalty_program_archive_check",
      sql`(${table.status} = 'ARCHIVED' AND ${table.archivedAt} IS NOT NULL)
        OR (${table.status} <> 'ARCHIVED' AND ${table.archivedAt} IS NULL)`,
    ),
  ],
);

export const programVersions = loyaltySchema.table(
  "program_version",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    programId: uuid("program_id").notNull(),
    version: integer("version").notNull(),
    status: programVersionStatusEnum("status").notNull().default("DRAFT"),
    revision: integer("revision").notNull().default(1),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
      mode: "string",
    }),
    effectiveTo: timestamp("effective_to", {
      withTimezone: true,
      mode: "string",
    }),
    earningEnabled: boolean("earning_enabled").notNull().default(true),
    redemptionEnabled: boolean("redemption_enabled").notNull().default(true),
    activationDelaySeconds: integer("activation_delay_seconds")
      .notNull()
      .default(0),
    pointsExpiryDays: integer("points_expiry_days"),
    earnPoints: bigint("earn_points", { mode: "bigint" }).notNull(),
    earnAmountMinor: bigint("earn_amount_minor", { mode: "bigint" }).notNull(),
    minimumEligibleAmountMinor: bigint("minimum_eligible_amount_minor", {
      mode: "bigint",
    })
      .notNull()
      .default(0n),
    redeemPoints: bigint("redeem_points", { mode: "bigint" }).notNull(),
    redeemAmountMinor: bigint("redeem_amount_minor", {
      mode: "bigint",
    }).notNull(),
    minimumRedeemPoints: bigint("minimum_redeem_points", { mode: "bigint" })
      .notNull()
      .default(1n),
    maximumRedeemPointsPerOrder: bigint("maximum_redeem_points_per_order", {
      mode: "bigint",
    }),
    maximumOrderPercentageBps: integer("maximum_order_percentage_bps")
      .notNull()
      .default(10000),
    roundingMode: roundingModeEnum("rounding_mode").notNull().default("DOWN"),
    refundPolicy: refundPolicyEnum("refund_policy")
      .notNull()
      .default("PROPORTIONAL"),
    debtPolicy: debtPolicyEnum("debt_policy")
      .notNull()
      .default("TRACK_DEBT"),
    restoredPointsExpiryPolicy: restoredPointsExpiryPolicyEnum(
      "restored_points_expiry_policy",
    )
      .notNull()
      .default("ORIGINAL_EXPIRY"),
    rulesSchemaVersion: integer("rules_schema_version").notNull().default(1),
    rules: jsonb("rules")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdById: uuid("created_by_id"),
    publishedById: uuid("published_by_id"),
    createdAt: createdAt(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    foreignKey({
      name: "loyalty_program_version_program_fk",
      columns: [table.programId, table.storeId],
      foreignColumns: [programs.id, programs.storeId],
    }),
    unique("loyalty_program_version_number_unique").on(
      table.programId,
      table.version,
    ),
    unique("loyalty_program_version_id_store_unique").on(
      table.id,
      table.storeId,
    ),
    unique("loyalty_program_version_id_program_store_unique").on(
      table.id,
      table.programId,
      table.storeId,
    ),
    uniqueIndex("loyalty_program_one_active_version_idx")
      .on(table.programId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("loyalty_program_version_effective_idx").on(
      table.storeId,
      table.programId,
      table.status,
      table.effectiveFrom.desc(),
      table.version.desc(),
    ),
    check(
      "loyalty_program_version_revision_check",
      sql`${table.revision} > 0`,
    ),
    check(
      "loyalty_program_version_activation_delay_check",
      sql`${table.activationDelaySeconds} >= 0`,
    ),
    check(
      "loyalty_program_version_expiry_check",
      sql`${table.pointsExpiryDays} IS NULL OR ${table.pointsExpiryDays} > 0`,
    ),
    check(
      "loyalty_program_version_earning_ratio_check",
      sql`${table.earnPoints} > 0 AND ${table.earnAmountMinor} > 0`,
    ),
    check(
      "loyalty_program_version_eligible_amount_check",
      sql`${table.minimumEligibleAmountMinor} >= 0`,
    ),
    check(
      "loyalty_program_version_redemption_ratio_check",
      sql`${table.redeemPoints} > 0 AND ${table.redeemAmountMinor} > 0`,
    ),
    check(
      "loyalty_program_version_rules_schema_check",
      sql`${table.rulesSchemaVersion} > 0 AND jsonb_typeof(${table.rules}) = 'object'`,
    ),
  ],
);

export const earningRules = loyaltySchema.table(
  "earning_rule",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    programVersionId: uuid("program_version_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    priority: integer("priority").notNull().default(0),
    triggerType: earningTriggerTypeEnum("trigger_type").notNull(),
    triggerSchemaVersion: integer("trigger_schema_version")
      .notNull()
      .default(1),
    triggerConfig: jsonb("trigger_config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    conditionSchemaVersion: integer("condition_schema_version")
      .notNull()
      .default(1),
    conditions: jsonb("conditions")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{"type":"ALL","conditions":[]}'::jsonb`),
    actionType: earningActionTypeEnum("action_type").notNull(),
    actionSchemaVersion: integer("action_schema_version")
      .notNull()
      .default(1),
    action: jsonb("action").$type<Record<string, unknown>>().notNull(),
    limitSchemaVersion: integer("limit_schema_version").notNull().default(1),
    limits: jsonb("limits")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    stopProcessing: boolean("stop_processing").notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_earning_rule_program_version_fk",
      columns: [table.programVersionId],
      foreignColumns: [programVersions.id],
    }),
    unique("loyalty_earning_rule_version_code_unique").on(
      table.programVersionId,
      table.code,
    ),
    index("loyalty_earning_rule_match_idx").on(
      table.storeId,
      table.programVersionId,
      table.triggerType,
      table.priority,
      table.id,
    ),
    check(
      "loyalty_earning_rule_code_check",
      sql`${table.code} ~ '^[a-z][a-z0-9_-]{1,63}$'`,
    ),
    check("loyalty_earning_rule_name_check", sql`btrim(${table.name}) <> ''`),
    check(
      "loyalty_earning_rule_priority_check",
      sql`${table.priority} >= 0`,
    ),
    check(
      "loyalty_earning_rule_schema_versions_check",
      sql`${table.triggerSchemaVersion} > 0
        AND ${table.conditionSchemaVersion} > 0
        AND ${table.actionSchemaVersion} > 0
        AND ${table.limitSchemaVersion} > 0`,
    ),
    check(
      "loyalty_earning_rule_json_check",
      sql`jsonb_typeof(${table.triggerConfig}) = 'object'
        AND jsonb_typeof(${table.conditions}) = 'object'
        AND jsonb_typeof(${table.action}) = 'object'
        AND jsonb_typeof(${table.limits}) = 'object'`,
    ),
  ],
);

export type Program = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;
export type ProgramVersion = typeof programVersions.$inferSelect;
export type NewProgramVersion = typeof programVersions.$inferInsert;
export type EarningRule = typeof earningRules.$inferSelect;
export type NewEarningRule = typeof earningRules.$inferInsert;
