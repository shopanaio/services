# Compatibility и security spike OAuth 2.1 / OIDC для `application_users`

Статус: исследовательская часть завершена; exit gates этапа 0 еще не закрыты

Дата: 2026-07-19  
Сервис: `services/iam`  
Связанный план: [OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md)

## 1. Итог

`@better-auth/oauth-provider@1.6.23` совместим с `better-auth@1.6.23` и подходит как основа OAuth 2.1 / OIDC provider. Переход на самописный OAuth server не требуется.

Spike выявил три compatibility gap, относящихся к OAuth/OIDC v1:

1. `adminCreateOAuthClient` и `adminUpdateOAuthClient` помечены как server-only, но фактически требуют Better Auth user session и без нее возвращают `401 UNAUTHORIZED`.
2. OAuth Provider не хранит разрешенные resources на client и не связывает `resource` authorization request, code exchange и refresh-token family.
3. Если `/oauth2/token` вызывается без `resource`, plugin выдает opaque access token вместо обязательного Storefront JWT.

Основной план закрывает их явными решениями:

- OAuth clients управляются `ApplicationOAuthClientManagementService` через application-scoped repository без application-user session;
- каждая application имеет ровно один собственный `application.resource`, наследуемый всеми ее clients;
- `ApplicationOAuthResourcePolicyGuard` до `auth.handler` требует exact single resource на authorize, code exchange и каждом refresh и исключает opaque-token fallback.

Дополнительно spike исследовал phone OTP и synthetic email. Они не являются блокерами OAuth/OIDC v1: основной план полностью исключает phone OTP, phone fields/routes, SMS delivery и synthetic email из первой версии. Результаты сохранены ниже только как исторический материал для отдельного будущего плана.

Статус «исследовательская часть завершена» не означает, что этап 0 закрыт. Spike зафиксировал выбор технологии и ключевые ограничения, но ряд contract-проверок на реальной IAM composition еще не выполнен. Открытые пункты явно перечислены в разделах 3.1 и 15.

## 2. Среда и методика проверки

Проверка выполнялась в изолированном временном стенде, без изменения `package.json` и `yarn.lock` проекта.

Exact-версии стенда:

- `better-auth@1.6.23`;
- `@better-auth/core@1.6.23`;
- `@better-auth/oauth-provider@1.6.23`;
- `@better-auth/utils@0.4.2`;
- `@better-fetch/fetch@1.3.1`;
- `better-call@1.3.7`;
- `libphonenumber-js@1.12.17`;
- `fastify@4.28.1`.

Проверялись:

- runtime manifest plugin endpoints;
- runtime schema plugin models;
- path-prefixed issuer и discovery documents;
- прямой вызов server-only API;
- доступ application user к session-authenticated management endpoints;
- public и confidential client behavior;
- отказ `client_credentials`;
- хранение client secret;
- обработка `resource` и выбор JWT/opaque access token;
- возможность custom claims и store binding;
- применимость текущего scoped adapter;
- Fastify → Fetch API bridge, form body, redirects и несколько `Set-Cookie`;
- реализация phone OTP в Better Auth;
- E.164/HKDF/HMAC/Base32 synthetic email test vector.

Проектные test suite и `tsc` не запускались. Код сервиса в рамках spike не изменялся.

## 3. Статус задач этапа 0

