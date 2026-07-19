# План рефакторинга провайдеров социального входа в IAM

Статус: готов к декомпозиции и реализации  
Дата: 2026-07-19  
Сервис: `services/iam`  
Целевая область: application-scoped social sign-in и account linking  
Предпосылка: фазы 0–7 OAuth 2.1 / OIDC runtime завершены

Связанные документы:

- [План OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md);
- [Compatibility и security spike OAuth 2.1 / OIDC](./application-users-oauth-oidc-compatibility-spike.ru.md);
- [Контрактный отчет фазы 7](./application-users-oauth-oidc-phase-7-contract-report.md);
- [План Admin API для application auth](./application-auth-admin-api-implementation-plan.ru.md).

## 1. Резюме решения


Текущая реализация уже создана но не задеплоена изза блокеров. Перед реализацией api требуется выполнить рефакторинг. Текущая реализация корректно выполняет v1-требование исходного плана: публично доступны только явно разрешенные Google/Facebook routes, credentials изолированы по application, а social OAuth и linking выполняет Better Auth. Однако множество слоев независимо перечисляют `google | facebook`. Добавление нового встроенного Better Auth provider сейчас требует синхронных изменений в модели БД, Zod-схемах, factory, HTTP boundary, audit, CSRF types, Hosted UI и localization.

Рефакторинг должен заменить эти повторения двумя явными сущностями:

1. **Глобальный code-owned каталог поддерживаемых providers** — единственный semantic allowlist provider ID, допустимых scopes, UI metadata и provider-specific security policy.
2. **Application-scoped provider configuration** — единственный persisted источник состояния `configured/enabled`, credentials и scopes конкретной application.

Better Auth остается владельцем:

- начала social sign-in;
- upstream OAuth redirect/callback;
- state/PKCE/provider-token handling;
- создания и чтения provider account;
- authenticated `linkSocial()` и unlink через стандартные account APIs;
- шифрования upstream access/refresh tokens через `account.encryptOAuthTokens=true`.

Shopana IAM остается владельцем:

- каталога разрешенных providers и scopes;
- tenant isolation по `applicationId`;
- encrypted per-application credentials;
- effective enable/signup policy;
- default-deny route manifest;
- hosted UI, CSRF, audit и безопасной нормализации ошибок;
- factory revision/invalidation.

Собственный OAuth callback, code exchange или account-linking flow в рамках рефакторинга не создается.

## 2. Цели

1. Удалить hardcoded перечисления Google/Facebook из runtime, HTTP boundary и Hosted UI.
2. Сохранить точный default-deny allowlist без wildcard `/callback/*`.
3. Сделать `application_auth_provider.enabled` единственным persisted переключателем social provider.
4. Вывести `ApplicationAuthProviderName` из единого каталога, а не поддерживать union вручную.
5. Централизовать provider-specific scopes, labels и linking/email policy.
6. Сохранить без изменений публичное поведение Google/Facebook.
7. Ограничить подключение будущего встроенного Better Auth provider следующими обязательными изменениями:
   - definition в каталоге;
   - localization keys;
   - provider-specific compatibility/security contract;
   - Admin API enum/contract, если он к тому моменту опубликован.
8. Не требовать изменения core factory, HTTP callback branching, БД-схемы или Hosted UI branching для каждого нового provider.

## 3. Не входит в план

- подключение GitHub, Apple, Microsoft или другого нового provider;
- generic OAuth provider с произвольными authorization/token/userinfo URLs из Admin API;
- изменение OAuth/OIDC issuer, grants, resource/audience или token validation;
- включение implicit account linking;
- доверие email нового provider без отдельного security review;
- изменение password, email OTP или OAuth client flows;
- реализация Admin frontend;
- ручная реализация social OAuth поверх Better Auth.

Новый provider добавляется только после завершения настоящего рефакторинга и отдельного provider-specific compatibility spike.

## 4. Обязательные инварианты

### 4.1. Tenant isolation

