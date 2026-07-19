import {
  betterAuth,
  type Auth as BetterAuthInstance,
  type BetterAuthOptions,
} from "better-auth";
import { bearer, jwt } from "better-auth/plugins";
import { getDatabase } from "../infrastructure/db/database.js";
import { assertApplicationId, type AuthAdapterScope } from "./AuthScope.js";
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
    session: createSessionOptions({ kind: "platform" }),
    plugins: createJwtPlugins({ kind: "platform" }),
  });
}

/**
 * Create an application-scoped Better Auth instance.
 *
 * Users, credentials, OAuth accounts, sessions, verification flows, and JWT
 * keys are stored in application tables and isolated by application ID.
 */
export function createApplicationAuth(
  config: ApplicationAuthConfiguration
): BetterAuthInstance<IamAuthOptions> {
  const db = getDatabase();
  const { applicationId } = config;

  assertApplicationId(applicationId);

  return betterAuth<IamAuthOptions>({
    ...createCommonOptions(),
    database: createScopedDrizzleAdapter(db, {
      kind: "application",
      applicationId,
    }),
    baseURL: config.baseURL,
    basePath: config.basePath ?? `/auth/applications/${applicationId}`,
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
    session: createSessionOptions(
      { kind: "application", applicationId },
      config.session
    ),
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
  scope: AuthAdapterScope,
  overrides?: BetterAuthOptions["session"]
): NonNullable<BetterAuthOptions["session"]> {
  const additionalFields = {
    ...overrides?.additionalFields,
    ...(scope.kind === "application"
      ? {
          applicationId: {
            type: "string" as const,
            required: false,
            input: false,
          },
        }
      : {}),
  };

  return {
    ...DEFAULT_SESSION,
    ...overrides,
    ...(Object.keys(additionalFields).length ? { additionalFields } : {}),
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

          if (session.applicationId !== scope.applicationId) {
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
