# План реализации OAuth 2.1 / OpenID Connect для `application_users` в IAM

Статус: проектный план  
Дата: 2026-07-19  
Сервис: `services/iam`  
Целевая область: аутентификация покупателей приложений (`application_users`)

Связанные документы:

- [Compatibility и security spike OAuth 2.1 / OIDC для `application_users`](./application-users-oauth-oidc-compatibility-spike.ru.md);
- [План реализации API управления OAuth clients в IAM](./application-oauth-client-management-api-plan.ru.md).

## 1. Резюме решения

IAM должен стать OIDC-провайдером для клиентских приложений организаций. Каждая сущность `iam.application` образует изолированный realm со своими:

- пользователями, учетными записями, сессиями и проверками;
- способами входа и политиками регистрации;
- Google/Facebook OAuth-конфигурациями;
- OAuth-клиентами для web, mobile и server-side storefront;
- issuer, ключами подписи и токенами;
- разрешенными origin, redirect URI и post-logout URI;
- брендингом и текстами hosted login UI.

Основой реализации должен быть Better Auth. Новый протокол не следует реализовывать вручную:

- OAuth 2.1 / OIDC provider — `@better-auth/oauth-provider` той же версии, что `better-auth`;
- password signup/signin — встроенный `emailAndPassword`;
- email OTP — `emailOTP`;
- Google/Facebook — встроенные `socialProviders`;
- JWT/JWKS, discovery, authorization code, PKCE, refresh token, userinfo, introspection, revocation и logout — возможности Better Auth и OAuth Provider plugin.

Хотя исходное бизнес-требование сформулировано как OAuth 2.0, для новой реализации принимается OAuth 2.1-профиль с OpenID Connect. Он сохраняет нужный Authorization Code flow, но требует PKCE и исключает небезопасные устаревшие варианты. Клиентский сценарий должен быть похож на Shopify Customer Account API: discovery → authorize → hosted login → callback с code → token exchange → refresh → end-session logout.

## 2. Цели

1. Дать каждой `iam.application` независимый пул `application_users`.
2. Позволить администраторам организации настраивать доступные способы входа без изменения кода IAM.
3. Поддержать:
   - регистрацию и вход по email/password;
   - passwordless-вход по одноразовому коду из email;
   - Google;
   - Facebook;
   - связывание нескольких способов входа с одним `application_user` по безопасной политике.
4. Выдавать стандартные OIDC ID tokens и OAuth access/refresh tokens для storefront-клиентов.
5. Предоставить hosted login/consent/logout UI, чтобы storefront не обрабатывал пароли и OTP как OAuth-клиент.
6. Гарантировать изоляцию данных по `applicationId` и принадлежность приложения организации.
7. Сохранить IAM владельцем credentials, sessions и verification, а Customers — владельцем бизнес-профиля покупателя.
8. Максимально использовать готовые endpoint, модели и security-проверки Better Auth.

## 3. Не входит в первую версию

- SAML, LDAP и enterprise federation.
- Собственный grant или password grant.
- Implicit flow и Resource Owner Password Credentials flow.
- Device Authorization Grant.
- Client Credentials grant и любые machine-to-machine principals/tokens.
- Dynamic Client Registration для внешних клиентов.
- wildcard redirect URI.
- Полноценный identity brokering между разными `iam.application`.
- Автоматическое объединение пользователей разных applications.
- Custom domains для issuer. Их можно добавить отдельным этапом после стабилизации канонических issuer.
- Passkeys/WebAuthn, TOTP MFA и recovery codes. Архитектура не должна мешать их добавлению позже.
- Phone OTP/passwordless, SMS delivery, phone-only users и synthetic email. Они выносятся в отдельный будущий план после выбора production Verify provider и security contract; текущий план не добавляет `phoneNumber` plugin, phone endpoints, phone-поля или SMS-конфигурацию.
- Кастомный keyed hasher/HMAC для email OTP, отдельный lifecycle ключей и миграция формата OTP hash. В v1 используется стандартный Better Auth `emailOTP({ storeOTP: "hashed" })`; дополнительный hardening выносится в отдельный будущий план после стабилизации email OTP flow.
- Реализация собственного email delivery worker, durable outbox, retry/dead-letter механизма и transport infrastructure. IAM интегрирует Better Auth `sendVerificationOTP` с утвержденным внешним platform email delivery service; надежность его очереди и хранение delivery payload определяются отдельным контрактом вне этого плана.
- Перенос бизнес-профиля, адресов, заказов или согласий маркетинга из Customers в IAM.

## 4. Текущее состояние и разрыв

В IAM уже присутствует основа application realm:

- `ApplicationAuthFactory` создает и кэширует Better Auth instance для application;
- `createApplicationAuth` задает application-specific `basePath`, cookie prefix, JWT claims и provider configuration;
- `scopedDrizzleAdapter` ограничивает `user`, `account`, `session`, `verification` и `jwks` по `applicationId`;
- существуют `application_user`, `application_account`, `application_session`, `application_verification`, `application_jwks`;
- блокировка пользователя отзывает его сессии;
- сессия проверяется с учетом активности application, organization и user.

Для целевого решения не хватает:

- публичного Fastify catch-all маршрута Better Auth для application realm;
- актуального OAuth Provider plugin и его application-scoped моделей;
- issuer/discovery/authorize/token/userinfo/revoke/introspect/logout;
- административных моделей и GraphQL API для auth settings, providers и OAuth clients;
- hosted login/consent UI;
- интеграции `sendVerificationOTP` с внешним platform email delivery service;
- безопасного хранения Google/Facebook secrets;
- договоренности между OAuth identity и Customer profile;
- проверки access token на стороне Storefront API;
- security limits, аудит-логов и наблюдаемости.

Настоящий план уточняет транспорт браузерной авторизации: стандартный HTTP OAuth/OIDC является каноническим протоколом. Broker Actions API не должен становиться вторым способом выдачи OAuth token и не должен проксировать password, OTP или authorization code через GraphQL.

## 5. Архитектурные решения

### 5.1. Application — realm, OAuth client — потребитель realm

Необходимо явно разделить два понятия:

- `iam.application` — изолированный identity realm/user pool, принадлежащий организации;
- OAuth client — конкретный web, mobile или backend-клиент, использующий realm.

Одна application может иметь несколько OAuth clients, например:

- публичный browser storefront;
- iOS/Android application;
- confidential server-side storefront;
- локальный development client.

Пользователи принадлежат application, а не отдельному OAuth client. Redirect URI, client type, client secret и logout URI принадлежат OAuth client.

Все OAuth clients в v1, включая confidential server-side storefront, работают только от имени `application_user` через Authorization Code flow. Запрет M2M применяется двумя независимыми слоями. OAuth Provider instance для каждой application глобально ограничивает token endpoint:

```text
oauthProvider.grantTypes = ["authorization_code", "refresh_token"]
```

Дополнительно IAM создает каждый client с неизменяемой protocol policy:

```text
grant_types = ["authorization_code", "refresh_token"]
response_types = ["code"]
```

`client_credentials` не входит в v1 и не может быть выбран через Admin GraphQL, client metadata или прямой HTTP endpoint. Глобальная provider policy не поддерживает и не рекламирует этот grant в discovery, а client-level policy не позволяет включить его для отдельного клиента даже при ошибке в management flow. Confidential client означает только возможность безопасно аутентифицироваться на token endpoint при code exchange/refresh; это не M2M client. Если позже понадобится service principal, для него требуется отдельный actor model, scopes, claims, audience, threat model и отдельная versioned protocol-policy migration.

### 5.2. Актуальный Better Auth OAuth Provider

Использовать `@better-auth/oauth-provider@1.6.23` вместе с `better-auth@1.6.23`.

Не использовать новый код на deprecated `oidcProvider` из `better-auth/plugins/oidc-provider`: Better Auth предупреждает о его удалении в следующей major-версии. Отдельный пакет уже предоставляет OAuth 2.1/OIDC endpoint, client management, consent, access/refresh token, revocation, introspection, discovery и end-session.

Версии `better-auth`, `@better-auth/core` и `@better-auth/oauth-provider` должны быть зафиксированы одинаково, без диапазона.

### 5.3. Канонический протокол — HTTP

OAuth/OIDC endpoint монтируются напрямую в существующий IAM Fastify instance. Отдельный Fastify application/process/listener для них не создается. Public application auth и Admin GraphQL регистрируются как два sibling encapsulated Fastify plugin scope на одном server instance:

```text
IAM Fastify instance / один listener
├── applicationAuthHttpPlugin
│   ├── versioned route manifest / default deny
│   ├── ApplicationOAuthResourcePolicyGuard
│   ├── /auth/applications/:applicationId/*
│   └── необходимые /.well-known/* routes
└── adminGraphqlPlugin
    ├── buildAdminContextMiddleware
    └── /graphql
```

`buildAdminContextMiddleware` и другие GraphQL-specific hooks добавляются только внутри `adminGraphqlPlugin` и не наследуются `applicationAuthHttpPlugin`. Публичный auth plugin имеет собственные hooks для default-deny route manifest, application/organization state, trusted proxy/IP, rate limits, request ID и безопасного логирования. GraphQL используется только для административного управления настройками, пользователями и OAuth clients.

Оба plugin используют общий IAM lifecycle, logger, `Kernel`, database pool и shutdown через один Fastify instance. Текущее имя конфигурационного порта `admin_graphql` после добавления публичных HTTP routes должно быть переименовано в общий IAM HTTP port либо явно задокументировано как общий listener. Reverse proxy публикует наружу только `/auth/applications/*` и утвержденные `/.well-known/*`; `/graphql` может оставаться доступным только внутреннему gateway/admin network.

