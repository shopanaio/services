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
    iamPrincipalStatus: varchar("iam_principal_status", { length: 16 }).$type<
      "active" | "blocked"
    >(),
    iamLifecycleDisabled: boolean("iam_lifecycle_disabled")
      .notNull()
      .default(false),
    lifecycleStatus: customerLifecycleStatusEnum("lifecycle_status")
      .notNull()
      .default("ACTIVE"),
    accountStatus: customerAccountStatusEnum("account_status")
      .notNull()
      .default("GUEST"),
    email: varchar("email", { length: 320 }),
    normalizedEmail: varchar("normalized_email", { length: 320 }),
    emailDomainNormalized: varchar("email_domain_normalized", { length: 255 }),
    emailVerified: boolean("email_verified").notNull().default(false),
    phoneE164: varchar("phone_e164", { length: 32 }),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    prefix: varchar("prefix", { length: 32 }),
    firstName: varchar("first_name", { length: 128 }),
    middleName: varchar("middle_name", { length: 128 }),
    lastName: varchar("last_name", { length: 128 }),
    suffix: varchar("suffix", { length: 32 }),
    preferredLocale: varchar("preferred_locale", { length: 35 }),
    preferredLocaleNormalized: varchar("preferred_locale_normalized", { length: 35 }),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    birthdayMonthDay: varchar("birthday_month_day", { length: 4 }),
    gender: varchar("gender", { length: 32 }),
    companyName: varchar("company_name", { length: 255 }),
    companyNameNormalized: varchar("company_name_normalized", { length: 255 }),
    jobTitle: varchar("job_title", { length: 255 }),
    note: text("note"),
    blockedReason: text("blocked_reason"),
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
      "customer_iam_principal_status_check",
      sql`(${table.iamPrincipalId} IS NULL AND ${table.iamPrincipalStatus} IS NULL)
        OR (${table.iamPrincipalId} IS NOT NULL
          AND ${table.iamPrincipalStatus} IN ('active', 'blocked'))`
    ),
    check(
      "customer_iam_lifecycle_disabled_check",
      sql`NOT ${table.iamLifecycleDisabled}
        OR (${table.iamPrincipalId} IS NOT NULL
          AND ${table.iamPrincipalStatus} = 'blocked'
          AND ${table.lifecycleStatus} = 'DISABLED')`
    ),
    check(
      "customer_email_projection_check",
      sql`(${table.email} IS NULL) = (${table.normalizedEmail} IS NULL)
        AND (${table.email} IS NULL) = (${table.emailDomainNormalized} IS NULL)`
    ),
    check(
      "customer_birthday_month_day_check",
      sql`(${table.dateOfBirth} IS NULL AND ${table.birthdayMonthDay} IS NULL)
        OR (${table.dateOfBirth} IS NOT NULL AND ${table.birthdayMonthDay} ~ '^(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$')`
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
      "customer_blocked_reason_check",
      sql`(${table.lifecycleStatus} <> 'BLOCKED' AND ${table.blockedReason} IS NULL)
        OR (${table.lifecycleStatus} = 'BLOCKED'
          AND ${table.blockedReason} IS NOT NULL
          AND length(btrim(${table.blockedReason})) > 0)`
    ),
    check(
      "customer_moderation_note_check",
      sql`${table.moderationNote} IS NULL OR length(btrim(${table.moderationNote})) > 0`
    ),
    check(
      "customer_merge_target_check",
      sql`(${table.lifecycleStatus} = 'MERGED' AND ${table.mergedIntoCustomerId} IS NOT NULL)
        OR (${table.lifecycleStatus} <> 'MERGED' AND ${table.mergedIntoCustomerId} IS NULL)`
    ),
    check(
      "customer_not_merged_into_self_check",
      sql`${table.mergedIntoCustomerId} IS NULL OR ${table.mergedIntoCustomerId} <> ${table.id}`
    ),
    check(
      "customer_redaction_timestamp_check",
      sql`(${table.lifecycleStatus} = 'REDACTED' AND ${table.redactedAt} IS NOT NULL)
        OR (${table.lifecycleStatus} <> 'REDACTED' AND ${table.redactedAt} IS NULL)`
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
    uniqueIndex("customer_store_id_unique").on(table.storeId, table.id),
    index("customer_store_root_scan_idx")
      .on(table.storeId, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_store_email_domain_idx")
      .on(table.storeId, table.emailDomainNormalized, table.id)
      .where(sql`${table.deletedAt} IS NULL AND ${table.emailDomainNormalized} IS NOT NULL`),
    index("customer_store_locale_idx")
      .on(table.storeId, table.preferredLocaleNormalized, table.id)
      .where(sql`${table.deletedAt} IS NULL AND ${table.preferredLocaleNormalized} IS NOT NULL`),
    index("customer_store_company_idx")
      .on(table.storeId, table.companyNameNormalized, table.id)
      .where(sql`${table.deletedAt} IS NULL AND ${table.companyNameNormalized} IS NOT NULL`),
    index("customer_store_source_idx")
      .on(table.storeId, table.source, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_store_created_idx")
      .on(table.storeId, table.createdAt, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_store_updated_idx")
      .on(table.storeId, table.updatedAt, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_store_birth_date_idx")
      .on(table.storeId, table.dateOfBirth, table.id)
      .where(sql`${table.deletedAt} IS NULL AND ${table.dateOfBirth} IS NOT NULL`),
    index("customer_store_birthday_idx")
      .on(table.storeId, table.birthdayMonthDay, table.id)
      .where(sql`${table.deletedAt} IS NULL AND ${table.birthdayMonthDay} IS NOT NULL`),
    index("customer_store_email_verified_idx")
      .on(table.storeId, table.emailVerified, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_store_phone_verified_idx")
      .on(table.storeId, table.phoneVerified, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_store_status_created_idx").on(
      table.storeId,
      table.lifecycleStatus,
      table.createdAt.desc(),
      table.id
    ),
    index("customer_store_lifecycle_status_idx")
      .on(table.storeId, table.lifecycleStatus, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
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
