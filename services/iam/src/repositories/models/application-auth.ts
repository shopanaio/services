import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { application } from "./authorization.js";
import { user } from "./auth.js";
import { iamSchema } from "./schema.js";

export type ApplicationUserStatus = "active" | "blocked";
export type ApplicationRegistrationMode = "open" | "disabled";
export type ApplicationConsentMode = "explicit";
export type ApplicationOAuthClientEnvironment = "development" | "production";
export type ApplicationAuthorizationStep = "login" | "consent";

export interface ApplicationAuthBranding {
  displayName?: string;
  headline?: string;
  logoUrl?: string;
  primaryColor?: string;
  backgroundColor?: string;
}

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
    privateKeyKeyVersion: integer("private_key_key_version").notNull(),
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
    check(
      "application_jwks_private_key_ciphertext_check",
      sql`${table.privateKey} LIKE 'iam-auth-keyring.v1.%' AND split_part(${table.privateKey}, '.', 3) = ${table.privateKeyKeyVersion}::text`
    ),
    check(
      "application_jwks_private_key_version_check",
      sql`${table.privateKeyKeyVersion} > 0`
    ),
  ]
);

export type ApplicationJwks = typeof applicationJwks.$inferSelect;
export type NewApplicationJwks = typeof applicationJwks.$inferInsert;

/**
 * Server-owned application realm configuration. The resource is derived from
 * applicationId and is deliberately absent from every mutable repository DTO.
 */
export const applicationAuthConfiguration = iamSchema.table(
  "application_auth_configuration",
  {
    applicationId: uuid("application_id")
      .primaryKey()
      .references(() => application.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull().default(1),
    realmEnabled: boolean("realm_enabled").notNull().default(false),
    resource: text("resource").notNull(),
    registrationMode: varchar("registration_mode", { length: 16 })
      .$type<ApplicationRegistrationMode>()
      .notNull()
      .default("disabled"),
    passwordSignUpEnabled: boolean("password_sign_up_enabled")
      .notNull()
      .default(false),
    passwordSignInEnabled: boolean("password_sign_in_enabled")
      .notNull()
      .default(false),
    passwordResetEnabled: boolean("password_reset_enabled")
      .notNull()
      .default(false),
    emailVerificationRequired: boolean("email_verification_required")
      .notNull()
      .default(true),
    emailOtpSignInEnabled: boolean("email_otp_sign_in_enabled")
      .notNull()
      .default(false),
    emailOtpSignUpEnabled: boolean("email_otp_sign_up_enabled")
      .notNull()
      .default(false),
    consentMode: varchar("consent_mode", { length: 16 })
      .$type<ApplicationConsentMode>()
      .notNull()
      .default("explicit"),
    accessTokenTtlSeconds: integer("access_token_ttl_seconds")
      .notNull()
      .default(15 * 60),
    idTokenTtlSeconds: integer("id_token_ttl_seconds")
      .notNull()
      .default(60 * 60),
    refreshTokenTtlSeconds: integer("refresh_token_ttl_seconds")
      .notNull()
      .default(30 * 24 * 60 * 60),
    sessionTtlSeconds: integer("session_ttl_seconds")
      .notNull()
      .default(30 * 24 * 60 * 60),
    secretKeyVersion: integer("secret_key_version").notNull(),
    brandingJson: jsonb("branding_json")
      .$type<ApplicationAuthBranding>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    defaultLocale: varchar("default_locale", { length: 35 })
      .notNull()
      .default("en"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_application_auth_configuration_resource").on(
      table.resource
    ),
    uniqueIndex("idx_application_auth_configuration_application_resource").on(
      table.applicationId,
      table.resource
    ),
    index("idx_application_auth_configuration_active").on(
      table.realmEnabled,
      table.applicationId
    ),
    check(
      "application_auth_configuration_resource_check",
      sql`${table.resource} = 'urn:shopana:application:' || ${table.applicationId}::text`
    ),
    check(
      "application_auth_configuration_revision_check",
      sql`${table.revision} > 0`
    ),
    check(
      "application_auth_configuration_registration_mode_check",
      sql`${table.registrationMode} IN ('open', 'disabled')`
    ),
    check(
      "application_auth_configuration_consent_mode_check",
      sql`${table.consentMode} = 'explicit'`
    ),
    check(
      "application_auth_configuration_otp_flags_check",
      sql`NOT ${table.emailOtpSignUpEnabled} OR ${table.emailOtpSignInEnabled}`
    ),
    check(
      "application_auth_configuration_access_ttl_check",
      sql`${table.accessTokenTtlSeconds} BETWEEN 300 AND 1800`
    ),
    check(
      "application_auth_configuration_id_ttl_check",
      sql`${table.idTokenTtlSeconds} BETWEEN 300 AND 3600`
    ),
    check(
      "application_auth_configuration_refresh_ttl_check",
      sql`${table.refreshTokenTtlSeconds} BETWEEN 86400 AND 2592000`
    ),
    check(
      "application_auth_configuration_session_ttl_check",
      sql`${table.sessionTtlSeconds} BETWEEN 86400 AND 2592000`
    ),
    check(
      "application_auth_configuration_secret_version_check",
      sql`${table.secretKeyVersion} > 0`
    ),
    check(
      "application_auth_configuration_branding_check",
      sql`jsonb_typeof(${table.brandingJson}) = 'object'`
    ),
  ]
);

export type ApplicationAuthConfigurationRecord =
  typeof applicationAuthConfiguration.$inferSelect;
export type NewApplicationAuthConfigurationRecord =
  typeof applicationAuthConfiguration.$inferInsert;

export const applicationAuthOrigin = iamSchema.table(
  "application_auth_origin",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    origin: text("origin").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_application_auth_origin_application_origin").on(
      table.applicationId,
      table.origin
    ),
    index("idx_application_auth_origin_application").on(table.applicationId),
    check(
      "application_auth_origin_normalized_check",
      sql`${table.origin} ~ '^https://[^/?#@]+$' OR ${table.origin} ~ '^http://(localhost|127\\.0\\.0\\.1|\\[::1\\])(:[0-9]{1,5})?$'`
    ),
  ]
);