Запрещается:

- оборачивать `/authorize`, `/token` или provider callback в GraphQL mutation;
- выдавать access/refresh token через самописную IAM action;
- принимать пароль или OTP в admin GraphQL;
- создавать параллельный JWT-формат для Storefront API.

### 5.4. Hosted login UI

IAM предоставляет собственные login, signup, OTP, provider selection, consent и logout страницы. OAuth client отправляет пользователя на `/oauth2/authorize`; IAM сохраняет подписанный authorization context и после успешной Better Auth-сессии продолжает authorization flow.

Такой подход:

- напоминает Shopify Customer Account flow;
- не раскрывает credentials storefront-приложению;
- унифицирует web/mobile/server-side clients;
- позволяет централизовать anti-enumeration, rate limits, локализацию и branding.

### 5.5. Административное управление

Dynamic Client Registration в первой версии выключен. OAuth client создается и меняется только организационным администратором через Admin GraphQL. Единственный серверный путь v1: `ApplicationOAuthClientManagementService` → application-scoped repository поверх plugin-compatible таблиц.

Публичный application realm не предоставляет Better Auth endpoint управления OAuth clients. Отключение Dynamic Client Registration само по себе недостаточно: OAuth Provider также содержит session-authenticated endpoint создания, чтения, изменения, удаления и ротации secret клиента. Fastify boundary обязан отклонять их до вызова `auth.handler`, даже если у request есть действующая `application_session`.

Admin GraphQL после Casbin и organization/application ownership checks вызывает `ApplicationOAuthClientManagementService`. Service выполняет create/update/delete/rotate через application-scoped repository в IAM transaction и сохраняет plugin-compatible формат данных. `adminCreateOAuthClient`, `adminUpdateOAuthClient` и session-authenticated public client-management endpoints в v1 не используются. Platform admin credential/cookie не передается в публичный application handler, application user session не имперсонируется, а internal management service не экспонируется как HTTP endpoint application realm.

Это позволяет IAM дополнительно проверять:

- принадлежность application организации;
- разрешения Casbin;
- точный allowlist URI;
- client type;
- связь client со Store;
- аудит операции.

## 6. Публичный HTTP-контракт

### 6.1. Канонический issuer

Для application использовать неизменяемый UUID, а не display name:

```text
{IAM_PUBLIC_BASE_URL}/auth/applications/{applicationId}
```

Пример:

```text
https://iam.example.com/auth/applications/019abcde-...
```

`IAM_PUBLIC_BASE_URL` задается серверной конфигурацией. Его нельзя строить из непроверенного `Host`/`X-Forwarded-Host` request header. Reverse proxy должен быть доверенным и корректно передавать исходную схему.

Каждая application получает собственные issuer, signing keys, cookies и данные Better Auth.

### 6.2. Стандартные endpoint

Фактические пути должны формироваться plugin и проверяться contract-тестами. Кроме отдельно указанного root OAuth metadata route, публичный контракт ожидается в следующем виде относительно issuer:

| Назначение | Endpoint |
| --- | --- |
| OIDC discovery | `/.well-known/openid-configuration` |
| OAuth Authorization Server Metadata (RFC 8414) | `{IAM_PUBLIC_BASE_URL}/.well-known/oauth-authorization-server/auth/applications/{applicationId}` |
| OAuth authorization | `/oauth2/authorize` |
| Token exchange/refresh | `/oauth2/token` |
| UserInfo | `/oauth2/userinfo` |
| Token introspection | `/oauth2/introspect` |
| Token revocation | `/oauth2/revoke` |
| End session | `/oauth2/end-session` |
| JWKS | путь из discovery `jwks_uri` |
| Better Auth methods/callback | только явно разрешенные endpoint под application `basePath` |

Поскольку issuer содержит path `/auth/applications/{applicationId}`, RFC 8414 требует вставить well-known suffix перед path issuer. Поэтому OAuth metadata публикуется отдельным `GET` route вне catch-all `/auth/applications/:applicationId/*`. Route не требует user session, но использует те же UUID validation, active application/organization checks, `IAM_PUBLIC_BASE_URL`, trusted-proxy policy и metadata того же application Better Auth instance. OIDC discovery остается доступен по issuer-relative адресу.

После подключения OAuth Provider добавить `disabledPaths: ["/token"]`, чтобы не оставлять второй неоднозначный token endpoint Better Auth.

Для всего application Better Auth handler действует versioned default-deny allowlist по паре `(HTTP method, normalized relative pathname)`, зафиксированный для точного набора и версий Better Auth plugins. Наличие endpoint в runtime router Better Auth само по себе не делает его публичным. В базовый публичный контракт входят только:

- OAuth/OIDC protocol endpoint: `authorize`, `token`, `userinfo`, `introspect`, `revoke`, `end-session`;
- hosted OAuth flow: `consent` и `continue`;
- read-only `public-client`/`public-client-prelogin`, только если они требуются hosted login/consent UI;
- OIDC discovery/JWKS endpoint, опубликованные plugin, и отдельный root OAuth Authorization Server Metadata route RFC 8414;
- точные Better Auth endpoint для включенных password signup/signin, email verification и password reset flows;
- точные endpoint `emailOTP`, необходимые для включенных OTP flows;
- точные social sign-in и callback endpoint только для разрешенных provider IDs `google`/`facebook`.

Manifest не содержит широких prefix/wildcard правил для `/sign-in/*`, `/sign-up/*`, `/callback/*`, `/email-otp/*` или иных plugin namespaces. Каждый callback provider и каждый HTTP method перечисляются явно. Effective allowlist request определяется пересечением:

1. versioned route manifest установленной сборки;
2. включенных для application auth methods/provider configuration;

Endpoint выключенного application method/provider возвращает `404` до `auth.handler`, даже если этот endpoint зарегистрирован plugin и разрешен общим versioned manifest.

Публично запрещены и возвращают `404` до `auth.handler`:

- Dynamic Client Registration;
- `create-client`, `get-client`, `get-clients`, `update-client`, `delete-client`;
- `client/rotate-secret`;
- любые admin/client-management endpoint, добавленные текущей или будущей версией plugin;
- account/consent management endpoint, не требуемые hosted flow;
- endpoint выключенного password/OTP/social method или provider;
- любой неизвестный path под application `basePath`, отсутствующий в effective allowlist, включая неизвестные не-`/oauth2/*` Better Auth/plugin endpoint.

Точные имена и HTTP methods путей извлекаются из runtime manifest полного Better Auth instance и фиксируются в compatibility ADR после установки `@better-auth/oauth-provider@1.6.23` и подключения password/emailOTP/social plugins. Upgrade Better Auth, OAuth Provider, emailOTP либо изменение plugin composition невозможно без повторной сверки и явного обновления публичного route manifest.

### 6.3. Mandatory resource enforcement

`oauthProvider.validAudiences` является defense-in-depth allowlist, но не владельцем mandatory-resource contract. Версия `@better-auth/oauth-provider@1.6.23` не связывает `resource` authorization request с authorization code и refresh-token family, а token request без `resource` может получить opaque access token. Поэтому обязательность и неизменность единственного application resource обеспечивает отдельный `ApplicationOAuthResourcePolicyGuard` внутри `applicationAuthHttpPlugin` до вызова `auth.handler`.

Guard применяется только к точным protocol routes из versioned manifest:

- `GET /oauth2/authorize` — читает `resource` из raw query;
- `POST /oauth2/token` с `grant_type=authorization_code` — читает `resource` из исходного `application/x-www-form-urlencoded` body;
- `POST /oauth2/token` с `grant_type=refresh_token` — выполняет ту же проверку для каждого refresh.

Для каждого из этих requests guard обязан:

1. принимать ровно одно непустое значение `resource`; отсутствие, два одинаковых значения и несколько разных значений одинаково отклоняются;
2. сравнивать request value как exact string с уже нормализованным `application.resource`, не нормализуя и не переписывая входной URI повторно;
3. загружать OAuth client в scope application и проверять его IAM-controlled resource binding; `client_id` берется из form body либо username HTTP Basic authentication, конфликт двух источников отклоняется;
4. не проверять client secret, authorization code или refresh token самостоятельно — их аутентификацию, одноразовость и rotation продолжает выполнять OAuth Provider;
5. возвращать protocol error `invalid_target` до выпуска token. Authorization endpoint может перенаправлять ошибку только после отдельной точной проверки client и `redirect_uri`; иначе используется прямой безопасный `400` response;
6. передавать в `auth.handler` исходные query/body bytes и HTTP method без потери повторяющихся параметров, повторного percent-decoding или изменения form encoding.

В v1 у application существует ровно один resource. Поэтому exact-проверка одного и того же значения на authorize, code exchange и каждом refresh эквивалентна запрету смены/расширения audience, несмотря на то что plugin не хранит resource в code/refresh-token row. Добавление второго resource в будущем запрещено обычной configuration mutation и потребует новой protocol-policy version, хранения granted resources с authorization code/refresh family и отдельной migration.

`ApplicationOAuthResourcePolicyGuard` не является OAuth server и не выпускает token: он закрывает только подтвержденный compatibility spike gap перед передачей request готовому OAuth Provider.

### 6.4. Fastify integration