| Задача | Статус | Результат |
| --- | --- | --- |
| Exact dependency compatibility | Подтверждено | Версии Better Auth и OAuth Provider совместимы по runtime и peer dependencies |
| Добавление direct dependencies в IAM | Не выполнено | Пакеты устанавливались только во временный стенд; direct dependencies нужно добавить при реализации |
| Schema и endpoint paths | Подтверждено | Manifest и четыре plugin model зафиксированы ниже |
| Public/internal route classification | Частично выполнено | OAuth Provider/JWKS routes зафиксированы; signin/signup, email OTP и social callback routes нужно снять с итоговой plugin composition |
| Sessionless server-side client API | Ограничение подтверждено, решение зафиксировано | Используется IAM internal management service/repository без application-user session |
| Fastify integration | Подтверждено с условиями | Нужны form parser, отдельный root metadata route и trusted proxy policy |
| Scoping через текущий adapter | Требует изменений | Текущий adapter знает только `user`, `account`, `session`, `verification`, `jwks` |
| Storefront resource contract | Ограничение подтверждено, решение зафиксировано | Единственный `application.resource` и `ApplicationOAuthResourcePolicyGuard` закрывают отсутствие plugin binding и opaque fallback |
| Custom claims/store binding | Подтверждено | Claims callbacks получают trusted client metadata и текущий resource |
| Phone OTP | Вне OAuth/OIDC v1 | Phone plugin/routes/fields, SMS и synthetic email не добавляются основным планом |
| Synthetic email vector | Историческая проверка вне v1 | Не является контрактом текущей реализации |
| Email OTP storage baseline | Решение v1 зафиксировано | Стандартный `emailOTP({ storeOTP: "hashed" })`; custom hasher/HMAC, lifecycle ключей и миграция hash-формата вне scope |
| Public/confidential clients | Подтверждено | Secret и PKCE behavior соответствуют ожиданиям |
| Отказ `client_credentials` | Подтверждено | Отказ получен для public и confidential v1 clients |
| Application resource policy | Контракт зафиксирован, проверка не выполнена | Exact HTTPS URI хранится per application; guard нужно contract-подтвердить на authorize/code exchange/refresh |
| Public client discovery | Не выполнено | Не выбрана Storefront OIDC library и не принято решение об IAM-owned metadata с `none` |

### 3.1. Незавершенные пункты этапа 0

1. Добавить exact direct dependency `@better-auth/oauth-provider@1.6.23` в IAM package и lockfile. Временный стенд подтвердил совместимость, но зависимость еще не включена в проект.
2. Собрать итоговую Better Auth composition с password, `emailOTP`, Google, Facebook, OAuth Provider и JWT, затем снять runtime route manifest по method + normalized pathname. Текущий manifest покрывает только OAuth Provider и JWKS.
3. Зафиксировать default-deny allowlist для signin/signup, email OTP и social callback routes и подтвердить, что management/DCR endpoints остаются запрещены после сборки всех plugins.
4. Выбрать фактическую Storefront OIDC library и проверить public client flow, если discovery document не включает `none` в `token_endpoint_auth_methods_supported`. Если library требует `none`, зафиксировать IAM-owned metadata override без включения unauthenticated DCR.
5. Реализовать и contract-подтвердить `ApplicationOAuthResourcePolicyGuard`: exact single resource обязателен на authorize, code exchange и каждом refresh; mismatch/missing/multiple resources отклоняются до `auth.handler`; opaque-token fallback недоступен.
6. Добавить четыре OAuth Drizzle models в application schema/scoped model set и contract-подтвердить tenant predicates, application-scoped relations, composite foreign keys и cross-application create/read/update/delete denial.

До закрытия этих пунктов spike следует трактовать как завершенное исследование с открытыми implementation/contract gates, а не как полностью закрытый этап 0.

## 4. ADR: выбор OAuth Provider

### Решение

Использовать `@better-auth/oauth-provider@1.6.23` совместно с exact-версиями `better-auth@1.6.23` и `@better-auth/core@1.6.23`.

Не использовать deprecated `oidcProvider` из `better-auth/plugins/oidc-provider`.

### Обоснование

Проверенная версия предоставляет:

- Authorization Code flow;
- PKCE S256;
- OIDC discovery и OAuth Authorization Server metadata;
- JWT ID token и JWT/opaque access token modes;
- refresh token rotation;
- UserInfo;
- introspection и revocation;
- RP-Initiated Logout;
- consent/continue hosted-flow endpoints;
- public и confidential OAuth clients;
- hashed client secrets при включенном JWT plugin.

Выявленные OAuth/OIDC v1 gaps закрываются IAM HTTP boundary, `ApplicationOAuthResourcePolicyGuard`, tenant-aware repository и internal client management service. Они не требуют реализации OAuth protocol с нуля.

## 5. Versioned route manifest

Версия manifest: `@better-auth/oauth-provider@1.6.23`.

### 5.1. Public protocol и hosted-flow allowlist