export type ApplicationAuthOrigin = typeof applicationAuthOrigin.$inferSelect;
export type NewApplicationAuthOrigin =
  typeof applicationAuthOrigin.$inferInsert;

export const applicationAuthProvider = iamSchema.table(
  "application_auth_provider",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 64 }).notNull(),
    enabled: boolean("enabled").notNull().default(false),
    encryptedClientId: text("encrypted_client_id").notNull(),
    encryptedClientSecret: text("encrypted_client_secret").notNull(),
    secretKeyVersion: integer("secret_key_version").notNull(),
    scopesJson: jsonb("scopes_json")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("idx_application_auth_provider_application_provider").on(
      table.applicationId,
      table.provider
    ),
    index("idx_application_auth_provider_application_enabled").on(
      table.applicationId,
      table.enabled
    ),
    check(
      "application_auth_provider_name_check",
      sql`${table.provider} ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'`
    ),
    check(
      "application_auth_provider_ciphertext_check",
      sql`${table.encryptedClientId} LIKE 'iam-auth-keyring.v1.%' AND ${table.encryptedClientSecret} LIKE 'iam-auth-keyring.v1.%'`
    ),
    check(
      "application_auth_provider_secret_version_check",
      sql`${table.secretKeyVersion} > 0 AND split_part(${table.encryptedClientId}, '.', 3) = ${table.secretKeyVersion}::text AND split_part(${table.encryptedClientSecret}, '.', 3) = ${table.secretKeyVersion}::text`
    ),
    check(
      "application_auth_provider_scopes_check",
      sql`jsonb_typeof(${table.scopesJson}) = 'array'`
    ),
  ]
);