Не создавать второй `fastify()` instance. В существующем IAM HTTP server зарегистрировать `applicationAuthHttpPlugin` рядом, а не внутри encapsulated scope Admin GraphQL. Рекомендуемый порядок сборки:

```text
create Fastify instance
register shared process-level infrastructure
register applicationAuthHttpPlugin
register adminGraphqlPlugin with buildAdminContextMiddleware
register health routes
listen once
```

Hooks дочернего `adminGraphqlPlugin` не должны применяться к sibling `applicationAuthHttpPlugin`. Auth plugin не создает фиктивный platform admin context и не принимает platform session как основание для application authorization. Общие hooks разрешены только если они безопасны для обоих transport: request ID, базовое structured logging и утвержденная trusted-proxy policy.

Внутри `applicationAuthHttpPlugin` добавить catch-all handler под `/auth/applications/:applicationId/*`, который:

1. валидирует UUID;
2. загружает активную application и ее активную organization;
3. загружает auth configuration application;
4. нормализует относительный path без повторного decode;
5. проверяет `(HTTP method, normalized pathname)` по versioned manifest и пересекает его с включенными application methods/providers;
6. возвращает `404` для любого неизвестного, management или выключенного endpoint до вызова Better Auth;
7. для точных authorize/token routes выполняет `ApplicationOAuthResourcePolicyGuard` из раздела 6.3 и при нарушении возвращает `invalid_target` до вызова Better Auth;
8. получает instance из `ApplicationAuthFactory`;
9. преобразует Fastify request в стандартный Fetch API `Request`;
10. передает только разрешенный и прошедший resource policy request в `auth.handler`;
11. корректно переносит status, headers и body в Fastify reply.

Дополнительно в том же `applicationAuthHttpPlugin` зарегистрировать точный `GET /.well-known/oauth-authorization-server/auth/applications/:applicationId`. Он находится вне application-prefixed catch-all, но повторно использует общую логику application lookup, active realm validation, request ID, rate limit, trusted proxy и metadata response. Другие path под `/.well-known/*` остаются запрещены по default-deny policy.

Route authorization выполняется по HTTP method и нормализованному pathname, а не по строковому prefix match. Query/body не участвуют в выборе route; после точного выбора authorize/token route они используются только соответствующей protocol policy, включая `ApplicationOAuthResourcePolicyGuard`. Encoded slash, duplicate slash, dot-segment и повторное percent-decoding не должны позволять обойти deny/default-deny policy. Для social callback provider берется из уже сопоставленного точного pathname manifest, а не из непроверенного wildcard segment.

Handler обязан сохранять:

- query string без повторного декодирования;
- JSON и `application/x-www-form-urlencoded` body;
- все `Set-Cookie`, включая несколько заголовков;
- redirect location;
- client IP только из доверенной proxy chain;
- исходный HTTP method;
- отсутствие общего CORS `*`.

Allowed origins берутся из application configuration и сопоставляются точным origin. Redirect URI проверяет OAuth Provider plugin по точному зарегистрированному URI.

`applicationAuthHttpPlugin` и `adminGraphqlPlugin` используют один порт, но имеют независимые transport/auth boundaries. Network exposure на reverse proxy настраивается по path: публичные OAuth/OIDC routes доступны storefront clients, а `/graphql` не становится публичным только из-за общего listener.

## 7. Целевой пользовательский flow

### 7.1. Authorization Code + PKCE

1. Storefront получает discovery document application issuer.
2. Клиент генерирует `state`, `nonce`, `code_verifier` и `code_challenge=S256`.
3. Браузер переходит на `/oauth2/authorize` с:
   - `client_id`;
   - точным `redirect_uri`;
   - `response_type=code`;
   - `scope=openid profile email offline_access customer-account-api:full`;
   - `resource={application.resource}`;
   - `state`;
   - `nonce`;
   - `code_challenge`;
   - `code_challenge_method=S256`.
4. `ApplicationOAuthResourcePolicyGuard` загружает единственный настроенный для application resource и OAuth client, требует ровно один `resource`, его точное совпадение с `application.resource` и IAM-controlled binding клиента; затем OAuth Provider сохраняет authorization context.
5. Если application-сессии нет, IAM показывает hosted login UI.
6. Пользователь выбирает разрешенный application способ входа.
7. Better Auth создает/проверяет `application_user`, account и session.
8. Для доверенного first-party client consent может быть заранее разрешен server-controlled настройкой client `skipConsent`; для остальных показывается consent page.
9. IAM возвращает одноразовый authorization code на зарегистрированный callback вместе со `state`.
10. Клиент проверяет `state` и обменивает code + `code_verifier` на token, повторно передавая тот же `resource`; guard до OAuth Provider отклоняет отсутствующий, повторяющийся или отличающийся resource и не допускает смену/расширение audience.
11. Клиент проверяет ID token: signature, `iss`, `aud`, `exp`, `nonce`.
12. Клиент проверяет, что access token имеет JWT-формат и `aud={application.resource}`, после чего отправляет его в Storefront API как bearer token.
13. Refresh token используется только через `/oauth2/token` с тем же единственным `resource`; guard повторяет exact-проверку на каждом refresh, после чего новый access token сохраняет application resource/audience. Rotation/revocation контролирует plugin.

PKCE нельзя отключать. Для browser/mobile client используется public client с `token_endpoint_auth_method=none`. Для server-side client используется confidential client, PKCE и client authentication. Оба типа имеют только `grant_types=["authorization_code", "refresh_token"]` и `response_types=["code"]`; запрос `grant_type=client_credentials` отклоняется глобальной policy OAuth Provider до выдачи token и дополнительно не разрешен policy конкретного client.

### 7.2. Logout

1. Клиент удаляет локальную application session.
2. Браузер направляется в `end_session_endpoint` с `id_token_hint` и зарегистрированным `post_logout_redirect_uri`.
3. IAM отзывает/закрывает связанную сессию и очищает realm cookie.
4. IAM перенаправляет только на заранее зарегистрированный URI.

Один logout не должен затрагивать сессии пользователя в другой application.

## 8. Способы регистрации и входа

### 8.1. Email/password

Использовать встроенный `emailAndPassword` Better Auth:

- email нормализуется, но исходное значение не используется как tenant key;
- уникальность email — внутри application;
- минимальная длина пароля по умолчанию 10 символов, максимальная — ограничение Better Auth;
- signup может быть выключен независимо от signin;
- email verification может быть обязательным до выдачи полноценной сессии;
- forgot/reset password использует подписанные одноразовые ссылки Better Auth;
- password hash и account lifecycle не реализуются вручную.

Политики, управляемые администратором:

- `passwordSignUpEnabled`;
- `passwordSignInEnabled`;
- `emailVerificationRequired`;
- `passwordResetEnabled`;
- `registrationMode`: `open | disabled`.

### 8.2. Email OTP/passwordless

Использовать `emailOTP`:

- 6 цифр;
- TTL 5 минут;
- максимум 3 проверки;
- новый запрос ротирует предыдущий код;
- хранение OTP — `hashed`;
- ответ отправки всегда обобщенный, независимо от существования пользователя;
- `sendVerificationOTP` передает исходный код утвержденному внешнему platform email delivery service и ожидает только подтверждение приема задания, а не фактическую отправку письма;
- используется стандартная конфигурация Better Auth `storeOTP: "hashed"` как осознанный baseline v1;
- custom `storeOTP` hasher/HMAC, отдельный ключ на realm, dual-format verification и миграция hash-формата не входят в этот план;
- baseline дополнительно ограничивается TTL, числом попыток, ротацией кода, rate limits и контролем доступа к verification storage.

Администратор может включать email OTP signin/signup и настраивать утвержденный email delivery profile, но не произвольный executable template.

### 8.3. Google и Facebook

Использовать встроенные Better Auth `socialProviders.google` и `socialProviders.facebook` с отдельными credentials для каждой application.

Provider configuration включает:

- `enabled`;
- encrypted `clientId`/`clientSecret`;
- provider-specific scopes из утвержденного списка;
- время последнего изменения и actor;
- безопасный callback URL, рассчитанный IAM и показанный администратору read-only.

Правила:

- upstream access/refresh token шифруются через `account.encryptOAuthTokens: true`;
- `clientSecret` никогда не возвращается через GraphQL;
- callback URL нельзя переопределить произвольным запросом;
- provider errors показываются пользователю без токенов и внутренних деталей;
- Facebook login без доступного email в v1 завершается понятным безопасным сообщением, а не созданием неоднозначного пользователя;
- provider account связывается только внутри текущей application.

## 9. Account linking

Базовая политика Better Auth:

- `accountLinking.enabled=true`;
- `allowDifferentEmails=false`;
- `allowUnlinkingAll=false`;
- `updateUserInfoOnLink=false`;
- не включать небезопасный глобальный trusted provider список;

Автоматическое связывание допускается только когда Better Auth получил и подтвердил один и тот же реальный email по безопасному provider flow. Facebook без достоверного verified email не должен автоматически связываться.

Для неоднозначных случаев предоставить отдельный authenticated link-account flow:

1. пользователь уже имеет свежую application session;
2. подтверждает новый provider/passwordless method;
3. IAM проверяет application scope и отсутствие account у другого пользователя;
4. связь создается атомарно;
5. операция записывается в audit log.

Разрыв последнего способа входа запрещен. Объединение двух существующих пользователей — отдельная административная операция и не входит в первую версию.

## 10. Данные и миграции

