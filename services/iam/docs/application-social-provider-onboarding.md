# Application social provider onboarding

Этот runbook применяется только к встроенному provider установленной версии Better Auth. Он не
разрешает generic OAuth endpoints/options из БД или Admin API.

## Обязательный compatibility/security contract

1. Подтвердить точный Better Auth provider ID и `GET`/`POST` callback contract.
2. Проверить authorization, token и profile flow через Better Auth без IAM-owned callback/code
   exchange.
3. Зафиксировать минимальный approved scope set.
4. Проверить наличие email, его формат и verification semantics, включая absent/unverified сценарии.
5. Подтвердить, что `disableSignUp=true` блокирует первый login, но сохраняет вход существующего
   linked account.
6. Проверить explicit `linkSocial()`, account conflict, email mismatch и `unlinkAccount()` при
   `allowUnlinkingAll=false`.
7. Оставить `trustedForExplicitLinking=false`. Исключение требует отдельного security rationale и не
   может использоваться при `disableImplicitLinking=false`.
8. Зафиксировать отсутствие client secret, authorization code, state, upstream response и provider
   tokens в response/log/audit/traces.

## Изменения реализации

1. Добавить одну immutable definition в `src/auth/applicationSocialProviders.ts`: stable ID,
   approved scopes, localization keys, email contract, trust flag/rationale и typed Better Auth
   options builder.
2. Добавить все catalog-referenced localization keys для `en`, `uk` и `ru`.
3. Синхронизировать закрытый Admin GraphQL provider enum/contract, если он уже опубликован. Не
   добавлять provider-specific field или mutation.
4. Добавить provider-specific compatibility fixtures/contract scenarios.
5. Не изменять core factory, HTTP callback branching, Hosted UI branching, CSRF union, keyring
   context или application configuration columns.

## Проверка активации

- Unknown persisted/request provider остается fail-closed.
- Unconfigured и disabled provider отсутствует в Better Auth options, sign-in UI и effective route
  manifest.
- Enabled provider появляется только с catalog-approved scopes и валидными application-scoped
  credentials.
- Manifest содержит только exact `GET` и `POST /callback/{provider}`.
- Closed registration, cross-application isolation, explicit link/unlink, disabled-linked-account UI
  и safe audit/error behavior совпадают с общими инвариантами.
- IAM build выполнен через `shopana-cli`; compatibility/contract report не содержит открытых
  security вопросов.
