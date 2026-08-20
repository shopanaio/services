# Application users OAuth/OIDC — Phase 5 contract report

Date: 2026-07-19  
Versions: `better-auth@1.6.23`, `@better-auth/core@1.6.23`, `@better-auth/oauth-provider@1.6.23`

This report covers Phase 5 of `application-users-oauth-oidc-implementation-plan.ru.md`. Social
providers and account linking remain in Phase 6; live token validation remains in Phase 7.

## Better Auth OTP composition

The application-scoped factory enables `emailOTP` only when email OTP signin is allowed. Its fixed
v1 contract is:

- six numeric digits;
- five-minute expiry;
- three verification attempts;
- rotation on every resend;
- `storeOTP: "hashed"`;
- `overrideDefaultEmailVerification: false`;
- password-reset and email-change OTP flows disabled;
- `disableSignUp` derived from both `email_otp_sign_up_enabled` and `registration_mode`.

The Zod configuration contract and database CHECK both reject `email_otp_sign_up_enabled=true` when
signin is disabled. No custom OTP hasher, realm OTP key, dual-format reader, IAM worker or outbox
was added.

## Delivery boundary

`sendVerificationOTP` accepts only Better Auth `type="sign-in"` and maps it to the typed IAM purpose
`email_otp_sign_in`. The request uses the application delivery profile, server-selected template,
normalized recipient and a deterministic non-PII idempotency key. The plaintext OTP exists only in
the in-memory handoff request to the external delivery port; IAM persistence, rate-limit keys,
responses and logs do not receive it.

Missing delivery dependencies prevent construction of a realm with enabled email flows. Adapter
rejection, malformed acceptance and the three-second handoff timeout fail closed without inline
retry.

## Hosted UI and public boundary

The hosted UI provides separate request and verification pages. Both POST forms require same-origin
navigation and a CSRF token bound to the one-time application authorization context. The email is
re-entered on verification, so neither email nor OTP is stored in a URL, authorization context,
local storage or browser-readable cookie. Context rotation occurs before the sign-in attempt, and
the rotated cookie is retained on an internal failure.

The effective route manifest adds exact methods only when OTP signin is enabled:

```text
GET  /email-otp
POST /email-otp/request
GET  /email-otp/verify
POST /email-otp/verify
POST /email-otp/send-verification-otp
POST /sign-in/email-otp
```

OTP check, email verification, password reset, legacy forget-password and email-change plugin
endpoints are explicitly classified as forbidden and remain `404` before `auth.handler`.

Send responses use the same accepted status/schema and a 250 ms minimum response floor for existing
and absent users. Invalid sign-in responses are replaced with one email-or-code error. Delivery
failure is exposed only as a generic temporary-unavailable result.

## Distributed limits

Both hosted and direct endpoints use the same required shared `ApplicationAuthRateLimitPort`
policies:

| Operation           | HMAC-scoped subject                          | Limit           |
| ------------------- | -------------------------------------------- | --------------- |
| Send cooldown       | application + email + IP                     | 1 / 60 seconds  |
| Send window         | application + email                          | 3 / 15 minutes  |
| Send daily identity | application + email                          | 20 / day        |
| Send daily IP       | application + IP                             | 100 / day       |
| Verify challenge    | application + Better Auth sign-in identifier | 3 / 5 minutes   |
| Verify IP           | application + IP                             | 10 / 15 minutes |

The Better Auth verification record independently enforces expiry, rotation, three attempts and
atomic one-time consumption. If the shared limiter is missing or unavailable, OTP request and
verification fail closed with a generic response and `Retry-After` where applicable.

## Verification

The IAM production build was run through `shopana-cli` after implementation:

```text
yarn shopana build -s iam
Type check passed
Built dist/iam.module.js
```

Per repository instructions, standalone `test` and `tsc` commands were not run, and no changeset
file was edited.
