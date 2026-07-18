import {
  boolean,
  foreignKey,
  index,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { application } from "./authorization.js";
import { iamSchema } from "./schema.js";

// ============================================================================
// Application user table
// Better Auth user model scoped to a single IAM application.
// ============================================================================

export const applicationUser = iamSchema.table(
  "application_user",
  {
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("application_user_application_id_id_unique").on(
      table.applicationId,
      table.id
    ),
    uniqueIndex("application_user_application_email_unique").on(
      table.applicationId,
      table.normalizedEmail
    ),
    index("application_user_application_created_idx").on(
      table.applicationId,
      table.createdAt
    ),
  ]
);

export type ApplicationUser = typeof applicationUser.$inferSelect;
export type NewApplicationUser = typeof applicationUser.$inferInsert;

// ============================================================================
// Application account table
// Better Auth credential and OAuth account model.
// ============================================================================

export const applicationAccount = iamSchema.table(
  "application_account",
  {
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "application_account_application_user_fk",
      columns: [table.applicationId, table.userId],
      foreignColumns: [applicationUser.applicationId, applicationUser.id],
    }).onDelete("cascade"),
    uniqueIndex("application_account_provider_unique").on(
      table.applicationId,
      table.providerId,
      table.accountId
    ),
    index("application_account_application_user_idx").on(
      table.applicationId,
      table.userId
    ),
  ]
);

export type ApplicationAccount = typeof applicationAccount.$inferSelect;
export type NewApplicationAccount = typeof applicationAccount.$inferInsert;

// ============================================================================
// Application session table
// Better Auth session model. Tokens are isolated by application.
// ============================================================================

export const applicationSession = iamSchema.table(
  "application_session",
  {
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "application_session_application_user_fk",
      columns: [table.applicationId, table.userId],
      foreignColumns: [applicationUser.applicationId, applicationUser.id],
    }).onDelete("cascade"),
    uniqueIndex("application_session_token_unique").on(
      table.applicationId,
      table.token
    ),
    index("application_session_application_user_idx").on(
      table.applicationId,
      table.userId
    ),
    index("application_session_application_expires_idx").on(
      table.applicationId,
      table.expiresAt
    ),
  ]
);

export type ApplicationSession = typeof applicationSession.$inferSelect;
export type NewApplicationSession = typeof applicationSession.$inferInsert;

// ============================================================================
// Application verification table
// Better Auth email verification and password reset model.
// ============================================================================

export const applicationVerification = iamSchema.table(
  "application_verification",
  {
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("application_verification_identifier_idx").on(
      table.applicationId,
      table.identifier
    ),
    index("application_verification_expires_idx").on(
      table.applicationId,
      table.expiresAt
    ),
  ]
);

export type ApplicationVerification =
  typeof applicationVerification.$inferSelect;
export type NewApplicationVerification =
  typeof applicationVerification.$inferInsert;

// ============================================================================
// Application JWKS table
// Better Auth JWT signing keys scoped to an application.
// ============================================================================

export const applicationJwks = iamSchema.table(
  "application_jwks",
  {
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    publicKey: text("public_key").notNull(),
    privateKey: text("private_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("application_jwks_application_created_idx").on(
      table.applicationId,
      table.createdAt
    ),
  ]
);

export type ApplicationJwks = typeof applicationJwks.$inferSelect;
export type NewApplicationJwks = typeof applicationJwks.$inferInsert;