| Method | Relative path | Назначение | Условие публикации |
| --- | --- | --- | --- |
| `GET` | `/.well-known/oauth-authorization-server` | OAuth metadata относительно issuer | Public |
| `GET` | `/.well-known/openid-configuration` | OIDC discovery | Public |
| `GET` | `/oauth2/authorize` | Authorization endpoint | Public |
| `POST` | `/oauth2/consent` | Продолжение consent flow | Public, session required by plugin |
| `POST` | `/oauth2/continue` | Продолжение hosted login/signup flow | Public, session required by plugin |
| `POST` | `/oauth2/token` | Code exchange и refresh | Public |
| `POST` | `/oauth2/introspect` | Token introspection | Public, client authentication required |
| `POST` | `/oauth2/revoke` | Token revocation | Public, client authentication required |
| `GET`, `POST` | `/oauth2/userinfo` | OIDC UserInfo | Public, bearer token required |
| `GET` | `/oauth2/end-session` | RP-Initiated Logout | Public |
| `GET` | `/oauth2/public-client` | Read-only client metadata для hosted UI | Разрешать только при фактической необходимости UI |
| `POST` | `/oauth2/public-client-prelogin` | Client metadata до login | Только при `allowPublicClientPrelogin` и signed `oauth_query` |
| `GET` | `/jwks` | JWKS от Better Auth JWT plugin | Public, URI брать из discovery |

Для Better Auth signup/signin, OTP и social callbacks нужен отдельный точный allowlist после подключения соответствующих plugins. Нельзя разрешать все неизвестные пути под application `basePath` только потому, что они не начинаются с `/oauth2/`.

### 5.2. Обязательный deny-list до `auth.handler`

| Method | Relative path | Причина |
| --- | --- | --- |
| `POST` | `/oauth2/register` | Dynamic Client Registration не входит в v1 |
| `POST` | `/oauth2/create-client` | Session-authenticated client management |
| `GET` | `/oauth2/get-client` | Session-authenticated client management |
| `GET` | `/oauth2/get-clients` | Session-authenticated client management |
| `POST` | `/oauth2/update-client` | Session-authenticated client management |
| `POST` | `/oauth2/client/rotate-secret` | Session-authenticated secret rotation |
| `POST` | `/oauth2/delete-client` | Session-authenticated client management |
| `GET` | `/oauth2/get-consent` | Account-side consent management, не нужен hosted protocol flow |
| `GET` | `/oauth2/get-consents` | Account-side consent management |
| `POST` | `/oauth2/update-consent` | Account-side consent management |
| `POST` | `/oauth2/delete-consent` | Account-side consent management |

Любой неизвестный `/oauth2/*` path должен возвращать `404` до вызова Better Auth. Сравнение выполняется по нормализованным pathname и method, а не prefix match.

### 5.3. Server-only endpoints plugin

Plugin объявляет:

- `POST /admin/oauth2/create-client`;
- `PATCH /admin/oauth2/update-client`.

Они помечены `SERVER_ONLY` и не регистрируются в HTTP router: HTTP spike получил `404`. Однако прямые вызовы соответствующих `auth.api` methods без Better Auth user session получили `401`, поэтому они не подходят для Admin GraphQL contract проекта.

Server-only delete и rotate-secret methods в версии `1.6.23` отсутствуют.

### 5.4. Path-prefixed issuer metadata

При issuer:

```text
https://iam.example.com/auth/applications/{applicationId}
```

OIDC discovery относительно issuer работает по адресу:

```text
https://iam.example.com/auth/applications/{applicationId}/.well-known/openid-configuration
```

OAuth Authorization Server metadata также поддерживает стандартный root-relative URI:

```text
https://iam.example.com/.well-known/oauth-authorization-server/auth/applications/{applicationId}
```

Catch-all `/auth/applications/:applicationId/*` не обслужит второй URI. Для него нужен отдельный Fastify route, использующий тот же application lookup, active realm validation и metadata handler.

## 6. Подтвержденная plugin schema

Все четыре таблицы должны получить дополнительный обязательный `application_id`, tenant-first indexes и application-scoped foreign keys в IAM schema.

### 6.1. `oauthClient`

Plugin fields:

- implicit `id`;
- `clientId`: string, required, unique;
- `clientSecret`: nullable string;
- `disabled`: nullable boolean, default `false`;
- `skipConsent`: nullable boolean;
- `enableEndSession`: nullable boolean;
- `subjectType`: nullable string;
- `scopes`: nullable string array;
- `userId`: nullable reference на `user.id`, indexed;
- `createdAt`, `updatedAt`: nullable date;
- `name`, `uri`, `icon`: nullable string;
- `contacts`: nullable string array;
- `tos`, `policy`: nullable string;
- `softwareId`, `softwareVersion`, `softwareStatement`: nullable string;
- `redirectUris`: required string array;
- `postLogoutRedirectUris`: nullable string array;
- `tokenEndpointAuthMethod`: nullable string;
- `grantTypes`: nullable string array;
- `responseTypes`: nullable string array;
- `public`: nullable boolean;
- `type`: nullable string;
- `requirePKCE`: nullable boolean;
- `referenceId`: nullable string;
- `metadata`: nullable JSON.

