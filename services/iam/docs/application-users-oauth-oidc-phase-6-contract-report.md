# Application users OAuth/OIDC — Phase 6 contract report

Date: 2026-07-19  
Versions: `better-auth@1.6.23`, `@better-auth/core@1.6.23`,
`@better-auth/oauth-provider@1.6.23`

This report covers Phase 6 of
`application-users-oauth-oidc-implementation-plan.ru.md`. IAM live token
validation and token-family lifecycle remain in Phase 7.

## Social provider composition

The application-scoped factory loads only enabled Google/Facebook credentials
from the encrypted configuration repository, validates provider-specific scope
allowlists and fails closed when credentials or referenced root-key versions
are unavailable. Each provider receives `disableSignUp` from the effective
policy, including the global `registration_mode=disabled` override.

Better Auth is configured with:

```text
account.encryptOAuthTokens = true
account.accountLinking.enabled = true
account.accountLinking.disableImplicitLinking = true
account.accountLinking.allowDifferentEmails = false
account.accountLinking.allowUnlinkingAll = false
account.accountLinking.updateUserInfoOnLink = false
account.accountLinking.trustedProviders = ["facebook"]
session.freshAge = 600
```

The Facebook trusted-provider entry affects only explicit authenticated
`linkSocial()` verification. It cannot enable implicit email linking because
implicit linking is globally disabled.

## Hosted social sign-in

The hosted login page exposes only providers enabled for that application. Its
same-origin form uses a CSRF token bound to the one-time authorization context,
rotates that context before dispatch, and calls Better Auth `/sign-in/social`
with only `provider` and the signed `oauth_query`. The browser then receives a
303 redirect to the provider.

The public `/sign-in/social` boundary rejects caller-supplied `callbackURL`,
`errorCallbackURL`, `idToken`, scope overrides, `additionalData` and signup
overrides. Google/Facebook callback paths are exact manifest entries, are scoped
to the application instance and force a configuration revision check. Better
Auth's stored state is application-scoped, expires after ten minutes and is
consumed on callback, which rejects issuer/application mismatch and replay.

Provider callbacks without email, disabled-signup first login, matching-email
implicit-link attempts and provider failures return only the generic hosted
error UI. Better Auth logging is disabled for application realms, so provider
responses and tokens are not written by the runtime.

## Explicit link and unlink

Application users manage social connections through three exact hosted routes:

```text
GET  /account/connections
POST /account/connections/link
POST /account/connections/unlink
```

The routes require the application session, exact same-origin POST semantics
and an HMAC CSRF token bound to application, session, action and provider. Link
and unlink reject sessions aged ten minutes or more. The link route fixes both
success and error callback URLs to IAM's own account-connections page and then
uses standard Better Auth `linkSocial()`; no custom OAuth linking protocol was
added.

Better Auth enforces matching email, provider-account uniqueness and
`allowUnlinkingAll=false`. The hosted wrapper additionally requires exactly one
matching provider account before unlinking. Raw `/link-social`, `/list-accounts`
and `/unlink-account` paths are explicitly forbidden at the public Fastify
boundary and are reachable only through the reviewed hosted wrappers.

## Audit boundary

`ApplicationAuthAuditService` emits the v1 redacted event contract for provider
callback, link and unlink success/failure. Events contain event/schema/time,
category/action/outcome/reason, organization/application/request identifiers,
optional realm-HMAC actor identity and only an allowlisted provider name in
`safeDiff`. Email, account ID, callback/query URL, state, code, session token,
provider credential/token/response and client secret have no event fields.

`ApplicationAuthAuditPort` owns append-only production persistence and the
durable delivery-failure counter. Operational audit delivery failure is logged
without secrets and does not alter the protocol flow, as required by the plan.

## Verification

The IAM production build was run through `shopana-cli` after implementation:

```text
yarn shopana build -s iam
Type check passed
Built dist/iam.module.js
```

Per repository instructions, standalone `test` and `tsc` commands were not
run, and no changeset file was edited.
