export const APPLICATION_AUTH_ADMIN_AUDIT_PORT = Symbol.for(
  "shopana.iam.application-auth-admin-audit-port"
);

export type ApplicationAuthAdminAuditAction =
  | "application_create"
  | "application_update"
  | "application_archive"
  | "auth_configuration_update"
  | "auth_realm_enabled_set"
  | "auth_method_update"
  | "provider_configure"
  | "provider_update"
  | "provider_credentials_rotate"
  | "provider_credentials_delete"
  | "provider_validate"
  | "oauth_client_create"
  | "oauth_client_update"
  | "oauth_client_enabled_set"
  | "oauth_client_skip_consent_set"
  | "oauth_client_secret_rotate"
  | "oauth_client_archive"
  | "application_user_block"
  | "application_user_unblock"
  | "application_user_sessions_revoke_all"
  | "application_user_account_unlink"
  | "application_user_privacy_delete";

export type ApplicationAuthAdminAuditReasonCategory =
  | "success"
  | "authorization"
  | "unauthenticated"
  | "forbidden"
  | "scope_not_found"
  | "client_not_found"
  | "target_not_found"
  | "invalid_input"
  | "invalid_uri"
  | "first_party_required"
  | "invalid_client_state"
  | "invalid_target_state"
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

/** Closed, secret-free diff shared by the remaining realm mutations. */
export interface ApplicationRealmAdminAuditSafeDiff {
  changedFields?: readonly (
    | "name"
    | "displayName"
    | "description"
    | "realmEnabled"
    | "registrationMode"
    | "emailVerificationRequired"
    | "accessTokenTtlSeconds"
    | "idTokenTtlSeconds"
    | "refreshTokenTtlSeconds"
    | "sessionTtlSeconds"
    | "branding"
    | "defaultLocale"
    | "trustedOrigins"
    | "emailDelivery"
    | "credentials"
    | "scopes"
    | "enabled"
    | "status"
    | "sessions"
    | "linkedAccount"
  )[];
  enabled?: boolean;
  status?: "active" | "blocked" | "archived";
  provider?: "google" | "facebook";
  methodId?: "password" | "email_otp" | "phone_otp";
  enabledCapabilities?: readonly (
    | "sign_in"
    | "sign_up"
    | "password_reset"
  )[];
  enabledMethods?: readonly ("password" | "email_otp" | "phone_otp")[];
  trustedOriginCount?: number;
  scopeCount?: number;
  revokedCount?: number;
  blockedByServiceLinkedBinding?: boolean;
  resourceKind?: string;
  linkedService?: string;
  linkedOwnerType?: string;
  serviceLinkedBindingCreated?: boolean;
}

export type ApplicationAuthAdminAuditSafeDiff =
  | ApplicationOAuthClientAdminAuditSafeDiff
  | ApplicationRealmAdminAuditSafeDiff;

export interface ApplicationAuthAdminAuditRecord {
  recordId: string;
  schemaVersion: 1;
  occurredAt: string;
  category: "application_auth_admin" | "iam_resource_admin";
  action: ApplicationAuthAdminAuditAction;
  outcome: "success" | "failure";
  reasonCategory: ApplicationAuthAdminAuditReasonCategory;
  actorType: "platform_admin" | "external_service" | "anonymous";
  actorId: string | null;
  /** Null only when malformed GraphQL input cannot identify a tenant. */
  organizationId: string | null;
  /** Null only when validation fails before a target can be resolved. */
  applicationId: string | null;
  targetType:
    | "application"
    | "auth_configuration"
    | "auth_method"
    | "provider"
    | "oauth_client"
    | "application_user"
    | "linked_account";
  targetId?: string;
  requestId: string;
  safeDiff: Readonly<ApplicationAuthAdminAuditSafeDiff>;
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
