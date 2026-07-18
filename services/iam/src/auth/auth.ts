import {
  betterAuth,
  type Auth as BetterAuthInstance,
  type BetterAuthOptions,
} from "better-auth";
import { bearer, jwt } from "better-auth/plugins";
import { getDatabase } from "../infrastructure/db/database.js";
import { createScopedDrizzleAdapter } from "./scopedDrizzleAdapter.js";

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
    database: createScopedDrizzleAdapter(db, { kind: "platform" }),
    session: createSessionOptions(),
    plugins: createJwtPlugins({ kind: "platform" }),
  });
}

/**
 * Create an application-scoped Better Auth instance.
 *
 * User profiles are global. The adapter guarantees that credentials, OAuth
 * accounts, sessions, and verification flows are restricted to this application.
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
    database: createScopedDrizzleAdapter(db, {
      kind: "application",
      applicationId,
    }),
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
  | "user"
  | "account"
  | "verification"
  | "emailAndPassword"
  | "rateLimit"
  | "experimental"
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
    account: {
      additionalFields: createAuthScopeFields(),
    },
    verification: {
      additionalFields: createAuthScopeFields(),
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
    experimental: {
      joins: false,
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
      authScope: {
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
            session.authScope !== "application" ||
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

function createAuthScopeFields() {
  return {
    authScope: {
      type: "string" as const,
      required: false,
      input: false,
    },
    applicationId: {
      type: "string" as const,
      required: false,
      input: false,
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;
export type ApplicationAuth = ReturnType<typeof createApplicationAuth>;
