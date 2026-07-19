import {
  parseApplicationAuthProviderName,
  type ApplicationAuthProviderName,
} from "./applicationSocialProviders.js";
import type { EffectiveApplicationAuthPolicy } from "./applicationAuthConfiguration.js";
import { APPLICATION_AUTH_UI_STYLE_PATH } from "../api/http/application-auth/ui/assets.js";

export type ApplicationAuthHttpMethod = "GET" | "POST";

export interface ApplicationAuthRouteManifestEntry {
  method: ApplicationAuthHttpMethod;
  path: string;
  pathKind: "exact" | "reset-token" | "social-callback";
}

export interface EffectiveApplicationAuthRouteManifest {
  version: "better-auth-1.6.23+oauth-provider-1.6.23";
  allowedRoutes: readonly ApplicationAuthRouteManifestEntry[];
  allowedSocialProviders: readonly ApplicationAuthProviderName[];
}

const OAUTH_PROTOCOL_ROUTES: readonly ApplicationAuthRouteManifestEntry[] = [
  exact("GET", "/.well-known/oauth-authorization-server"),
  exact("GET", "/.well-known/openid-configuration"),
  exact("GET", "/oauth2/authorize"),
  exact("POST", "/oauth2/consent"),
  exact("POST", "/oauth2/continue"),
  exact("POST", "/oauth2/token"),
  exact("POST", "/oauth2/introspect"),
  exact("POST", "/oauth2/revoke"),
  exact("GET", "/oauth2/userinfo"),
  exact("POST", "/oauth2/userinfo"),
  exact("GET", "/oauth2/end-session"),
  exact("GET", "/jwks"),
];

const HOSTED_UI_BASE_ROUTES: readonly ApplicationAuthRouteManifestEntry[] = [
  exact("GET", "/login"),
  exact("GET", "/consent"),
  exact("POST", "/consent"),
  exact("GET", "/logout"),
  exact("POST", "/logout"),
  exact("GET", "/error"),
  exact("GET", "/verification-pending"),
  exact("GET", "/verified"),
  exact("GET", "/account-created"),
  exact("GET", "/account/connections"),
  exact("POST", "/account/connections/link"),
  exact("POST", "/account/connections/unlink"),
  exact("GET", APPLICATION_AUTH_UI_STYLE_PATH),
];

/** Paths which must remain denied even though the installed plugins own them. */
export const APPLICATION_AUTH_FORBIDDEN_ROUTES: readonly ApplicationAuthRouteManifestEntry[] =
  [
    exact("GET", "/oauth2/public-client"),
    exact("POST", "/oauth2/public-client-prelogin"),
    exact("POST", "/oauth2/register"),
    exact("POST", "/oauth2/create-client"),
    exact("GET", "/oauth2/get-client"),
    exact("GET", "/oauth2/get-clients"),
    exact("POST", "/oauth2/update-client"),
    exact("POST", "/oauth2/client/rotate-secret"),
    exact("POST", "/oauth2/delete-client"),
    exact("GET", "/oauth2/get-consent"),
    exact("GET", "/oauth2/get-consents"),
    exact("POST", "/oauth2/update-consent"),
    exact("POST", "/oauth2/delete-consent"),
    exact("POST", "/email-otp/check-verification-otp"),
    exact("POST", "/email-otp/verify-email"),
    exact("POST", "/email-otp/request-password-reset"),
    exact("POST", "/email-otp/reset-password"),
    exact("POST", "/forget-password/email-otp"),
    exact("POST", "/email-otp/request-email-change"),
    exact("POST", "/email-otp/change-email"),
    exact("POST", "/link-social"),
    exact("GET", "/list-accounts"),
    exact("POST", "/unlink-account"),
    exact("GET", "/token"),
  ];

export function createEffectiveApplicationAuthRouteManifest(input: {
  policy: EffectiveApplicationAuthPolicy;
  emailVerificationEnabled: boolean;
  enabledSocialProviders: readonly ApplicationAuthProviderName[];
}): EffectiveApplicationAuthRouteManifest {
  const enabledSocialProviders = input.enabledSocialProviders.map(
    parseApplicationAuthProviderName
  );
  if (
    new Set(enabledSocialProviders).size !== enabledSocialProviders.length
  ) {
    throw new Error("Enabled application social providers are duplicated");
  }
  const allowedRoutes = [...OAUTH_PROTOCOL_ROUTES, ...HOSTED_UI_BASE_ROUTES];

  if (input.policy.passwordSignInAllowed) {
    allowedRoutes.push(
      exact("POST", "/sign-in/email"),
      exact("POST", "/login/password")
    );
  }
  if (input.policy.passwordSignUpAllowed) {
    allowedRoutes.push(
      exact("GET", "/signup"),
      exact("POST", "/sign-up/email"),
      exact("POST", "/signup/password")
    );
  }
  if (input.policy.passwordResetAllowed) {
    allowedRoutes.push(
      exact("GET", "/password/forgot"),
      exact("POST", "/password/forgot"),
      exact("GET", "/password/reset"),
      exact("POST", "/password/reset"),
      exact("POST", "/request-password-reset"),
      {
        method: "GET",
        path: "/reset-password/:token",
        pathKind: "reset-token",
      },
      exact("POST", "/reset-password")
    );
  }
  if (input.emailVerificationEnabled) {
    allowedRoutes.push(
      exact("POST", "/verification/resend"),
      exact("POST", "/send-verification-email"),
      exact("GET", "/verify-email")
    );
  }
  if (input.policy.emailOtpSignInAllowed) {
    allowedRoutes.push(
      exact("GET", "/email-otp"),
      exact("POST", "/email-otp/request"),
      exact("GET", "/email-otp/verify"),
      exact("POST", "/email-otp/verify"),
      exact("POST", "/email-otp/send-verification-otp"),
      exact("POST", "/sign-in/email-otp")
    );
  }
  if (enabledSocialProviders.length > 0) {
    allowedRoutes.push(exact("POST", "/sign-in/social"));
    allowedRoutes.push(exact("POST", "/login/social"));
    for (const provider of enabledSocialProviders) {
      allowedRoutes.push(
        {
          method: "GET",
          path: `/callback/${provider}`,
          pathKind: "social-callback",
        },
        {
          method: "POST",
          path: `/callback/${provider}`,
          pathKind: "social-callback",
        }
      );
    }
  }

  return Object.freeze({
    version: "better-auth-1.6.23+oauth-provider-1.6.23",
    allowedRoutes: Object.freeze(
      allowedRoutes.map((route) => Object.freeze({ ...route }))
    ),
    allowedSocialProviders: Object.freeze([
      ...enabledSocialProviders,
    ]),
  });
}

function exact(
  method: ApplicationAuthHttpMethod,
  path: string
): ApplicationAuthRouteManifestEntry {
  return { method, path, pathKind: "exact" };
}