Все новые таблицы размещаются в схеме `iam`. Названия окончательно сверить с `@better-auth/oauth-provider` schema generation, не переименовывая поля, которые plugin ожидает напрямую.

### 10.1. `application_auth_configuration`

Одна строка на application:

| Поле | Назначение |
| --- | --- |
| `application_id` | PK/FK на `iam.application` |
| `revision` | монотонная версия для cache invalidation |
| `resource` | единственный канонический OAuth resource/audience application |
| `registration_mode` | `open`, `disabled` |
| `password_sign_up_enabled` | регистрация password |
| `password_sign_in_enabled` | вход password |
| `email_verification_required` | обязательная проверка email |
| `email_otp_enabled` | email passwordless |
| `google_enabled` | Google UI/provider switch |
| `facebook_enabled` | Facebook UI/provider switch |
| `consent_mode` | политика consent по умолчанию |
| `access_token_ttl_seconds` | ограниченный TTL access token |
| `id_token_ttl_seconds` | TTL ID token |
| `refresh_token_ttl_seconds` | TTL refresh token |
| `session_ttl_seconds` | TTL application session |
| `branding_json` | валидированный branding contract |
| `default_locale` | локаль hosted UI |
| `created_at`, `updated_at` | аудит времени |

Значения по умолчанию:

- access token: 15 минут;
- ID token: 60 минут;
- authorization code: 5 минут;
- refresh token: 30 дней;
- session: 30 дней с серверной ревокацией.

Администратор может менять значения только в заранее заданных безопасных диапазонах. Конфигурация не должна позволять отключить PKCE, state/nonce validation, redirect validation или token signature.

`resource` обязателен до создания первого OAuth client и задается администратором application через Admin GraphQL. Для одной application разрешено ровно одно значение: массив или несколько resource не поддерживаются. Значение должно быть абсолютным HTTPS URI, нормализуется один раз без trailing slash, не строится из request `Host` и должно быть уникальным среди активных applications. Изменение resource является security-sensitive mutation: IAM атомарно обновляет resource всех OAuth clients application, увеличивает `revision`, инвалидирует `ApplicationAuthFactory` cache и отзывает ранее выданные access/refresh tokens, чтобы старый audience не продолжал использоваться.

### 10.2. `application_auth_origin`

- `id`;
- `application_id`;
- `origin` в нормализованном виде `scheme://host[:port]`;
- `created_at`;
- unique `(application_id, origin)`.

Запрещены path, query, fragment, userinfo, wildcard и незашифрованный HTTP вне явного localhost development режима.

### 10.3. `application_auth_provider`

- `id`;
- `application_id`;
- `provider`: `google | facebook`;
- `enabled`;
- `encrypted_client_id`;
- `encrypted_client_secret`;
- `secret_key_version`;
- `scopes_json`;
- `created_at`, `updated_at`, `updated_by`;
- unique `(application_id, provider)`.

Секреты шифруются envelope encryption/KMS abstraction либо AES-256-GCM с versioned IAM master key. AAD включает `applicationId`, provider и field name. Значения не попадают в Pino context, exception, GraphQL response или audit payload.

### 10.4. Email delivery integration configuration

Не хранить произвольные SMTP secrets в обычном JSON. Ввести:

- `application_auth_delivery_profile` — ссылка на разрешенный email transport, sender identity и template id;
- секреты transport — только в secrets backend;
- шаблоны — versioned/validated, без executable code;
- IAM передает delivery profile, recipient, purpose и исходный OTP/ссылку только через typed interface утвержденного platform email delivery service;
- IAM не сохраняет plaintext OTP/ссылку в собственной очереди, outbox или audit; защита durable payload, retries и dead-letter lifecycle являются ответственностью внешнего delivery service и его отдельного security contract.

Если platform-wide transport достаточен для v1, application хранит только sender/template selection из allowlist.

### 10.5. OAuth Provider plugin models

Добавить application-scoped варианты моделей plugin:

- OAuth client;
- OAuth access token;
- OAuth refresh token;
- OAuth consent.

В текущей версии plugin это логические модели `oauthClient`, `oauthAccessToken`, `oauthRefreshToken`, `oauthConsent`. Точные поля генерируются/сверяются с установленной версией пакета.

Каждая строка должна иметь `application_id`. Adapter должен автоматически:

- добавлять `applicationId` на create;
- добавлять application predicate на read/update/delete;
- запрещать изменение `applicationId`;
- применять составную уникальность, например `(application_id, client_id)`;
- не позволять token/consent ссылаться на client/user/session другой application.

Если Better Auth ожидает глобально уникальный `clientId`, генерировать его с криптографической энтропией и все равно сохранять tenant predicates. Внешний subject `sub` остается application user id.

### 10.6. OAuth client metadata

Помимо plugin fields хранить контролируемую IAM metadata:

- `application_id`;
- `client_id`;
- `store_id` — trusted Store binding, отдельный от OAuth resource;
- `resources` — server-controlled значение; в v1 ровно `[application.resource]` для каждого client этой application;
- `grant_types` — server-controlled, в v1 ровно `["authorization_code", "refresh_token"]`;
- `response_types` — server-controlled, в v1 ровно `["code"]`;
- `environment`: `development | production`;
- `created_by`, `updated_by`;
- `created_at`, `updated_at`;
- `deleted_at`/disabled state.

`store_id` проверяется через внутренний Project service action: Store и application должны принадлежать одной организации. Межсервисный FK не создается.

При создании/изменении клиента IAM записывает `[application.resource]` в plugin field `resources`, если оно поддерживается подтвержденной схемой версии `1.6.23`, и всегда дублирует enforcement в server-side client policy. OAuth client не может иметь ноль, два или иной resource. GraphQL input OAuth client не содержит `resource`/`resources`: значение наследуется из auth configuration application и меняется только application-level mutation.

Поля plugin `grantTypes` и `responseTypes` записываются IAM при создании и не принимаются из GraphQL input при create/update. Repository запрещает их изменение в обход отдельной будущей protocol-policy migration. Это client-level ограничение дополняет глобальное `oauthProvider.grantTypes=["authorization_code", "refresh_token"]`; ни один client record не может расширить grant set OAuth Provider instance. Public client-management endpoint закрыты, поэтому application user не может зарегистрировать client с `client_credentials` самостоятельно.

## 11. Better Auth instance для application

`createApplicationAuth` должен собирать instance только из валидированной конфигурации и включать:

```text
emailAndPassword
socialProviders.google/facebook
plugins: jwt, emailOTP, oauthProvider
oauthProvider.validAudiences: [application.resource]
oauthProvider.grantTypes: ["authorization_code", "refresh_token"]
oauthProvider.disableJwtPlugin: false
account.encryptOAuthTokens
account.accountLinking
trustedOrigins
session settings
advanced.cookiePrefix/basePath
disabledPaths: /token
```

### 11.1. Секрет application instance

Не хранить одинаковый Better Auth `secret` для всех realms. Получать стабильный realm secret через HKDF от versioned IAM root secret с context:

```text
shopana:iam:application-auth:{applicationId}:{keyVersion}
```

Ротация требует периода одновременной проверки текущим и предыдущим ключом либо контролируемого отзыва всех realm sessions. Схему ротации утвердить до production.

### 11.2. Cache invalidation

Ключ `ApplicationAuthFactory`:

```text
applicationId + configurationRevision + secretKeyVersion
```

После admin mutation:

1. транзакционно обновляется config и увеличивается `revision`;
2. публикуется cache invalidation event;
3. локальный instance удаляется;
4. следующий request строит новую конфигурацию.

Нельзя оставлять старые provider credentials активными до process restart.

### 11.3. Adapter contract

Расширить `scopedDrizzleAdapter` всеми моделями OAuth Provider plugin и написать отдельные contract-сценарии для каждой операции adapter. Особое внимание:

- вложенным `where`;
- update/delete по token/client id;
- спискам и count;
- transaction boundary;
- composite uniqueness;
- чужим application IDs в входных данных;
- soft-deleted application/organization;
- blocked user и revoked session.

## 12. Admin GraphQL API

Все операции размещаются в существующем Admin API IAM namespace и защищаются Casbin. Application всегда повторно загружается по `applicationId`, а `organizationId` берется из доверенного admin context, не из произвольного client claim.

### 12.1. Application и auth settings

Нужны операции:

- создать application;
- получить/list applications текущей организации;
- изменить display metadata;
- архивировать application;
- получить auth configuration;
- задать/изменить единственный canonical resource application;
- обновить разрешенные auth methods и policy;
- получить issuer, OIDC discovery URL, OAuth Authorization Server Metadata URL и рассчитанные provider callback URLs;
- управлять trusted origins;
- обновить branding/localization.

Mutation обновления принимает ожидаемую `revision` для optimistic concurrency.

Application-level resource mutation принимает одно поле `resource`, а не список. Она валидирует absolute HTTPS URI, выполняет каноническую нормализацию и проверяет уникальность среди активных applications. Resource нельзя задавать в OAuth client mutation. При изменении IAM применяет описанную в разделе 10.1 атомарную синхронизацию clients, cache invalidation и token revocation. Операция требует `iam.application.auth.write` и записывается в audit log без authorization context/token values.

### 12.2. Social providers

- configure Google provider;
- configure Facebook provider;
- enable/disable provider;
- rotate credentials;
- удалить credentials только после disable;
- получить status без secret;
- опционально выполнить безопасную configuration validation без раскрытия токенов.

GraphQL response возвращает только:

