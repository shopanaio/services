import { sql } from "drizzle-orm";
import {
  check,
  index,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { headlessStorefrontConnections } from "./connections.js";
import { bytea, headlessSchema } from "./schema.js";

export const storefrontCredentialKind = headlessSchema.enum(
  "app_storefront_credential_kind",
  ["PUBLIC", "PRIVATE"],
);

export const storefrontCredentialStatus = headlessSchema.enum(
  "app_storefront_credential_status",
  ["ACTIVE", "REVOKED"],
);

export const storefrontCredentials = headlessSchema.table(
  "storefront_credentials",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    connectionId: uuid("connection_id")
      .references(() => headlessStorefrontConnections.id)
      .notNull(),
    kind: storefrontCredentialKind("kind").notNull(),
    status: storefrontCredentialStatus("status")
      .notNull()
      .default("ACTIVE"),
    kid: varchar("kid", { length: 64 }).notNull(),
    tokenVersion: smallint("token_version").notNull(),
    pepperVersion: smallint("pepper_version").notNull(),
    tokenDigest: bytea("token_digest").notNull(),
    publicTokenCiphertext: text("public_token_ciphertext"),
    label: varchar("label", { length: 255 }),
    tokenHint: varchar("token_hint", { length: 16 }).notNull(),
    createdByType: varchar("created_by_type", { length: 16 }).notNull(),
    createdById: varchar("created_by_id", { length: 255 }),
    revokedByType: varchar("revoked_by_type", { length: 16 }),
    revokedById: varchar("revoked_by_id", { length: 255 }),
    lastUsedAt: timestamp("last_used_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    uniqueIndex("storefront_credentials_kid_key").on(table.kid),
    uniqueIndex("storefront_credentials_token_digest_key").on(
      table.tokenDigest,
    ),
    uniqueIndex("storefront_credentials_active_public_connection_key")
      .on(table.connectionId)
      .where(
        sql`${table.kind} = 'PUBLIC' AND ${table.status} = 'ACTIVE'`,
      ),
    index("storefront_credentials_connection_kind_status_created_idx").on(
      table.connectionId,
      table.kind,
      table.status,
      table.createdAt,
    ),
    index("storefront_credentials_store_status_idx").on(
      table.storeId,
      table.status,
    ),
    index("storefront_credentials_organization_status_idx").on(
      table.organizationId,
      table.status,
    ),
    check(
      "storefront_credentials_public_token_ciphertext_check",
      sql`(
        (${table.kind} = 'PUBLIC' AND ${table.publicTokenCiphertext} IS NOT NULL)
        OR
        (${table.kind} = 'PRIVATE' AND ${table.publicTokenCiphertext} IS NULL)
      )`,
    ),
    check(
      "storefront_credentials_revoked_at_check",
      sql`(
        (${table.status} = 'ACTIVE' AND ${table.revokedAt} IS NULL)
        OR
        (${table.status} = 'REVOKED' AND ${table.revokedAt} IS NOT NULL)
      )`,
    ),
  ],
);

export type StorefrontCredentialKind =
  (typeof storefrontCredentialKind.enumValues)[number];
export type StorefrontCredentialStatus =
  (typeof storefrontCredentialStatus.enumValues)[number];
export type StorefrontCredentialModel =
  typeof storefrontCredentials.$inferSelect;
export type NewStorefrontCredentialModel =
  typeof storefrontCredentials.$inferInsert;
