import {
  betterAuth,
  type Auth as BetterAuthInstance,
  type BetterAuthOptions,
} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, jwt } from "better-auth/plugins";
import { getDatabase } from "../infrastructure/db/database.js";
import * as schema from "../repositories/models/index.js";
import { createApplicationSessionAdapter } from "./applicationSessionAdapter.js";

interface IamAuthOptions extends BetterAuthOptions {
  plugins: [ReturnType<typeof bearer>, ReturnType<typeof jwt>];
}

export interface ApplicationAuthConfiguration {
  applicationId: string;
  /** Persisted config version or updatedAt; change it to invalidate the cache. */
  version: string | number;
  baseURL?: string;
  basePath?: string;
  issuer?: string;
  audience?: string;
  cookiePrefix?: string;
  trustedOrigins?: BetterAuthOptions["trustedOrigins"];
  emailAndPassword?: BetterAuthOptions["emailAndPassword"];
  socialProviders?: BetterAuthOptions["socialProviders"];
  session?: BetterAuthOptions["session"];
}

const DEFAULT_SESSION = {
  expiresIn: 60 * 60 * 24 * 7,
  updateAge: 60 * 60 * 24,
};

/** Create the platform/admin Better Auth instance. */
export function createAuth(): BetterAuthInstance<IamAuthOptions> {
  const db = getDatabase();

  return betterAuth<IamAuthOptions>({
    ...createCommonOptions(),
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
    session: createSessionOptions(),
    plugins: createJwtPlugins({ kind: "platform" }),
  });
}

/**
 * Create an application-scoped Better Auth instance.
 *
 * User identities and accounts are global. The adapter guarantees that all
 * session reads and writes are restricted to this application.
 */
export function createApplicationAuth(
  config: ApplicationAuthConfiguration
): BetterAuthInstance<IamAuthOptions> {
  const db = getDatabase();
  const { applicationId } = config;

  if (!applicationId) {
    throw new Error("Application ID is required for application auth");
  }

  return betterAuth<IamAuthOptions>({
    ...createCommonOptions(),
    database: createApplicationSessionAdapter(db, applicationId),
    baseURL: config.baseURL,
    basePath:
      config.basePath ?? `/auth/applications/${applicationId}`,
    trustedOrigins: config.trustedOrigins,
    advanced: {
      cookiePrefix:
        config.cookiePrefix ?? `shopana_application_${applicationId}`,
    },
    emailAndPassword: config.emailAndPassword ?? {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    socialProviders: config.socialProviders,
    session: createSessionOptions(config.session),
    plugins: createJwtPlugins({
      kind: "application",
      applicationId,
      issuer: config.issuer,
      audience: config.audience,
    }),
  });
}

function createCommonOptions(): Pick<
  BetterAuthOptions,
  "user" | "emailAndPassword" | "rateLimit"
> {
  return {
    user: {
      additionalFields: {
        firstName: {
          type: "string",
          required: false,
        },
        lastName: {
          type: "string",
          required: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
    },
  };
}

function createSessionOptions(
  overrides?: BetterAuthOptions["session"]
): NonNullable<BetterAuthOptions["session"]> {
  return {
    ...DEFAULT_SESSION,
    ...overrides,
    additionalFields: {
      ...overrides?.additionalFields,
      scope: {
        type: "string",
        required: false,
        input: false,
      },
      applicationId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  };
}

function createJwtPlugins(
  scope:
    | { kind: "platform" }
    | {
        kind: "application";
        applicationId: string;
        issuer?: string;
        audience?: string;
      }
): IamAuthOptions["plugins"] {
  const issuer =
    scope.kind === "application" && scope.issuer
      ? scope.issuer
      : process.env.JWT_ISSUER || "shopana-iam";
  const audience =
    scope.kind === "application"
      ? scope.audience ?? `shopana:application:${scope.applicationId}`
      : process.env.JWT_AUDIENCE || "shopana-api";

  return [
    bearer(),
    jwt({
      jwt: {
        expirationTime: "15m",
        issuer,
        audience,
        definePayload: ({ user, session }) => {
          const payload: Record<string, unknown> = {
            sid: session.id,
            email: user.email,
            name: user.name,
          };

          if (scope.kind === "platform") {
            payload.actor_type = "platform_user";
            return payload;
          }

          if (
            session.scope !== "application" ||
            session.applicationId !== scope.applicationId
          ) {
            throw new Error("Session application scope mismatch");
          }

          payload.actor_type = "application_user";
          payload.application_id = scope.applicationId;
          return payload;
        },
      },
      jwks: {
        keyPairConfig: {
          alg: "EdDSA",
          crv: "Ed25519",
        },
        rotationInterval: 60 * 60 * 24 * 30,
        gracePeriod: 60 * 60 * 24 * 7,
      },
    }),
  ];
}

export type Auth = ReturnType<typeof createAuth>;
export type ApplicationAuth = ReturnType<typeof createApplicationAuth>;