- `configured`;
- `enabled`;
- masked client id при необходимости;
- scopes;
- callback URL;
- `updatedAt`/`updatedBy`.

### 12.3. OAuth clients

Все операции ниже доступны только через Admin GraphQL. Resolver выполняет Casbin/organization/application checks и затем вызывает `ApplicationOAuthClientManagementService`, который работает только через application-scoped repository. Application user session никогда не авторизует эти операции через публичный HTTP handler.

- list/get clients;
- create public/confidential client;
- update name, redirect URIs, post-logout URIs и store binding;
- disable/enable client;
- rotate confidential client secret;
- delete/archive client;
- управлять `skipConsent` только для first-party clients.

GraphQL input не содержит `grantTypes`/`responseTypes`. При create IAM всегда передает Better Auth:

```text
grant_types = ["authorization_code", "refresh_token"]
response_types = ["code"]
```

Update не позволяет менять эти поля. Значения возвращаются read-only, чтобы администратор и аудит видели фактическую protocol policy клиента.

Client secret показывается один раз при создании/ротации и далее хранится plugin в защищенном/hashed виде. Его нельзя получить повторно.

Валидация URI:

- точное совпадение;
- HTTPS для production;
- localhost HTTP разрешен только development client;
- без wildcard, fragment и userinfo;
- custom mobile scheme — только по отдельному allowlist policy;
- post-logout URI валидируется отдельно;
- максимум URI на client ограничен.

### 12.4. Application users

- list/get пользователя внутри application;
- block/unblock;
- revoke all sessions;
- list accounts без credential/token;
- unlink допустимый account;
- получить security metadata без PII из других applications.

Администратор не может получить password hash, OTP, provider token, session token, authorization code или refresh token.

### 12.5. Разрешения

Ввести отдельные permissions, например:

- `iam.application.read/write/archive`;
- `iam.application.auth.read/write`;
- `iam.application.provider.read/write`;
- `iam.application.oauth-client.read/write/rotate-secret`;
- `iam.application.user.read/block/revoke-session/unlink-account`.

Чтение секретных status и ротация secret должны быть разделены. Все write/secret operations аудируются.

## 13. Hosted UI

Минимальный набор страниц:

- выбор способа входа;
- email/password signin;
- password signup;
- email OTP request/verify;
- email verification pending;
- forgot/reset password;
- consent;
- logout confirmation;
- provider/application disabled;
- безопасная общая ошибка.

Требования:

- WCAG-compatible keyboard/focus behavior;
- локализация, минимум язык application default + fallback;
- organization/application branding только из безопасной схемы цветов, logo URL и текста;
- никакого arbitrary HTML/JavaScript;
- OAuth request context хранится в подписанном HttpOnly cookie/server-side record;
- context привязан к application, client, redirect URI, state/nonce и короткому TTL;
- SameSite и Secure cookie выбираются по конкретному flow;
- CSRF protection на state-changing form;
- generic ошибки против account enumeration;
- provider button виден только при configured + enabled provider.

Hosted UI не должен сохранять password или OTP в localStorage, URL, analytics event или error tracker.

## 14. Token и claims

### 14.1. Обязательные claims

ID token:

- `iss` — application issuer;
- `sub` — стабильный ID `application_user` внутри application;
- `aud` — OAuth client;
- `exp`, `iat`, `auth_time`;
- `nonce` при authorization request;
- `sid`, если поддерживается plugin/session binding;
- `email`/`email_verified` только для реального email и запрошенного scope;

Access token:

- `iss`;
- `sub`;
- `aud`/resource audience;
- `client_id`;
- `scope`;
- `exp`, `iat`;
- `application_id`;
- `store_id`, только из trusted OAuth client metadata;
- `actor_type=application_user`;
- `sid`, если нужен live session check.

В v1 каждый access token имеет пользователя: `sub` обязателен, а `actor_type` всегда равен `application_user`. Userless/M2M access token от `client_credentials` является недопустимым и отклоняется Storefront validator даже при корректной подписи.

Не помещать в token:

- Casbin admin roles;
- password/account/provider tokens;
- Customer profile snapshot;
- произвольные admin-configured claims.

### 14.2. Scopes

Первая версия:

- `openid`;
- `profile`;
- `email`;
- `offline_access`;
- `customer-account-api:full` как resource scope.

Начать с малого утвержденного scope registry. Администратор может выбирать только разрешенные scopes, но не создавать исполняемую claim mapping логику.

### 14.3. Resource indicator и формат access token

В v1 каждая `iam.application` имеет ровно один собственный канонический resource indicator для Storefront API:

```text
application.resource=<absolute HTTPS URI Storefront API для этой application>
```

Значение задается администратором application через Admin GraphQL, хранится в `application_auth_configuration`, нормализуется один раз без trailing slash и не строится из `Host` request. Множественные resources для одной application не поддерживаются. Нормализованное значение уникально среди активных applications и одинаково используется как:

- `resource` в authorization request;
- элемент `oauthProvider.validAudiences`;
- единственный разрешенный resource каждого OAuth client application;
- `aud` JWT access token;
- ожидаемый audience Storefront validator.

OAuth Provider работает с включенным JWT plugin (`disableJwtPlugin=false`). Storefront client обязан передавать `application.resource` и в authorization request, и в code exchange/refresh token request. Отсутствующий, неизвестный, множественный, принадлежащий другой application или не совпадающий с настроенным resource отклоняется с protocol error `invalid_target`. Успешный code exchange и refresh должны выдавать JWT access token с точным `aud=application.resource`. Opaque access tokens не входят в Storefront v1 contract и отклоняются без попытки fallback-introspection.

Enforcement принадлежит `ApplicationOAuthResourcePolicyGuard` из раздела 6.3, а не одному `oauthProvider.validAudiences`. Guard требует exact application resource до передачи authorize/code-exchange/refresh request в OAuth Provider; `validAudiences`, client metadata и JWT-only Storefront validation остаются независимыми дополнительными слоями. Ни application configuration, ни OAuth client input не могут отключить guard или выбрать permissive fallback.

`store_id` не является resource/audience: он берется только из доверенной metadata OAuth client и добавляется через `customAccessTokenClaims`. Все clients одной application используют ее единственный resource, а resource server одновременно проверяет `aud`, `application_id` и `store_id`.

### 14.4. Проверка в Storefront API

Storefront/Gateway обязан проверять:

- подпись по JWKS и допустимый алгоритм;
- точный `iss`;
- точный `aud`, равный resource application из trusted routing/configuration context;
- `exp`, `nbf`, `iat` с небольшим clock skew;
- `scope`;
- `application_id` и `store_id` из trusted routing context;
- `actor_type`;
- актуальное состояние application/user/session для чувствительных операций.

Storefront сначала проверяет JWT shape и никогда не принимает opaque token. Для обычных запросов короткий JWT access token проходит локальную cryptographic verification. Для операций с повышенным риском и после block/revoke использовать IAM validation action или JWT introspection с live checks. Результаты live validation кэшировать только на очень короткий срок и инвалидировать событиями.

Формат token не определяется клиентом: IAM конфигурация и обязательный resource гарантируют JWT для Storefront. Поддержка opaque access token в будущем требует отдельного versioned resource-server contract и не включается автоматически.

## 15. Связь с Customers service

IAM владеет identity/security данными. Customers владеет business profile. Между таблицами нет cross-service FK.

После первого успешного создания/входа пользователя нужен идемпотентный процесс связывания:

1. IAM устанавливает `applicationId`, `applicationUserId` и trusted `storeId` из OAuth client metadata.
2. Публикуется versioned event либо вызывается внутренняя idempotent action `ensureCustomerForApplicationUser`.
3. Customers создает или находит Customer по `(storeId, iamPrincipalId)`.
4. `customer.iam_principal_id` указывает на application user id как внешний reference.
5. Проверенный email проецируется в Customers только событием, без передачи credentials.

Обязательная уникальность Customers: один IAM principal на один Store. Один application user может иметь разные Customer profiles в разных Stores, если несколько OAuth clients application привязаны к разным Stores.

Порядок не должен блокировать выдачу token из-за временной недоступности Customers. Использовать outbox/retry и идемпотентность. Для Storefront операции, требующей Customer, допускается синхронный `ensure` с тем же idempotency key.

## 16. Multi-tenancy и изоляция

На каждом request должны одновременно соблюдаться:

- application найдена по route и активна;
- organization application активна;
- OAuth client принадлежит той же application;
- user/account/session/verification/token/consent принадлежат той же application;
- store OAuth client принадлежит той же organization;
- admin actor имеет permission в этой organization;
- пользователь не заблокирован;
- session/token не отозваны.

Нельзя полагаться только на application id из body, GraphQL input, JWT или adapter-created object. Scope поступает из доверенного route/admin context и принудительно добавляется сервером.

Cross-application атаки должны входить в обязательные негативные сценарии для каждого repository/adapter endpoint.

## 17. Интеграция с email delivery service

Better Auth вызывает настроенный IAM callback `sendVerificationOTP`. Callback:

- загружает разрешенный application delivery profile;
- формирует typed request внешнему platform email delivery service с `applicationId`, нормализованным recipient, purpose, template id и исходным OTP/ссылкой;
- передает idempotency key, если его поддерживает внешний contract;
- ожидает только подтверждение приема задания внешним service, а не фактическую отправку письма;
- маскирует recipient в логах и не логирует OTP/link token;
- не сохраняет plaintext OTP/ссылку в IAM database, cache, outbox или audit;
- публикует только метрики результата handoff без high-cardinality PII labels.