- Каждая provider configuration и каждый account остаются scoped по `applicationId`.
- Credentials читаются только predicate `(application_id, provider)` или application-scoped list query.
- `applicationId` берется из проверенного route/runtime context, а не из request body.
- Callback одной application не может использовать configuration, account, session или key другой application.
- AAD существующих encrypted credentials сохраняет `applicationId`, `model=provider`, provider ID и field.

### 4.2. Default deny

- Provider считается публично доступным только если он одновременно присутствует в глобальном каталоге и enabled в текущей application.
- Для каждого enabled provider manifest генерирует только точные `GET` и `POST /callback/{provider}`.
- `/callback/*`, prefix matching и fallback к произвольному Better Auth provider запрещены.
- Provider из `/sign-in/social` сверяется с `runtime.routeManifest.allowedSocialProviders` до `auth.handler`.
- Неизвестный persisted provider является configuration corruption и приводит к fail-closed runtime build.

### 4.3. Registration и linking

- `registrationMode=disabled` устанавливает `disableSignUp=true` для каждого enabled social provider.
- Existing linked account может войти при закрытой регистрации; первый social login не создает user/account/session.
- `disableImplicitLinking=true`, `allowDifferentEmails=false`, `allowUnlinkingAll=false` и `updateUserInfoOnLink=false` остаются общими фиксированными инвариантами.
- Provider-specific доверие в `trustedProviders` по умолчанию равно `false` и включается только definition с отдельным security rationale.
- Текущее исключение Facebook действует только для authenticated explicit linking и не превращается в доверие Facebook email для implicit merge.
- Новый provider обязан иметь подтвержденный контракт получения email и поведения при absent/unverified email.

### 4.4. Secrets и audit

- Client secret и upstream provider tokens не возвращаются из runtime/Admin API и не попадают в logs, audit, traces или errors.
- Audit принимает typed provider ID из уже сопоставленного manifest route, а не извлекает provider через небезопасный wildcard.
- Provider error остается безопасным и не раскрывает upstream response/token/internal exception.

## 5. Текущая связанность

| Область | Текущее состояние | Целевое состояние |
| --- | --- | --- |
| Provider type | Ручной union `"google" | "facebook"` в repository model | Тип выводится из каталога |
| Allowed scopes | Отдельный `APPROVED_SOCIAL_SCOPES` | Metadata каталога |
| Persisted enable flags | `google_enabled`, `facebook_enabled` и `application_auth_provider.enabled` | Только `application_auth_provider.enabled` |
| Credentials schema | Ручной `z.enum(["google", "facebook"])` | Parser из provider IDs каталога |
| Factory | Повторяющиеся массивы `(["google", "facebook"] as const)` | Один application-scoped provider list |
| Better Auth composition | Общий цикл, но список и scopes определены локально | Provider-specific builder из каталога |
| Callback audit | Явные сравнения двух callback paths и ternary provider extraction | Exact manifest matcher возвращает typed provider |
| Request policy | Cast request value к `"google" | "facebook"` | Catalog parser + membership в effective manifest |
| CSRF actions | Два literal union members | Template literal от provider type |
| Hosted login | Google/Facebook ternary labels | UI metadata каталога |
| Connections UI | Ручной массив и ternary labels | Каталог + linked accounts |
| Keyring context | Ручной provider union | Общий provider type из каталога |
| DB provider CHECK | Семантический список в schema constraint | Синтаксический ID constraint + semantic code allowlist |

## 6. Целевая архитектура

### 6.1. Provider catalog

Создать отдельный модуль, например:

```text
services/iam/src/auth/applicationSocialProviders.ts
```

Каталог является immutable compile-time allowlist. Пример целевого контракта:

