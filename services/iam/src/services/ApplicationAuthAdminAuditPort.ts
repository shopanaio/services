export const APPLICATION_AUTH_ADMIN_AUDIT_PORT = Symbol.for(
  "shopana.iam.application-auth-admin-audit-port"
);

export type ApplicationAuthAdminAuditAction =
  | "oauth_client_create"
  | "oauth_client_update"
  | "oauth_client_enabled_set"
  | "oauth_client_skip_consent_set"
  | "oauth_client_secret_rotate"
  | "oauth_client_archive";

export type ApplicationAuthAdminAuditReasonCategory =
  | "success"
  | "unauthenticated"
  | "forbidden"
  | "scope_not_found"
  | "client_not_found"
  | "invalid_input"
  | "invalid_uri"
  | "first_party_required"
  | "invalid_client_state"
  | "revision_conflict"
  | "audit_unavailable"
  | "internal_error";

/**
 * Closed, deliberately non-secret diff for OAuth client administration.
 * URI values are represented only by counts; full URIs and query strings are
 * never admitted to the audit schema.
 */
export interface ApplicationOAuthClientAdminAuditSafeDiff {
  clientType?: "public" | "confidential";
  environment?: "development" | "production";
  enabled?: boolean;
  skipConsent?: boolean;
  enableEndSession?: boolean;
  redirectUriCount?: number;
  postLogoutRedirectUriCount?: number;
  changedFields?: readonly (
    | "name"
    | "environment"
    | "redirectUris"
    | "postLogoutRedirectUris"
    | "enableEndSession"
    | "enabled"
    | "skipConsent"
    | "clientSecret"
    | "archived"
  )[];
}

export interface ApplicationAuthAdminAuditRecord {
  recordId: string;
  schemaVersion: 1;
  occurredAt: string;
  category: "application_auth_admin";
  action: ApplicationAuthAdminAuditAction;
  outcome: "success" | "failure";
  reasonCategory: ApplicationAuthAdminAuditReasonCategory;
  actorType: "platform_admin";
  actorId: string;
  organizationId: string;
  applicationId: string;
  targetType: "oauth_client";
  targetId?: string;
  requestId: string;
  safeDiff: Readonly<ApplicationOAuthClientAdminAuditSafeDiff>;
}

/**
 * Durable fail-closed administrative audit boundary.
 *
 * A success append invoked inside the IAM transaction must either participate
 * in that ambient transaction or provide equivalent atomic acknowledgement.
 * Implementations must be idempotent by `recordId` and must not log payloads
 * rejected by their transport.
 */
export interface ApplicationAuthAdminAuditPort {
  append(record: ApplicationAuthAdminAuditRecord): Promise<void>;
}
