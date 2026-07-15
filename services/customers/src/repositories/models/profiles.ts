import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  customerAccountStatusEnum,
  customerLifecycleStatusEnum,
  customersSchema,
} from "./schema.js";

export const customer = customersSchema.table(
  "customer",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    iamPrincipalId: text("iam_principal_id"),
    lifecycleStatus: customerLifecycleStatusEnum("lifecycle_status")
      .notNull()
      .default("active"),
    accountStatus: customerAccountStatusEnum("account_status")
      .notNull()
      .default("guest"),
    email: varchar("email", { length: 320 }),
    normalizedEmail: varchar("normalized_email", { length: 320 }),
    emailVerified: boolean("email_verified").notNull().default(false),
    phoneE164: varchar("phone_e164", { length: 32 }),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    prefix: varchar("prefix", { length: 32 }),
    firstName: varchar("first_name", { length: 128 }),
    middleName: varchar("middle_name", { length: 128 }),
    lastName: varchar("last_name", { length: 128 }),
    suffix: varchar("suffix", { length: 32 }),
    preferredLocale: varchar("preferred_locale", { length: 35 }),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    gender: varchar("gender", { length: 32 }),
    companyName: varchar("company_name", { length: 255 }),
    jobTitle: varchar("job_title", { length: 255 }),
    note: text("note"),
    disabledReason: text("disabled_reason"),
    moderationNote: text("moderation_note"),
    source: varchar("source", { length: 64 }).notNull().default("unknown"),
    createdByUserId: text("created_by_user_id"),
    revision: integer("revision").notNull().default(0),
    lastActivityAt: timestamp("last_activity_at", {
      withTimezone: true,
      mode: "string",
    }),
    mergedIntoCustomerId: uuid("merged_into_customer_id").references(
      (): AnyPgColumn => customer.id,
      { onDelete: "restrict" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    redactedAt: timestamp("redacted_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    check(
      "customer_email_projection_check",
      sql`(${table.email} IS NULL) = (${table.normalizedEmail} IS NULL)`
    ),
    check(
      "customer_email_verified_check",
      sql`NOT ${table.emailVerified} OR ${table.email} IS NOT NULL`
    ),
    check(
      "customer_phone_verified_check",
      sql`NOT ${table.phoneVerified} OR ${table.phoneE164} IS NOT NULL`
    ),
    check(
      "customer_phone_e164_check",
      sql`${table.phoneE164} IS NULL OR ${table.phoneE164} ~ '^\\+[1-9][0-9]{6,14}$'`
    ),
    check(
      "customer_revision_nonnegative_check",
      sql`${table.revision} >= 0`
    ),
    check(
      "customer_disabled_reason_check",
      sql`(${table.lifecycleStatus} <> 'disabled' AND ${table.disabledReason} IS NULL)
        OR (${table.lifecycleStatus} = 'disabled'
          AND ${table.disabledReason} IS NOT NULL
          AND length(btrim(${table.disabledReason})) > 0)`
    ),
    check(
      "customer_moderation_note_check",
      sql`${table.moderationNote} IS NULL OR length(btrim(${table.moderationNote})) > 0`
    ),
    check(
      "customer_merge_target_check",
      sql`(${table.lifecycleStatus} = 'merged' AND ${table.mergedIntoCustomerId} IS NOT NULL)
        OR (${table.lifecycleStatus} <> 'merged' AND ${table.mergedIntoCustomerId} IS NULL)`
    ),
    check(
      "customer_not_merged_into_self_check",
      sql`${table.mergedIntoCustomerId} IS NULL OR ${table.mergedIntoCustomerId} <> ${table.id}`
    ),
    check(
      "customer_redaction_timestamp_check",
      sql`(${table.lifecycleStatus} = 'redacted' AND ${table.redactedAt} IS NOT NULL)
        OR (${table.lifecycleStatus} <> 'redacted' AND ${table.redactedAt} IS NULL)`
    ),
    check(
      "customer_deleted_at_check",
      sql`${table.deletedAt} IS NULL OR ${table.deletedAt} >= ${table.createdAt}`
    ),
    check(
      "customer_redacted_at_check",
      sql`${table.redactedAt} IS NULL OR ${table.redactedAt} >= ${table.createdAt}`
    ),
    uniqueIndex("customer_store_principal_unique")
      .on(table.storeId, table.iamPrincipalId)
      .where(sql`${table.iamPrincipalId} IS NOT NULL`),
    uniqueIndex("customer_store_email_unique")
      .on(table.storeId, table.normalizedEmail)
      .where(
        sql`${table.normalizedEmail} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),
    index("customer_store_status_created_idx").on(
      table.storeId,
      table.lifecycleStatus,
      table.createdAt.desc(),
      table.id
    ),
    index("customer_store_account_status_idx")
      .on(table.storeId, table.accountStatus, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_store_name_idx")
      .on(
        table.storeId,
        sql`lower(${table.lastName})`,
        sql`lower(${table.firstName})`,
        table.id
      )
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_store_phone_idx")
      .on(table.storeId, table.phoneE164)
      .where(sql`${table.phoneE164} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    index("customer_store_activity_idx")
      .on(table.storeId, table.lastActivityAt.desc(), table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_merge_target_idx")
      .on(table.mergedIntoCustomerId)
      .where(sql`${table.mergedIntoCustomerId} IS NOT NULL`),
  ]
);

export type Customer = typeof customer.$inferSelect;
export type NewCustomer = typeof customer.$inferInsert;
