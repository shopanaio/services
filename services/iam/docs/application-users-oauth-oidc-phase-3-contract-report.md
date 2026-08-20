# Application users OAuth/OIDC — Phase 3 contract report

Date: 2026-07-19  
Versions: `better-auth@1.6.23`, `@better-auth/core@1.6.23`, `@better-auth/oauth-provider@1.6.23`,
`fastify@4.28.1`

This report covers only Phase 3 of `application-users-oauth-oidc-implementation-plan.ru.md`. Hosted
pages and authorization-context resume belong to Phase 4; email OTP UI, social UI and live token
validation remain in their downstream phases.

## One listener and transport isolation

IAM creates one Fastify instance and registers two encapsulated sibling plugins:

- `applicationAuthHttpPlugin` owns public application OAuth/OIDC routes;
- `adminGraphqlPlugin` owns `/graphql` and its admin context middleware.

The public plugin neither receives `buildAdminContextMiddleware` nor creates a platform admin
context. Both transports share the same `Kernel`, database pool, logger, listener and shutdown
lifecycle. Health endpoints remain at the root scope.

The common listener port is `services.iam.ports.iam_http`. The previous `admin_graphql` key remains
a one-cycle fallback and emits a startup warning; conflicting values fail startup.

## Public route boundary

The application catch-all is mounted at:

```text
/auth/applications/:applicationId/*
```

The separate RFC 8414 route is:

```text
GET /.well-known/oauth-authorization-server/auth/applications/:applicationId
```

Every request validates a canonical lowercase UUID, an active realm, application and organization,
then matches the Phase 2 versioned method/path manifest. Unknown methods/paths, OAuth client
management, DCR, consent account management, the JWT `/token` path, disabled application methods and
disabled social providers return `404` before `auth.handler`.

Path selection performs one safe unreserved-character decode and rejects encoded slash/backslash,
raw backslash, NUL, malformed UTF-8/percent encoding, duplicate slash and dot segments. Social
callbacks are concrete Google or Facebook paths from the effective manifest; no callback prefix
wildcard is accepted.

## Raw bridge and HTTP policy

The public Fastify scope replaces JSON parsing and adds scoped raw-buffer parsers for JSON, form
data and otherwise unsupported media types. The maximum body is 64 KiB. The boundary validates the
selected endpoint's media type and rejects unsupported charset/content encoding, invalid UTF-8,
malformed JSON or form encoding, NUL and oversized bodies before Better Auth.

`/oauth2/token`, introspection and revocation accept only `application/x-www-form-urlencoded`.
Better Auth receives the original raw query substring and original body bytes; the guard parses a
separate copy. Fetch responses preserve status, redirect location, response bytes and all individual
`Set-Cookie` values.

The Fetch URL and `Host` are built only from the validated public base URL. Incoming forwarded
host/proto values are removed. The bridge forwards only the client IP already resolved by Fastify's
explicit trusted-proxy allowlist.

## Mandatory resource guard

`ApplicationOAuthResourcePolicyGuard` runs before Better Auth for:

- `GET /oauth2/authorize`;
- authorization-code `POST /oauth2/token`;
- refresh-token `POST /oauth2/token`.

It requires exactly one non-empty byte-equal application resource, rejects duplicate security
parameters, resolves `client_id` from the form or HTTP Basic username and rejects conflicting
sources. The selected client is read without secret material through
`ApplicationOAuthClientRepository`, with active realm/application/organization/client predicates and
the immutable IAM policy: resource, protocol version, grants, response type, PKCE and reserved
metadata.

Missing, empty, duplicate, foreign or mismatched resources return `invalid_target` before
authorization-code consumption, refresh rotation or opaque access-token creation. Client secrets,
codes and refresh tokens remain owned and validated by OAuth Provider.

## Metadata, CORS and external exposure

Issuer-relative OIDC/OAuth metadata and the root RFC 8414 response are checked against the same
canonical issuer and endpoints. IAM enforces:

- grants `authorization_code`, `refresh_token` only;
- response type `code` only;
- PKCE method `S256` only;
- token endpoint authentication `none`, `client_secret_basic`, `client_secret_post`;
- no registration endpoint and no `client_credentials` advertisement.

CORS never uses `*`. Browser origins are matched exactly against the realm's trusted origins or the
canonical IAM origin. Cross-site social callback navigations may complete without CORS response
headers and remain protected by the provider/state flow. Preflight methods and headers are
allowlisted against the same effective route manifest.

The validated external reverse-proxy path manifest is exactly:

```text
/auth/applications/:applicationId/*
/.well-known/oauth-authorization-server/auth/applications/:applicationId
```

`/graphql` and all other root `/.well-known/*` paths are absent. Production startup requires an
explicit manifest, an HTTPS `IAM_PUBLIC_BASE_URL`, and a non-empty trusted proxy allowlist when
`behind_reverse_proxy=true`.

## Errors and logging

Boundary errors contain an OAuth-style code, safe description and request ID. Logs contain request
ID, method, route template, status and error class only; raw query, form values, authorization code,
client secret, OTP and token values are never logged.

## Verification

The IAM production build was run through `shopana-cli` after implementation:

```text
yarn shopana build -s iam
Type check passed
Built dist/iam.module.js
```

Admin/storefront federation composition was also run through `shopana-cli` with a temporary output
path. The admin subgraph resolver accepted `ports.iam_http`, and composition completed successfully.

Per repository instructions, standalone `test` and `tsc` commands were not run, and no changeset
file was edited.