Поля `resources` в schema версии `1.6.23` нет.

### 6.2. `oauthRefreshToken`

- implicit `id`;
- `token`: required unique string;
- `clientId`: required reference на `oauthClient.clientId`, indexed;
- `sessionId`: nullable reference на `session.id`, `onDelete=set null`, indexed;
- `userId`: required reference на `user.id`, indexed;
- `referenceId`: nullable string;
- `expiresAt`: date;
- `createdAt`: date;
- `revoked`: nullable date;
- `authTime`: nullable date;
- `scopes`: required string array.

Resource/audience в refresh-token row не хранится.

### 6.3. `oauthAccessToken`

- implicit `id`;
- `token`: unique string;
- `clientId`: required reference на `oauthClient.clientId`, indexed;
- `sessionId`: nullable reference на `session.id`, `onDelete=set null`, indexed;
- `userId`: nullable reference на `user.id`, indexed;
- `referenceId`: nullable string;
- `refreshId`: nullable reference на `oauthRefreshToken.id`, indexed;
- `expiresAt`: date;
- `createdAt`: date;
- `scopes`: required string array.

Эта таблица используется для opaque access tokens. При обязательном Storefront resource нормальный v1 flow должен выдавать JWT и не создавать opaque access token.

### 6.4. `oauthConsent`

- implicit `id`;
- `clientId`: required reference на `oauthClient.clientId`, indexed;
- `userId`: nullable reference на `user.id`, indexed;
- `referenceId`: nullable string;
- `scopes`: required string array;
- `createdAt`, `updatedAt`: date.

## 7. OAuth client management

### 7.1. Подтвержденная экспозиция application user

В стенде application user зарегистрировался через email/password, получил application session и без дополнительной IAM authorization смог:

- создать confidential client через `/oauth2/create-client` — `200`;
- прочитать его через `/oauth2/get-client` — `200`;
- ротировать secret через `/oauth2/client/rotate-secret` — `200`.

Это ожидаемое поведение plugin по умолчанию и подтверждает необходимость Fastify default-deny boundary. `allowDynamicClientRegistration: false` блокирует только `/oauth2/register` и не закрывает session-authenticated CRUD.

### 7.2. Client secret lifecycle

Подтверждено:

- public client с `token_endpoint_auth_method=none` создается без secret;
- confidential client получает secret при create;
- новый secret возвращается при rotate;
- read endpoint не возвращает secret;
- при `disableJwtPlugin=false` plugin по умолчанию хранит client secret как hash, а не plaintext.

IAM должен дополнительно гарантировать one-time GraphQL response, redaction логов и отсутствие secret в audit payload.

### 7.3. Решение для Admin GraphQL

Использовать отдельный `ApplicationOAuthClientManagementService`, который работает поверх тех же plugin-compatible Drizzle tables и выполняет:

1. Casbin authorization;
2. application/organization ownership check;
3. Store ownership check через Project service;
4. URI, client type и protocol policy validation;
5. create/update/delete/rotate в application-scoped transaction;
6. hash нового client secret тем же утвержденным способом;
7. one-time возврат plaintext secret;
8. audit без secret value;
9. revision/cache invalidation.

Нельзя создавать временную application user session, передавать platform cookie или имперсонировать пользователя для вызова plugin CRUD.

## 8. Resource indicator, JWT и Store binding

### 8.1. Фактическое поведение plugin

`validAudiences` является глобальным allowlist OAuth Provider instance. Проверка token endpoint:

- читает `resource` только из текущего `/oauth2/token` body;
- принимает его, если он входит в `validAudiences`;
- не сравнивает его с `resource` исходного authorization request;
- не сравнивает его с client metadata;
- не сохраняет его в refresh token;
- при refresh снова доверяет текущему request в пределах глобального allowlist.

Если `resource` отсутствует:

- `audience` остается undefined;
- access token создается как opaque token;
- JWT-only Storefront contract нарушается.

Если в будущем `validAudiences` содержит несколько URI, refresh token сможет запросить другой глобально разрешенный resource, если IAM не добавит дополнительный enforcement.

### 8.2. Решение для v1

