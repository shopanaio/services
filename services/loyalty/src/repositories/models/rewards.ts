import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts.js";
import { eventFacts } from "./events.js";
import { transactions } from "./ledger.js";
import { programVersions } from "./programs.js";
import {
  actorTypeEnum,
  loyaltySchema,
  rewardEntitlementEventTypeEnum,
  rewardEntitlementStatusEnum,
  rewardTypeEnum,
} from "./schema.js";
import { tiers } from "./tiers.js";
import { monetaryTransactions } from "./wallets.js";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow();

export const rewardDefinitions = loyaltySchema.table(
  "reward_definition",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    programVersionId: uuid("program_version_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    rewardType: rewardTypeEnum("reward_type").notNull(),
    configurationSchemaVersion: integer("configuration_schema_version")
      .notNull()
      .default(1),
    configuration: jsonb("configuration")
      .$type<Record<string, unknown>>()
      .notNull(),
    validityDays: integer("validity_days"),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "string",
    }),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "string",
    }),
    issuanceLimit: bigint("issuance_limit", { mode: "bigint" }),
    perAccountLimit: bigint("per_account_limit", { mode: "bigint" }),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_reward_definition_program_version_fk",
      columns: [table.programVersionId],
      foreignColumns: [programVersions.id],
    }),
    unique("loyalty_reward_definition_version_code_unique").on(
      table.programVersionId,
      table.code,
    ),
    index("loyalty_reward_definition_type_idx").on(
      table.storeId,
      table.programVersionId,
      table.rewardType,
      table.code,
      table.id,
    ),
    check(
      "loyalty_reward_definition_code_check",
      sql`${table.code} ~ '^[a-z][a-z0-9_-]{1,63}$'`,
    ),
    check(
      "loyalty_reward_definition_name_check",
      sql`btrim(${table.name}) <> ''`,
    ),
    check(
      "loyalty_reward_definition_configuration_check",
      sql`${table.configurationSchemaVersion} > 0
        AND jsonb_typeof(${table.configuration}) = 'object'`,
    ),
    check(
      "loyalty_reward_definition_validity_check",
      sql`(${table.validityDays} IS NULL OR ${table.validityDays} > 0)
        AND (${table.endsAt} IS NULL
          OR (${table.startsAt} IS NOT NULL AND ${table.endsAt} > ${table.startsAt}))`,
    ),
    check(
      "loyalty_reward_definition_limits_check",
      sql`(${table.issuanceLimit} IS NULL OR ${table.issuanceLimit} > 0)
        AND (${table.perAccountLimit} IS NULL OR ${table.perAccountLimit} > 0)
        AND (${table.issuanceLimit} IS NULL OR ${table.perAccountLimit} IS NULL
          OR ${table.perAccountLimit} <= ${table.issuanceLimit})`,
    ),
  ],
);

export const rewardEntitlements = loyaltySchema.table(
  "reward_entitlement",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    rewardDefinitionId: uuid("reward_definition_id").notNull(),
    accountId: uuid("account_id").notNull(),
    sourceEventFactId: uuid("source_event_fact_id"),
    issuanceTransactionId: uuid("issuance_transaction_id"),
    monetaryTransactionId: uuid("monetary_transaction_id"),
    status: rewardEntitlementStatusEnum("status")
      .notNull()
      .default("ISSUED"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    configurationSchemaVersion: integer("configuration_schema_version")
      .notNull()
      .default(1),
    configurationSnapshot: jsonb("configuration_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    quantity: bigint("quantity", { mode: "bigint" }).notNull().default(1n),
    validFrom: timestamp("valid_from", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    validTo: timestamp("valid_to", {
      withTimezone: true,
      mode: "string",
    }),
    reservedForCheckoutId: uuid("reserved_for_checkout_id"),
    redeemedOrderId: uuid("redeemed_order_id"),
    externalReference: varchar("external_reference", { length: 255 }),
    issuedAt: timestamp("issued_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    reservedAt: timestamp("reserved_at", {
      withTimezone: true,
      mode: "string",
    }),
    redeemedAt: timestamp("redeemed_at", {
      withTimezone: true,
      mode: "string",
    }),
    expiredAt: timestamp("expired_at", {
      withTimezone: true,
      mode: "string",
    }),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "string",
    }),
    revision: integer("revision").notNull().default(1),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_reward_entitlement_definition_fk",
      columns: [table.rewardDefinitionId],
      foreignColumns: [rewardDefinitions.id],
    }),
    foreignKey({
      name: "loyalty_reward_entitlement_account_fk",
      columns: [table.accountId],
      foreignColumns: [accounts.id],
    }),
    foreignKey({
      name: "loyalty_reward_entitlement_source_event_fk",
      columns: [table.sourceEventFactId],
      foreignColumns: [eventFacts.id],
    }),
    foreignKey({
      name: "loyalty_reward_entitlement_points_transaction_fk",
      columns: [table.issuanceTransactionId],
      foreignColumns: [transactions.id],
    }),
    foreignKey({
      name: "loyalty_reward_entitlement_monetary_transaction_fk",
      columns: [table.monetaryTransactionId],
      foreignColumns: [monetaryTransactions.id],
    }),
    unique("loyalty_reward_entitlement_idempotency_unique").on(
      table.accountId,
      table.rewardDefinitionId,
      table.idempotencyKey,
    ),
    index("loyalty_reward_entitlement_account_status_idx").on(
      table.storeId,
      table.accountId,
      table.status,
      table.validTo,
      table.id,
    ),
    check(
      "loyalty_reward_entitlement_idempotency_check",
      sql`btrim(${table.idempotencyKey}) <> ''`,
    ),
    check(
      "loyalty_reward_entitlement_configuration_check",
      sql`${table.configurationSchemaVersion} > 0
        AND jsonb_typeof(${table.configurationSnapshot}) = 'object'`,
    ),
    check(
      "loyalty_reward_entitlement_quantity_check",
      sql`${table.quantity} > 0`,
    ),
    check(
      "loyalty_reward_entitlement_validity_check",
      sql`${table.validTo} IS NULL OR ${table.validTo} > ${table.validFrom}`,
    ),
    check(
      "loyalty_reward_entitlement_revision_check",
      sql`${table.revision} > 0`,
    ),
    check(
      "loyalty_reward_entitlement_state_check",
      sql`(${table.status} = 'ISSUED' AND ${table.reservedAt} IS NULL
          AND ${table.redeemedAt} IS NULL AND ${table.expiredAt} IS NULL
          AND ${table.revokedAt} IS NULL AND ${table.reservedForCheckoutId} IS NULL
          AND ${table.redeemedOrderId} IS NULL)
        OR (${table.status} = 'RESERVED' AND ${table.reservedAt} IS NOT NULL
          AND ${table.reservedForCheckoutId} IS NOT NULL
          AND ${table.redeemedAt} IS NULL AND ${table.expiredAt} IS NULL
          AND ${table.revokedAt} IS NULL AND ${table.redeemedOrderId} IS NULL)
        OR (${table.status} = 'REDEEMED' AND ${table.redeemedAt} IS NOT NULL
          AND ${table.redeemedOrderId} IS NOT NULL AND ${table.expiredAt} IS NULL
          AND ${table.revokedAt} IS NULL)
        OR (${table.status} = 'EXPIRED' AND ${table.expiredAt} IS NOT NULL
          AND ${table.redeemedAt} IS NULL AND ${table.revokedAt} IS NULL
          AND ${table.redeemedOrderId} IS NULL)
        OR (${table.status} = 'REVOKED' AND ${table.revokedAt} IS NOT NULL
          AND ${table.redeemedAt} IS NULL AND ${table.expiredAt} IS NULL
          AND ${table.redeemedOrderId} IS NULL)`,
    ),
  ],
);

