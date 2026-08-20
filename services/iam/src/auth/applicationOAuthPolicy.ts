export const APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION = 1 as const;

export const APPLICATION_OAUTH_GRANT_TYPES = ["authorization_code", "refresh_token"] as const;

export const APPLICATION_OAUTH_RESPONSE_TYPES = ["code"] as const;

export const APPLICATION_OAUTH_SCOPES = ["openid", "profile", "email", "offline_access"] as const;

export const APPLICATION_OAUTH_CLIENT_METADATA_KEYS = {
  applicationId: "shopana_application_id",
  clientId: "shopana_client_id",
  resource: "shopana_resource",
  protocolPolicyVersion: "shopana_protocol_policy_version",
} as const;

export interface ApplicationOAuthClientPolicyMetadata {
  applicationId: string;
  clientId: string;
  resource: string;
  protocolPolicyVersion: typeof APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION;
}

export function createApplicationOAuthClientPolicyMetadata(input: {
  applicationId: string;
  clientId: string;
  resource: string;
  metadata?: Record<string, unknown> | string | null;
}): Record<string, unknown> {
  const metadata = parseApplicationOAuthClientMetadata(input.metadata);
  assertReservedMetadataValue(
    metadata,
    APPLICATION_OAUTH_CLIENT_METADATA_KEYS.applicationId,
    input.applicationId,
  );
  assertReservedMetadataValue(
    metadata,
    APPLICATION_OAUTH_CLIENT_METADATA_KEYS.clientId,
    input.clientId,
  );
  assertReservedMetadataValue(
    metadata,
    APPLICATION_OAUTH_CLIENT_METADATA_KEYS.resource,
    input.resource,
  );
  assertReservedMetadataValue(
    metadata,
    APPLICATION_OAUTH_CLIENT_METADATA_KEYS.protocolPolicyVersion,
    APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
  );

  return {
    ...metadata,
    [APPLICATION_OAUTH_CLIENT_METADATA_KEYS.applicationId]: input.applicationId,
    [APPLICATION_OAUTH_CLIENT_METADATA_KEYS.clientId]: input.clientId,
    [APPLICATION_OAUTH_CLIENT_METADATA_KEYS.resource]: input.resource,
    [APPLICATION_OAUTH_CLIENT_METADATA_KEYS.protocolPolicyVersion]:
      APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
  };
}

function parseApplicationOAuthClientMetadata(
  value: Record<string, unknown> | string | null | undefined,
): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (typeof value !== "string") return value;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("OAuth client metadata is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OAuth client metadata must be an object");
  }
  return parsed as Record<string, unknown>;
}

export function readApplicationOAuthClientPolicyMetadata(
  metadata: Record<string, unknown> | undefined,
  expected: { applicationId: string; resource: string },
): ApplicationOAuthClientPolicyMetadata {
  const applicationId = metadata?.[APPLICATION_OAUTH_CLIENT_METADATA_KEYS.applicationId];
  const clientId = metadata?.[APPLICATION_OAUTH_CLIENT_METADATA_KEYS.clientId];
  const resource = metadata?.[APPLICATION_OAUTH_CLIENT_METADATA_KEYS.resource];
  const protocolPolicyVersion =
    metadata?.[APPLICATION_OAUTH_CLIENT_METADATA_KEYS.protocolPolicyVersion];

  if (
    applicationId !== expected.applicationId ||
    typeof clientId !== "string" ||
    clientId.length === 0 ||
    resource !== expected.resource ||
    protocolPolicyVersion !== APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION
  ) {
    throw new Error("OAuth client policy metadata is invalid");
  }

  return {
    applicationId,
    clientId,
    resource,
    protocolPolicyVersion,
  };
}

export function hasExactStringValues(value: unknown, expected: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((item, index) => item === expected[index])
  );
}

function assertReservedMetadataValue(
  metadata: Record<string, unknown>,
  key: string,
  expected: unknown,
): void {
  if (Object.prototype.hasOwnProperty.call(metadata, key) && metadata[key] !== expected) {
    throw new Error(`OAuth client metadata field "${key}" is server-owned`);
  }
}
