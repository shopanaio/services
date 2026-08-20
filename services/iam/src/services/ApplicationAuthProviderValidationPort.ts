import type { ApplicationAuthProviderName } from "../auth/applicationSocialProviders.js";

export const APPLICATION_AUTH_PROVIDER_VALIDATION_PORT = Symbol.for(
  "shopana.iam.application-auth-provider-validation-port",
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
    request: ApplicationAuthProviderValidationRequest,
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

/**
 * Deterministic adapter enabled explicitly by the isolated E2E runtime.
 *
 * It exercises all validation outcomes without making external provider
 * requests or embedding real credentials in the test environment.
 */
export const e2eApplicationAuthProviderValidationPort: ApplicationAuthProviderValidationPort =
  Object.freeze({
    async validate(request: ApplicationAuthProviderValidationRequest) {
      if (request.clientId === "e2e-provider-valid") {
        return { status: "valid" as const };
      }
      if (request.clientId === "e2e-provider-invalid") {
        return {
          status: "invalid" as const,
          reasonCode: "PROVIDER_CREDENTIALS_REJECTED",
        };
      }
      return {
        status: "unavailable" as const,
        reasonCode: "PROVIDER_VALIDATION_UNAVAILABLE",
      };
    },
  });
