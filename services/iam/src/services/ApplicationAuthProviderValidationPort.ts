import type { ApplicationAuthProviderName } from "../auth/applicationSocialProviders.js";

export const APPLICATION_AUTH_PROVIDER_VALIDATION_PORT = Symbol.for(
  "shopana.iam.application-auth-provider-validation-port"
);

export interface ApplicationAuthProviderValidationRequest {
  provider: ApplicationAuthProviderName;
  clientId: string;
  clientSecret: string;
  scopes: readonly string[];
}

export type ApplicationAuthProviderValidationOutcome =
  | { status: "valid"; reasonCode?: never }
  | { status: "invalid"; reasonCode: string }
  | { status: "unavailable"; reasonCode: string };

/**
 * Provider-specific credential verification boundary.
 * Implementations must never log the request or include upstream payloads in
 * errors. Structural decryption alone must not return `valid`.
 */
export interface ApplicationAuthProviderValidationPort {
  validate(
    request: ApplicationAuthProviderValidationRequest
  ): Promise<ApplicationAuthProviderValidationOutcome>;
}

/** Honest fallback used until an upstream-safe validator is configured. */
export const unavailableApplicationAuthProviderValidationPort: ApplicationAuthProviderValidationPort =
  Object.freeze({
    async validate() {
      return {
        status: "unavailable" as const,
        reasonCode: "PROVIDER_VALIDATION_NOT_CONFIGURED",
      };
    },
  });