```ts
export const APPLICATION_SOCIAL_PROVIDERS = {
  google: defineApplicationSocialProvider({
    approvedScopes: ["openid", "profile", "email"],
    providerLabelKey: "googleProvider",
    continueLabelKey: "continueWithGoogle",
    emailContract: "verified_required",
    trustedForExplicitLinking: false,
    createBetterAuthOptions: createGoogleOptions,
  }),
  facebook: defineApplicationSocialProvider({
    approvedScopes: ["email", "public_profile"],
    providerLabelKey: "facebookProvider",
    continueLabelKey: "continueWithFacebook",
    emailContract: "required_but_unverified",
    trustedForExplicitLinking: true,
    createBetterAuthOptions: createFacebookOptions,
  }),
} as const;

export type ApplicationAuthProviderName =
  keyof typeof APPLICATION_SOCIAL_PROVIDERS;

export const APPLICATION_AUTH_PROVIDER_NAMES =
  Object.freeze(Object.keys(APPLICATION_SOCIAL_PROVIDERS)) as
    readonly ApplicationAuthProviderName[];
```

Окончательные поля definition фиксируются в фазе 0. Минимально definition обязан содержать:

- stable provider ID, совпадающий с Better Auth provider ID;
- approved upstream scopes;
- provider-specific Better Auth options builder;
- localization keys;
- email capability/verification contract;
- explicit-linking trust flag, default `false`.

Каталог не содержит credentials, application IDs, secrets или mutable application policy.

### 6.2. Application-scoped configuration

Каноническая запись provider остается в `iam.application_auth_provider`:

```text
application_id
provider
enabled
encrypted_client_id
encrypted_client_secret
secret_key_version
scopes_json
updated_at
updated_by
```

Effective provider определяется так:

```text
supported(provider) = provider exists in code-owned catalog
configured(provider) = application_auth_provider row exists
signInAllowed(provider) = realm active && supported && configured && row.enabled
signUpAllowed(provider) = signInAllowed && registration_mode == "open"
```

Отдельные `google_enabled`, `facebook_enabled` и будущие `{provider}_enabled` колонки не используются.

Repository предоставляет application-scoped чтение всех configured providers одним запросом. Persisted Drizzle model хранит provider ID как ограниченную строку и не владеет semantic union; typed provider contract принадлежит каталогу. Repository/factory валидирует каждую прочитанную запись через каталог, проверяет key version, расшифровывает только нужные credentials и строит immutable runtime list/map. Unknown provider независимо от `enabled`, неразрешенный scope, поврежденный ciphertext или missing key version закрывают runtime, а не приводят к пропуску проверки.

### 6.3. Better Auth adapter

`createApplicationAuth()` продолжает передавать объект `socialProviders` в Better Auth. Каждый catalog definition преобразует общий runtime credential contract в точные options встроенного Better Auth provider.

Общие значения применяются централизованно:

- `clientId`;
- `clientSecret`;
- validated scope;
- `disableSignUp` из effective registration policy.

Provider-specific options задаются только builder соответствующего definition. Нельзя приводить весь объект к широкому `any` или разрешать произвольные Better Auth options из БД/Admin API.

`account.accountLinking.trustedProviders` вычисляется из enabled catalog definitions с `trustedForExplicitLinking=true`, при этом factory отдельно утверждает `disableImplicitLinking=true`.

### 6.4. Route manifest и HTTP boundary

Route manifest остается единственным владельцем публичной allowlist. Добавляется typed matcher:

```ts
resolveAllowedSocialCallbackProvider({
  method,
  normalizedPath,
  manifest,
}): ApplicationAuthProviderName | null
```

Matcher:

1. не использует prefix/wildcard matching;
2. принимает только точный callback route из effective manifest;
3. возвращает provider только после membership check;
4. одинаково используется для success/failure audit;
5. не вызывает Better Auth для неизвестного или disabled provider.

Проверка request body `/sign-in/social` использует общий provider parser и exact membership в `allowedSocialProviders`.

### 6.5. Hosted UI и CSRF

Hosted UI строит login buttons и connections rows по effective provider list и metadata каталога. Provider-specific ternary expressions удаляются.

CSRF action принимает закрытый тип:

