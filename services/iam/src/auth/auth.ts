import {
  betterAuth,
  type Auth as BetterAuthInstance,
  type BetterAuthOptions,
} from "better-auth";
import { bearer, emailOTP, jwt } from "better-auth/plugins";
import { signJWT } from "better-auth/plugins/jwt";
import { getCurrentAuthContext } from "@better-auth/core/context";
import { oauthProvider } from "@better-auth/oauth-provider";
import { createHash } from "node:crypto";
import { getDatabase } from "../infrastructure/db/database.js";
import type {
  ApplicationAuthDeliveryProfile,
} from "../repositories/models/application-auth.js";
import type { ApplicationAuthKeyring } from "../services/ApplicationAuthKeyring.js";
import {
  createApplicationAuthEmailIdempotencyKey,
  enqueueApplicationAuthEmail,
  normalizeApplicationAuthEmailRecipient,
  type ApplicationAuthEmailDeliveryPort,
} from "../services/ApplicationAuthEmailDeliveryPort.js";
import type { ApplicationAuthSecretService } from "../services/ApplicationAuthSecretService.js";
import type { ApplicationUserLifecyclePort } from "../services/ApplicationUserLifecyclePort.js";
import type { ApplicationAuthLiveStateInvalidationBus } from "../events/application-auth/index.js";
import { assertApplicationId, type AuthAdapterScope } from "./AuthScope.js";
import type { EffectiveApplicationAuthPolicy } from "./applicationAuthConfiguration.js";
import type {
  ApplicationAuthMutableConfiguration,
  ApplicationAuthUiLocale,
} from "./applicationAuthConfiguration.js";
import { createApplicationResource } from "./applicationAuthConfiguration.js";
import {
  assertApplicationSocialProviderScopes,
  createApplicationSocialProviderOptions,
  getApplicationSocialProviderDefinition,
  type ApplicationAuthProviderName,
} from "./applicationSocialProviders.js";
import { createApplicationOAuthClaimsPolicy } from "./applicationOAuthClaims.js";
import {
  APPLICATION_OAUTH_GRANT_TYPES,
  APPLICATION_OAUTH_SCOPES,
} from "./applicationOAuthPolicy.js";
import { createScopedDrizzleAdapter } from "./scopedDrizzleAdapter.js";

interface IamAuthOptions extends BetterAuthOptions {
  plugins: [ReturnType<typeof bearer>, ReturnType<typeof jwt>];
}

export interface ApplicationAuthProviderRuntimeConfiguration {
  provider: ApplicationAuthProviderName;
  clientId: string;
  clientSecret: string;
  scopes: readonly string[];
  disableSignUp: boolean;
}

export interface ApplicationAuthRuntimeConfiguration {
  applicationId: string;
  organizationId: string;
  revision: number;
  secretKeyVersion: number;
  publicBaseUrl: string;
  resource: string;
  trustedOrigins: string[];
  policy: EffectiveApplicationAuthPolicy;
  branding: ApplicationAuthMutableConfiguration["brandingJson"];
  defaultLocale: ApplicationAuthUiLocale;
  emailVerificationRequired: boolean;
  accessTokenTtlSeconds: number;
  idTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  sessionTtlSeconds: number;
  providers: readonly ApplicationAuthProviderRuntimeConfiguration[];
  deliveryProfile: ApplicationAuthDeliveryProfile | null;
}

const DEFAULT_SESSION = {
  expiresIn: 60 * 60 * 24 * 7,
  updateAge: 60 * 60 * 24,
};

