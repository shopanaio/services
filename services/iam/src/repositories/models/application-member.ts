import {
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { application } from "./authorization.js";
import { iamSchema } from "./schema.js";

/** Status of a global user within one IAM application. */
export type ApplicationMemberStatus = "active" | "blocked";

/**
 * Links a global Better Auth identity to an application.
 * Profile, credentials, sessions, verifications, and signing keys stay global.
 */
export const applicationMember = iamSchema.table(
  "application_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 })
      .$type<ApplicationMemberStatus>()
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
    index("idx_application_member_application").on(table.applicationId),
    index("idx_application_member_user").on(table.userId),
    index("idx_application_member_application_status").on(
      table.applicationId,
      table.status
    ),
    uniqueIndex("idx_application_member_unique").on(
      table.applicationId,
      table.userId
    ),
  ]
);

export type ApplicationMember = typeof applicationMember.$inferSelect;
export type NewApplicationMember = typeof applicationMember.$inferInsert;