До первого OAuth client администратор application задает единственный exact resource через application-level Admin GraphQL mutation:

```text
application.resource=<absolute HTTPS URI Storefront API для этой application>
```

Значение хранится в `application_auth_configuration`, нормализуется один раз без trailing slash, уникально среди active applications и не принимается OAuth client create/update input. Все clients application наследуют exact `application.resource` в IAM-controlled metadata.

Для v1 разрешается ровно один Storefront resource на application realm. `ApplicationOAuthResourcePolicyGuard` внутри `applicationAuthHttpPlugin` до `auth.handler` обязан требовать ровно одно побайтно равное значение:

- в `/oauth2/authorize`;
- в authorization-code `/oauth2/token` request;
- в refresh-token `/oauth2/token` request.

Отсутствующий, пустой, чужой, второй или повторяющийся resource отклоняется с `invalid_target` до OAuth Provider и выпуска token. `validAudiences` application-scoped provider instance содержит ровно `[application.resource]` как дополнительный enforcement layer, но не заменяет guard.

Client binding хранится в IAM-controlled metadata/table:

- `store_id`;
- физическое `resource_audience = application.resource`, проецируемое в Admin GraphQL как read-only `resources: [application.resource]`;
- protocol policy version.

Нельзя полагаться на plugin field `resources`: такого поля в `1.6.23` нет.

Так как v1 допускает только один resource на application, повторная exact-проверка на authorize, code exchange и каждом refresh запрещает смену/расширение audience даже без resource column в authorization-code/refresh-token plugin rows. Несколько resources потребуют отдельной protocol-policy version и хранения granted resources с code/refresh family.

### 8.3. Custom claims

`customAccessTokenClaims` получает:

- user;
- scopes;
- текущий `resource`;
- `referenceId`;
- parsed client metadata.

`customIdTokenClaims` получает user, scopes и client metadata. Этого достаточно, чтобы добавить проверенные `application_id`, `store_id`, actor type и другие IAM-owned claims.

Metadata должна записываться только internal management service после ownership checks. Произвольная client metadata из Admin GraphQL не должна напрямую попадать в signed claims. В OAuth/OIDC v1 IAM создает только пользователей с реальным email; synthetic email не используется.

## 9. Public/confidential clients и grant policy

### 9.1. Public client

Подтверждено:

- `token_endpoint_auth_method=none`;
- secret не создается;
- допустимый type: `native` или `user-agent-based`;
- PKCE обязателен независимо от `requirePKCE`;
- `client_credentials` без secret отклоняется с `400 invalid_grant`.

### 9.2. Confidential client

Подтверждено:

- `client_secret_basic` и `client_secret_post` поддерживаются;
- type должен быть `web`, если он указан;
- PKCE обязателен при `offline_access`;
- `requirePKCE` по умолчанию трактуется как `true`;
- client с grants `authorization_code` и `refresh_token` отклонил `client_credentials` с `400 unauthorized_client`.

### 9.3. Обязательная server и client policy

OAuth Provider instance должен глобально задавать:

```text
grantTypes = ["authorization_code", "refresh_token"]
```

Каждый v1 client создается только с:

```text
grant_types = ["authorization_code", "refresh_token"]
response_types = ["code"]
require_pkce = true
```

Это дает две линии защиты:

- token endpoint глобально не поддерживает `client_credentials` и не рекламирует его в discovery;
- client policy также не разрешает этот grant конкретному client.

### 9.4. Discovery для public clients

В `1.6.23` `token_endpoint_auth_methods_supported` включает `none` только при `allowUnauthenticatedClientRegistration=true`. Это связывает metadata public-client support с настройкой unauthenticated DCR.

Нельзя включать DCR только ради discovery. Перед выбором решения нужно проверить Storefront OIDC library:

- если она корректно работает без advertised `none`, оставить plugin discovery без изменения;
- иначе отдать IAM-owned metadata document с `none`, сохранив `/oauth2/register` запрещенным.

## 10. Fastify integration

### 10.1. Подтверждено

Fetch/Fastify bridge способен без потерь перенести:

- HTTP method;
- raw query string через `request.raw.url`;
- JSON body;
- `application/x-www-form-urlencoded` body;
- response status;
- `Location` с исходным encoding;
- несколько `Set-Cookie` через `Headers.getSetCookie()` и Fastify header array;
- response body.

### 10.2. Обязательные условия

