# Application auth OAuth/OIDC — operations

This runbook covers the schema, configuration and secret lifecycle plus the
public HTTP, hosted UI, password, email OTP and social account runtime delivered
through Phase 6.

## Public IAM HTTP listener

IAM uses one `ports.iam_http` listener for the public application OAuth/OIDC
routes, internal Admin GraphQL and health endpoints. `ports.admin_graphql` is a
deprecated one-cycle alias; do not configure both keys with different values.

The `application_auth_http` configuration contains:

- `public_base_url` for local/non-secret defaults; `IAM_PUBLIC_BASE_URL`
  overrides it at startup;
- `behind_reverse_proxy`;
- `trusted_proxy_cidrs`, used directly as Fastify's explicit `trustProxy`
  allowlist;
- `external_paths`, which must equal the approved public path manifest.

Production requires `IAM_PUBLIC_BASE_URL` explicitly and requires HTTPS. If
`behind_reverse_proxy=true`, production also
requires a non-empty trusted proxy allowlist. The external proxy must publish
only:

```text
/auth/applications/:applicationId/*
/.well-known/oauth-authorization-server/auth/applications/:applicationId
```

Never publish `/graphql` or a broad `/.well-known/*` prefix. The IAM listener
builds issuer, callbacks and Fetch bridge URLs from `IAM_PUBLIC_BASE_URL`; it
does not trust `Host`, `X-Forwarded-Host` or `X-Forwarded-Proto` for canonical
URL construction.

## Email OTP runtime

Email OTP is present in a realm only when `email_otp_sign_in_enabled=true`.
`email_otp_sign_up_enabled=true` additionally requires signin to be enabled,
and the factory fails closed on the inverse combination. New-user creation also
requires `registration_mode=open`; disabling registration does not prevent an
existing application user from signing in with a valid code.

The public manifest exposes only the following OTP endpoints:

```text
GET  /auth/applications/:applicationId/email-otp
POST /auth/applications/:applicationId/email-otp/request
GET  /auth/applications/:applicationId/email-otp/verify
POST /auth/applications/:applicationId/email-otp/verify
POST /auth/applications/:applicationId/email-otp/send-verification-otp
POST /auth/applications/:applicationId/sign-in/email-otp
```

The send endpoint accepts only `type="sign-in"`. OTP password reset, email
verification and email-change endpoints remain outside the default-deny
manifest. Hosted forms are same-origin, CSRF-bound to the one-time OAuth
authorization context and never put the email or OTP in a URL or browser
storage.

Better Auth is configured with six digits, a five-minute expiry, three
attempts, rotation on resend and `storeOTP="hashed"`. IAM has no OTP worker or
outbox. The callback enqueues only purpose `email_otp_sign_in` through
`ApplicationAuthEmailDeliveryPort`, using the realm's server-selected delivery
profile and template. A missing port/profile prevents the realm instance from
being built; timeout, rejection and malformed handoff responses fail closed.

Production composition must provide an atomic shared
`ApplicationAuthRateLimitPort`. OTP and password-reset operations fail closed
when that backend is unavailable. The OTP baseline is:

- one send per normalized identity and IP every 60 seconds;
- three sends per identity per 15 minutes;
- twenty sends per identity and one hundred per IP per day;
- three verification attempts per sign-in challenge and ten attempts per IP
  per 15 minutes.

Rate-limit keys are realm-specific HMAC values. Email addresses, OTPs and raw
verification identifiers must not be used as backend keys, metrics labels or
log fields. Send responses are generic for existing and absent users and use a
minimum response floor to reduce account-enumeration timing differences.

## Application social providers and account linking

Supported provider IDs, approved scopes, UI localization keys, email contracts,
explicit-link trust metadata and typed Better Auth option builders live only in
`src/auth/applicationSocialProviders.ts`. Google and Facebook are the current
catalog entries; a syntactically valid database value is not supported unless
it is present in this code-owned catalog.

