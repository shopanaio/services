import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  smallint,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts.js";
import { programVersions } from "./programs.js";
import {
  loyaltySchema,
  tierCalendarPeriodEnum,
  tierDowngradePolicyEnum,
  tierEvaluationWindowTypeEnum,
  tierMembershipEventTypeEnum,
  tierMembershipStatusEnum,
  tierRequalificationPolicyEnum,
} from "./schema.js";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();

export const tierPolicies = loyaltySchema.table(
  "tier_policy",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    programVersionId: uuid("program_version_id").notNull(),
    windowType: tierEvaluationWindowTypeEnum("window_type").notNull(),
    rollingWindowDays: integer("rolling_window_days"),
    calendarPeriod: tierCalendarPeriodEnum("calendar_period"),
    programYearStartsMonth: smallint("program_year_starts_month"),
    membershipDurationDays: integer("membership_duration_days"),
    gracePeriodDays: integer("grace_period_days").notNull().default(0),
    downgradePolicy: tierDowngradePolicyEnum("downgrade_policy").notNull().default("IMMEDIATE"),
    requalificationPolicy: tierRequalificationPolicyEnum("requalification_policy")
      .notNull()
      .default("AUTOMATIC"),
    metricSchemaVersion: integer("metric_schema_version").notNull().default(1),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_tier_policy_program_version_fk",
      columns: [table.programVersionId],
      foreignColumns: [programVersions.id],
    }),
    unique("loyalty_tier_policy_program_version_unique").on(table.programVersionId),
    check(
      "loyalty_tier_policy_window_check",
      sql`(${table.windowType} = 'LIFETIME'
          AND ${table.rollingWindowDays} IS NULL
          AND ${table.calendarPeriod} IS NULL
          AND ${table.programYearStartsMonth} IS NULL)
        OR (${table.windowType} = 'ROLLING'
          AND ${table.rollingWindowDays} IS NOT NULL
          AND ${table.rollingWindowDays} > 0
          AND ${table.calendarPeriod} IS NULL
          AND ${table.programYearStartsMonth} IS NULL)
        OR (${table.windowType} = 'CALENDAR'
          AND ${table.rollingWindowDays} IS NULL
          AND ${table.calendarPeriod} IS NOT NULL
          AND ((${table.calendarPeriod} = 'PROGRAM_YEAR'
              AND ${table.programYearStartsMonth} IS NOT NULL
              AND ${table.programYearStartsMonth} BETWEEN 1 AND 12)
            OR (${table.calendarPeriod} <> 'PROGRAM_YEAR'
              AND ${table.programYearStartsMonth} IS NULL)))`,
    ),
    check(
      "loyalty_tier_policy_duration_check",
      sql`(${table.membershipDurationDays} IS NULL OR ${table.membershipDurationDays} > 0)
        AND ${table.gracePeriodDays} >= 0
        AND (${table.downgradePolicy} = 'GRACE_PERIOD' OR ${table.gracePeriodDays} = 0)`,
    ),
    check("loyalty_tier_policy_metric_schema_check", sql`${table.metricSchemaVersion} > 0`),
  ],
);

export const tiers = loyaltySchema.table(
  "tier",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    programVersionId: uuid("program_version_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    rank: integer("rank").notNull(),
    qualificationSchemaVersion: integer("qualification_schema_version").notNull().default(1),
    qualification: jsonb("qualification").$type<Record<string, unknown>>().notNull(),
    maintenance: jsonb("maintenance").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_tier_program_version_fk",
      columns: [table.programVersionId, table.storeId],
      foreignColumns: [programVersions.id, programVersions.storeId],
    }),
    unique("loyalty_tier_id_store_unique").on(table.id, table.storeId),
    unique("loyalty_tier_version_code_unique").on(table.programVersionId, table.code),
    unique("loyalty_tier_version_rank_unique").on(table.programVersionId, table.rank),
    check("loyalty_tier_code_check", sql`${table.code} ~ '^[a-z][a-z0-9_-]{1,63}$'`),
    check("loyalty_tier_name_check", sql`btrim(${table.name}) <> ''`),
    check("loyalty_tier_rank_check", sql`${table.rank} >= 0`),
    check(
      "loyalty_tier_qualification_check",
      sql`${table.qualificationSchemaVersion} > 0
        AND jsonb_typeof(${table.qualification}) = 'object'
        AND (${table.maintenance} IS NULL OR jsonb_typeof(${table.maintenance}) = 'object')`,
    ),
  ],
);

