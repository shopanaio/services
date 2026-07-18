import {
  text,
  boolean,
  check,
  timestamp,
  index,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { application } from "./authorization.js";
import { iamSchema } from "./schema.js";

// ============================================================================
// User table
// ============================================================================

export const user = iamSchema.table(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    // Site admin flag - bypasses all tenant RBAC (like GitLab's admin field)
    admin: boolean("admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_email").on(table.email),
    index("idx_user_created_at").on(table.createdAt),
  ]
);

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

// ============================================================================
// Session table
// ============================================================================

export type AuthScope = "platform" | "application";

export const session = iamSchema.table(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    authScope: varchar("scope", { length: 16 })
      .$type<AuthScope>()
      .notNull()
      .default("platform"),
    applicationId: uuid("application_id").references(() => application.id, {
      onDelete: "cascade",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_session_user_id").on(table.userId),
    index("idx_session_application").on(table.applicationId),
    index("idx_session_scope_application").on(
      table.authScope,
      table.applicationId
    ),
    uniqueIndex("idx_session_token").on(table.token),
    index("idx_session_expires_at").on(table.expiresAt),
    check(
      "chk_session_auth_scope_application",
      sql`(${table.authScope} = 'platform' AND ${table.applicationId} IS NULL) OR (${table.authScope} = 'application' AND ${table.applicationId} IS NOT NULL)`
    ),
  ]
);

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

// ============================================================================
// Account table (for OAuth and credential providers)
// ============================================================================

export const account = iamSchema.table(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(), // "credential", "google", "github", etc.
    authScope: varchar("auth_scope", { length: 16 })
      .$type<AuthScope>()
      .notNull()
      .default("platform"),
    applicationId: uuid("application_id").references(() => application.id, {
      onDelete: "cascade",
    }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"), // Hashed password for credential provider
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_account_user_id").on(table.userId),
    index("idx_account_scope_application_user").on(
      table.authScope,
      table.applicationId,
      table.userId
    ),
    uniqueIndex("idx_account_platform_provider")
      .on(table.providerId, table.accountId)
      .where(sql`${table.authScope} = 'platform'`),
    uniqueIndex("idx_account_application_provider")
      .on(table.applicationId, table.providerId, table.accountId)
      .where(sql`${table.authScope} = 'application'`),
    check(
      "chk_account_auth_scope_application",
      sql`(${table.authScope} = 'platform' AND ${table.applicationId} IS NULL) OR (${table.authScope} = 'application' AND ${table.applicationId} IS NOT NULL)`
    ),
  ]
);

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

// ============================================================================
// Verification table (email verification, password reset)
// ============================================================================

export const verification = iamSchema.table(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(), // email or other identifier
    value: text("value").notNull(), // verification code/token
    authScope: varchar("auth_scope", { length: 16 })
      .$type<AuthScope>()
      .notNull()
      .default("platform"),
    applicationId: uuid("application_id").references(() => application.id, {
      onDelete: "cascade",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_verification_identifier").on(table.identifier),
    index("idx_verification_scope_application_identifier").on(
      table.authScope,
      table.applicationId,
      table.identifier
    ),
    index("idx_verification_expires_at").on(table.expiresAt),
    check(
      "chk_verification_auth_scope_application",
      sql`(${table.authScope} = 'platform' AND ${table.applicationId} IS NULL) OR (${table.authScope} = 'application' AND ${table.applicationId} IS NOT NULL)`
    ),
  ]
);

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

// ============================================================================
// JWKS table (for JWT plugin key storage)
// ============================================================================

export const jwks = iamSchema.table(
  "jwks",
  {
    id: text("id").primaryKey(),
    publicKey: text("public_key").notNull(),
    privateKey: text("private_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  }
);

export type Jwks = typeof jwks.$inferSelect;
export type NewJwks = typeof jwks.$inferInsert;