Credentials are loaded per application from encrypted
`application_auth_provider` rows. `application_auth_provider.enabled` is the
only persisted social enable switch; application auth configuration has no
provider-specific flags. The repository reads the application-scoped provider
collection in one query, rejects unknown IDs and unapproved scopes regardless
of enabled state, validates envelope/key versions and decrypts credentials only
for enabled providers. The factory configures Better Auth with
`account.encryptOAuthTokens=true`.
Provider credentials, provider responses and upstream access/refresh tokens
must not be included in responses, operational logs or audit payloads.

The hosted login page starts social sign-in with the same signed, one-time OAuth
authorization context used by password and OTP flows. The public
`/sign-in/social` boundary parses the provider through the catalog and accepts
it only when it is also present in the effective manifest, together with the
signed `oauth_query`; caller-selected callback URLs, ID tokens, scopes,
additional data and signup overrides are rejected. Every enabled provider gets
only exact `GET` and `POST /callback/{provider}` entries. The typed exact
manifest matcher is shared by success/failure audit; callback wildcard and
Better Auth fallback are forbidden. Provider callbacks force a configuration
revision read.

Application users manage links at:

```text
GET  /auth/applications/:applicationId/account/connections
POST /auth/applications/:applicationId/account/connections/link
POST /auth/applications/:applicationId/account/connections/unlink
```

These are same-origin, server-rendered, session-bound and CSRF-protected hosted
routes. They invoke Better Auth's standard `linkSocial()`, `listAccounts()` and
`unlinkAccount()` endpoints internally. The raw Better Auth account-management
paths remain forbidden by the public default-deny manifest, so a caller cannot
override the IAM-calculated return URL or submit the ID-token linking branch.
Link and unlink require a session created less than ten minutes ago. Better
Auth also enforces `allowUnlinkingAll=false`, so the last stored login account
cannot be removed.

Connections UI is generated from catalog metadata plus the user's linked
accounts. Credential accounts are not treated as social. A disabled but linked
catalog provider remains visible for safe unlink, while an unknown linked
provider fails closed as a data-integrity error and never receives a link
action.

Linking policy is fixed to `disableImplicitLinking=true`,
`allowDifferentEmails=false`, `allowUnlinkingAll=false`,
`updateUserInfoOnLink=false` and `trustedProviders=["facebook"]`. Facebook is
trusted only as proof of the explicitly linked Facebook account; it does not
enable email-based implicit linking. A missing/different email, an account
owned by another application user, callback/application mismatch or replayed
state is rejected by the scoped Better Auth flow and shown as a generic hosted
error. When `registration_mode=disabled`, an existing linked account can sign
in, while the first social login cannot create a user, account or session.

Production composition should provide `ApplicationAuthAuditPort` backed by an
append-only sink. Events use the v1 redacted schema and cover provider callback,
link and unlink outcomes. Application-user actor IDs are realm-HMAC values;
only the provider name is permitted in `safeDiff`. Audit delivery failure does
not alter the OAuth response, but the port should persist its failure counter
and alert according to the observability policy.

## Root-key contract

`ApplicationAuthKeyring` consumes a versioned root-key provider. Production
composition must obtain these values from the platform secrets backend. The
development adapter uses the variables below and refuses to initialize when
`NODE_ENV=production`:

- `IAM_APPLICATION_AUTH_ACTIVE_KEY_VERSION` — positive integer;
- `IAM_APPLICATION_AUTH_ROOT_KEYS` — JSON object whose keys are versions and
  whose values are canonical base64-encoded 32-byte keys.

Example shape (the value is intentionally not a real key):

```text
IAM_APPLICATION_AUTH_ACTIVE_KEY_VERSION=1
IAM_APPLICATION_AUTH_ROOT_KEYS={"1":"<base64-encoded-32-byte-secret>"}
```

Migration `0001` assigns version `1` to the idempotent configuration backfill.
Keep version `1` available until every backfilled realm has completed the
controlled realm-secret rotation. Startup fails before opening the IAM listener
if the active version or any version referenced by configuration, provider, or
JWKS rows is unavailable.

