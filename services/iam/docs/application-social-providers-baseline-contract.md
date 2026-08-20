# Application social providers — baseline contract

Дата фиксации: 2026-07-19  
Сервис: `services/iam`  
Версии runtime: Better Auth 1.6.23, OAuth Provider 1.6.23

Этот snapshot фиксирует поведение Google/Facebook до catalog-driven рефакторинга. Он является
входным контрактом этапа 0 и не разрешает расширять public route surface или account-linking policy.

## Матрица providers

| Provider | Better Auth ID | Approved scopes              | Callback methods                        | Email contract                                  | Explicit-link trust                           |
| -------- | -------------- | ---------------------------- | --------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| Google   | `google`       | `openid`, `profile`, `email` | exact `GET` и `POST /callback/google`   | verified email обязателен                       | нет                                           |
| Facebook | `facebook`     | `email`, `public_profile`    | exact `GET` и `POST /callback/facebook` | email обязателен, но считается неподтвержденным | да, только для authenticated explicit linking |

## Общий runtime contract

- Provider публикуется только при наличии application-scoped encrypted credentials и effective
  enable state.
- `registrationMode=disabled` передается каждому social provider как `disableSignUp=true`:
  существующий linked account может войти, первый login не создает user/account/session.
- Better Auth владеет social redirect/callback, state/PKCE, provider tokens, `linkSocial()` и
  `unlinkAccount()`.
- `account.encryptOAuthTokens=true`.
- Linking фиксирован как `disableImplicitLinking=true`, `allowDifferentEmails=false`,
  `allowUnlinkingAll=false` и `updateUserInfoOnLink=false`.
- `trustedProviders=["facebook"]` не разрешает merge по совпавшему Facebook email и действует только
  внутри явного authenticated linking flow.
- Public manifest содержит `/sign-in/social`, hosted `/login/social` и только exact callback entries
  enabled providers; callback wildcard отсутствует.
- Hosted UI использует provider-specific localized labels, fresh-session gate для link/unlink и
  provider-bound CSRF actions.
- Callback/link/unlink audit содержит только typed provider ID и redacted metadata; credentials,
  upstream response, code, state и tokens отсутствуют.

## Fail-closed scenarios

Unknown provider ID, disabled provider, unapproved scope, enabled row без валидных credentials,
key-version/ciphertext mismatch, cross-application row и callback вне effective manifest должны
завершаться до permissive Better Auth fallback. Публичная ошибка остается нормализованной и не
раскрывает внутреннюю причину или secret material.