Email worker, durable queue/outbox, retries, dead-letter state, шифрование и retention delivery payload реализуются внешним platform email delivery service и находятся вне scope этого плана. IAM должен документировать требования к этому контракту, но не реализует собственную delivery infrastructure.

User-facing response не ждет фактической отправки и не различает `user_not_found`, `provider_failed` и `accepted`. Ошибка handoff отображается как generic временная недоступность без раскрытия существования account.

## 18. Rate limits и защита от злоупотреблений

Минимальные отдельные policies:

| Операция | Ключи ограничения |
| --- | --- |
| Password signin | application + normalized email hash + IP |
| Email OTP request | application + email hash + IP/device |
| Email OTP verify | application + verification id + IP |
| OAuth authorize | application + client + IP |
| Token endpoint | application + client + IP |
| Password reset | application + email hash + IP |

Точные числа определить нагрузочным/security review, но обязателен layered limit: короткое окно и суточный delivery budget.

После лимита возвращать стандартную/generic ошибку и `Retry-After`, не подтверждая существование account. CAPTCHA/risk challenge оставить расширением после появления telemetry.

## 19. Аудит и наблюдаемость

Аудитировать:

- изменение auth configuration;
- enable/disable provider;
- изменение/ротацию provider credentials;
- создание/изменение/disable OAuth client;
- ротацию client secret;
- block/unblock user;
- revoke session;
- link/unlink account;
- смену signing key;
- admin actor, organization, application, request id, время и безопасный diff.

Security/operational события без секретов:

- authorize success/failure reason category;
- token exchange/refresh/revoke;
- signin method and outcome;
- OTP requested/verified/expired/rate-limited;
- provider callback outcome;
- invalid redirect/state/nonce/PKCE;
- blocked application/user/client;
- Customer projection retry.

Метрики:

- latency/error rate по endpoint и method;
- active realms/factory cache hit/miss/rebuild;
- OTP delivery handoff latency/failure;
- token refresh/revoke;
- rate-limit count;
- provider callback failure;
- adapter cross-scope rejection;

Не использовать raw user ID, email, token, code, client secret или provider response как metric label.

## 20. Этапы реализации

### Этап 0. Compatibility и security spike

Подробный результат выполненного spike: [Compatibility и security spike OAuth 2.1 / OIDC для `application_users`](./application-users-oauth-oidc-compatibility-spike.ru.md).

Задачи:

1. Добавить exact dependency `@better-auth/oauth-provider@1.6.23`.
2. Зафиксировать generated schema и endpoint paths установленной версии.
3. Классифицировать каждый endpoint полного Better Auth instance, включая OAuth Provider, password, emailOTP и social plugins, как public protocol/hosted-flow или internal/forbidden и зафиксировать default-deny manifest по method + normalized pathname.
4. Подтвердить, что session-authenticated client-management endpoint недоступны application users, а все admin operations выполняются только через `ApplicationOAuthClientManagementService` и application-scoped repository без публичной HTTP-экспозиции.
5. Подтвердить Fastify integration, path-prefixed issuer, issuer-relative OIDC discovery, отдельный root OAuth Authorization Server Metadata route RFC 8414 и multi-cookie responses.
6. Проверить возможность application scoping всех plugin models через текущий adapter.
7. Подтвердить application-scoped `resource`, поведение `validAudiences: [application.resource]`, отсутствие resource binding в plugin и необходимость `ApplicationOAuthResourcePolicyGuard` для authorize/code exchange/refresh.
8. Проверить custom claims/store binding.
9. Зафиксировать глобальный `oauthProvider.grantTypes=["authorization_code", "refresh_token"]`, public/confidential client behavior, обязательные client-level `grant_types=["authorization_code", "refresh_token"]`, `response_types=["code"]` и secret one-time return.
10. Подтвердить, что discovery не рекламирует `client_credentials`, а token endpoint отклоняет этот grant для каждого public/confidential v1 client.

Результат:

- короткий ADR с выбранным plugin и отклонением deprecated `oidcProvider`;
- подтвержденная схема таблиц;
- versioned route manifest с точными HTTP methods и public/internal endpoint всего Better Auth handler;
- подтвержденные issuer-relative OIDC discovery и root `GET /.well-known/oauth-authorization-server/auth/applications/:applicationId` с согласованными issuer/endpoints;
- негативное подтверждение, что application user не может читать, создавать, изменять, удалять client или ротировать его secret;
- contract-подтверждение guard contract: обязательный единственный resource конкретной application выдает JWT с ожидаемым `aud`, а отсутствующий, повторяющийся или resource другой application отклоняется до `auth.handler`;
- contract-подтверждение, что `client_credentials` отсутствует в discovery и public/confidential v1 clients не получают token через этот grant;

Критерий выхода: нет неизвестных, требующих самописного OAuth server или небезопасного хранения OTP.

### Этап 1. Схема, конфигурация и secrets

Задачи:

1. Создать миграции application auth config, включая единственный `resource`, origins/providers/delivery metadata.
2. Добавить OAuth Provider plugin tables с `application_id`.
3. Добавить индексы, tenant constraints и cleanup behavior.
4. Реализовать encryption service для provider credentials.
5. Реализовать HKDF realm secret derivation/versioning.
6. Добавить repository и Zod schemas для configuration.

Критерий выхода: конфигурация и secrets изолированы по application, а secret не читается обратно через публичный API.

### Этап 2. Application-scoped Better Auth factory

Задачи:

1. Расширить adapter plugin models.
2. Собирать plugins согласно application settings.
3. Добавить account token encryption/linking policy.
4. Добавить OAuth scopes, `validAudiences: [application.resource]`, автоматическое наследование единственного resource clients и custom claims policy; JWT plugin нельзя отключать.
5. Глобально задать `oauthProvider.grantTypes=["authorization_code", "refresh_token"]`, чтобы token endpoint не поддерживал и discovery не рекламировал `client_credentials`.
6. Принудительно задавать client `grantTypes=["authorization_code", "refresh_token"]` и `responseTypes=["code"]`, запретив mutation этих полей.
7. Добавить revision-aware cache invalidation.
8. Проверять active organization/application перед созданием instance.

Критерий выхода: два application одновременно используют разные users, clients, keys, cookies, providers и единственные собственные resources без пересечения.

### Этап 3. Публичный HTTP OAuth/OIDC слой

Задачи:

1. Реализовать Fastify catch-all route под `/auth/applications/:applicationId/*`.
2. Реализовать отдельный root `GET /.well-known/oauth-authorization-server/auth/applications/:applicationId` для OAuth Authorization Server Metadata RFC 8414.
3. Выделить `applicationAuthHttpPlugin` и `adminGraphqlPlugin` как sibling scopes одного IAM Fastify instance; admin context middleware остается только в GraphQL scope.
4. Сохранить один listener/shutdown lifecycle и определить общий IAM HTTP port вместо неявно GraphQL-only port contract.
5. Настроить canonical public base URL/proxy handling и path-based reverse-proxy exposure без публикации `/graphql` наружу.
6. Добавить versioned default-deny manifest для всего application Better Auth handler и закрыть management, неизвестные и выключенные application endpoint до `auth.handler`.
7. Экспонировать только утвержденные OIDC discovery, OAuth Authorization Server Metadata, JWKS/authorize/token/userinfo/introspection/revoke/end-session, hosted-flow, password, emailOTP и social callback endpoint с точными HTTP methods.
8. Реализовать `ApplicationOAuthResourcePolicyGuard` до `auth.handler`: exact single resource для authorize, authorization-code exchange и каждого refresh, client/application binding, безопасный `invalid_target` и сохранение исходных query/form bytes.
9. Отключить конфликтующий `/token` Better Auth path.
10. Реализовать exact CORS/trusted origins.
11. Добавить structured errors/request IDs без утечки данных.

Критерий выхода: один IAM Fastify listener обслуживает изолированные sibling scopes application auth и Admin GraphQL; публичный auth request не проходит через admin GraphQL middleware, `/graphql` не публикуется public reverse proxy, issuer-relative OIDC discovery и root OAuth Authorization Server Metadata RFC 8414 возвращают согласованный issuer/endpoints текущей application, стандартный OIDC client проходит Authorization Code + PKCE flow только с exact application resource, guard отклоняет missing/duplicate/foreign resource до Better Auth и не допускает opaque fallback, application user не может вызвать ни один client-management endpoint, неизвестные и выключенные OAuth/password/OTP/social endpoint возвращают `404` до Better Auth, а `client_credentials` отсутствует в discovery и не выдает token ни public, ни confidential v1 client.

### Этап 4. Admin GraphQL

Задачи:

1. Application CRUD/list/read.
2. Auth settings, включая единственный application resource, origins/branding и revisioned update.
3. Provider credentials/status.
4. OAuth clients с автоматически унаследованным application resource, фиксированными Authorization Code/Refresh grants и one-time secret rotation; resource/grant policy отсутствуют в client mutation input и возвращаются read-only.
5. Application user security actions.
6. Casbin permissions и audit events.
7. Store ownership validation через internal action.

Критерий выхода: organization admin может полностью настроить realm без DB/manual config, но не может прочитать secrets или включить `client_credentials`/изменить protocol grants.

### Этап 5. Hosted UI и password flow

Задачи:

1. Сделать OAuth context persistence/resume.
2. Реализовать signin/signup/password reset/email verification UI.
3. Реализовать consent и end-session pages.
4. Добавить localization/branding schema.
5. Подключить anti-enumeration, CSRF и rate limits.