export type ApplicationAuthProvider =
  typeof applicationAuthProvider.$inferSelect;
export type NewApplicationAuthProvider =
  typeof applicationAuthProvider.$inferInsert;

export const applicationAuthDeliveryProfile = iamSchema.table(
  "application_auth_delivery_profile",
  {
    applicationId: uuid("application_id")
      .primaryKey()
      .references(() => application.id, { onDelete: "cascade" }),
    transportProfile: varchar("transport_profile", { length: 128 }).notNull(),
    senderIdentity: varchar("sender_identity", { length: 320 }).notNull(),
    emailVerificationTemplateId: varchar("email_verification_template_id", {
      length: 128,
    }).notNull(),
    passwordResetTemplateId: varchar("password_reset_template_id", {
      length: 128,
    }).notNull(),
    emailOtpSignInTemplateId: varchar("email_otp_sign_in_template_id", {
      length: 128,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    check(
      "application_auth_delivery_templates_distinct_check",
      sql`${table.emailVerificationTemplateId} <> ${table.passwordResetTemplateId} AND ${table.emailVerificationTemplateId} <> ${table.emailOtpSignInTemplateId} AND ${table.passwordResetTemplateId} <> ${table.emailOtpSignInTemplateId}`
    ),
  ]
);

export type ApplicationAuthDeliveryProfile =
  typeof applicationAuthDeliveryProfile.$inferSelect;
export type NewApplicationAuthDeliveryProfile =
  typeof applicationAuthDeliveryProfile.$inferInsert;

/**
 * Durable append-only administrative audit log.
 *
 * Organization/application columns deliberately have no foreign keys: a
 * failure record must survive a rolled-back create and the later archival or
 * deletion of its target. The service admits only its closed versioned audit
 * contract into safeDiffJson.
 */
export const applicationAuthAdminAudit = iamSchema.table(
  "application_auth_admin_audit",
  {
    recordId: uuid("record_id").primaryKey(),
    schemaVersion: integer("schema_version").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    outcome: varchar("outcome", { length: 16 }).notNull(),
    reasonCategory: varchar("reason_category", { length: 64 }).notNull(),
    actorType: varchar("actor_type", { length: 32 }).notNull(),
    actorId: text("actor_id"),
    organizationId: uuid("organization_id"),
    applicationId: uuid("application_id"),
    targetType: varchar("target_type", { length: 64 }).notNull(),
    targetId: text("target_id"),
    requestId: varchar("request_id", { length: 256 }).notNull(),
    safeDiffJson: jsonb("safe_diff_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [
    index("idx_application_auth_admin_audit_org_occurred").on(
      table.organizationId,
      table.occurredAt
    ),
    index("idx_application_auth_admin_audit_application_occurred").on(
      table.applicationId,
      table.occurredAt
    ),
    index("idx_application_auth_admin_audit_request").on(table.requestId),
    check(
      "application_auth_admin_audit_schema_check",
      sql`${table.schemaVersion} = 1 AND ${table.category} IN ('application_auth_admin', 'iam_resource_admin')`
    ),
    check(
      "application_auth_admin_audit_outcome_check",
      sql`${table.outcome} IN ('success', 'failure')`
    ),
    check(
      "application_auth_admin_audit_actor_check",
      sql`(${table.actorType} IN ('platform_admin', 'external_service') AND ${table.actorId} IS NOT NULL) OR (${table.actorType} = 'anonymous' AND ${table.actorId} IS NULL)`
    ),
    check(
      "application_auth_admin_audit_safe_diff_check",
      sql`jsonb_typeof(${table.safeDiffJson}) = 'object'`
    ),
  ]
);

export type ApplicationAuthAdminAuditRecord =
  typeof applicationAuthAdminAudit.$inferSelect;
export type NewApplicationAuthAdminAuditRecord =
  typeof applicationAuthAdminAudit.$inferInsert;

/** OAuth Provider 1.6.23 compatible client model plus IAM-owned policy fields. */
export const applicationOauthClient = iamSchema.table(
  "application_oauth_client",
  {
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    clientSecret: text("client_secret"),
    disabled: boolean("disabled").notNull().default(false),
    skipConsent: boolean("skip_consent").notNull().default(false),
    enableEndSession: boolean("enable_end_session").notNull().default(true),
    subjectType: text("subject_type"),
    scopes: text("scopes").array(),
    userId: text("user_id").references(() => applicationUser.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    name: text("name"),
    uri: text("uri"),
    icon: text("icon"),
    contacts: text("contacts").array(),
    tos: text("tos"),
    policy: text("policy"),
    softwareId: text("software_id"),
    softwareVersion: text("software_version"),
    softwareStatement: text("software_statement"),
    redirectUris: text("redirect_uris").array().notNull(),
    postLogoutRedirectUris: text("post_logout_redirect_uris").array(),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull(),
    grantTypes: text("grant_types")
      .array()
      .notNull()
      .default(sql`ARRAY['authorization_code', 'refresh_token']::text[]`),
    responseTypes: text("response_types")
      .array()
      .notNull()
      .default(sql`ARRAY['code']::text[]`),
    public: boolean("public").notNull(),
    type: text("type"),
    requirePKCE: boolean("require_pkce").notNull().default(true),
    referenceId: text("reference_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    resourceAudience: text("resource_audience").notNull(),
    protocolPolicyVersion: integer("protocol_policy_version")
      .notNull()
      .default(1),
    environment: varchar("environment", { length: 16 })
      .$type<ApplicationOAuthClientEnvironment>()
      .notNull(),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    revision: integer("revision").notNull().default(1),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    uniqueIndex("idx_application_oauth_client_client_id").on(table.clientId),
    uniqueIndex("idx_application_oauth_client_application_client_id").on(
      table.applicationId,
      table.clientId
    ),
    uniqueIndex("idx_application_oauth_client_application_id").on(
      table.applicationId,
      table.id
    ),
    index("idx_application_oauth_client_application_state").on(
      table.applicationId,
      table.disabled,
      table.deletedAt
    ),
    index("idx_application_oauth_client_application_user").on(
      table.applicationId,
      table.userId
    ),
    foreignKey({
      name: "application_oauth_client_application_user_fk",
      columns: [table.applicationId, table.userId],
      foreignColumns: [applicationUser.applicationId, applicationUser.id],
    }),
    foreignKey({
      name: "application_oauth_client_resource_fk",
      columns: [table.applicationId, table.resourceAudience],
      foreignColumns: [
        applicationAuthConfiguration.applicationId,
        applicationAuthConfiguration.resource,
      ],
    }).onDelete("cascade"),
    check(
      "application_oauth_client_environment_check",
      sql`${table.environment} IN ('development', 'production')`
    ),
    check(
      "application_oauth_client_protocol_policy_check",
      sql`${table.protocolPolicyVersion} = 1 AND ${table.grantTypes} = ARRAY['authorization_code', 'refresh_token']::text[] AND ${table.responseTypes} = ARRAY['code']::text[] AND ${table.requirePKCE}`
    ),
    check(
      "application_oauth_client_auth_method_check",
      sql`${table.tokenEndpointAuthMethod} IN ('none', 'client_secret_basic', 'client_secret_post')`
    ),
    check(
      "application_oauth_client_secret_policy_check",
      sql`(${table.public} AND ${table.clientSecret} IS NULL AND ${table.tokenEndpointAuthMethod} = 'none') OR (NOT ${table.public} AND ${table.clientSecret} IS NOT NULL AND ${table.tokenEndpointAuthMethod} IN ('client_secret_basic', 'client_secret_post'))`
    ),
    check(
      "application_oauth_client_revision_check",
      sql`${table.revision} > 0`
    ),
  ]
);

export type ApplicationOauthClient =
  typeof applicationOauthClient.$inferSelect;
export type NewApplicationOauthClient =
  typeof applicationOauthClient.$inferInsert;

export const applicationOauthRefreshToken = iamSchema.table(
  "application_oauth_refresh_token",
  {
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    clientId: text("client_id").notNull(),
    sessionId: text("session_id").references(() => applicationSession.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").notNull(),
    referenceId: text("reference_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revoked: timestamp("revoked", { withTimezone: true }),
    authTime: timestamp("auth_time", { withTimezone: true }),
    scopes: text("scopes").array().notNull(),
  },
  (table) => [
    uniqueIndex("idx_application_oauth_refresh_token_token").on(table.token),
    uniqueIndex("idx_application_oauth_refresh_token_application_id").on(
      table.applicationId,
      table.id
    ),
    index("idx_application_oauth_refresh_token_application_client").on(
      table.applicationId,
      table.clientId
    ),
    index("idx_application_oauth_refresh_token_application_user").on(
      table.applicationId,
      table.userId
    ),
    index("idx_application_oauth_refresh_token_expires").on(
      table.applicationId,
      table.expiresAt
    ),
    foreignKey({
      name: "application_oauth_refresh_token_client_fk",
      columns: [table.applicationId, table.clientId],
      foreignColumns: [
        applicationOauthClient.applicationId,
        applicationOauthClient.clientId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "application_oauth_refresh_token_session_scope_fk",
      columns: [table.applicationId, table.sessionId],
      foreignColumns: [
        applicationSession.applicationId,
        applicationSession.id,
      ],
    }),
    foreignKey({
      name: "application_oauth_refresh_token_user_fk",
      columns: [table.applicationId, table.userId],
      foreignColumns: [applicationUser.applicationId, applicationUser.id],
    }).onDelete("cascade"),
  ]
);

export type ApplicationOauthRefreshToken =
  typeof applicationOauthRefreshToken.$inferSelect;
export type NewApplicationOauthRefreshToken =
  typeof applicationOauthRefreshToken.$inferInsert;

export const applicationOauthAccessToken = iamSchema.table(
  "application_oauth_access_token",
  {
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    token: text("token"),
    clientId: text("client_id").notNull(),
    sessionId: text("session_id").references(() => applicationSession.id, {
      onDelete: "set null",
    }),
    userId: text("user_id"),
    referenceId: text("reference_id"),
    refreshId: text("refresh_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    scopes: text("scopes").array().notNull(),
  },
  (table) => [
    uniqueIndex("idx_application_oauth_access_token_token").on(table.token),
    index("idx_application_oauth_access_token_application_client").on(
      table.applicationId,
      table.clientId
    ),
    index("idx_application_oauth_access_token_application_user").on(
      table.applicationId,
      table.userId
    ),
    index("idx_application_oauth_access_token_application_refresh").on(
      table.applicationId,
      table.refreshId
    ),
    index("idx_application_oauth_access_token_expires").on(
      table.applicationId,
      table.expiresAt
    ),
    foreignKey({
      name: "application_oauth_access_token_client_fk",
      columns: [table.applicationId, table.clientId],
      foreignColumns: [
        applicationOauthClient.applicationId,
        applicationOauthClient.clientId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "application_oauth_access_token_session_scope_fk",
      columns: [table.applicationId, table.sessionId],
      foreignColumns: [
        applicationSession.applicationId,
        applicationSession.id,
      ],
    }),
    foreignKey({
      name: "application_oauth_access_token_user_fk",
      columns: [table.applicationId, table.userId],
      foreignColumns: [applicationUser.applicationId, applicationUser.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "application_oauth_access_token_refresh_fk",
      columns: [table.applicationId, table.refreshId],
      foreignColumns: [
        applicationOauthRefreshToken.applicationId,
        applicationOauthRefreshToken.id,
      ],
    }).onDelete("cascade"),
  ]
);

export type ApplicationOauthAccessToken =
  typeof applicationOauthAccessToken.$inferSelect;
export type NewApplicationOauthAccessToken =
  typeof applicationOauthAccessToken.$inferInsert;

export const applicationOauthConsent = iamSchema.table(
  "application_oauth_consent",
  {
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    userId: text("user_id"),
    referenceId: text("reference_id"),
    scopes: text("scopes").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_application_oauth_consent_application_id").on(
      table.applicationId,
      table.id
    ),
    index("idx_application_oauth_consent_application_client").on(
      table.applicationId,
      table.clientId
    ),
    index("idx_application_oauth_consent_application_user").on(
      table.applicationId,
      table.userId
    ),
    foreignKey({
      name: "application_oauth_consent_client_fk",
      columns: [table.applicationId, table.clientId],
      foreignColumns: [
        applicationOauthClient.applicationId,
        applicationOauthClient.clientId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "application_oauth_consent_user_fk",
      columns: [table.applicationId, table.userId],
      foreignColumns: [applicationUser.applicationId, applicationUser.id],
    }).onDelete("cascade"),
  ]
);

export type ApplicationOauthConsent =
  typeof applicationOauthConsent.$inferSelect;
export type NewApplicationOauthConsent =
  typeof applicationOauthConsent.$inferInsert;

export const applicationAuthorizationContext = iamSchema.table(
  "application_authorization_context",
  {
    /** SHA-256 hash of the browser-held 256-bit opaque context id. */
    id: text("id").primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    redirectUriHash: text("redirect_uri_hash").notNull(),
    postLoginReturnPathHash: text("post_login_return_path_hash").notNull(),
    state: text("state").notNull(),
    nonce: text("nonce").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: varchar("code_challenge_method", { length: 8 })
      .notNull()
      .default("S256"),
    scopes: text("scopes").array().notNull(),
    resource: text("resource").notNull(),
    currentStep: varchar("current_step", { length: 16 })
      .$type<ApplicationAuthorizationStep>()
      .notNull()
      .default("login"),
    sessionId: text("session_id").references(() => applicationSession.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '10 minutes'`),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_application_authorization_context_application_client").on(
      table.applicationId,
      table.clientId
    ),
    index("idx_application_authorization_context_cleanup").on(
      table.expiresAt,
      table.consumedAt
    ),
    foreignKey({
      name: "application_authorization_context_client_fk",
      columns: [table.applicationId, table.clientId],
      foreignColumns: [
        applicationOauthClient.applicationId,
        applicationOauthClient.clientId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "application_authorization_context_session_scope_fk",
      columns: [table.applicationId, table.sessionId],
      foreignColumns: [
        applicationSession.applicationId,
        applicationSession.id,
      ],
    }),
    foreignKey({
      name: "application_authorization_context_resource_fk",
      columns: [table.applicationId, table.resource],
      foreignColumns: [
        applicationAuthConfiguration.applicationId,
        applicationAuthConfiguration.resource,
      ],
    }).onDelete("cascade"),
    check(
      "application_authorization_context_pkce_check",
      sql`${table.codeChallengeMethod} = 'S256'`
    ),
    check(
      "application_authorization_context_step_check",
      sql`${table.currentStep} IN ('login', 'consent')`
    ),
    check(
      "application_authorization_context_ttl_check",
      sql`${table.expiresAt} = ${table.createdAt} + interval '10 minutes'`
    ),
    check(
      "application_authorization_context_scopes_check",
      sql`cardinality(${table.scopes}) > 0`
    ),
  ]
);

export type ApplicationAuthorizationContext =
  typeof applicationAuthorizationContext.$inferSelect;
export type NewApplicationAuthorizationContext =
  typeof applicationAuthorizationContext.$inferInsert;