```ts
type ApplicationAuthorizationContextAction =
  | ExistingNonSocialActions
  | `social-signin:${ApplicationAuthProviderName}`;
```

При отображении linked accounts:

- credential account не считается social provider;
- enabled provider показывает link/unlink actions по текущей policy;
- disabled, но ранее linked provider может быть показан для безопасного unlink;
- неизвестный provider ID не получает link action и обрабатывается как configuration/data integrity error без раскрытия tokens.

### 6.6. Factory cache и invalidation

- Provider configuration mutation продолжает увеличивать application auth `revision`.
- Factory cache key/version продолжает учитывать revision и realm secret key version.
- Enable/disable, credential rotation, scope update и delete provider invalidируют runtime во всех replicas через существующий revision/invalidation contract.
- Cached runtime не может пережить disable provider дольше установленного revision window; callback и refresh-sensitive routes продолжают использовать принудительную revision check там, где это уже требуется.

## 7. Целевой schema contract

1. Удалить `google_enabled` и `facebook_enabled` из `application_auth_configuration`.
2. Увеличить допустимую длину `application_auth_provider.provider` до заранее утвержденного generic лимита, например 64 символов.
3. Заменить DB CHECK `provider IN ('google', 'facebook')` синтаксическим ограничением stable provider ID.
4. Semantic allowlist остается в code-owned каталоге и проверяется на write и runtime read boundaries.
5. Сохранить unique `(application_id, provider)`, application FK, encrypted envelope и scope constraints.

DB не должен автоматически считать любую синтаксически допустимую строку поддерживаемым provider. Любой unknown row приводит к fail-closed через repository/factory validation.

## 8. Этапы реализации

Порядок этапов обязателен. Следующий этап начинается только после выполнения бинарного критерия выхода предыдущего.

### Этап 0. Зафиксировать baseline и provider contract

Входные зависимости:

- завершены фазы 0–7 исходного OAuth/OIDC-плана;
- IAM build проходит на текущей composition;
- Google/Facebook runtime contract считается baseline.

Задачи:

1. Зафиксировать текущие Google/Facebook options, scopes, callback methods, signup gates, linking policy и UI/audit behavior.
2. Составить полный inventory hardcoded provider IDs через `rg` по `services/iam/src`, schema definitions и IAM docs.
3. Утвердить точный `ApplicationSocialProviderDefinition`.
4. Утвердить политику unknown provider IDs.
5. Утвердить single source of truth: `application_auth_provider.enabled`.

Артефакты:

- baseline contract matrix Google/Facebook;
- утвержденный provider definition type;
- список разрешенных мест, где provider-specific IDs могут оставаться: каталог, schema definitions, provider-specific compatibility fixtures и documentation.

Негативные сценарии:

- unknown provider ID;
- known, но disabled provider;
- unapproved scope;
- enabled flag без credentials;
- provider row другой application;
- callback provider отсутствует в effective manifest.

Критерий выхода: все поля definition определены без открытых решений; Google/Facebook baseline имеет проверяемый snapshot/contract.

### Этап 1. Ввести единый code-owned каталог без изменения поведения

Задачи:

1. Создать `applicationSocialProviders.ts`.
2. Перенести в него provider IDs, approved scopes, UI keys, email/linking metadata и Better Auth options builders.
3. Вывести `ApplicationAuthProviderName` и provider parser из каталога.
4. Заменить ручные provider unions в auth, repository contracts, audit и keyring type-only imports.
5. Оставить runtime behavior и persisted schema без изменений.
6. Запретить экспорт mutable registry object.

Артефакты:

- immutable catalog;
- typed `parseApplicationAuthProviderName()`;
- typed provider definition lookup;
- build-time exhaustive checks для localization metadata и builder.

Негативные сценарии:

- произвольная строка не проходит parser;
- duplicate/invalid provider ID невозможно представить;
- definition с пустыми/duplicate scopes отклоняется;
- trusted linking нельзя включить без явного definition flag.