Fastify `4.28.1` без дополнительного parser отклонил form token request с:

```text
415 FST_ERR_CTP_INVALID_MEDIA_TYPE
```

Нужно зарегистрировать `application/x-www-form-urlencoded` parser как string до OAuth routes, чтобы Better Auth получил исходное form body.

Также необходимо:

- создавать public URL только из `IAM_PUBLIC_BASE_URL` и raw relative URL;
- не использовать непроверенный `Host`/`X-Forwarded-Host`;
- настроить explicit `trustProxy` policy для известных proxy ranges;
- передавать несколько `Set-Cookie` отдельными значениями;
- не объединять cookies запятой;
- не включать общий CORS `*`;
- выполнить route allowlist до `auth.handler`;
- добавить отдельный root metadata route для path-prefixed issuer.

## 11. Application scoping и текущий adapter

Текущий `scopedDrizzleAdapter` ограничен моделями:

- `user`;
- `account`;
- `session`;
- `verification`;
- `jwks`.

`oauthClient`, `oauthRefreshToken`, `oauthAccessToken` и `oauthConsent` отсутствуют в `applicationAuthSchema` и `APPLICATION_SCOPED_MODELS`. При обращении plugin текущий adapter завершится ошибкой `model not found`.

Расширение возможно без замены adapter architecture. Требуется:

1. Добавить четыре Drizzle tables в application schema map.
2. Добавить их в scoped model set.
3. Инжектировать `applicationId` во все create/update operations.
4. Запретить смену `applicationId` через update payload.
5. Добавлять application predicate во все find/count/update/delete/consume/increment operations.
6. Проверять active application и active organization.
7. Проверять cross-model принадлежность:
   - client → application;
   - consent → client/user той же application;
   - refresh token → client/user/session той же application;
   - access token → client/user/session/refresh token той же application.
8. Добавить composite foreign keys с `application_id` там, где они применимы.
9. Сохранить криптографически случайные глобально уникальные `clientId` и token values, несмотря на tenant predicates.
10. Добавить adapter contract checks на cross-application create/read/update/delete.

## 12. Историческая проверка Phone OTP вне v1

Phone OTP, phone-only users, phone fields/routes, SMS delivery и synthetic email не входят в OAuth/OIDC v1 основного плана. Этот раздел фиксирует найденное ограничение Better Auth только для отдельного будущего phone-auth design и не является задачей или exit criterion текущей реализации.

### 12.1. Подтвержденная проблема

Стандартный `phoneNumber` plugin сохраняет:

```text
verification.value = "${otp}:0"
```

После неправильной попытки он создает новую verification value:

```text
verification.value = "${otp}:${attempts + 1}"
```

`sendOTP` callback получает уже сгенерированный код после его сохранения. Поэтому callback нельзя использовать как адаптер внешнего provider-managed challenge, не сохраняя локальный plaintext OTP.

### 12.2. Решение

Решение OAuth/OIDC v1: не подключать `phoneNumber` plugin, не публиковать его routes и не добавлять phone configuration/schema. Отсутствие SMS Verify provider не блокирует этап 0 или реализацию email/password, email OTP, Google и Facebook.

Если phone OTP будет добавляться отдельным будущим планом, stock routes нельзя включать без нового security review. Предпочтительный будущий контракт — Better Auth-compatible IAM plugin/route layer с внешним Verify provider:

```text
startVerification(applicationId, canonicalE164) -> opaqueChallengeId
checkVerification(applicationId, opaqueChallengeId, code) -> approved | pending | rejected
```

IAM хранит только:

- application ID;
- opaque challenge ID или безопасный provider reference;
- normalized phone hash для limits/idempotency;
- expiry;
- attempt/status metadata, если это требуется контрактом provider;
- timestamps и audit actor без phone/code.

Provider credential должен храниться только в secrets backend. До утверждения отдельного phone-auth плана phone endpoints отсутствуют полностью; отдельный `phoneOtpEnabled` flag в текущей v1 schema не вводится.

Better Auth user/session lifecycle можно повторно использовать после успешного provider verification, но нельзя вызывать stock verify route с plaintext OTP storage.

## 13. Исторический synthetic email test vector вне v1

Synthetic email не используется OAuth/OIDC v1 и не должен попадать в `application_user`, ID Token или UserInfo. Вектор ниже сохранен только как результат выполненного эксперимента для возможного будущего phone-only identity design.

