import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { smtpSchema } from "./schema.js";

const appsSchema = pgSchema("apps");
const appInstallationsReference = appsSchema.table("app_installations", {
  id: uuid("id").primaryKey(),
});

export const smtpConnectionProvider = smtpSchema.enum(
  "smtp_connection_provider",
  ["CUSTOM", "SENDGRID", "MAILCHIMP_TRANSACTIONAL", "GOOGLE_WORKSPACE"],
);

export const smtpConnectionStatus = smtpSchema.enum(
  "smtp_connection_status",
  ["ACTIVE", "INACTIVE", "DISCONNECTED"],
);

export const smtpConnectionSecurity = smtpSchema.enum(
  "smtp_connection_security",
  ["NONE", "STARTTLS", "TLS"],
);

export const smtpConnections = smtpSchema.table(
  "smtp_connections",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    installationId: uuid("installation_id")
      .references(() => appInstallationsReference.id)
      .notNull(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    provider: smtpConnectionProvider("provider").notNull(),
    status: smtpConnectionStatus("status").notNull().default("INACTIVE"),
    host: varchar("host", { length: 253 }).notNull(),
    port: integer("port").notNull(),
    security: smtpConnectionSecurity("security").notNull(),
    username: varchar("username", { length: 320 }),
    passwordEnvelope: text("password_envelope"),
    createdById: varchar("created_by_id", { length: 255 }),
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
    disconnectedAt: timestamp("disconnected_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("smtp_connections_installation_status_idx").on(
      table.installationId,
      table.status,
    ),
    index("smtp_connections_store_status_idx").on(
      table.storeId,
      table.status,
    ),
    uniqueIndex("smtp_connections_one_active_per_installation_idx")
      .on(table.installationId)
      .where(sql`${table.status} = 'ACTIVE'`),
  ],
);

export type SmtpConnectionModel = typeof smtpConnections.$inferSelect;
export type SmtpConnectionProvider =
  (typeof smtpConnectionProvider.enumValues)[number];
export type SmtpConnectionStatus =
  (typeof smtpConnectionStatus.enumValues)[number];