Критерий выхода: изменение списка поддерживаемых provider IDs выполняется только в каталоге; IAM build проходит; поведение Google/Facebook не изменилось.

### Этап 2. Устранить два persisted источника истины

Задачи:

1. Переключить domain configuration schema с `googleEnabled/facebookEnabled` на generic provider state.
2. Добавить repository operation для application-scoped list configured/enabled providers.
3. Валидировать provider IDs и scopes через каталог на write/read boundaries.
4. Переключить `calculateEffectiveApplicationAuthPolicy()` на generic provider list/map.
5. Удалить `google_enabled` и `facebook_enabled` из Drizzle model и БД.
6. Заменить enumerating DB CHECK синтаксическим provider ID constraint.
7. Сохранить bump revision для всех provider mutations.

Артефакты:

- обновленная схема БД;
- generic repository contract;
- обновленные Zod/domain schemas.

Негативные сценарии:

- provider configuration другой application не читается;
- unknown provider row закрывает runtime;
- missing/corrupt credentials закрывают enabled provider;
- disabled row не попадает в Better Auth composition или route manifest.

Критерий выхода: persisted enable state существует только в `application_auth_provider.enabled`; provider-specific columns отсутствуют; tenant isolation и revision bump подтверждены.

### Этап 3. Перевести factory и Better Auth composition на catalog-driven runtime

Задачи:

1. Заменить provider-name loops в `ApplicationAuthFactory` одним repository result.
2. Построить immutable runtime provider collection.
3. Проверить catalog membership, scopes, key version и enabled state до `createApplicationAuth()`.
4. Переписать `createSocialProviders()` на provider definitions/builders.
5. Вычислять `disableSignUp` из `registrationMode` для каждого provider.
6. Вычислять `trustedProviders` из reviewed definitions.
7. Удалить локальный `APPROVED_SOCIAL_SCOPES` и provider arrays.
8. Сохранить Better Auth как единственный social OAuth/linking runtime.

Артефакты:

- catalog-driven factory;
- catalog-driven Better Auth options adapter;
- immutable effective provider runtime contract.

Негативные сценарии:

- provider-specific builder не может получить произвольные options из БД;
- unapproved scope отклоняется до Better Auth;
- закрытая registration блокирует первый login, но не existing linked login;
- Facebook linking exception не распространяется на Google или будущий provider;
- runtime cache не сохраняет provider после revision change.

Критерий выхода: `ApplicationAuthFactory` и `auth.ts` не содержат provider-specific branching вне catalog adapter; Google/Facebook contract совпадает с baseline.

### Этап 4. Обобщить HTTP boundary, route matching и audit

Задачи:

1. Добавить exact social callback matcher поверх effective route manifest.
2. Использовать matcher до/после `runtime.auth.handler()` для audit success/failure.
3. Заменить callback comparisons и `endsWith` provider extraction.
4. Заменить cast request provider на catalog parser + manifest membership.
5. Сохранить safe `404` для unknown/disabled provider.
6. Проверить GET и POST callback routes отдельно.
7. Сохранить response normalization и redaction.

Артефакты:

- typed callback resolver;
- generic provider callback audit;
- обновленный request policy guard.

Негативные сценарии:

- `/callback/github` при отсутствии provider в catalog/manifest;
- `/callback/google/extra`, encoded slash, duplicate slash и double encoding;
- provider в body не совпадает с effective manifest;
- callback одной application после disable/revision change;
- thrown Better Auth error записывает safe provider audit без exception details.

Критерий выхода: HTTP plugin не перечисляет Google/Facebook; callback wildcard отсутствует; все неизвестные/disabled paths отклоняются до Better Auth.

### Этап 5. Обобщить Hosted UI, CSRF и connections

Задачи:

1. Строить sign-in buttons по `allowedSocialProviders` и catalog UI metadata.
2. Заменить provider ternary labels на typed translation lookup.
3. Обобщить `ApplicationAuthorizationContextAction` через template literal provider type.
4. Заменить ручной список providers на catalog/effective runtime в connections page.
5. Сохранить fresh-session requirement для link/unlink.
6. Определить отображение disabled linked accounts.
7. Обеспечить escaping provider labels и отсутствие credentials/tokens в HTML/query.

Артефакты:

- catalog-driven Hosted UI;
- generic social CSRF contract;
- exhaustive localization entries для текущего каталога.

Негативные сценарии:

- подмена provider в form;
- CSRF token одного provider используется для другого;
- disabled provider нельзя начать link/sign-in;
- последний login method нельзя unlink;
- account другой application не отображается и не unlink-ится.

Критерий выхода: Hosted UI и authorization context не содержат Google/Facebook branching; UI behavior текущих providers сохранено.

### Этап 6. Синхронизировать management contracts и документацию

Задачи:

1. Обновить Admin API plan: social provider operations становятся generic по закрытому provider enum/catalog.
2. Удалить provider-specific enable flags из будущего auth configuration GraphQL contract.
3. Оставить secret mutations и RBAC `org.application-auth-providers` без изменения уровня доступа.
4. Зафиксировать provider status: `supported`, `configured`, `enabled`, masked client ID, scopes, callback URL, timestamps — без secret.
5. Добавить runbook подключения provider.
6. Обновить основной OAuth/OIDC документ ссылкой на этот refactoring decision, не переписывая исторические v1 acceptance statements.

Артефакты:

- синхронизированный Admin API plan;
- provider onboarding checklist;
- updated architecture references.

Негативные сценарии:

- Admin input передает неизвестный provider;
- Admin response раскрывает client secret;
- provider enable обходится без credentials/security validation;
- provider configuration удаляется при существующих linked accounts без определенного поведения connections UI.

Критерий выхода: будущий Admin API не требует отдельного GraphQL field/column на provider и не может включить provider вне code-owned каталога.

### Этап 7. Contract verification и cleanup

Задачи:

1. Проверить Google sign-in, closed registration, callback, explicit link/unlink и audit.
2. Проверить Facebook absent/unverified email, explicit linking trust boundary и safe failure.
3. Проверить cross-application credentials/account/callback isolation.
4. Проверить unknown, disabled, unconfigured и unapproved-scope providers.
5. Проверить exact route manifest snapshot.
6. Выполнить IAM build через `shopana-cli`.
7. Выполнить статический поиск запрещенных hardcoded provider lists.
8. Создать contract report рефакторинга.
9. Сгенерировать changeset штатным механизмом, если он требуется; changeset вручную не редактировать.

Разрешенные остаточные упоминания `google`/`facebook` после cleanup:

- provider catalog definitions;
- provider-specific compatibility contracts/fixtures;
- historical schema files и snapshots;
- localization values;
- историческая и security документация.

Негативные сценарии:

- неизвестный callback доходит до Better Auth;
- provider из другой application попадает в runtime;
- disable не инвалидирует factory;
- signup создается при закрытой registration;
- implicit linking происходит по совпадению email;
- secret/token появляется в response/log/audit snapshot.

Критерий выхода: все acceptance criteria раздела 10 выполнены, IAM build успешен, contract report не содержит открытых compatibility вопросов.

## 9. Матрица обязательных проверок

| Сценарий | Ожидаемый результат |
| --- | --- |
| Google enabled/configured | Присутствует в Better Auth options, UI и exact callback manifest |
| Google disabled | Отсутствует в UI/Better Auth/manifest; direct request получает safe 404 |
| Facebook enabled/configured | Поведение совпадает с baseline, включая explicit linking policy |
| `registrationMode=disabled` | Existing linked login разрешен; first social login не создает identity/session |
| Provider row отсутствует | Provider считается unconfigured и не публикуется |
| Unknown provider row независимо от `enabled` | Runtime build fail-closed |
| Известный provider с unknown scope | Runtime build fail-closed |
| Invalid key version/ciphertext | Runtime build fail-closed без secret details |
| Callback не в manifest | Отклонен до `auth.handler` |
| Callback другой application | Не использует credentials/account/session текущей application |
| CSRF provider mismatch | Hosted UI operation отклонена |
| Same email, новый social account | Implicit link не выполняется |
| Link с stale session | Отклонен |
| Unlink последнего login method | Отклонен |
| Provider disable/reconfigure | Revision увеличен, cached runtime инвалидирован |
| Error/audit snapshot | Не содержит client secret, upstream token, code, state или raw provider response |

