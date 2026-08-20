# Application social providers refactoring — contract report

Дата: 2026-07-19  
Сервис: `services/iam`  
Статус: completed

## Baseline

Исходный Google/Facebook contract зафиксирован в
`application-social-providers-baseline-contract.md`. До изменений и после рефакторинга IAM build
выполнен через `shopana-cli`. Better Auth остается владельцем social sign-in, upstream
callback/state/PKCE, provider tokens и standard account link/unlink flow.

## Реализованный contract

- `ApplicationAuthProviderName` выводится из ключей immutable `APPLICATION_SOCIAL_PROVIDERS`.
- Catalog definition содержит stable Better Auth ID, approved scopes, localization keys, email
  contract, explicit-link trust flag/rationale и typed Better Auth options builder. Catalog
  проверяет ID, key/ID match, duplicate IDs, empty/duplicate scopes и обязательный rationale для
  trusted provider.
- Write/read boundaries используют единый parser и catalog scope validation.
- `application_auth_provider.enabled` является единственным persisted social enable switch. Active
  Drizzle model не содержит `google_enabled` и `facebook_enabled`.
- Сгенерированная Drizzle migration `0002_left_zaladane.sql` удаляет legacy flags, расширяет
  provider ID до 64 символов и заменяет semantic enum CHECK на syntactic stable-ID CHECK. Semantic
  allowlist остается в code catalog.
- Repository читает все configured providers одной application-scoped query. Unknown ID/scope,
  duplicate scope, invalid/missing key version и malformed ciphertext fail closed независимо от
  enabled state; plaintext credentials расшифровываются только для enabled rows.
- Factory строит immutable provider collection, вычисляет per-provider `disableSignUp`, проверяет
  revision consistency и включает только enabled providers. Trusted explicit-link providers
  вычисляются из enabled catalog definitions при зафиксированном `disableImplicitLinking=true`.
- Effective manifest публикует только exact `GET`/`POST /callback/{provider}`. Typed exact matcher
  используется для callback audit и cross-site navigation policy до передачи запроса Better Auth.
- `/sign-in/social` использует catalog parser плюс exact membership в effective manifest;
  cast/fallback к произвольной строке удален.
- Hosted login и connections UI используют catalog metadata. CSRF social action выводится как
  template literal от provider type. Disabled linked provider остается доступен для unlink;
  credential account не считается social; unknown linked provider приводит к safe data-integrity
  failure.
- Admin API plan использует generic closed provider enum/status contract без provider-specific
  fields. Добавлен onboarding runbook.

## Route manifest contract

Для каждого enabled provider effective manifest добавляет ровно:

```text
POST /sign-in/social
POST /login/social
GET  /callback/{provider}
POST /callback/{provider}
```

Unconfigured/disabled/unknown provider не добавляет callback entry. Extra path segments, encoded
slash, duplicate slash, dot segments и double/malformed encoding отклоняются normalization + exact
manifest boundary до `auth.handler()`.

## Security verification matrix

| Scenario                           | Verification result                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Enabled/configured Google/Facebook | Catalog builder включает provider в Better Auth, Hosted UI и exact manifest                                              |
| Disabled/unconfigured provider     | Отсутствует в Better Auth/sign-in UI/manifest; direct route получает safe 404                                            |
| Closed registration                | Factory устанавливает `disableSignUp=true`; existing-account behavior остается Better Auth baseline                      |
| Unknown persisted provider         | Repository parser отклоняет row независимо от `enabled`                                                                  |
| Unknown/unapproved scope           | Write/read/factory boundaries отклоняют configuration до Better Auth                                                     |
| Invalid key version/ciphertext     | Envelope/version validation fail closed без secret output                                                                |
| Cross-application credentials      | Repository predicate и AAD включают `applicationId`; factory повторно проверяет row scope                                |
| Callback вне manifest              | Exact allowlist отклоняет запрос до handler; wildcard отсутствует                                                        |
| Request-body provider mismatch     | Catalog parser + effective manifest membership возвращают safe 404                                                       |
| Same-email implicit linking        | `disableImplicitLinking=true`, `allowDifferentEmails=false` сохранены                                                    |
| Facebook explicit-link trust       | Metadata catalog включает reviewed rationale; trust применяется только к enabled definition                              |
| Stale-session link/unlink          | Fresh-session gate и provider-bound CSRF сохранены                                                                       |
| Unlink последнего метода           | `allowUnlinkingAll=false` сохранен в Better Auth configuration                                                           |
| Disabled linked account            | Connections UI показывает catalog provider только для safe unlink                                                        |
| Unknown linked account             | UI завершает обработку safe integrity error и не создает link action                                                     |
| Provider mutation/cache            | Upsert, enable/disable и delete увеличивают revision; callback/revision-sensitive routes выполняют forced revision check |
| Audit/error redaction              | Audit получает typed matched provider; raw exception, credentials, code/state и tokens не сериализуются                  |

## Verification commands

- Baseline IAM build: success through `shopana-cli`.
- Migration generation: success through `shopana-cli`, service `iam`.
- Final IAM build: success through `shopana-cli`.
- Static search: provider-specific runtime lists/branches отсутствуют; остаточные Google/Facebook
  mentions находятся только в catalog definitions, localization, generated/historical migrations and
  security documentation.
- `git diff --check`: success.

Отдельные `test` и `tsc` команды не запускались согласно project instructions; проверка выполнена
разрешенной IAM build и статическим contract review. Новых provider-specific compatibility вопросов
нет.
