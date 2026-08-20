# Application users OAuth/OIDC — Phase 7 contract report

Date: 2026-07-19  
Versions: `better-auth@1.6.23`, `@better-auth/core@1.6.23`, `@better-auth/oauth-provider@1.6.23`,
`jose@6.1.3`

This report covers Phase 7 of `application-users-oauth-oidc-implementation-plan.ru.md`.

## JWT-only claims contract

OAuth access tokens are accepted by IAM only when all of the following are true:

- compact JWS with protected `alg=EdDSA` and a known application-scoped `kid`;
- signature verifies against the scoped public JWKS row;
- scalar `iss` equals the canonical application issuer;
- scalar `aud` equals the immutable `application.resource`;
- `application_id` equals the route/validation application;
- `actor_type=application_user`;
- non-empty `sub`, `client_id`, `azp`, `sid`, `token_family_id` and `scope`;
- `client_id=azp`, `iat` is not in the future and `exp` is not expired;
- every scope belongs to the fixed v1 registry.

OAuth Provider 1.6.23 normally adds the UserInfo endpoint as a second access token audience for an
`openid` request. The Phase 7 compatibility shim reuses Better Auth's own `signJWT`, scoped adapter
and encrypted JWKS lifecycle and normalizes only access-token payloads identified by `azp` to the
single IAM resource. ID tokens have no `azp` in this composition and retain the standard OAuth
client audience. The compatibility ADR records this installed-version fact and the removal condition
for the shim.

Every authorization grant receives an unguessable `token_family_id` through the provider's
`referenceId`; rotation preserves it in the refresh family. Opaque access tokens, userless tokens
and tokens without the mandatory claims fail closed.

## Domain validation contract

`ApplicationTokenValidationService` exports the typed contract:

```text
validate({ token, expectedApplicationId, expectedAudience }) ->
  { active: true, applicationId, userId, clientId, sessionId,
    tokenFamilyId, scopes, issuer, audience, issuedAt, expiresAt,
    actorType: "application_user", cacheUntil }
| { active: false, reasonCategory, cacheUntil }
```

The closed reason enum is exactly:

```text
malformed | signature_invalid | expired | issuer_mismatch |
audience_mismatch | application_inactive | client_inactive |
user_inactive | session_inactive | token_family_revoked
```

The live-state repository checks the active organization/application realm, the immutable client
resource and client state, application user status, application-scoped unexpired session and, for
`offline_access`, an unrevoked unexpired refresh row from the same client/user/session/family. A
foreign application key, issuer, audience, client, user, session or family cannot satisfy the
combined predicates. Missing keys/claims and database failures are inactive; raw tokens are never
logged and are hashed before cache lookup.

## Cache and invalidation

Positive validation entries expire no later than `min(exp, now + 30s)`. Negative entries expire
after at most five seconds. Cache keys contain the expected application/audience plus a SHA-256
token digest, never the token.

`ApplicationAuthLiveStateInvalidationBus` performs immediate local fan-out and supports an injected
distributed publish/subscribe port for other replicas. Events can target application, client, user,
session or token family. Block, hosted logout, Better Auth session deletion/password-reset
revocation, realm disable, realm-secret rotation and OAuth revocation evict the matching entries.
Transport failure falls back to the 30-second database reread ceiling and does not undo an already
committed security-state change.

## Refresh and revocation lifecycle

Refresh requests are force-checked against current application/client/user/ session/family state
before OAuth Provider rotates a row. A previously revoked refresh token is deliberately handed to
OAuth Provider so its RFC 9700 replay handling can invalidate the family; other inactive states
return `invalid_grant` before issuance.

Blocking an application user revokes and detaches refresh rows, removes opaque rows and sessions in
one transaction. Session deletion performs the same token cleanup before the scoped session FK is
removed. Realm-secret rotation uses the same ordering. JWT access-token revocation revokes its
refresh family, or the session when the token has no `offline_access`; refresh-token persistence and
rotation remain owned by OAuth Provider.

## Standard introspection binding

`POST /oauth2/introspect` remains the OAuth Provider protocol endpoint and therefore retains its
confidential-client authentication and token parsing. An `active=true` provider result is passed
through `ApplicationTokenValidationService`; IAM returns either a safe RFC 7662 active projection or
exactly `{ "active": false }`. The internal reason category, tenant state and dependency failure are
never returned to the OAuth client.

## Executable matrix boundaries

The implementation exposes deterministic seams for the required matrix:

- injected clock, validation repository and invalidation bus;
- exact application/key/issuer/audience/claim checks before live state;
- application/client/user/session/family predicates in one scoped read;
- refresh preflight and introspection/revocation bindings at the public HTTP boundary;
- forced 5/30-second cache ceilings independent of transport availability.

Per repository instructions, standalone `test` and `tsc` commands were not run. The IAM production
build was run through `shopana-cli` after the final implementation:

```text
yarn shopana build -s iam
Type check passed
Built dist/iam.module.js
```

No changeset file was edited.