## 10. Acceptance criteria

Рефакторинг завершен только если одновременно выполняются все условия:

1. `ApplicationAuthProviderName` выводится из единого immutable provider catalog.
2. Google/Facebook IDs не перечисляются вручную в factory, HTTP plugin, Hosted UI, CSRF union, keyring context или runtime policy.
3. `application_auth_provider.enabled` является единственным persisted enable switch.
4. `google_enabled` и `facebook_enabled` отсутствуют в active Drizzle model и целевой schema.
5. Unknown provider не может стать публичным через БД, request body или Better Auth fallback.
6. Effective manifest содержит только exact callback routes enabled providers.
7. Better Auth продолжает владеть social OAuth и account linking flow.
8. Provider-specific scopes и security metadata находятся только в catalog definition.
9. Google/Facebook functional и security behavior совпадает с baseline.
10. Cross-application isolation подтверждена на repository, factory, callback и account boundaries.
11. Admin API plan использует generic provider contract и не вводит provider-specific fields.
12. Для подключения нового встроенного Better Auth provider не требуется редактировать core factory, HTTP callback branching, Hosted UI branching или добавлять provider-specific DB column.
13. IAM build проходит; contract report создан; secrets отсутствуют в output snapshots.

## 11. Риски и меры контроля

| Риск | Контроль |
| --- | --- |
| Generic registry случайно превращается в permissive arbitrary OAuth | Только compile-time definitions; Admin API не принимает endpoints/options |
| Удаление DB enum CHECK позволяет unknown row | Semantic catalog validation на write/read; runtime fail-closed; syntactic DB CHECK |
| Provider-specific Better Auth options имеют разные типы | Отдельный typed builder на definition; без broad `any` |
| Новый provider не возвращает verified email | Обязательный compatibility/security contract до catalog activation |
| Trusted provider расширяет implicit linking | `disableImplicitLinking=true` фиксирован; trust default false; отдельный invariant assertion |
| Callback matcher становится wildcard | Exact manifest entry остается источником provider resolution |
| Runtime использует stale provider после disable | Revision bump, invalidation и force revision check на sensitive routes |

## 12. Checklist подключения будущего provider

После завершения рефакторинга каждый новый provider проходит одинаковый процесс:

1. Подтвердить, что установленная версия Better Auth имеет подходящий встроенный provider и точный callback contract.
2. Проверить authorization/token/profile endpoints через Better Auth, не реализуя их в IAM.
3. Зафиксировать минимальные approved scopes.
4. Проверить наличие, формат и verification semantics email.
5. Проверить поведение первого login при `disableSignUp=true`.
6. Проверить explicit linking, account conflict и unlink.
7. По умолчанию оставить `trustedForExplicitLinking=false`; любое исключение требует security rationale.
8. Добавить definition и typed Better Auth options builder в каталог.
9. Добавить localization keys.
10. Обновить закрытый Admin API provider enum/contract, если он опубликован.
11. Добавить provider-specific contract/e2e scenarios.
12. Убедиться, что exact callback появился только у enabled application.
13. Убедиться, что credentials и upstream tokens отсутствуют в response/log/audit.
14. Выполнить IAM build и оформить compatibility/contract report.

Provider не считается поддерживаемым только потому, что Better Auth содержит одноименное поле `socialProviders`. Он становится доступным в Shopana IAM только после catalog definition, security contract и прохождения всех application-scoped negative scenarios.
