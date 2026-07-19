import {
  boolean,
  foreignKey,
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { application } from "./authorization.js";
import { user } from "./auth.js";
import { iamSchema } from "./schema.js";

export type ApplicationUserStatus = "active" | "blocked";

/**
 * Authentication identity owned by exactly one IAM application.
 * Linking to a platform user is optional and must be performed explicitly
 * after proving ownership of both identities.
 */
export const applicationUser = iamSchema.table(
  "application_user",
  {
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    globalUserId: text("global_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    status: varchar("status", { length: 16 })
      .$type<ApplicationUserStatus>()
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_application_user_application_id").on(
      table.applicationId,
      table.id
    ),
    uniqueIndex("idx_application_user_application_email").on(
      table.applicationId,
      table.email
    ),
    uniqueIndex("idx_application_user_application_global_user").on(
      table.applicationId,
      table.globalUserId
    ),
    index("idx_application_user_application_status").on(
      table.applicationId,
      table.status
    ),
  ]
);

export type ApplicationUser = typeof applicationUser.$inferSelect;
export type NewApplicationUser = typeof applicationUser.$inferInsert;

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
    uniqueIndex("idx_application_session_application_id").on(
      table.applicationId,
      table.id
    ),
    uniqueIndex("idx_application_session_application_token").on(
      table.applicationId,
      table.token
    ),
    index("idx_application_session_application_user").on(
      table.applicationId,
      table.userId
    ),
    index("idx_application_session_expires_at").on(table.expiresAt),
    foreignKey({
      name: "application_session_application_user_fk",
      columns: [table.applicationId, table.userId],
      foreignColumns: [applicationUser.applicationId, applicationUser.id],
    }).onDelete("cascade"),
  ]
);

export type ApplicationSession = typeof applicationSession.$inferSelect;
export type NewApplicationSession = typeof applicationSession.$inferInsert;

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
    uniqueIndex("idx_application_account_application_id").on(
      table.applicationId,
      table.id
    ),
    uniqueIndex("idx_application_account_provider").on(
      table.applicationId,
      table.providerId,
      table.accountId
    ),
    index("idx_application_account_application_user").on(
      table.applicationId,
      table.userId
    ),
    foreignKey({
      name: "application_account_application_user_fk",
      columns: [table.applicationId, table.userId],
      foreignColumns: [applicationUser.applicationId, applicationUser.id],
    }).onDelete("cascade"),
  ]
);

export type ApplicationAccount = typeof applicationAccount.$inferSelect;
export type NewApplicationAccount = typeof applicationAccount.$inferInsert;

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
    uniqueIndex("idx_application_verification_application_id").on(
      table.applicationId,
      table.id
    ),
    index("idx_application_verification_identifier").on(
      table.applicationId,
      table.identifier
    ),
    index("idx_application_verification_expires_at").on(table.expiresAt),
  ]
);

export type ApplicationVerification =
  typeof applicationVerification.$inferSelect;
export type NewApplicationVerification =
  typeof applicationVerification.$inferInsert;

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
    uniqueIndex("idx_application_jwks_application_id").on(
      table.applicationId,
      table.id
    ),
    index("idx_application_jwks_application_created").on(
      table.applicationId,
      table.createdAt
    ),
  ]
);

export type ApplicationJwks = typeof applicationJwks.$inferSelect;
export type NewApplicationJwks = typeof applicationJwks.$inferInsert;