Критерий выхода: public и confidential clients проходят signup/signin/logout, а redirect/state/nonce/PKCE проверяются.

### Этап 6. Email OTP

Задачи:

1. Подключить `emailOTP` со стандартным `storeOTP: "hashed"`, не вводя custom hasher/HMAC и отдельный lifecycle ключей.
2. Интегрировать Better Auth `sendVerificationOTP` с утвержденным внешним platform email delivery service без собственного IAM worker/outbox.
3. Добавить request/verify UI.
4. Реализовать generic responses, resend cooldown и attempt limits.

Критерий выхода: email passwordless работает на стандартном Better Auth `storeOTP: "hashed"` без plaintext OTP, enumeration и повторного использования; custom hashing не является условием выпуска v1.

### Этап 7. Google/Facebook и account linking

Задачи:

1. Подключить per-application socialProviders.
2. Добавить callback URL/status в Admin API.
3. Включить upstream OAuth token encryption.
4. Реализовать строгую linking policy.
5. Обработать provider без email и конфликт account.
6. Добавить link/unlink UI/API и аудит.

Критерий выхода: providers не могут связать account между applications или по неподтвержденному email.

### Этап 8. Storefront API и Customers integration

Задачи:

1. Добавить JWT-only/JWKS validator с обязательным `aud=application.resource` из trusted application context и live validation path.
2. Ввести trusted auth context `application_user`.
3. Проверять application/store binding и scopes.
4. Реализовать идемпотентный Customer ensure/projection.
5. Обработать block/revoke/config disable events.

Критерий выхода: Storefront принимает только JWT token правильного issuer/resource/client/store, отклоняет opaque token, а Customer создается/связывается идемпотентно.

### Этап 9. Hardening

Задачи:

1. Threat model review.
2. Security/contract/e2e scenarios.
3. Нагрузочная проверка authorize/token/OTP limits.
4. Signing/provider/client secret rotation runbooks.
5. Dashboards/alerts/audit retention.
6. Документация интеграции storefront SDK/client.

Критерий выхода: выполнен Definition of Done и есть emergency disable процедура без удаления users.

## 21. Предполагаемые изменения файлов

Точная структура уточняется после compatibility spike, но ожидаются:

```text
services/iam/package.json
services/iam/src/auth/auth.ts
services/iam/src/auth/ApplicationAuthFactory.ts
services/iam/src/auth/scopedDrizzleAdapter.ts
services/iam/src/auth/applicationAuthConfiguration.ts
services/iam/src/auth/applicationOAuthClaims.ts
services/iam/src/api/graphql-admin/server.ts
services/iam/src/api/http/application-auth/ApplicationOAuthResourcePolicyGuard.ts
services/iam/src/api/http/application-auth/*
services/iam/src/api/graphql-admin/application/*
services/iam/src/repositories/models/application-auth.ts
services/iam/src/repositories/models/authorization.ts
services/iam/src/repositories/ApplicationAuthConfigurationRepository.ts
services/iam/src/repositories/ApplicationOAuthClientRepository.ts
services/iam/src/services/ApplicationAuthSecretService.ts
services/iam/src/services/ApplicationAuthAuditService.ts
services/iam/src/events/application-auth/*
services/iam/migrations/*
services/iam/docs/application-users-oauth-oidc-integration.md
services/e2e/.../iam/application-auth/*
```

Hosted UI следует разместить в выбранном для IAM web assets модуле либо отдельном frontend package, но его HTTP origin и release lifecycle должны быть частью IAM auth boundary.

## 22. Обязательные сценарии проверки

Проверки готовятся как targeted contract/Playwright сценарии и запускаются только через `shopana-cli` согласно правилам проекта. `test` и `tsc` не используются как способ проверки; когда нужна новая собранная версия, выполняется build через проектный инструмент.

### 22.1. Protocol

- issuer-relative OIDC discovery возвращает issuer и endpoint текущей application;
- `GET /.well-known/oauth-authorization-server/auth/applications/{applicationId}` возвращает OAuth Authorization Server Metadata RFC 8414 с тем же issuer и protocol endpoints;
- root OAuth metadata application A не возвращает issuer/endpoints application B, а disabled application/organization отклоняется;
- JWKS валидирует выданный ID/access token;
- public client + S256 PKCE проходит flow;
- confidential client проходит flow с client authentication и PKCE;
- discovery `grant_types_supported` не содержит `client_credentials`;
- OAuth Provider instance настроен с глобальным `grantTypes=["authorization_code", "refresh_token"]`;
- public и confidential clients созданы только с `grant_types=["authorization_code", "refresh_token"]` и `response_types=["code"]`;
- `grant_type=client_credentials` не выдает token ни одному v1 client;
- Admin GraphQL не принимает и не изменяет `grantTypes`/`responseTypes`;
- authorize с точным `resource=application.resource` выдает JWT access token с таким же `aud`;
- отсутствующий, пустой, неизвестный, повторенный дважды даже с одинаковым значением, resource другой application или не совпадающий с application resource отклоняется как `invalid_target` до `auth.handler`;
- authorization error не перенаправляется на непроверенный `redirect_uri`;
- code exchange без resource не создает opaque access token и не достигает OAuth Provider;
- token exchange не позволяет заменить resource из authorization request;
- refresh без resource или с другим resource отклоняется до OAuth Provider, не ротирует refresh family и не выдает opaque token;
- успешный refresh с exact resource сохраняет исходный resource/audience;
- resource guard одинаково определяет confidential `client_id` из HTTP Basic и public `client_id` из form body, а конфликт источников отклоняется;
- resource guard сохраняет исходный raw query/form body для OAuth Provider без повторного decode или изменения encoding;
- отсутствующий/неверный verifier отклоняется;
- повторное использование code отклоняется;
- неверные state/nonce обнаруживаются клиентом/flow;
- refresh rotation работает, старый refresh token не переиспользуется;
- revoke прекращает refresh;
- end-session принимает только зарегистрированный post-logout URI;
- disabled client/application/organization отклоняются;
- неизвестный scope/audience отклоняется;
- application user session не дает доступ к create/get/list/update/delete OAuth client;
- application user session не позволяет ротировать client secret;
- Dynamic Client Registration и любой неизвестный path под application Better Auth `basePath`, включая не-`/oauth2/*`, возвращают `404` до `auth.handler`;
- endpoint, разрешенный build-time manifest, но выключенный в application method/provider configuration, возвращает `404` до `auth.handler`;
- route с верным pathname, но неразрешенным HTTP method возвращает `404` и не достигает Better Auth;
- разрешенные protocol/hosted-flow endpoint продолжают работать через тот же catch-all.

### 22.2. Tenant isolation

- client application A не авторизуется через issuer B;
- user/session/account/token/consent A не читается adapter B;
- одинаковый email допустим в A и B как разные users;
- Google/Facebook account A не связывается в B;
- OTP A не проверяется в B;
- signing key A не используется issuer B;
- admin organization A не меняет application B;
- Store организации A нельзя привязать к OAuth client organization B.
- application A и B имеют разные canonical resources, и resource A отклоняется issuer/client application B;

### 22.3. Password/email OTP

- разрешенные signup/signin работают;
- выключенный method недоступен и в UI, и прямым HTTP вызовом;
- registration disabled enforced server-side;
- generic response одинаков для существующего/несуществующего email;
- OTP истекает, ротируется, имеет limit и одноразовый;
- email OTP хранится стандартным Better Auth способом `storeOTP: "hashed"`;
- блокировка user отзывает sessions и запрещает новый signin;

### 22.4. Social/linking

- Google/Facebook callback привязан к правильной application;
- disabled/misconfigured provider закрыт безопасно;
- provider secrets/tokens отсутствуют в GraphQL/logs/errors;
- verified same-email linking следует policy;
- unverified/different email не auto-links;
- нельзя unlink последний login method;
- provider account уже другого user вызывает конфликт, а не merge.

### 22.5. Admin и Storefront

- secret OAuth client показывается один раз;
- rotation инвалидирует старый secret;
- config revision предотвращает lost update;
- factory перестраивается после config change;
- Admin GraphQL принимает ровно один application resource, не принимает массив и не позволяет задать его через OAuth client input;
- изменение application resource синхронизирует clients, отзывает старые tokens и не позволяет refresh сохранить старый audience;
- Storefront отклоняет неверный issuer/audience/store/scope/actor;
- Storefront отклоняет opaque access token без fallback-introspection;
- Storefront отклоняет userless token без `sub` или с `actor_type`, отличным от `application_user`;
- OAuth client, привязанный к Store A, не получает token с resource/store binding другого client;
- block/revoke отражается в live validation;
- Customer ensure идемпотентен при retry/duplicate event;
- недоступность Customers не ломает token endpoint.

### 22.6. Web security

- wildcard/open redirect отсутствует;
- untrusted Host не меняет issuer, callback, root OAuth Authorization Server Metadata URL и его response;
- CSRF form request отклоняется;
- cookies имеют ожидаемые Secure/HttpOnly/SameSite/path attributes;
- несколько `Set-Cookie` не схлопываются Fastify adapter;
- CORS разрешает только точный configured origin;
- application auth routes и Admin GraphQL работают на одном Fastify listener, но в sibling encapsulated plugin scopes;
- `buildAdminContextMiddleware` вызывается для `/graphql` и не вызывается для application auth/metadata routes;
- public reverse-proxy routing не делает `/graphql` доступным извне;
- reverse proxy публикует только точный root OAuth metadata pattern и не открывает прочие `/.well-known/*` paths;
- encoded slash, duplicate slash, dot-segment и double-encoding не обходят default-deny manifest всего Better Auth handler;
- wildcard callback не позволяет выбрать неразрешенный social provider;
- route manifest проверен повторно при upgrade Better Auth/OAuth Provider/emailOTP plugins или изменении plugin composition;
- rate limit работает по application/identity/IP;
- PII/secrets отсутствуют в logs/traces/metrics.

