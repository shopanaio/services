# Application users OAuth/OIDC — Phase 2 contract report

Date: 2026-07-19  
Versions: `better-auth@1.6.23`, `@better-auth/core@1.6.23`, `@better-auth/oauth-provider@1.6.23`

This report covers only Phase 2 of `application-users-oauth-oidc-implementation-plan.ru.md`. Public
Fastify routes, the raw Fetch bridge, the mandatory resource guard, hosted UI and live token
validation remain closed for their downstream phases.

## Production composition

`ApplicationAuthFactory` loads an active application/organization realm from
`ApplicationAuthConfigurationRepository`, validates the persisted mutable configuration, origins,
delivery profile and decrypted provider credentials, and performs a final revision/key-version read
before constructing Better Auth. A missing realm, root-key version, provider secret, delivery
dependency or invalid configuration fails the request; a cached/default instance is not used as a
fallback.

The resulting application instance has:

- one canonical base path, issuer, cookie prefix, realm secret and JWKS scope;
- JWT, OAuth Provider and optional email OTP plugins;
- OAuth scopes `openid profile email offline_access`;
- `validAudiences=[application.resource]` and JWT enabled;
- global grants `authorization_code` and `refresh_token` only;
- `/token` from the JWT plugin disabled;
- dynamic/unauthenticated client registration and public pre-login disabled;
- session-authenticated OAuth client privileges denied defense-in-depth;
- encrypted upstream account tokens and explicit-only account linking;
- password, OTP and social `disableSignUp` derived from the same effective `registration_mode`
  policy;
- password signup `autoSignIn` derived independently from password signin;
- application TTLs applied to access, ID, refresh and session tokens.

`createEffectiveApplicationAuthRouteManifest` produces a versioned method/path allowlist for the
exact enabled composition. Password signup/signin/reset, email verification, email OTP and
Google/Facebook callback entries are added independently. OAuth client/consent management, DCR,
public-client helpers and the JWT `/token` endpoint are explicitly classified as forbidden. Phase 3
owns normalization and enforcement at the Fastify boundary.

## Scoped adapter operation matrix

The application schema map and scoped model set include `oauthClient`, `oauthRefreshToken`,
`oauthAccessToken` and `oauthConsent` in addition to user, account, session, verification and JWKS.

| Operation               | Scope and invariant                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create`                | Injects trusted `applicationId`; rejects a foreign input id; verifies active organization/application/realm; checks related client/user/session/refresh rows in the same application. |
| `findOne`               | Appends active realm and exact application predicates outside the caller condition group; active-user and active-client predicates are added where applicable.                        |
| `findMany`              | Applies the same predicates before sort/limit/offset and rejects native joins so Better Auth fallback joins cannot bypass the raw scoped adapter.                                     |
| `count`                 | Counts only rows selected by the same application and active-realm predicates.                                                                                                        |
| `update`                | Selects by caller conditions plus application predicates; rejects foreign application input and OAuth client policy/metadata mutation; validates any changed relation.                |
| `updateMany`            | Uses the same scoped predicate and relation validation; bulk private-JWKS mutation and OAuth client policy mutation remain forbidden.                                                 |
| `delete` / `deleteMany` | Deletes only rows matched by caller conditions plus active application scope.                                                                                                         |
| `consumeOne`            | Selects the single target through the scoped predicate before atomic delete.                                                                                                          |
| `incrementOne`          | Selects through scoped conditions, preserves comparison guards and rejects server-owned OAuth policy changes in the `set` payload.                                                    |
| `transaction`           | Recreates the same scoped custom adapter over the transaction connection; plugin operations do not fall back to an unscoped adapter.                                                  |

Better Auth 1.6.23 represents compound where input as a flat list with `AND`/`OR` connectors. The
adapter groups caller `AND` and `OR` expressions, then appends application/active-state predicates
outside that group. A caller cannot place the tenant predicate under its own `OR` branch.

For OAuth clients the adapter always writes:

```text
resourceAudience = urn:shopana:application:{applicationId}
grantTypes = [authorization_code, refresh_token]
responseTypes = [code]
requirePKCE = true
protocolPolicyVersion = 1
```

The same values are recorded in server-owned client metadata used by the custom claims policy.
Attempts to provide a foreign resource/application, expand grants/responses, disable PKCE or alter
the reserved metadata fail closed. Access/ID token custom claims accept only a scoped application
user and matching client metadata; arbitrary client metadata is not copied into signed claims.

## Email callback contract

`ApplicationAuthEmailDeliveryPort` has a typed purpose union:

- `email_verification_link`;
- `password_reset_link`;
- `email_otp_sign_in`.

Callbacks are attached only when their persisted flow is enabled. OTP accepts only Better Auth
`type="sign-in"`; other OTP purposes fail before the port. Requests use the server-selected delivery
profile/template, normalized recipient, deterministic non-PII idempotency key and a three-second
handoff timeout. IAM performs no inline retry and stores/logs no OTP, URL or token.

## Cache and invalidation contract

The cache key is effectively `applicationId + revision + secretKeyVersion`. Every entry has:

- a database revision recheck no later than 30 seconds;
- a hard TTL no longer than five minutes;
- LRU size eviction;
- single-flight rebuild per application;
- an invalidation generation that prevents an in-flight stale rebuild from re-entering the cache
  after an event or shutdown;
- an event-shaped `invalidate({applicationId, revision, changeType})` entry point plus the existing
  direct invalidator used by realm-secret rotation.
- a `forceRevisionCheck` request option for refresh/provider callback routes, so the Phase 3 HTTP
  boundary can require a database revision read before handing a security-sensitive request to
  Better Auth.

Consequently, replica-local invalidation can be immediate when the composition delivers the revision
event, while a lost event is bounded by the 30-second database revision recheck. A failed reload
never serves the prior entry for the request that observed the failure.

## Isolation result

For two simultaneously cached applications, every persistence predicate, realm secret, cookie
prefix, issuer, provider credentials, JWKS encryption AAD, resource, OAuth client policy metadata
and route manifest is derived from that application's trusted route/repository scope. A user,
client, token, consent, session, provider secret or key from application A cannot satisfy adapter or
claims validation for application B.

## Verification

The IAM production build was run through `shopana-cli` after implementation:

```text
yarn shopana build -s iam
Type check passed
Built dist/iam.module.js
```

Per repository instructions, standalone `test` and `tsc` commands were not run, and no changeset
file was edited.
