import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDatabase } from "../db/database.js";
import * as schema from "../db/schema/index.js";

/**
 * Better Auth instance for IAM service.
 *
 * Handles:
 * - Email/password authentication
 * - Session management
 * - User lifecycle
 *
 * Note: Must be initialized after database connection.
 */
export function createAuth() {
  const db = getDatabase();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),

    // Email/Password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Enable later when email service is ready
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every day
    },

    // Rate limiting (optional)
    rateLimit: {
      enabled: true,
      window: 60, // 1 minute window
      max: 100, // 100 requests per window
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
