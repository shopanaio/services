# Application password auth e2e

Этот каталог содержит отложенные Playwright-спеки security-контракта из
[`application-users-password-e2e-coverage-plan.ru.md`](../../../services/iam/docs/application-users-password-e2e-coverage-plan.ru.md).

Спеки сгруппированы по проверяемой ответственности:

- `public-boundary.spec.ts` — effective configuration и default-deny HTTP boundary;
- `password-signup.spec.ts` — создание password identity;
- `email-verification.spec.ts` — verification link lifecycle;
- `password-signin.spec.ts` — credential authentication;
- `password-reset.spec.ts` — forgot/reset password lifecycle;
- `oauth-authorization-code.spec.ts` — Authorization Code, PKCE, resource и token claims;
- `session-token-lifecycle.spec.ts` — session, refresh, revoke и logout;
- `application-isolation.spec.ts` — cross-application substitution matrix;
- `web-security.spec.ts` — CSRF, cookies, CORS, headers и transport hardening;
- `abuse-anti-enumeration.spec.ts` — distributed limits и account enumeration;
- `live-validation.spec.ts` — актуальное состояние realm/client/user/session/token;
- `delivery-observability.spec.ts` — email capture, audit и redaction.

Все suites намеренно помечены `skip`: публичный runtime и поддерживаемый способ
подготовки application/client/user state еще не образуют законченный e2e-контракт.
До этого момента спеки фиксируют только ожидаемое поведение и не предполагают
названия будущих GraphQL operations или fixture API.

При реализации suite снимается `skip`, а соответствующий case получает setup,
действие и проверки всех применимых response/state/delivery/audit side effects.
Отрицательный кейс не считается реализованным без проверки отсутствия изменений
в целевой и чужой application.
