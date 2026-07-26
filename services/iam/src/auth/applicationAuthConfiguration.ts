import { z } from "zod";
import type { ApplicationAuthConfigurationRecord } from "../repositories/models/application-auth.js";
import {
  APPLICATION_AUTH_PROVIDER_ID_MAX_LENGTH,
  assertApplicationSocialProviderScopes,
  isApplicationAuthProviderName,
  parseApplicationAuthProviderName,
  type ApplicationAuthProviderName,
} from "./applicationSocialProviders.js";

export const APPLICATION_AUTH_TTL = {
  accessToken: { min: 5 * 60, max: 30 * 60, default: 15 * 60 },
  idToken: { min: 5 * 60, max: 60 * 60, default: 60 * 60 },
  refreshToken: {
    min: 24 * 60 * 60,
    max: 30 * 24 * 60 * 60,
    default: 30 * 24 * 60 * 60,
  },
  session: {
    min: 24 * 60 * 60,
    max: 30 * 24 * 60 * 60,
    default: 30 * 24 * 60 * 60,
  },
  authorizationCode: 5 * 60,
  authorizationContext: 10 * 60,
} as const;

export const APPLICATION_AUTH_UI_LOCALES = ["en"] as const;
export type ApplicationAuthUiLocale =
  (typeof APPLICATION_AUTH_UI_LOCALES)[number];

export const APPLICATION_AUTH_PRIMARY_COLOR_TOKENS = [
  "blue",
  "indigo",
  "violet",
  "emerald",
] as const;
export const APPLICATION_AUTH_BACKGROUND_COLOR_TOKENS = [
  "white",
  "slate",
] as const;

export const applicationAuthBrandingSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    headline: z.string().trim().min(1).max(160).optional(),
    logoUrl: z
      .string()
      .url()
      .max(2048)
      .refine((value) => new URL(value).protocol === "https:", {
        message: "Branding logoUrl must use HTTPS",
      })
      .optional(),
    primaryColor: z
      .enum(APPLICATION_AUTH_PRIMARY_COLOR_TOKENS)
      .optional(),
    backgroundColor: z
      .enum(APPLICATION_AUTH_BACKGROUND_COLOR_TOKENS)
      .optional(),
  })
  .strict();

export const applicationAuthLocaleSchema = z.enum(
  APPLICATION_AUTH_UI_LOCALES
);

/**
 * Complete mutable configuration contract. The canonical resource, revision,
 * application id and secret key version are intentionally not accepted here.
 */
export const applicationAuthMutableConfigurationSchema = z
  .object({
    registrationMode: z.enum(["open", "disabled"]),
    passwordSignUpEnabled: z.boolean(),
    passwordSignInEnabled: z.boolean(),
    passwordResetEnabled: z.boolean(),
    emailVerificationRequired: z.boolean(),
    emailOtpSignInEnabled: z.boolean(),
    emailOtpSignUpEnabled: z.boolean(),
    consentMode: z.literal("explicit"),
    accessTokenTtlSeconds: z
      .number()
      .int()
      .min(APPLICATION_AUTH_TTL.accessToken.min)
      .max(APPLICATION_AUTH_TTL.accessToken.max),
    idTokenTtlSeconds: z
      .number()
      .int()
      .min(APPLICATION_AUTH_TTL.idToken.min)
      .max(APPLICATION_AUTH_TTL.idToken.max),
    refreshTokenTtlSeconds: z
      .number()
      .int()
      .min(APPLICATION_AUTH_TTL.refreshToken.min)
      .max(APPLICATION_AUTH_TTL.refreshToken.max),
    sessionTtlSeconds: z
      .number()
      .int()
      .min(APPLICATION_AUTH_TTL.session.min)
      .max(APPLICATION_AUTH_TTL.session.max),
    brandingJson: applicationAuthBrandingSchema,
    defaultLocale: applicationAuthLocaleSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.emailOtpSignUpEnabled && !value.emailOtpSignInEnabled) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emailOtpSignUpEnabled"],
        message:
          "emailOtpSignUpEnabled requires emailOtpSignInEnabled to be enabled",
      });
    }
  });

export const applicationAuthConfigurationPatchSchema =
  applicationAuthMutableConfigurationSchema._def.schema.partial().strict();

export const applicationAuthProviderScopesSchema = z
  .array(z.string().trim().min(1).max(256))
  .max(32);

export const applicationAuthProviderNameSchema = z
  .string()
  .max(APPLICATION_AUTH_PROVIDER_ID_MAX_LENGTH)
  .refine(isApplicationAuthProviderName, {
    message: "Application social provider is unsupported",
  })
  .transform(parseApplicationAuthProviderName);

export const applicationAuthProviderStateSchema = z
  .object({
    provider: applicationAuthProviderNameSchema,
    enabled: z.boolean(),
    updatedBy: z.string().trim().min(1).max(256),
  })
  .strict();

export const applicationAuthProviderCredentialsSchema = z
  .object({
    provider: applicationAuthProviderNameSchema,
    enabled: z.boolean(),
    clientId: z.string().trim().min(1).max(2048),
    clientSecret: z.string().min(1).max(8192),
    scopes: applicationAuthProviderScopesSchema,
    updatedBy: z.string().trim().min(1).max(256),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.scopes).size !== value.scopes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopes"],
        message: "Provider scopes must be unique",
      });
    }
    try {
      assertApplicationSocialProviderScopes(value.provider, value.scopes);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopes"],
        message: "Provider contains an unapproved scope",
      });
    }
  });

