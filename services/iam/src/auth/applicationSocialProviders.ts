import type { BetterAuthOptions } from "better-auth";
import type { FacebookOptions, GoogleOptions } from "better-auth/social-providers";
import type { ApplicationAuthUiMessageKey } from "../api/http/application-auth/ui/localization.js";

export const APPLICATION_AUTH_PROVIDER_ID_MAX_LENGTH = 64;
export const APPLICATION_AUTH_PROVIDER_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

export type ApplicationSocialProviderEmailContract =
  "verified_required" | "required_but_unverified";

export interface ApplicationSocialProviderRuntimeOptions {
  clientId: string;
  clientSecret: string;
  scopes: readonly string[];
  disableSignUp: boolean;
}

interface ApplicationSocialProviderDefinitionInput<
  TProvider extends string,
  TOptions extends GoogleOptions | FacebookOptions,
> {
  readonly id: TProvider;
  readonly approvedScopes: readonly string[];
  readonly providerLabelKey: ApplicationAuthUiMessageKey;
  readonly continueLabelKey: ApplicationAuthUiMessageKey;
  readonly emailContract: ApplicationSocialProviderEmailContract;
  readonly trustedForExplicitLinking: boolean;
  readonly explicitLinkingSecurityRationale?: string;
  readonly createBetterAuthOptions: (input: ApplicationSocialProviderRuntimeOptions) => TOptions;
}

function defineApplicationSocialProvider<
  const TProvider extends string,
  TOptions extends GoogleOptions | FacebookOptions,
>(
  definition: ApplicationSocialProviderDefinitionInput<TProvider, TOptions>,
): Readonly<ApplicationSocialProviderDefinitionInput<TProvider, TOptions>> {
  if (
    definition.id.length > APPLICATION_AUTH_PROVIDER_ID_MAX_LENGTH ||
    !APPLICATION_AUTH_PROVIDER_ID_PATTERN.test(definition.id)
  ) {
    throw new Error("Application social provider ID is invalid");
  }
  if (
    definition.approvedScopes.length === 0 ||
    definition.approvedScopes.some((scope) => !scope.trim()) ||
    new Set(definition.approvedScopes).size !== definition.approvedScopes.length
  ) {
    throw new Error(`Application social provider ${definition.id} scopes are invalid`);
  }
  if (
    definition.trustedForExplicitLinking &&
    !definition.explicitLinkingSecurityRationale?.trim()
  ) {
    throw new Error(
      `Application social provider ${definition.id} requires an explicit linking security rationale`,
    );
  }
  return Object.freeze({
    ...definition,
    approvedScopes: Object.freeze([...definition.approvedScopes]),
  });
}

const google = defineApplicationSocialProvider({
  id: "google",
  approvedScopes: ["openid", "profile", "email"],
  providerLabelKey: "googleProvider",
  continueLabelKey: "continueWithGoogle",
  emailContract: "verified_required",
  trustedForExplicitLinking: false,
  createBetterAuthOptions: (input: ApplicationSocialProviderRuntimeOptions): GoogleOptions => ({
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    scope: [...input.scopes],
    disableSignUp: input.disableSignUp,
  }),
});

const facebook = defineApplicationSocialProvider({
  id: "facebook",
  approvedScopes: ["email", "public_profile"],
  providerLabelKey: "facebookProvider",
  continueLabelKey: "continueWithFacebook",
  emailContract: "required_but_unverified",
  trustedForExplicitLinking: true,
  explicitLinkingSecurityRationale:
    "Facebook email is treated as unverified; trust applies only to authenticated explicit linking while implicit linking remains disabled.",
  createBetterAuthOptions: (input: ApplicationSocialProviderRuntimeOptions): FacebookOptions => ({
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    scope: [...input.scopes],
    disableSignUp: input.disableSignUp,
  }),
});

const applicationSocialProviders = {
  google,
  facebook,
} as const;

const providerDefinitionIds = Object.entries(applicationSocialProviders).map(
  ([provider, definition]) => {
    if (provider !== definition.id) {
      throw new Error("Application social provider catalog key mismatch");
    }
    return definition.id;
  },
);
if (new Set(providerDefinitionIds).size !== providerDefinitionIds.length) {
  throw new Error("Application social provider catalog contains duplicate IDs");
}

export const APPLICATION_SOCIAL_PROVIDERS = Object.freeze(applicationSocialProviders);

export type ApplicationAuthProviderName = keyof typeof APPLICATION_SOCIAL_PROVIDERS;

export type ApplicationSocialProviderDefinition =
  (typeof APPLICATION_SOCIAL_PROVIDERS)[ApplicationAuthProviderName];

export const APPLICATION_AUTH_PROVIDER_NAMES = Object.freeze(
  Object.keys(APPLICATION_SOCIAL_PROVIDERS),
) as readonly ApplicationAuthProviderName[];

const applicationAuthProviderNameSet: ReadonlySet<string> = new Set(
  APPLICATION_AUTH_PROVIDER_NAMES,
);

export function isApplicationAuthProviderName(
  value: unknown,
): value is ApplicationAuthProviderName {
  return typeof value === "string" && applicationAuthProviderNameSet.has(value);
}

export function parseApplicationAuthProviderName(value: unknown): ApplicationAuthProviderName {
  if (!isApplicationAuthProviderName(value)) {
    throw new Error("Application social provider is unsupported");
  }
  return value;
}

export function getApplicationSocialProviderDefinition(
  provider: ApplicationAuthProviderName,
): ApplicationSocialProviderDefinition {
  return APPLICATION_SOCIAL_PROVIDERS[provider];
}

export function assertApplicationSocialProviderScopes(
  provider: ApplicationAuthProviderName,
  scopes: readonly string[],
): void {
  const approvedScopes = new Set(getApplicationSocialProviderDefinition(provider).approvedScopes);
  if (scopes.some((scope) => !approvedScopes.has(scope))) {
    throw new Error(`Application social provider ${provider} contains an unapproved scope`);
  }
}

export function createApplicationSocialProviderOptions(input: {
  provider: ApplicationAuthProviderName;
  clientId: string;
  clientSecret: string;
  scopes: readonly string[];
  disableSignUp: boolean;
}): NonNullable<BetterAuthOptions["socialProviders"]> {
  const definition = getApplicationSocialProviderDefinition(input.provider);
  const options = definition.createBetterAuthOptions({
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    scopes: input.scopes,
    disableSignUp: input.disableSignUp,
  });
  return {
    [input.provider]: options,
  } as NonNullable<BetterAuthOptions["socialProviders"]>;
}