export const tierMemberships = loyaltySchema.table(
  "tier_membership",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    accountId: uuid("account_id").notNull(),
    tierId: uuid("tier_id").notNull(),
    status: tierMembershipStatusEnum("status").notNull().default("ACTIVE"),
    evaluationPeriodStartedAt: timestamp("evaluation_period_started_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    evaluationPeriodEndedAt: timestamp("evaluation_period_ended_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    qualifiedAt: timestamp("qualified_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    effectiveTo: timestamp("effective_to", {
      withTimezone: true,
      mode: "string",
    }),
    revision: integer("revision").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_tier_membership_account_fk",
      columns: [table.accountId, table.storeId],
      foreignColumns: [accounts.id, accounts.storeId],
    }),
    foreignKey({
      name: "loyalty_tier_membership_tier_fk",
      columns: [table.tierId, table.storeId],
      foreignColumns: [tiers.id, tiers.storeId],
    }),
    unique("loyalty_tier_membership_id_store_unique").on(table.id, table.storeId),
    uniqueIndex("loyalty_tier_membership_one_active_idx")
      .on(table.accountId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("loyalty_tier_membership_store_tier_idx").on(
      table.storeId,
      table.tierId,
      table.status,
      table.effectiveFrom.desc(),
      table.id.desc(),
    ),
    check(
      "loyalty_tier_membership_evaluation_check",
      sql`${table.evaluationPeriodEndedAt} > ${table.evaluationPeriodStartedAt}`,
    ),
    check(
      "loyalty_tier_membership_effective_check",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
    check(
      "loyalty_tier_membership_status_check",
      sql`(${table.status} = 'ACTIVE'
          AND (${table.effectiveTo} IS NULL OR ${table.effectiveTo} > ${table.effectiveFrom}))
        OR (${table.status} <> 'ACTIVE' AND ${table.effectiveTo} IS NOT NULL)`,
    ),
    check("loyalty_tier_membership_revision_check", sql`${table.revision} > 0`),
  ],
);

export const tierMembershipEvents = loyaltySchema.table(
  "tier_membership_event",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    accountId: uuid("account_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    previousTierId: uuid("previous_tier_id"),
    tierId: uuid("tier_id").notNull(),
    eventType: tierMembershipEventTypeEnum("event_type").notNull(),
    evaluationRevision: varchar("evaluation_revision", { length: 64 }).notNull(),
    reasonCode: varchar("reason_code", { length: 128 }).notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_tier_membership_event_account_fk",
      columns: [table.accountId, table.storeId],
      foreignColumns: [accounts.id, accounts.storeId],
    }),
    foreignKey({
      name: "loyalty_tier_membership_event_membership_fk",
      columns: [table.membershipId, table.storeId],
      foreignColumns: [tierMemberships.id, tierMemberships.storeId],
    }),
    foreignKey({
      name: "loyalty_tier_membership_event_previous_tier_fk",
      columns: [table.previousTierId, table.storeId],
      foreignColumns: [tiers.id, tiers.storeId],
    }),
    foreignKey({
      name: "loyalty_tier_membership_event_tier_fk",
      columns: [table.tierId, table.storeId],
      foreignColumns: [tiers.id, tiers.storeId],
    }),
    index("loyalty_tier_membership_event_history_idx").on(
      table.accountId,
      table.occurredAt.desc(),
      table.id.desc(),
    ),
    check(
      "loyalty_tier_membership_event_revision_check",
      sql`${table.evaluationRevision} ~ '^[0-9a-f]{64}$'`,
    ),
    check("loyalty_tier_membership_event_reason_check", sql`btrim(${table.reasonCode}) <> ''`),
    check(
      "loyalty_tier_membership_event_metadata_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
  ],
);

export type TierPolicy = typeof tierPolicies.$inferSelect;
export type NewTierPolicy = typeof tierPolicies.$inferInsert;
export type Tier = typeof tiers.$inferSelect;
export type NewTier = typeof tiers.$inferInsert;
export type TierMembership = typeof tierMemberships.$inferSelect;
export type NewTierMembership = typeof tierMemberships.$inferInsert;
export type TierMembershipEvent = typeof tierMembershipEvents.$inferSelect;
export type NewTierMembershipEvent = typeof tierMembershipEvents.$inferInsert;
