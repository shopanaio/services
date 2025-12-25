import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, jwt } from "better-auth/plugins";
import { getDatabase } from "../infrastructure/db/database.js";
import * as schema from "../repositories/models/index.js";

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
        jwks: schema.jwks,
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

    // Plugins
    plugins: [
      // Bearer plugin for token-based authentication
      bearer(),

      // JWT plugin for short-lived access tokens
      jwt({
        jwt: {
          expirationTime: "15m", // 15 minutes
          issuer: process.env.JWT_ISSUER || "shopana-iam",
          audience: process.env.JWT_AUDIENCE || "shopana-api",
          definePayload: ({ user, session }) => {
            // Base payload
            const payload: Record<string, unknown> = {
              sub: user.id,
              email: user.email,
              name: user.name,
            };

            // Add organization claim if present in session data
            // This is set by switchOrganization mutation
            const sessionData = session as { organizationId?: string } | undefined;
            if (sessionData?.organizationId) {
              payload.org = sessionData.organizationId;
            }

            return payload;
          },
        },
        jwks: {
          keyPairConfig: {
            alg: "EdDSA",
            crv: "Ed25519",
          },
          rotationInterval: 60 * 60 * 24 * 30, // 30 days
          gracePeriod: 60 * 60 * 24 * 7, // 7 days grace period
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