export const rewardEntitlementEvents = loyaltySchema.table(
  "reward_entitlement_event",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    entitlementId: uuid("entitlement_id").notNull(),
    eventType: rewardEntitlementEventTypeEnum("event_type").notNull(),
    previousStatus: rewardEntitlementStatusEnum("previous_status"),
    status: rewardEntitlementStatusEnum("status").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: text("actor_id"),
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
      name: "loyalty_reward_entitlement_event_entitlement_fk",
      columns: [table.entitlementId],
      foreignColumns: [rewardEntitlements.id],
    }),
    unique("loyalty_reward_entitlement_event_idempotency_unique").on(
      table.entitlementId,
      table.idempotencyKey,
    ),
    index("loyalty_reward_entitlement_event_history_idx").on(
      table.entitlementId,
      table.occurredAt,
      table.id,
    ),
    check(
      "loyalty_reward_entitlement_event_names_check",
      sql`btrim(${table.idempotencyKey}) <> '' AND btrim(${table.reasonCode}) <> ''`,
    ),
    check(
      "loyalty_reward_entitlement_event_actor_check",
      sql`(${table.actorType} IN ('ADMIN_USER', 'CUSTOMER') AND ${table.actorId} IS NOT NULL)
        OR (${table.actorType} IN ('SERVICE', 'SYSTEM') AND ${table.actorId} IS NULL)`,
    ),
    check(
      "loyalty_reward_entitlement_event_metadata_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
  ],
);

export const tierRewardBenefits = loyaltySchema.table(
  "tier_reward_benefit",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    tierId: uuid("tier_id").notNull(),
    rewardDefinitionId: uuid("reward_definition_id").notNull(),
    grantPolicySchemaVersion: integer("grant_policy_schema_version")
      .notNull()
      .default(1),
    grantPolicy: jsonb("grant_policy")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{"type":"ON_QUALIFICATION"}'::jsonb`),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_tier_reward_benefit_tier_fk",
      columns: [table.tierId],
      foreignColumns: [tiers.id],
    }),
    foreignKey({
      name: "loyalty_tier_reward_benefit_definition_fk",
      columns: [table.rewardDefinitionId],
      foreignColumns: [rewardDefinitions.id],
    }),
    unique("loyalty_tier_reward_benefit_unique").on(
      table.tierId,
      table.rewardDefinitionId,
    ),
    check(
      "loyalty_tier_reward_benefit_policy_check",
      sql`${table.grantPolicySchemaVersion} > 0
        AND jsonb_typeof(${table.grantPolicy}) = 'object'`,
    ),
  ],
);

export type RewardDefinition = typeof rewardDefinitions.$inferSelect;
export type NewRewardDefinition = typeof rewardDefinitions.$inferInsert;
export type RewardEntitlement = typeof rewardEntitlements.$inferSelect;
export type NewRewardEntitlement = typeof rewardEntitlements.$inferInsert;
export type RewardEntitlementEvent = typeof rewardEntitlementEvents.$inferSelect;
export type NewRewardEntitlementEvent = typeof rewardEntitlementEvents.$inferInsert;
export type TierRewardBenefit = typeof tierRewardBenefits.$inferSelect;
export type NewTierRewardBenefit = typeof tierRewardBenefits.$inferInsert;