## 23. Security checklist перед релизом

- [ ] Используется актуальный `@better-auth/oauth-provider`, а не deprecated provider.
- [ ] Authorization Code + S256 PKCE обязателен.
- [ ] OAuth Provider глобально настроен с `grantTypes=["authorization_code", "refresh_token"]`; discovery не рекламирует `client_credentials`.
- [ ] Все v1 clients имеют только `grant_types=["authorization_code", "refresh_token"]` и `response_types=["code"]`.
- [ ] `client_credentials` отсутствует в Admin GraphQL input и не выдает token ни public, ни confidential client.
- [ ] Authorize flow требует единственный канонический `application.resource` и выдает JWT с точным `aud`.
- [ ] `ApplicationOAuthResourcePolicyGuard` до `auth.handler` требует ровно один exact resource на authorize, code exchange и каждом refresh; missing/duplicate/foreign resource возвращает `invalid_target` без opaque fallback.
- [ ] JWT plugin включен; Storefront отклоняет opaque access tokens.
- [ ] Каждая application имеет ровно один администраторский resource; OAuth clients наследуют только его, а `oauthProvider.validAudiences` равно `[application.resource]`.
- [ ] Code exchange/refresh не позволяют сменить или расширить исходный resource.
- [ ] Implicit/password grants отсутствуют.
- [ ] Dynamic Client Registration выключен.
- [ ] Все OAuth client-management endpoint закрыты в публичном application realm до `auth.handler`.
- [ ] Весь application Better Auth handler использует versioned default-deny manifest по `(HTTP method, normalized pathname)` без широких plugin-prefix/wildcard правил.
- [ ] Неизвестные и выключенные OAuth/password/OTP/social endpoint возвращают `404` до `auth.handler`.
- [ ] Application auth и Admin GraphQL зарегистрированы как sibling plugins одного Fastify instance/listener; GraphQL admin middleware не применяется к auth routes.
- [ ] Reverse proxy публикует только утвержденные auth/metadata paths и не публикует IAM `/graphql` во внешний network boundary.
- [ ] Отдельный `GET /.well-known/oauth-authorization-server/auth/applications/:applicationId` публикует RFC 8414 metadata текущей active application, строит URL из `IAM_PUBLIC_BASE_URL` и не открывает другие `/.well-known/*` routes.
- [ ] Admin GraphQL после Casbin и organization/application ownership checks вызывает только `ApplicationOAuthClientManagementService`, работающий через application-scoped repository.
- [ ] Redirect/post-logout URI проверяются точным совпадением.
- [ ] Issuer строится из server config, не request Host.
- [ ] Все OAuth plugin модели application-scoped.
- [ ] Organization/application/client/user/session live state проверяется.
- [ ] Provider credentials зашифрованы с versioned key/AAD.
- [ ] Upstream OAuth tokens зашифрованы.
- [ ] OAuth client secret нельзя прочитать повторно.
- [ ] Email OTP хранится стандартным Better Auth способом `storeOTP: "hashed"`.
- [ ] Custom email OTP hasher/HMAC, его ключи и миграция hash-формата не входят в release scope v1.
- [ ] State, nonce, CSRF, cookie policies проверены.
- [ ] Generic responses защищают от enumeration.
- [ ] Rate limits и email delivery limits включены.
- [ ] Логи/трейсы/метрики не содержат PII/secrets/tokens/codes.
- [ ] Signing/client/provider secret rotation описана и проверена.
- [ ] Customer projection идемпотентна.
- [ ] Audit log покрывает все admin/security mutations.

## 24. Definition of Done

Решение считается готовым, когда:

1. Каждая application имеет отдельный issuer, users, sessions, providers, OAuth clients, tokens, consents и keys.
2. Organization admin управляет настройками через Admin API с Casbin и audit trail.
3. Каждая application имеет ровно один заданный ее администратором Storefront resource; `ApplicationOAuthResourcePolicyGuard` требует его exact single value до Better Auth на authorize/code exchange/каждом refresh и исключает opaque fallback; public и confidential clients наследуют resource, проходят стандартный OIDC Authorization Code + PKCE flow и получают JWT access token с точным audience; OAuth Provider глобально поддерживает только `authorization_code`/`refresh_token`, а `client_credentials` отсутствует в discovery и запрещен также на уровне каждого client.
4. Password, email OTP, Google и Facebook можно независимо включать на application.
5. Email OTP хранится стандартным Better Auth способом `storeOTP: "hashed"`; custom hasher/HMAC и lifecycle его ключей не требуются для v1.
6. Account linking не пересекает applications и не доверяет unverified email.
7. Storefront проверяет token и trusted store binding.
8. Customers получает идемпотентную проекцию identity без credentials.
9. Block/revoke/disable действуют на live validation и refresh lifecycle.
10. Все негативные tenant/security сценарии подтверждены targeted проверками.
11. Есть документация для storefront client, organization admin и operations.
12. Есть runbooks для signing keys, provider/client secrets, delivery outage и emergency realm disable.

## 25. Риски и решения

| Риск | Решение |
| --- | --- |
| Deprecated встроенный OIDC provider | Использовать отдельный актуальный `@better-auth/oauth-provider` |
| Новый или неиспользуемый Better Auth/plugin endpoint становится публичным через catch-all | Versioned default-deny manifest всего handler по method + normalized pathname, effective allowlist по application configuration и обязательная повторная сверка при изменении plugin composition |
| Public OAuth routes случайно наследуют Admin GraphQL middleware или публикация общего порта раскрывает `/graphql` | Sibling encapsulated Fastify plugins на одном instance, GraphQL hooks только внутри admin scope и path-based reverse-proxy allowlist для public network |
| Plugin model leakage между applications | Явно расширить adapter и schema application scope, негативные contract-сценарии |
| Небезопасное auto-linking | Только реальный verified same-email или explicit authenticated linking |
| Secret leakage в admin/logs | Encryption, one-time reveal, redaction и audit без value |
| Open redirect/custom scheme abuse | Exact allowlist и отдельная mobile URI policy |
| Устаревшая factory config после admin update | Revisioned cache key + invalidation event |
| Storefront получает opaque token без audience или client меняет resource между authorize/exchange/refresh | `ApplicationOAuthResourcePolicyGuard` до `auth.handler` требует ровно один exact `application.resource` на каждом шаге и возвращает `invalid_target`; `validAudiences`, client binding, включенный JWT plugin и JWT-only Storefront validator дают дополнительные независимые слои |
| OAuth Provider поддерживает `client_credentials` по умолчанию | Глобально задать `oauthProvider.grantTypes=["authorization_code", "refresh_token"]`, дублировать ограничение в каждом v1 client, не принимать grant policy из GraphQL и проверять discovery/отказ token endpoint contract-сценариями |
| Мгновенная ревокация JWT | Короткий access TTL + live validation/introspection для чувствительных операций |
| Customers временно недоступен | Outbox/retry/idempotent ensure, не блокировать token endpoint |
| Смешение Application и integration apps service | Зафиксировать IAM application как auth realm и отдельный OAuth client resource |

## 26. Вопросы, которые нужно закрыть в этапе 0

Эти решения не меняют основную архитектуру, но должны быть зафиксированы до реализации соответствующего этапа:

1. Какой email transport/template service является platform default?
2. Нужны ли custom mobile URI schemes в первой версии или достаточно universal/app links?
3. Какие TTL ranges организация может менять, а какие остаются platform policy?
4. Нужен ли consent screen для всех third-party clients уже в первой версии?
5. Где размещается hosted UI bundle и как он версионируется вместе с IAM?
6. Достаточен ли event-driven Customer ensure или первый Customer-bound request должен делать синхронный ensure?

Exact URI resource задается администратором отдельно для каждой application и становится обязательным до создания ее первого OAuth client. Для application разрешено ровно одно нормализованное значение; OAuth clients не управляют им самостоятельно. До получения остальных ответов применяются безопасные значения этого плана: platform delivery profiles, HTTPS/universal links, короткие TTL, consent для не-first-party clients и асинхронная Customer projection с idempotent fallback.

## 27. Официальные источники

- [Better Auth OAuth Provider](https://better-auth.com/docs/plugins/oauth-provider)
- [RFC 8707: Resource Indicators for OAuth 2.0](https://www.rfc-editor.org/rfc/rfc8707.html)
- [Better Auth Email OTP](https://better-auth.com/docs/plugins/email-otp)
- [Better Auth Google](https://better-auth.com/docs/authentication/google)
- [Better Auth OAuth concepts](https://better-auth.com/docs/concepts/oauth)
- [Better Auth Users & Accounts](https://better-auth.com/docs/concepts/users-accounts)
- [Better Auth Fastify integration](https://better-auth.com/docs/integrations/fastify)
- [Shopify Customer Account API](https://shopify.dev/docs/api/customer/latest)
- [Shopify Customer Account API authentication](https://shopify.dev/docs/api/customer-authentication)