/** Create the platform/admin Better Auth instance. */
export function createAuth(): BetterAuthInstance<IamAuthOptions> {
  const db = getDatabase();

  return betterAuth<IamAuthOptions>({
    ...createCommonOptions({ kind: "platform" }),
    database: createScopedDrizzleAdapter(db, { kind: "platform" }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    session: createSessionOptions({ kind: "platform" }),
    plugins: [bearer(), createJwtPlugin({ kind: "platform" })],
  });
}

/**
 * Create an application-scoped Better Auth OAuth/OIDC provider.
 *
 * The caller must supply a database-backed, active and revision-consistent
 * runtime configuration. No method, provider, audience or secret defaults are
 * inferred when persisted configuration is invalid or incomplete.
 */
export function createApplicationAuth(
  config: ApplicationAuthRuntimeConfiguration,
  security: {
    keyring: ApplicationAuthKeyring;
    secrets: ApplicationAuthSecretService;
    emailDelivery?: ApplicationAuthEmailDeliveryPort;
    liveStateInvalidation?: ApplicationAuthLiveStateInvalidationBus;
    applicationUserLifecycle?: ApplicationUserLifecyclePort;
  }
) {
  const db = getDatabase();
  const { applicationId } = config;
  assertApplicationId(applicationId);
  assertApplicationRuntimeConfiguration(config);

  const basePath = `/auth/applications/${applicationId}`;
  const issuer = `${config.publicBaseUrl}${basePath}`;
  const passwordEnabled =
    config.policy.passwordSignInAllowed ||
    config.policy.passwordSignUpAllowed ||
    config.policy.passwordResetAllowed;
  const emailVerificationEnabled =
    (config.policy.passwordSignInAllowed ||
      config.policy.passwordSignUpAllowed) &&
    config.emailVerificationRequired;
  const delivery = createEmailDeliveryCallbacks(
    config,
    security.emailDelivery,
    {
      emailVerificationEnabled,
      passwordResetEnabled: config.policy.passwordResetAllowed,
      emailOtpEnabled: config.policy.emailOtpSignInAllowed,
    }
  );
  const socialProviders = createSocialProviders(config);
  const trustedProviders = config.providers
    .filter(({ provider }) =>
      getApplicationSocialProviderDefinition(provider)
        .trustedForExplicitLinking
    )
    .map(({ provider }) => provider);
  const accountLinking = {
    enabled: true,
    disableImplicitLinking: true,
    trustedProviders,
    allowDifferentEmails: false,
    allowUnlinkingAll: false,
    updateUserInfoOnLink: false,
  } as const;
  assertApplicationAccountLinkingPolicy(accountLinking);
  const claims = createApplicationOAuthClaimsPolicy({
    applicationId,
    resource: config.resource,
  });

  const plugins: BetterAuthOptions["plugins"] = [
    createJwtPlugin({
      kind: "application",
      applicationId,
      issuer,
      audience: config.resource,
    }),
  ];
  if (config.policy.emailOtpSignInAllowed) {
    plugins.push(
      emailOTP({
        otpLength: 6,
        expiresIn: 5 * 60,
        allowedAttempts: 3,
        resendStrategy: "rotate",
        storeOTP: "hashed",
        disableSignUp: !config.policy.emailOtpSignUpAllowed,
        overrideDefaultEmailVerification: false,
        changeEmail: { enabled: false, verifyCurrentEmail: false },
        sendVerificationOTP: delivery.sendVerificationOTP,
      })
    );
  }
  plugins.push(
    oauthProvider({
      loginPage: `${basePath}/login`,
      consentPage: `${basePath}/consent`,
      signup: { page: `${basePath}/signup` },
      postLogin: {
        page: `${basePath}/consent`,
        shouldRedirect: () => false,
        consentReferenceId: ({ user, session }) => {
          if (
            user.applicationId !== applicationId ||
            session.applicationId !== applicationId
          ) {
            throw new Error(
              "OAuth token family is outside the application realm"
            );
          }
          return applicationId;
        },
      },
      scopes: [...APPLICATION_OAUTH_SCOPES],
      validAudiences: [config.resource],
      grantTypes: [...APPLICATION_OAUTH_GRANT_TYPES],
      accessTokenExpiresIn: config.accessTokenTtlSeconds,
      idTokenExpiresIn: config.idTokenTtlSeconds,
      refreshTokenExpiresIn: config.refreshTokenTtlSeconds,
      codeExpiresIn: 5 * 60,
      allowDynamicClientRegistration: false,
      allowUnauthenticatedClientRegistration: false,
      allowPublicClientPrelogin: false,
      disableJwtPlugin: false,
      storeClientSecret: "hashed",
      storeTokens: "hashed",
      clientPrivileges: () => false,
      ...claims,
    })
  );

  return betterAuth({
    ...createCommonOptions({ kind: "application", applicationId }),
    database: createScopedDrizzleAdapter(
      db,
      { kind: "application", applicationId },
      {
        keyring: security.keyring,
        liveStateInvalidation: security.liveStateInvalidation,
      }
    ),
    secret: security.secrets.deriveRealmSecret(
      applicationId,
      config.secretKeyVersion
    ),
    baseURL: config.publicBaseUrl,
    basePath,
    trustedOrigins: config.trustedOrigins,
    advanced: {
      cookiePrefix: `shopana_application_${applicationId}`,
      useSecureCookies: config.publicBaseUrl.startsWith("https://"),
      defaultCookieAttributes: {
        httpOnly: true,
        secure: config.publicBaseUrl.startsWith("https://"),
        sameSite: "lax",
        path: basePath,
      },
    },
    onAPIError: {
      errorURL: `${basePath}/error`,
    },
    ...(security.applicationUserLifecycle
      ? {
          databaseHooks: {
            account: {
              create: {
                after: async (account: { userId: string }) => {
                  await security.applicationUserLifecycle!.provisioningRequired({
                    applicationId,
                    organizationId: config.organizationId,
                    applicationUserId: requireLifecycleUserId(
                      account.userId,
                      "account",
                    ),
                  });
                },
              },
            },
            session: {
              create: {
                after: async (session: Record<string, unknown>) => {
                  await security.applicationUserLifecycle!.provisioningRequired({
                    applicationId,
                    organizationId: config.organizationId,
                    applicationUserId: requireLifecycleUserId(
                      session.userId,
                      "session",
                    ),
                  });
                },
              },
            },
          },
        }
      : {}),
    disabledPaths: ["/token"],
    emailAndPassword: {
      enabled: passwordEnabled,
      disableSignUp: !config.policy.passwordSignUpAllowed,
      autoSignIn: config.policy.passwordSignInAllowed,
      requireEmailVerification: config.emailVerificationRequired,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      ...(config.policy.passwordResetAllowed
        ? { sendResetPassword: delivery.sendResetPassword }
        : {}),
    },
    ...(emailVerificationEnabled
      ? {
          emailVerification: {
            sendVerificationEmail: delivery.sendVerificationEmail,
            sendOnSignUp: true,
            sendOnSignIn: true,
          },
        }
      : {}),
    socialProviders,
    account: {
      encryptOAuthTokens: true,
      accountLinking,
    },
    session: createSessionOptions(
      { kind: "application", applicationId },
      {
        expiresIn: config.sessionTtlSeconds,
        updateAge: Math.min(24 * 60 * 60, config.sessionTtlSeconds),
        freshAge: 10 * 60,
      }
    ),
    plugins,
  });
}

function requireLifecycleUserId(
  value: unknown,
  model: "account" | "session",
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Application auth ${model} lifecycle user is invalid`);
  }
  return value;
}

function createCommonOptions(
  scope: AuthAdapterScope
): Pick<
  BetterAuthOptions,
  "user" | "rateLimit" | "experimental" | "logger"
> {
  return {
    ...(scope.kind === "application" ? { logger: { disabled: true } } : {}),
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
        ...(scope.kind === "application"
          ? {
              applicationId: {
                type: "string" as const,
                required: false,
                input: false,
              },
            }
          : {}),
      },
    },
    rateLimit: {
      // Application auth is protected by ApplicationAuthRateLimiter, whose
      // buckets are application-scoped and backed by the configured atomic
      // port. Better Auth's process-global IP/path buckets would otherwise
      // merge independent application realms and double-consume requests.
      enabled: scope.kind !== "application",
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

function createJwtPlugin(
  scope:
    | { kind: "platform" }
    | {
        kind: "application";
        applicationId: string;
        issuer: string;
        audience: string;
      }
): ReturnType<typeof jwt> {
  const issuer =
    scope.kind === "application"
      ? scope.issuer
      : process.env.JWT_ISSUER || "shopana-iam";
  const audience =
    scope.kind === "application"
      ? scope.audience
      : process.env.JWT_AUDIENCE || "shopana-api";

  const pluginOptions = {
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
          session.applicationId !== scope.applicationId ||
          user.applicationId !== scope.applicationId
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
  } satisfies Parameters<typeof jwt>[0];
  const plugin = jwt(pluginOptions);
  if (scope.kind === "platform") return plugin;

  /*
   * OAuth Provider 1.6.23 adds the UserInfo endpoint as a second access-token
   * audience whenever `openid` is requested. IAM v1 deliberately has exactly
   * one resource audience. Reuse Better Auth's signer/JWKS lifecycle while
   * normalizing only OAuth access-token payloads (identified by `azp`). ID
   * tokens keep their OAuth client audience.
   */
  return {
    ...plugin,
    options: {
      ...plugin.options,
      jwt: {
        ...plugin.options?.jwt,
        sign: async (payload: Record<string, unknown>) => {
          const context = await getCurrentAuthContext();
          return signJWT(context as Parameters<typeof signJWT>[0], {
            options: pluginOptions,
            payload:
              typeof payload.azp === "string"
                ? { ...payload, aud: audience }
                : payload,
          });
        },
      },
    },
  } as ReturnType<typeof jwt>;
}

function createSocialProviders(
  config: ApplicationAuthRuntimeConfiguration
): NonNullable<BetterAuthOptions["socialProviders"]> {
  const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  for (const runtime of config.providers) {
    assertApplicationSocialProviderScopes(runtime.provider, runtime.scopes);
    Object.assign(
      providers,
      createApplicationSocialProviderOptions({
        provider: runtime.provider,
        clientId: runtime.clientId,
        clientSecret: runtime.clientSecret,
        scopes: runtime.scopes,
        disableSignUp: runtime.disableSignUp,
      })
    );
  }
  return providers;
}

function assertApplicationAccountLinkingPolicy(policy: {
  disableImplicitLinking: boolean;
  trustedProviders: readonly ApplicationAuthProviderName[];
}): void {
  if (
    policy.trustedProviders.length > 0 &&
    !policy.disableImplicitLinking
  ) {
    throw new Error(
      "Trusted social providers require implicit account linking to remain disabled"
    );
  }
}

function createEmailDeliveryCallbacks(
  config: ApplicationAuthRuntimeConfiguration,
  port: ApplicationAuthEmailDeliveryPort | undefined,
  enabled: {
    emailVerificationEnabled: boolean;
    passwordResetEnabled: boolean;
    emailOtpEnabled: boolean;
  }
) {
  const deliveryRequired = Object.values(enabled).some(Boolean);
  const profile = config.deliveryProfile;
  if (deliveryRequired && (!port || !profile)) {
    throw new Error(
      "Enabled application email authentication flow has no validated delivery adapter/profile"
    );
  }

  const requireDependencies = () => {
    if (!port || !profile) {
      throw new Error("Application auth email delivery is unavailable");
    }
    return { port, profile };
  };

  return {
    sendVerificationEmail: async (data: {
      user: { email: string };
      url: string;
      token: string;
    }) => {
      if (!enabled.emailVerificationEnabled) {
        throw new Error("Email verification delivery is disabled");
      }
      const dependencies = requireDependencies();
      const recipient = normalizeApplicationAuthEmailRecipient(data.user.email);
      await enqueueApplicationAuthEmail({
        port: dependencies.port,
        request: {
          idempotencyKey: createApplicationAuthEmailIdempotencyKey({
            applicationId: config.applicationId,
            purpose: "email_verification_link",
            verificationReference: data.token,
          }),
          applicationId: config.applicationId,
          deliveryProfileId: dependencies.profile.transportProfile,
          purpose: "email_verification_link",
          recipient,
          templateId: dependencies.profile.emailVerificationTemplateId,
          payload: { url: data.url },
        },
      });
    },
    sendResetPassword: async (data: {
      user: { email: string };
      url: string;
      token: string;
    }) => {
      if (!enabled.passwordResetEnabled) {
        throw new Error("Password reset delivery is disabled");
      }
      const dependencies = requireDependencies();
      const recipient = normalizeApplicationAuthEmailRecipient(data.user.email);
      await enqueueApplicationAuthEmail({
        port: dependencies.port,
        request: {
          idempotencyKey: createApplicationAuthEmailIdempotencyKey({
            applicationId: config.applicationId,
            purpose: "password_reset_link",
            verificationReference: data.token,
          }),
          applicationId: config.applicationId,
          deliveryProfileId: dependencies.profile.transportProfile,
          purpose: "password_reset_link",
          recipient,
          templateId: dependencies.profile.passwordResetTemplateId,
          payload: { url: data.url },
        },
      });
    },
    sendVerificationOTP: async (data: {
      email: string;
      otp: string;
      type:
        | "sign-in"
        | "email-verification"
        | "forget-password"
        | "change-email";
    }) => {
      if (!enabled.emailOtpEnabled || data.type !== "sign-in") {
        throw new Error("Unsupported application email OTP purpose");
      }
      const dependencies = requireDependencies();
      const recipient = normalizeApplicationAuthEmailRecipient(data.email);
      const verificationReference = createHash("sha256")
        .update(recipient)
        .update("\0")
        .update(data.otp)
        .digest("base64url");
      await enqueueApplicationAuthEmail({
        port: dependencies.port,
        request: {
          idempotencyKey: createApplicationAuthEmailIdempotencyKey({
            applicationId: config.applicationId,
            purpose: "email_otp_sign_in",
            verificationReference,
          }),
          applicationId: config.applicationId,
          deliveryProfileId: dependencies.profile.transportProfile,
          purpose: "email_otp_sign_in",
          recipient,
          templateId: dependencies.profile.emailOtpSignInTemplateId,
          payload: { otp: data.otp },
        },
      });
    },
  };
}

function assertApplicationRuntimeConfiguration(
  config: ApplicationAuthRuntimeConfiguration
): void {
  if (!config.policy.realmEnabled) {
    throw new Error("Application auth realm is not active");
  }
  if (config.resource !== createApplicationResource(config.applicationId)) {
    throw new Error("Application auth resource is invalid");
  }
  if (!Number.isSafeInteger(config.revision) || config.revision < 1) {
    throw new Error("Application auth configuration revision is invalid");
  }
  if (
    !Number.isSafeInteger(config.secretKeyVersion) ||
    config.secretKeyVersion < 1
  ) {
    throw new Error("Application auth secret key version is invalid");
  }
  const publicBaseUrl = new URL(config.publicBaseUrl);
  if (
    publicBaseUrl.username ||
    publicBaseUrl.password ||
    publicBaseUrl.search ||
    publicBaseUrl.hash ||
    (publicBaseUrl.pathname !== "" && publicBaseUrl.pathname !== "/") ||
    config.publicBaseUrl.endsWith("/")
  ) {
    throw new Error("Application auth public base URL is not canonical");
  }
}

export type Auth = ReturnType<typeof createAuth>;
export type ApplicationAuth = ReturnType<typeof createApplicationAuth>;