Root-key values, provider credentials, decrypted signing keys, OTPs, and tokens
must never be placed in command arguments, migration SQL, logs, audit events, or
database snapshots.

## Initial cutover

The project has no stage/production application-auth data. The Phase 1 migration
therefore uses the following fail-closed cutover:

1. Back up the IAM database and record the migration journal state.
2. Confirm the keyring contains version `1` and the configured active version.
3. Preflight `iam.application_jwks`. It must contain zero rows. The migration
   deliberately aborts if legacy plaintext application signing keys exist.
4. Apply IAM migrations through `shopana-cli`.
   Migration `0002` removes legacy `google_enabled`/`facebook_enabled`, widens
   provider IDs to 64 characters and replaces the semantic DB enum CHECK with a
   syntactic stable-ID CHECK; the code catalog remains the semantic allowlist.
5. Verify every `iam.application` has exactly one
   `application_auth_configuration`; all backfilled realms must have
   `realm_enabled=false` and resource
   `urn:shopana:application:{application_id}`.
6. Verify `application_jwks.private_key` and provider credential columns accept
   only `iam-auth-keyring.v1.*` envelopes with a matching positive key version.
7. Start IAM. Missing referenced root-key versions must prevent startup.

The application/configuration constraint trigger is deferred, so trusted
provisioning creates both records in one transaction. Direct application insert
without configuration and configuration deletion while an application exists
fail at transaction commit. The canonical resource is protected by both a
deterministic CHECK and an immutable-column trigger.

### Non-empty legacy JWKS table

Do not bypass the migration preflight and do not assign a key version to
plaintext. A deployment with legacy rows requires a separately reviewed staged
cutover before applying `0001`:

1. keep the public application-auth listener closed;
2. add a nullable key-version column in an expand step;
3. encrypt every legacy private key through `ApplicationAuthKeyring`, using AAD
   containing `applicationId`, model `jwks`, row id, and field `privateKey`;
4. verify the envelope by decrypting through the same keyring boundary;
5. reject mixed/plaintext rows, then make the version column `NOT NULL` and add
   the ciphertext/version CHECKs from `0001`;
6. continue the normal migration only after the plaintext count is zero.

There is intentionally no permissive mixed-format reader in the scoped adapter.

## Rotation

Realm-secret rotation uses `ApplicationAuthSecretRotationService` and is a
single transaction: update `secret_key_version` and revision, revoke sessions,
authorization contexts, verifications and refresh-token families, remove opaque
access-token rows, commit, then invalidate the local factory instance. The old
root version remains available until all replicas consume the later distributed
invalidation contract.

Encryption-key rotation is an idempotent optimistic batch:

1. add the target version to the keyring without removing the source;
2. call `reencryptStoredSecrets` repeatedly;
3. continue until `remaining=0`;
4. rotate every realm still deriving its Better Auth secret from the source;
5. confirm no configuration/provider/JWKS row references the source version;
6. remove the source from the active keyring in a separate operational change.

An optimistic conflict aborts the batch. Re-read and retry; never overwrite a
concurrently rotated secret.

## Cleanup

`ApplicationAuthorizationContextRepository.cleanup` removes only contexts whose
expiry or consumption timestamp is older than 24 hours. Active contexts have an
immutable ten-minute TTL and are consumed atomically by application id plus the
hash of the browser-held opaque id.

## Rollback

Before any public OAuth/OIDC data exists, rollback means restoring the database
backup and the pre-migration application binary together. Do not keep the new
binary against the old schema.

After any realm, provider, signing key, OAuth client, token, consent, or
authorization context has been created, destructive schema rollback is
forbidden. Set `realm_enabled=false` through the emergency operation, retain all
referenced key versions, and roll forward. Restoring a database snapshot also
requires restoring the exact matching secrets-backend key versions; otherwise
startup must remain fail-closed.