Проверка выполнена с `libphonenumber-js@1.12.17`, Node Crypto HKDF-SHA-256, HMAC-SHA-256 и RFC 4648 Base32 без padding.

Вход:

```text
keyVersion = 1
rootKey.base64url = AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8
applicationId = 00000000-0000-4000-8000-000000000001
e164 = +12025550123
```

Подтверждено:

```text
rootKey.length = 32
parsed.isValid() = true
parsed.number = +12025550123

applicationKey.hex = fc4734a7951e9b6702a0934e427d2c1318cbcd90665cd76656194c0733244140
digest.hex = 5227f8b7a3dc70f7710ff2d0bf90697b2cd8f085dc6880248403c22763d5b176
syntheticEmail = kit7rn5d3rypo4ip6lil7edjpmwnr4ef3ruiajeeapbcoy6vwf3a@phone.invalid
```

Вектор совпал с исследуемым алгоритмом побайтно, но не является контрактом текущего основного плана.

## 14. Решения, перенесенные в основной план

По результатам spike основной план и client-management plan должны использовать следующие согласованные решения:

1. Использовать IAM internal repository/service для всего OAuth client CRUD, а не `adminCreateOAuthClient`/`adminUpdateOAuthClient` без session.
2. Хранить единственный exact `application.resource` в `application_auth_configuration`; resource обязателен до первого client и не принимается client mutation.
3. Использовать `ApplicationOAuthResourcePolicyGuard` до `auth.handler` и требовать exact single `application.resource` на authorize, code exchange и каждом refresh.
4. Хранить `resource_audience = application.resource` и Store binding в IAM-controlled client metadata/table; plugin field `resources` отсутствует.
5. Глобально исключить `client_credentials` через `oauthProvider.grantTypes`.
6. Добавить versioned Fastify route manifest по method + normalized pathname.
7. Добавить root OAuth Authorization Server metadata route.
8. Добавить form-urlencoded parser и explicit trusted proxy policy.
9. Расширить scoped adapter четырьмя plugin models и cross-tenant relation checks.
10. Не включать phone OTP, phone fields/routes, SMS delivery или synthetic email в OAuth/OIDC v1.
11. Использовать стандартный `emailOTP({ storeOTP: "hashed" })` как baseline v1; custom keyed hasher/HMAC, lifecycle ключей, dual-format verification и миграция hash-формата остаются вне scope.
12. Проверить discovery contract public clients с выбранной Storefront OIDC library, не включая unauthenticated DCR только ради `token_endpoint_auth_methods_supported=none`.

## 15. Exit criterion

Этап 0 пока не закрыт. Текущий статус exit gates:

- [x] Утверждены application-level resource schema/Admin contract и запрет client-level override.
- [x] Утвержден IAM internal client management contract.
- [ ] Exact direct dependency `@better-auth/oauth-provider@1.6.23` добавлена в IAM package и lockfile.
- [ ] `ApplicationOAuthResourcePolicyGuard` contract подтвержден на итоговой composition для authorize/code exchange/refresh без opaque fallback.
- [ ] Зафиксирован public route manifest итоговой composition, включая Better Auth signin/signup, email OTP и social callback paths.
- [x] Зафиксирован стандартный `emailOTP({ storeOTP: "hashed" })` baseline без требования custom hash contract для этапа 0 или релиза v1.
- [ ] Выбрана Storefront OIDC library и подтвержден discovery contract public client без включения unauthenticated DCR.
- [ ] OAuth plugin models добавлены в Drizzle/application-scoped adapter, а tenant constraints и cross-application denial contract-подтверждены.
- [ ] На итоговой v1 composition/schema подтверждено отсутствие phone plugin/routes и synthetic email.

После этих решений неизвестных, требующих самописного OAuth server, не остается. Необходимая v1 кастомизация ограничивается IAM authorization/resource boundary, tenant-aware persistence и internal client management.

## 16. Источники

- [Better Auth OAuth Provider](https://www.better-auth.com/docs/plugins/oauth-provider)
- [Better Auth Phone Number](https://www.better-auth.com/docs/plugins/phone-number)
- [Better Auth Fastify integration](https://www.better-auth.com/docs/integrations/fastify)
- [RFC 8707: Resource Indicators for OAuth 2.0](https://www.rfc-editor.org/rfc/rfc8707.html)
- [Основной implementation plan](./application-users-oauth-oidc-implementation-plan.ru.md)
