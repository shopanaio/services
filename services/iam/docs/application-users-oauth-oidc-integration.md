# Application auth OAuth/OIDC — Phase 1 operations

This runbook covers only the schema, configuration, and secret lifecycle added
in Phase 1 plus the public HTTP listener configuration added in Phase 3.

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
