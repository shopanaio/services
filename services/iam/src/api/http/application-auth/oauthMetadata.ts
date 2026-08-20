import {
  APPLICATION_OAUTH_GRANT_TYPES,
  APPLICATION_OAUTH_RESPONSE_TYPES,
  APPLICATION_OAUTH_SCOPES,
  hasExactStringValues,
} from "../../../auth/applicationOAuthPolicy.js";

const TOKEN_ENDPOINT_AUTH_METHODS = ["none", "client_secret_basic", "client_secret_post"] as const;

/**
 * Validate plugin metadata against IAM protocol policy, then publish the
 * IAM-owned representation. The explicit `none` advertisement supports the
 * confirmed public-client contract without enabling DCR.
 */
export async function enforceApplicationOAuthMetadata(
  response: Response,
  input: {
    applicationId: string;
    publicBaseUrl: string;
    oidc: boolean;
  },
): Promise<Response> {
  if (response.status !== 200) return response;

  let metadata: Record<string, unknown>;
  try {
    const parsed = await response.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Metadata response is not an object");
    }
    metadata = parsed as Record<string, unknown>;
  } catch {
    throw new Error("Application OAuth metadata response is invalid");
  }

  const issuer = `${input.publicBaseUrl}/auth/applications/${input.applicationId}`;
  const expectedEndpoints: Record<string, string> = {
    issuer,
    authorization_endpoint: `${issuer}/oauth2/authorize`,
    token_endpoint: `${issuer}/oauth2/token`,
    jwks_uri: `${issuer}/jwks`,
    introspection_endpoint: `${issuer}/oauth2/introspect`,
    revocation_endpoint: `${issuer}/oauth2/revoke`,
    ...(input.oidc
      ? {
          userinfo_endpoint: `${issuer}/oauth2/userinfo`,
          end_session_endpoint: `${issuer}/oauth2/end-session`,
        }
      : {}),
  };
  for (const [field, expected] of Object.entries(expectedEndpoints)) {
    if (metadata[field] !== expected) {
      throw new Error(`Application OAuth metadata field "${field}" conflicts with IAM policy`);
    }
  }
  if (metadata.registration_endpoint !== undefined) {
    throw new Error("Application OAuth metadata unexpectedly advertises DCR");
  }
  if (
    !hasExactStringValues(metadata.scopes_supported, APPLICATION_OAUTH_SCOPES) ||
    !hasExactStringValues(metadata.grant_types_supported, APPLICATION_OAUTH_GRANT_TYPES) ||
    !hasExactStringValues(metadata.response_types_supported, APPLICATION_OAUTH_RESPONSE_TYPES) ||
    !hasExactStringValues(metadata.code_challenge_methods_supported, ["S256"])
  ) {
    throw new Error("Application OAuth metadata protocol policy is invalid");
  }
  const advertisedAuthMethods = metadata.token_endpoint_auth_methods_supported;
  if (
    !Array.isArray(advertisedAuthMethods) ||
    !advertisedAuthMethods.includes("client_secret_basic") ||
    !advertisedAuthMethods.includes("client_secret_post") ||
    advertisedAuthMethods.some(
      (method) =>
        typeof method !== "string" ||
        !TOKEN_ENDPOINT_AUTH_METHODS.includes(
          method as (typeof TOKEN_ENDPOINT_AUTH_METHODS)[number],
        ),
    )
  ) {
    throw new Error("Application OAuth metadata client authentication policy is invalid");
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json; charset=utf-8");
  const ownedMetadata: Record<string, unknown> = {
    ...metadata,
    ...expectedEndpoints,
    scopes_supported: [...APPLICATION_OAUTH_SCOPES],
    grant_types_supported: [...APPLICATION_OAUTH_GRANT_TYPES],
    response_types_supported: [...APPLICATION_OAUTH_RESPONSE_TYPES],
    token_endpoint_auth_methods_supported: [...TOKEN_ENDPOINT_AUTH_METHODS],
    code_challenge_methods_supported: ["S256"],
  };
  delete ownedMetadata.registration_endpoint;

  return new Response(JSON.stringify(ownedMetadata), {
    status: 200,
    headers,
  });
}