export const applicationAuthDeliveryProfileSchema = z
  .object({
    transportProfile: z.string().trim().min(1).max(128),
    senderIdentity: z.string().trim().min(1).max(320),
    emailVerificationTemplateId: z.string().trim().min(1).max(128),
    passwordResetTemplateId: z.string().trim().min(1).max(128),
    emailOtpSignInTemplateId: z.string().trim().min(1).max(128),
    updatedBy: z.string().trim().min(1).max(256),
  })
  .strict()
  .superRefine((value, context) => {
    const templates = [
      value.emailVerificationTemplateId,
      value.passwordResetTemplateId,
      value.emailOtpSignInTemplateId,
    ];
    if (new Set(templates).size !== templates.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emailVerificationTemplateId"],
        message: "Every email purpose requires a distinct template",
      });
    }
  });

export type ApplicationAuthMutableConfiguration = z.infer<
  typeof applicationAuthMutableConfigurationSchema
>;
export type ApplicationAuthConfigurationPatch = z.infer<
  typeof applicationAuthConfigurationPatchSchema
>;
export type ApplicationAuthProviderCredentialsInput = z.infer<
  typeof applicationAuthProviderCredentialsSchema
>;
export type ApplicationAuthProviderStateInput = z.infer<
  typeof applicationAuthProviderStateSchema
>;
export type ApplicationAuthDeliveryProfileInput = z.infer<
  typeof applicationAuthDeliveryProfileSchema
>;

export const DEFAULT_APPLICATION_AUTH_CONFIGURATION: ApplicationAuthMutableConfiguration =
  {
    registrationMode: "disabled",
    passwordSignUpEnabled: false,
    passwordSignInEnabled: false,
    passwordResetEnabled: false,
    emailVerificationRequired: true,
    emailOtpSignInEnabled: false,
    emailOtpSignUpEnabled: false,
    consentMode: "explicit",
    accessTokenTtlSeconds: APPLICATION_AUTH_TTL.accessToken.default,
    idTokenTtlSeconds: APPLICATION_AUTH_TTL.idToken.default,
    refreshTokenTtlSeconds: APPLICATION_AUTH_TTL.refreshToken.default,
    sessionTtlSeconds: APPLICATION_AUTH_TTL.session.default,
    brandingJson: {},
    defaultLocale: "en",
  };

export interface EffectiveApplicationAuthPolicy {
  realmEnabled: boolean;
  passwordSignInAllowed: boolean;
  passwordSignUpAllowed: boolean;
  passwordResetAllowed: boolean;
  emailOtpSignInAllowed: boolean;
  emailOtpSignUpAllowed: boolean;
  socialProviders: readonly EffectiveApplicationSocialProviderPolicy[];
}

export interface EffectiveApplicationSocialProviderPolicy {
  provider: ApplicationAuthProviderName;
  configured: true;
  enabled: boolean;
  signInAllowed: boolean;
  signUpAllowed: boolean;
}

export function calculateEffectiveApplicationAuthPolicy(
  configuration: Pick<
    ApplicationAuthConfigurationRecord,
    | "realmEnabled"
    | "registrationMode"
    | "passwordSignInEnabled"
    | "passwordSignUpEnabled"
    | "passwordResetEnabled"
    | "emailOtpSignInEnabled"
    | "emailOtpSignUpEnabled"
  >,
  providers: readonly {
    provider: ApplicationAuthProviderName;
    enabled: boolean;
  }[]
): EffectiveApplicationAuthPolicy {
  const realmEnabled = configuration.realmEnabled;
  const signUpAllowed =
    realmEnabled && configuration.registrationMode === "open";
  if (
    new Set(providers.map(({ provider }) => provider)).size !==
    providers.length
  ) {
    throw new Error("Application social provider configuration is duplicated");
  }
  return {
    realmEnabled,
    passwordSignInAllowed:
      realmEnabled && configuration.passwordSignInEnabled,
    passwordSignUpAllowed:
      signUpAllowed && configuration.passwordSignUpEnabled,
    passwordResetAllowed:
      realmEnabled && configuration.passwordResetEnabled,
    emailOtpSignInAllowed:
      realmEnabled && configuration.emailOtpSignInEnabled,
    emailOtpSignUpAllowed:
      signUpAllowed && configuration.emailOtpSignUpEnabled,
    socialProviders: Object.freeze(
      providers.map(({ provider, enabled }) =>
        Object.freeze({
          provider,
          configured: true as const,
          enabled,
          signInAllowed: realmEnabled && enabled,
          signUpAllowed: signUpAllowed && enabled,
        })
      )
    ),
  };
}

export function createApplicationResource(applicationId: string): string {
  const validApplicationId = z.string().uuid().parse(applicationId);
  return `urn:shopana:application:${validApplicationId}`;
}

export function normalizeApplicationAuthOrigin(
  input: string,
  options: { allowInsecureLocalhost: boolean }
): string {
  const url = new URL(input);
  if (
    url.username ||
    url.password ||
    url.hostname.includes("*") ||
    url.search ||
    url.hash ||
    (url.pathname !== "" && url.pathname !== "/")
  ) {
    throw new Error(
      "Origin must not contain userinfo, path, query, or fragment"
    );
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const secure = url.protocol === "https:";
  const allowedLocalHttp =
    options.allowInsecureLocalhost &&
    url.protocol === "http:" &&
    localHosts.has(url.hostname);
  if (!secure && !allowedLocalHttp) {
    throw new Error("Origin must use HTTPS outside explicit localhost development");
  }

  return url.origin;
}
