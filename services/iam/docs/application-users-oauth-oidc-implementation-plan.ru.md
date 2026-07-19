# План реализации OAuth 2.1 / OpenID Connect для `application_users` в IAM

Статус: готов к декомпозиции и реализации после закрытия обязательного этапа 0

Оценка полноты реализации: 95% (архитектурные и v1 product decisions зафиксированы; оставшиеся 5% — проверяемые compatibility facts установленной plugin composition, а не открытые проектные решения)

Дата: 2026-07-19  
Сервис: `services/iam`  
Целевая область: аутентификация пользователей приложений (`application_users`)

Связанные документы:

- [Compatibility и security spike OAuth 2.1 / OIDC для `application_users`](./application-users-oauth-oidc-compatibility-spike.ru.md);
- [Последующий план реализации Admin API для application auth](./application-auth-admin-api-implementation-plan.ru.md);
- [План реализации API управления OAuth clients в IAM](./application-oauth-client-management-api-plan.ru.md).

### Критерий готовности настоящего плана

План считается готовым к выполнению, если для каждого этапа определены: входные зависимости, точные задачи, создаваемые артефакты, негативные сценарии и бинарный критерий выхода. Неизвестное поведение Better Auth закрывается в обязательном этапе 0 executable contract-проверкой и не переносится как архитектурный выбор в последующие этапы. Если contract-проверка расходится с планом, реализация останавливается, compatibility ADR обновляется, а небезопасный permissive fallback запрещен.

## 1. Резюме решения

IAM должен стать OIDC-провайдером для клиентских приложений организаций. Каждая сущность `iam.application` образует изолированный realm со своими:

- пользователями, учетными записями, сессиями и проверками;
- способами входа и политиками регистрации;
- Google/Facebook OAuth-конфигурациями;
- OAuth-клиентами для web, mobile и server-side applications;
- issuer, ключами подписи и токенами;
- разрешенными origin, redirect URI и post-logout URI;
- брендингом и текстами hosted login UI.

Основой реализации должен быть Better Auth. Новый протокол не следует реализовывать вручную:

- OAuth 2.1 / OIDC provider — `@better-auth/oauth-provider` той же версии, что `better-auth`;
- password signup/signin — встроенный `emailAndPassword`;
- email OTP — `emailOTP`;
- Google/Facebook — встроенные `socialProviders`;
- JWT/JWKS, discovery, authorization code, PKCE, refresh token, userinfo, introspection, revocation и logout — возможности Better Auth и OAuth Provider plugin.

Хотя исходное бизнес-требование сформулировано как OAuth 2.0, для новой реализации принимается OAuth 2.1-профиль с OpenID Connect. Он сохраняет Authorization Code flow, требует PKCE и исключает небезопасные устаревшие варианты. Канонический сценарий: discovery → authorize → hosted login → callback с code → token exchange → refresh → end-session logout.

## 2. Цели

1. Дать каждой `iam.application` независимый пул `application_users`.
2. Реализовать конфигурационную модель способов входа, которую последующий Admin API сможет безопасно изменять без изменения кода IAM.
3. Поддержать:
   - регистрацию и вход по email/password;
   - passwordless-вход по одноразовому коду из email;
   - Google;
   - Facebook;
   - связывание нескольких способов входа с одним `application_user` по безопасной политике.
4. Выдавать стандартные OIDC ID tokens и OAuth access/refresh tokens для application OAuth clients.
5. Предоставить hosted login/consent/logout UI, чтобы OAuth client не обрабатывал пароли и OTP.
6. Гарантировать изоляцию данных по `applicationId` и принадлежность приложения организации.
7. Сохранить IAM единственным владельцем application credentials, accounts, sessions, verification, consent и OAuth token lifecycle.
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
- Admin GraphQL API для управления applications, auth settings, providers, OAuth clients и application users. Он реализуется следующим отдельным планом после завершения этого OAuth/OIDC runtime plan.
- Passkeys/WebAuthn, TOTP MFA и recovery codes. Архитектура не должна мешать их добавлению позже.
- Phone OTP/passwordless, SMS delivery, phone-only users и synthetic email. Они выносятся в отдельный будущий план после выбора production Verify provider и security contract; текущий план не добавляет `phoneNumber` plugin, phone endpoints, phone-поля или SMS-конфигурацию.
- Кастомный keyed hasher/HMAC для email OTP, отдельный lifecycle ключей и миграция формата OTP hash. В v1 используется стандартный Better Auth `emailOTP({ storeOTP: "hashed" })`; дополнительный hardening выносится в отдельный будущий план после стабилизации email OTP flow.
- Реализация собственного email delivery worker, durable outbox, retry/dead-letter механизма и transport infrastructure. IAM интегрирует Better Auth `emailVerification.sendVerificationEmail`, `emailAndPassword.sendResetPassword` и `emailOTP.sendVerificationOTP` с утвержденным внешним platform email delivery service; надежность его очереди и хранение delivery payload определяются отдельным контрактом вне этого плана.
- Provisioning или binding `iam.application` из внешних domain services.
- Хранение external tenant/resource metadata в IAM OAuth clients, claims и auth configuration.
- Изменения resource-server сервисов. Их binding с `applicationId`, проверка IAM token и бизнес-проекции определяются отдельными integration plans.

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
- интеграции `emailVerification.sendVerificationEmail`, `emailAndPassword.sendResetPassword` и `emailOTP.sendVerificationOTP` с внешним platform email delivery service;
- безопасного хранения Google/Facebook secrets;
- IAM-owned live validation для application, user, session и token state;
- security limits, аудит-логов и наблюдаемости.

Настоящий план уточняет транспорт браузерной авторизации: стандартный HTTP OAuth/OIDC является каноническим протоколом. Broker Actions API не должен становиться вторым способом выдачи OAuth token и не должен проксировать password, OTP или authorization code через GraphQL.

## 5. Архитектурные решения

### 5.1. Application — realm, OAuth client — потребитель realm

Необходимо явно разделить два понятия:

- `iam.application` — изолированный identity realm/user pool, принадлежащий организации;
- OAuth client — конкретный web, mobile или backend-клиент, использующий realm.

Одна application может иметь несколько OAuth clients, например:

- публичный browser client;
- iOS/Android application;
- confidential server-side client;
- локальный development client.

Пользователи принадлежат application, а не отдельному OAuth client. Redirect URI, client type, client secret и logout URI принадлежат OAuth client.

При создании `iam.application` IAM в одной транзакции создает application auth configuration и детерминированно формирует неизменяемый канонический resource:

```text
urn:shopana:application:{applicationId}
```

Для существующих applications migration создает отсутствующую auth configuration и resource идемпотентно. `resource` не принимается из public/admin input и является публичным идентификатором resource server/audience, а не token или secret. Кардинальность внутри IAM: `IAM Application 1:N OAuth Client`.

Все OAuth clients в v1, включая confidential server-side clients, работают только от имени `application_user` через Authorization Code flow. Запрет M2M применяется двумя независимыми слоями. OAuth Provider instance для каждой application глобально ограничивает token endpoint:

```text
oauthProvider.grantTypes = ["authorization_code", "refresh_token"]
```

Дополнительно IAM создает каждый client с неизменяемой protocol policy:

```text
grant_types = ["authorization_code", "refresh_token"]
response_types = ["code"]
```

`client_credentials` не входит в v1 и не может быть выбран через runtime configuration, client metadata или прямой HTTP endpoint. Глобальная provider policy не поддерживает и не рекламирует этот grant в discovery, а client-level policy не позволяет включить его для отдельного клиента. Confidential client означает только возможность безопасно аутентифицироваться на token endpoint при code exchange/refresh; это не M2M client. Если позже понадобится service principal, для него требуется отдельный actor model, scopes, claims, audience, threat model и отдельная versioned protocol-policy migration.

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
- создавать параллельный JWT-формат в обход IAM OAuth Provider.

### 5.4. Hosted login UI

IAM предоставляет собственные login, signup, OTP, provider selection, consent и logout страницы. OAuth client отправляет пользователя на `/oauth2/authorize`; IAM сохраняет подписанный authorization context и после успешной Better Auth-сессии продолжает authorization flow.

Такой подход:

- не раскрывает credentials OAuth-клиенту;
- унифицирует web/mobile/server-side clients;
- позволяет централизовать anti-enumeration, rate limits, локализацию и branding.

### 5.5. Граница будущего административного управления

Dynamic Client Registration в первой версии выключен. После завершения этого плана OAuth client будет создаваться и изменяться организационным администратором только через отдельный Admin GraphQL plan. Единственный разрешенный серверный путь: `ApplicationOAuthClientManagementService` → application-scoped repository поверх plugin-compatible таблиц.

Публичный application realm не предоставляет Better Auth endpoint управления OAuth clients. Отключение Dynamic Client Registration само по себе недостаточно: OAuth Provider также содержит session-authenticated endpoint создания, чтения, изменения, удаления и ротации secret клиента. Fastify boundary обязан отклонять их до вызова `auth.handler`, даже если у request есть действующая `application_session`.

Будущий Admin GraphQL после Casbin и organization/application ownership checks должен вызывать `ApplicationOAuthClientManagementService`. Service выполняет create/update/delete/rotate через application-scoped repository в IAM transaction и сохраняет plugin-compatible формат данных. `adminCreateOAuthClient`, `adminUpdateOAuthClient` и session-authenticated public client-management endpoints в v1 не используются. Platform admin credential/cookie не передается в публичный application handler, application user session не имперсонируется, а internal management service не экспонируется как HTTP endpoint application realm.

Реализация GraphQL operations, Casbin permissions, audit mutations и пользовательского management flow не входит в этот документ. До выполнения [последующего Admin API plan](./application-auth-admin-api-implementation-plan.ru.md) runtime contract проверяется на заранее подготовленных application configuration и OAuth client fixtures через доверенный internal setup.

Это позволяет IAM дополнительно проверять:

- принадлежность application организации;
- разрешения Casbin;
- точный allowlist URI;
- client type;
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

Discovery/metadata являются IAM-owned response contract поверх значений plugin: `issuer`, endpoint URI, `jwks_uri`, `grant_types_supported`, `response_types_supported`, PKCE methods и `token_endpoint_auth_methods_supported` сверяются с server policy перед ответом. Для v1 metadata обязана рекламировать `token_endpoint_auth_methods_supported=["none","client_secret_basic","client_secret_post"]`, если все три метода подтверждены executable spike; неподтвержденный метод удаляется и соответствующий client type не может быть создан. IAM не включает DCR ради появления `none`. Этап 0 проверяет минимум один standards-compliant public client с `none` и один confidential client с `client_secret_basic`; конкретная Storefront library не является частью IAM runtime и не блокирует стандартный protocol contract.

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

Для v1 HTTP bridge реализуется внутри encapsulated `applicationAuthHttpPlugin` собственными content-type parsers с `parseAs: "buffer"` и limit 64 KiB для `application/x-www-form-urlencoded`/JSON auth requests. Query берется из raw request URL как substring после первого `?`; form body остается исходным `Buffer`. Guard разбирает отдельную копию через стандартный form parser, сохраняющий повторяющиеся параметры (`getAll`), но передает в Fetch `Request` исходные bytes без сериализации. Unsupported charset/content-encoding, malformed percent encoding, NUL, body выше лимита и protocol route с неожиданным content type отклоняются `400` до Better Auth. Для token endpoint разрешен только `POST application/x-www-form-urlencoded`; JSON не является альтернативой OAuth form contract.

Route matching использует один percent-decode только для безопасных unreserved characters и отклоняет encoded slash/backslash, dot-segment, NUL, invalid UTF-8, duplicate slash и любую ситуацию, в которой нормализованный path отличается по структуре от raw path. Manifest хранит уже нормализованные literal paths. Guard отклоняет duplicate `grant_type`, `client_id`, `redirect_uri`, `code`, `refresh_token` и `resource`; duplicate `scope` также не объединяется неявно. Секретные form values никогда не включаются в structured error/log.

Allowed origins берутся из application configuration и сопоставляются точным origin. Redirect URI проверяет OAuth Provider plugin по точному зарегистрированному URI.

`applicationAuthHttpPlugin` и `adminGraphqlPlugin` используют один порт, но имеют независимые transport/auth boundaries. Network exposure на reverse proxy настраивается по path: публичные OAuth/OIDC routes доступны OAuth clients, а `/graphql` не становится публичным только из-за общего listener.

Fastify создается с явным `trustProxy` allowlist из server configuration. `X-Forwarded-*` игнорируются, если непосредственный peer не входит в allowlist. Issuer и callback URL всегда строятся из `IAM_PUBLIC_BASE_URL`; forwarded headers используются только для trusted client-IP/rate-limit attribution. Production startup отклоняет HTTP public base URL и пустой proxy allowlist, если listener находится за reverse proxy.

## 7. Целевой пользовательский flow

### 7.1. Authorization Code + PKCE

1. OAuth client получает discovery document application issuer.
2. Клиент генерирует `state`, `nonce`, `code_verifier` и `code_challenge=S256`.
3. Браузер переходит на `/oauth2/authorize` с:
   - `client_id`;
   - точным `redirect_uri`;
   - `response_type=code`;
   - `scope=openid profile email offline_access`;
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
12. Клиент проверяет, что access token имеет JWT-формат и `aud={application.resource}`. Интеграция token с конкретным resource server не входит в IAM runtime plan.
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
- signup может быть выключен независимо от signin через `emailAndPassword.disableSignUp` и route policy;
- email verification может быть обязательным до выдачи полноценной сессии;
- forgot/reset password использует подписанные одноразовые ссылки Better Auth;
- email verification отправляется через `emailVerification.sendVerificationEmail`;
- password reset отправляется через `emailAndPassword.sendResetPassword`;
- password hash и account lifecycle не реализуются вручную.

Конфигурационная модель содержит политики, которые сможет изменять последующий Admin API:

- `passwordSignUpEnabled`;
- `passwordSignInEnabled`;
- `emailVerificationRequired`;
- `passwordResetEnabled`;
- `registrationMode`: `open | disabled`.

`registrationMode` — глобальный server-side gate создания нового `application_user`, а не выключатель входа. При `registrationMode=disabled` password signup отклоняется даже при `passwordSignUpEnabled=true`, но password signin и reset для уже существующего user продолжают работать, если соответствующие method flags включены.

В отличие от email OTP, password signup и signin имеют разные Better Auth endpoints, поэтому инвариант signup → signin для них не нужен. Допустимы все четыре комбинации flags. Если `passwordSignUpEnabled=true`, а `passwordSignInEnabled=false`, signup может создать пользователя, но `emailAndPassword.autoSignIn=false`: signup response не содержит session, а password signin endpoint остается закрытым. При обратной комбинации существующие password users могут входить, но новые не создаются.

### 8.2. Email OTP/passwordless

Использовать `emailOTP`:

- 6 цифр;
- TTL 5 минут;
- максимум 3 проверки;
- новый запрос ротирует предыдущий код;
- хранение OTP — `hashed`;
- ответ отправки всегда обобщенный, независимо от существования пользователя;
- `emailOTP.sendVerificationOTP` передает исходный код утвержденному внешнему platform email delivery service и ожидает только подтверждение приема задания, а не фактическую отправку письма;
- используется стандартная конфигурация Better Auth `storeOTP: "hashed"` как осознанный baseline v1;
- custom `storeOTP` hasher/HMAC, отдельный ключ на realm, dual-format verification и миграция hash-формата не входят в этот план;
- baseline дополнительно ограничивается TTL, числом попыток, ротацией кода, rate limits и контролем доступа к verification storage.

Конфигурация разделяет `emailOtpSignInEnabled` и `emailOtpSignUpEnabled`. Stock `emailOTP` использует один `/sign-in/email-otp` flow для входа и автоматического создания user, поэтому инвариант `emailOtpSignUpEnabled => emailOtpSignInEnabled` обязателен. Effective `emailOTP.disableSignUp=true`, если `registrationMode=disabled` или `emailOtpSignUpEnabled=false`. При этом OTP signin существующего user остается доступен, если `emailOtpSignInEnabled=true`.

В v1 email OTP использует только Better Auth purpose `type="sign-in"`. OTP-based `forget-password`, `change-email` и `overrideDefaultEmailVerification` не входят в v1, а их routes отсутствуют в effective public manifest. Конфигурация может выбирать утвержденный email delivery profile, но не произвольный executable template. Пользовательское управление этой конфигурацией относится к последующему Admin API plan.

### 8.3. Google и Facebook

Использовать встроенные Better Auth `socialProviders.google` и `socialProviders.facebook` с отдельными credentials для каждой application.

Provider configuration включает:

- `enabled`;
- encrypted `clientId`/`clientSecret`;
- provider-specific scopes из утвержденного списка;
- время последнего изменения и actor;
- безопасный callback URL, рассчитанный IAM; его read-only представление добавит последующий Admin API.

Правила:

- upstream access/refresh token шифруются через `account.encryptOAuthTokens: true`;
- `clientSecret` никогда не возвращается из runtime API;
- callback URL нельзя переопределить произвольным запросом;
- при `registrationMode=disabled` каждый configured social provider собирается с `disableSignUp=true`: существующий linked account может войти, но первый social login не создает user/account/session;
- provider errors показываются пользователю без токенов и внутренних деталей;
- Facebook login без доступного email в v1 завершается понятным безопасным сообщением, а не созданием неоднозначного пользователя;
- provider account связывается только внутри текущей application.

## 9. Account linking

Базовая политика Better Auth:

- `account.accountLinking.enabled=true`;
- `account.accountLinking.disableImplicitLinking=true` — v1 не выполняет silent merge при обычном social sign-in;
- `account.accountLinking.allowDifferentEmails=false`;
- `account.accountLinking.allowUnlinkingAll=false`;
- `account.accountLinking.updateUserInfoOnLink=false`;
- `account.accountLinking.trustedProviders=["facebook"]` разрешен только вместе с `disableImplicitLinking=true`: он позволяет стандартному authenticated `linkSocial()` принять Facebook account с `emailVerified=false`, но не разрешает автоматическое связывание по Facebook email;
- остальные provider IDs не добавляются в `trustedProviders` без отдельного security review.

В v1 автоматическое связывание отключено для всех social providers. Обычный Google/Facebook sign-in не связывает новый provider account с существующим `application_user` только по совпавшему email. Facebook email считается неподтвержденным независимо от совпадения строки; `trustedProviders=["facebook"]` означает доверие Facebook OAuth как доказательству владения конкретным Facebook account только внутри явного authenticated linking flow, а не доверие Facebook email как основанию для поиска или merge пользователя. Factory валидирует сочетание настроек как единый инвариант и не позволяет включить Facebook в `trustedProviders`, если `disableImplicitLinking` не равен `true`.

Для связывания использовать стандартный Better Auth authenticated `linkSocial()` flow, а не собственную реализацию OAuth linking:

1. пользователь уже имеет свежую application session;
2. запускает `linkSocial()` для разрешенного в этой application provider;
3. Better Auth завершает provider OAuth callback и связывает account только с пользователем из исходной authenticated link session;
4. linking разрешен только внутри того же Better Auth instance/application;
5. `allowDifferentEmails=false` требует совпадения email, но совпадение не используется как самостоятельное доказательство владения локальным пользователем;
6. provider account не должен принадлежать другому user;
7. при конфликте возвращается generic conflict и пишется security audit event.

Facebook без доступного email нельзя связать в v1, поскольку стандартный `linkSocial()` flow при `allowDifferentEmails=false` должен сопоставить provider email с email текущего пользователя. Если в будущем потребуется связывать Facebook account без email или сохранить implicit linking только для отдельных providers, это отдельное security design change, а не часть v1.

Разрыв последнего способа входа запрещен. Объединение двух существующих пользователей — отдельная административная операция и не входит в первую версию.

## 10. Данные и миграции

Все новые таблицы размещаются в схеме `iam`. Названия окончательно сверить с `@better-auth/oauth-provider` schema generation, не переименовывая поля, которые plugin ожидает напрямую.

Все auth-данные принадлежат `iam.application` и ее `organization_id`. Схема IAM не хранит external service owner metadata или domain-specific resource binding. Внешние сервисы могут хранить `applicationId` как свою ссылку, но этот lifecycle не входит в настоящий план.

### 10.1. `application_auth_configuration`

Одна строка на application:

| Поле | Назначение |
| --- | --- |
| `application_id` | PK/FK на `iam.application` |
| `revision` | монотонная версия для cache invalidation |
| `realm_enabled` | операционный выключатель публичной аутентификации без удаления application/users |
| `resource` | единственный канонический OAuth resource/audience application |
| `registration_mode` | `open`, `disabled` |
| `password_sign_up_enabled` | регистрация password |
| `password_sign_in_enabled` | вход password |
| `password_reset_enabled` | запрос и завершение password reset для существующего пользователя |
| `email_verification_required` | обязательная проверка email |
| `email_otp_sign_in_enabled` | passwordless-вход существующего пользователя по email OTP |
| `email_otp_sign_up_enabled` | создание пользователя при первом успешном email OTP flow |
| `google_enabled` | Google UI/provider switch |
| `facebook_enabled` | Facebook UI/provider switch |
| `consent_mode` | политика consent по умолчанию |
| `access_token_ttl_seconds` | ограниченный TTL access token |
| `id_token_ttl_seconds` | TTL ID token |
| `refresh_token_ttl_seconds` | TTL refresh token |
| `session_ttl_seconds` | TTL application session |
| `secret_key_version` | версия IAM root key для HKDF realm secret |
| `branding_json` | валидированный branding contract |
| `default_locale` | локаль hosted UI |
| `created_at`, `updated_at` | аудит времени |

Значения по умолчанию:

- access token: 15 минут;
- ID token: 60 минут;
- authorization code: 5 минут;
- refresh token: 30 дней;
- session: 30 дней с серверной ревокацией.

Изменяемые значения ограничиваются заранее заданными безопасными диапазонами. Конфигурация не должна позволять отключить PKCE, state/nonce validation, redirect validation или token signature.

Effective policy вычисляется IAM на сервере и не принимается из HTTP request:

```text
passwordSignInAllowed = password_sign_in_enabled
passwordSignUpAllowed = registration_mode == "open" && password_sign_up_enabled
passwordResetAllowed = password_reset_enabled
emailOtpSignInAllowed = email_otp_sign_in_enabled
emailOtpSignUpAllowed = registration_mode == "open" && email_otp_sign_up_enabled
socialSignInAllowed(provider) = provider.enabled
socialSignUpAllowed(provider) = registration_mode == "open" && provider.enabled
```

`registration_mode=disabled` запрещает создание `application_user` через **все** способы: password signup, первый email OTP flow и первый Google/Facebook login. Он не выключает вход существующих пользователей через разрешенные методы и не меняет их method flags. Factory устанавливает `disableSignUp=true` для password, email OTP и каждого social provider независимо от UI; direct HTTP request не может обойти этот gate.

`realm_enabled=false` является отдельным emergency/operational gate. Он возвращает безопасный `404` для публичных discovery/auth routes до `auth.handler`, запрещает authorize, signin и refresh, делает live validation неактивной, но не удаляет users, accounts, sessions, consents или keys. `registration_mode` не используется как замена realm disable. Active realm в этом документе означает одновременно: `application.deleted_at IS NULL`, `organization.deleted_at IS NULL` и `application_auth_configuration.realm_enabled=true`.

Конфигурационный инвариант `email_otp_sign_up_enabled => email_otp_sign_in_enabled` обязателен, потому что stock Better Auth создает пользователя внутри того же `/sign-in/email-otp` flow. Repository/Zod schema отклоняет комбинацию `email_otp_sign_up_enabled=true`, `email_otp_sign_in_enabled=false`, а не исправляет ее неявно.

Таким образом, допустимы только три OTP-состояния: `signin=false, signup=false`; `signin=true, signup=false`; `signin=true, signup=true`. Состояние `signin=false, signup=true` недопустимо.

`resource` создается IAM одновременно с application и auth configuration по неизменяемому шаблону `urn:shopana:application:{applicationId}`. URN является absolute URI, не зависит от DNS, request `Host` или deployment URL и уникален благодаря `applicationId`. Поле обязательно и immutable: оно отсутствует во всех public/admin create/update inputs, repository запрещает его update, а OAuth client нельзя создать для application без корректно provisioned resource. Исправление ошибочного resource выполняется только пересозданием application до появления production data либо отдельной versioned protocol migration с отзывом всех token families; обычной configuration mutation не существует.

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

Секреты шифруются AES-256-GCM через `ApplicationAuthKeyring` с versioned IAM root key. Конкретный secrets backend может использовать KMS/envelope encryption для хранения самого root key, но формат application ciphertext и adapter contract от этого не меняются. AAD включает `applicationId`, provider и field name. Значения не попадают в Pino context, exception, GraphQL response или audit payload.

Для v1 фиксируется один `ApplicationAuthKeyring` port. Production adapter получает versioned root keys только из platform secrets backend; development adapter — из явно названных IAM environment secrets. Ciphertext хранится как `keyVersion + iv + authTag + ciphertext`, алгоритм — AES-256-GCM, новый random 96-bit IV на каждую запись. Отсутствующий key version является fail-closed configuration error и не приводит к запуску provider.

Тот же keyring защищает `application_jwks.private_key`: scoped adapter шифрует поле перед create/update и расшифровывает только при чтении Better Auth JWT plugin. AAD содержит `applicationId`, model=`jwks`, row id и field=`privateKey`. Public key остается открытым. Plaintext private key запрещен в database snapshots, logs и audit. Backfill существующих plaintext keys выполняется отдельной идемпотентной migration task до включения публичного OAuth listener; смешанный формат после cutover не поддерживается.

### 10.4. Email delivery integration configuration

Не хранить произвольные SMTP secrets в обычном JSON. Ввести:

- `application_auth_delivery_profile` — ссылка на разрешенный email transport, sender identity и server-controlled mapping purpose → template id;
- секреты transport — только в secrets backend;
- шаблоны — versioned/validated, без executable code;
- профиль обязан иметь отдельные утвержденные templates для `email_verification_link`, `password_reset_link` и `email_otp_sign_in`; один template id нельзя неявно переиспользовать для другого purpose;
- IAM передает delivery profile, recipient, точный purpose и исходный OTP/URL только через typed interface утвержденного platform email delivery service;
- IAM не сохраняет plaintext OTP/ссылку в собственной очереди, outbox или audit; защита durable payload, retries и dead-letter lifecycle являются ответственностью внешнего delivery service и его отдельного security contract.

Если platform-wide transport достаточен для v1, application хранит только sender/template selection из allowlist. Произвольный template/purpose из request не принимается; OTP purposes `forget-password` и `change-email` отсутствуют в v1 delivery mapping.

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
- `resources` — server-controlled значение; в v1 ровно `[application.resource]` для каждого client этой application;
- `grant_types` — server-controlled, в v1 ровно `["authorization_code", "refresh_token"]`;
- `response_types` — server-controlled, в v1 ровно `["code"]`;
- `environment`: `development | production`;
- `created_by`, `updated_by`;
- `created_at`, `updated_at`;
- `deleted_at`/disabled state.

При создании/изменении клиента IAM записывает `[application.resource]` в plugin field `resources`, если оно поддерживается подтвержденной схемой версии `1.6.23`, и всегда дублирует enforcement в server-side client policy. OAuth client не может иметь ноль, два или иной resource. GraphQL input OAuth client не содержит `resource`/`resources`: значение наследуется из immutable auth configuration application и не меняется обычными application/client mutations.

Поля plugin `grantTypes` и `responseTypes` записываются IAM при создании и не принимаются из GraphQL input при create/update. Repository запрещает их изменение в обход отдельной будущей protocol-policy migration. Это client-level ограничение дополняет глобальное `oauthProvider.grantTypes=["authorization_code", "refresh_token"]`; ни один client record не может расширить grant set OAuth Provider instance. Public client-management endpoint закрыты, поэтому application user не может зарегистрировать client с `client_credentials` самостоятельно.

### 10.7. `application_authorization_context`

Server-side hosted-flow context:

- `id` — random 256-bit opaque identifier, хранится как hash;
- `application_id`, `client_id`;
- hash точного `redirect_uri` и `post_login_return_path` только из internal allowlist;
- `state`, `nonce`, `code_challenge`, `code_challenge_method`;
- `scopes`, единственный `resource`, `current_step`;
- nullable `session_id` после login;
- `expires_at`, `consumed_at`, `created_at`, `updated_at`.

TTL неизменяемые 10 минут. Context принадлежит одной application/client, читается только по hash id + application predicate и потребляется атомарным `UPDATE ... WHERE consumed_at IS NULL AND expires_at > now()`. Cleanup удаляет expired/consumed contexts старше 24 часов. Поля не содержат password, OTP, authorization code, code verifier, access/refresh token или provider token. Cookie содержит только raw opaque id и отдельную Better Auth/IAM signature; database snapshot не позволяет восстановить browser cookie.

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

Factory явно преобразует независимые configuration flags в Better Auth options и effective route manifest:

- `emailAndPassword.enabled=true`, если включен хотя бы один password flow; конкретные signin/signup/reset endpoint независимо закрываются effective manifest;
- `emailAndPassword.disableSignUp = !passwordSignUpAllowed`;
- `emailAndPassword.autoSignIn = passwordSignInAllowed`, чтобы signup при выключенном password signin не создавал session;
- `emailAndPassword.requireEmailVerification = email_verification_required`;
- `emailAndPassword.sendResetPassword` подключается только при `passwordResetAllowed=true`;
- `emailVerification.sendVerificationEmail` подключается для verification flow;
- plugin `emailOTP` подключается, если включен OTP signin или signup, с `emailOTP.disableSignUp = !emailOtpSignUpAllowed`;
- каждый enabled Google/Facebook provider получает `disableSignUp = !socialSignUpAllowed(provider)`;
- effective manifest независимо разрешает только включенные signin/signup/reset/verification/OTP/provider routes и возвращает `404` до `auth.handler` для остальных.

Factory не исправляет противоречивую конфигурацию. В частности, `email_otp_sign_up_enabled=true` при `email_otp_sign_in_enabled=false` является validation error. UI строится по тому же effective policy, но не считается security boundary.

### 11.1. Секрет application instance

Не хранить одинаковый Better Auth `secret` для всех realms. Получать стабильный realm secret через HKDF от versioned IAM root secret с context:

```text
shopana:iam:application-auth:{applicationId}:{keyVersion}
```

В v1 выбирается однозначная fail-safe ротация без dual-secret verification Better Auth: изменение `secret_key_version` атомарно увеличивает `revision`, отзывает все application sessions, authorization contexts и незавершенные verification records, инвалидирует factory cache во всех process и только затем включает instance на новом derived secret. OAuth refresh-token families также отзываются, если установленная plugin composition использует Better Auth secret для их проверки или если это нельзя отрицательно подтвердить contract-проверкой. Уже выданные короткоживущие JWT проверяются signing keys до истечения, но live validation после realm-secret rotation возвращает inactive для отозванной session/token family. Dual-key grace period не входит в v1.

Root key material никогда не хранится в application database. Startup валидирует наличие текущей и всех еще используемых encryption key versions до открытия listener. Ротация root encryption key выполняется re-encryption job с optimistic locking; после нулевого count старого `key_version` он удаляется из active keyring отдельной операционной процедурой.

### 11.2. Cache invalidation

Ключ `ApplicationAuthFactory`:

```text
applicationId + configurationRevision + secretKeyVersion
```

После доверенного изменения конфигурации:

1. транзакционно обновляется config и увеличивается `revision`;
2. публикуется cache invalidation event;
3. локальный instance удаляется;
4. следующий request строит новую конфигурацию.

Нельзя оставлять старые provider credentials активными до process restart.

Invalidation event содержит только `applicationId`, новую `revision` и тип изменения, не содержит configuration/secrets. Каждый process при получении события сравнивает revision с локальной; потеря события безопасно компенсируется чтением revision из database не реже одного раза в 30 секунд и перед security-sensitive refresh/provider callback. Cache entry имеет hard TTL 5 минут. До подтверждения новой валидной configuration instance не заменяется permissive/default configuration: request завершается fail closed.

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

## 12. Hosted UI

В v1 hosted UI размещается внутри `services/iam` в `src/api/http/application-auth/ui` и выпускается одним артефактом/версией с IAM. Используется server-rendered HTML с минимальным локальным CSS и progressive enhancement; отдельный SPA, Node listener, CDN origin и client-side token storage не создаются. Все page GET и form POST routes входят в тот же versioned route manifest и application issuer boundary. Static assets имеют content hash, immutable cache headers и обслуживаются только с IAM public base URL.

OAuth authorization context хранится server-side в application-scoped таблице `application_authorization_context`: random 256-bit id, `application_id`, `client_id`, hash точного `redirect_uri`, `state`, `nonce`, PKCE metadata, requested scopes/resource, current step, `expires_at`, `consumed_at`. Browser получает только opaque signed HttpOnly context cookie. TTL — 10 минут; context одноразовый, ротация cookie id выполняется после login и перед consent для защиты от session fixation. В URL, HTML и browser storage не помещаются password, OTP, code verifier, access/refresh token или provider token.

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

Web security defaults v1:

- CSP: `default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' https: data:; style-src 'self'`; inline script запрещен;
- auth/session/context cookies: `Secure`, `HttpOnly`, host-only, path текущего application realm; SameSite выбирается из contract-проверенного Better Auth flow и фиксируется в manifest ADR;
- каждый state-changing form имеет одноразовый CSRF token, связанный с authorization context и application session;
- response headers включают `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` для HTML/form responses;
- branding schema допускает только заранее перечисленные color tokens, plain text и HTTPS logo URL; итоговый HTML всегда экранируется;
- v1 locales: application `default_locale` из allowlist и обязательный fallback `en`; неизвестная локаль не загружает внешний bundle.

Hosted UI не должен сохранять password или OTP в localStorage, URL, analytics event или error tracker.

## 13. Token и claims

### 13.1. Обязательные claims

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
- `actor_type=application_user`;
- `sid`, если нужен live session check.

В v1 каждый access token имеет пользователя: `sub` обязателен, а `actor_type` всегда равен `application_user`. Userless/M2M access token от `client_credentials` недопустим и не выдается IAM даже для confidential client.

Не помещать в token:

- platform/admin authorization roles;
- password/account/provider tokens;
- произвольные admin-configured claims.

### 13.2. Scopes

Первая версия:

- `openid`;
- `profile`;
- `email`;
- `offline_access`.

Начать с малого утвержденного scope registry. Конфигурация может выбирать только разрешенные scopes и не может создавать исполняемую claim mapping логику. Resource-specific scopes вне IAM добавляются отдельной protocol-policy version и не входят в v1.

### 13.3. Resource indicator и формат access token

В v1 каждая `iam.application` имеет ровно один собственный канонический resource indicator:

```text
application.resource=urn:shopana:application:{applicationId}
```

IAM детерминированно создает значение из уже сгенерированного `applicationId` в одной транзакции с application auth configuration. OAuth client не задает resource; client origins и redirect URI хранятся отдельно. Значение immutable, не строится из `Host` request и одинаково используется как:

- `resource` в authorization request;
- элемент `oauthProvider.validAudiences`;
- единственный разрешенный resource каждого OAuth client application;
- `aud` JWT access token.

OAuth Provider работает с включенным JWT plugin (`disableJwtPlugin=false`). OAuth client обязан передавать `application.resource` и в authorization request, и в code exchange/refresh token request. Отсутствующий, неизвестный, множественный, принадлежащий другой application или не совпадающий с настроенным resource отклоняется с protocol error `invalid_target`. Успешный code exchange и refresh должны выдавать JWT access token с точным `aud=application.resource`. Opaque access tokens не входят в IAM v1 contract.

Enforcement принадлежит `ApplicationOAuthResourcePolicyGuard` из раздела 6.3, а не одному `oauthProvider.validAudiences`. Guard требует exact application resource до передачи authorize/code-exchange/refresh request в OAuth Provider; `validAudiences` и IAM-controlled client metadata остаются независимыми дополнительными слоями. Ни application configuration, ни OAuth client input не могут отключить guard или выбрать permissive fallback.

Multi-resource grants, несколько audiences в одном token и resource-specific claims не входят в v1 и требуют отдельной protocol migration и threat model.

### 13.4. IAM live validation

IAM предоставляет introspection/validation contract, который помимо криптографической проверки token учитывает актуальное состояние application, OAuth client, user, session и token family. Контракт не принимает external domain context и не выполняет authorization за другие сервисы.

В v1 владельцем проверки является `ApplicationTokenValidationService`. Стандартный `/oauth2/introspect` остается protocol transport OAuth Provider и требует client authentication; он вызывает тот же domain validation после protocol-level token parsing. Для внутренних resource-server adapters IAM экспортирует typed domain contract, а выбор межсервисного HTTP/gRPC transport относится к integration plan и не меняет semantics:

```text
validate({ token, expectedApplicationId, expectedAudience }) ->
  { active: true, applicationId, userId, clientId, sessionId, scopes,
    issuedAt, expiresAt, actorType: "application_user", cacheUntil }
| { active: false, reasonCategory, cacheUntil }
```

`reasonCategory` является закрытым enum: `malformed | signature_invalid | expired | issuer_mismatch | audience_mismatch | application_inactive | client_inactive | user_inactive | session_inactive | token_family_revoked`. Внешний OAuth introspection response не раскрывает внутреннюю reason category; она используется только в безопасном operational event.

Порядок проверки фиксирован: signature/alg/kid → `iss` → exact `aud` → `application_id` route binding → `actor_type/sub/client_id/sid` → active realm → client → user → session → token family/revocation. Неизвестный `kid`, отсутствие обязательного claim, database/cache error или timeout дают inactive/fail closed. Positive cache TTL — не более 30 секунд и не позже `exp`; negative cache TTL — 5 секунд. Block/revoke/realm-disable публикуют invalidation event и удаляют соответствующие cache entries. Целевой propagation SLA — не более 5 секунд при доступной event infrastructure и не более 30 секунд при потере события.

Формат token не определяется клиентом: IAM configuration и обязательный resource гарантируют JWT access token в v1. Поддержка opaque access token в будущем требует отдельного versioned protocol contract.

## 14. Multi-tenancy и изоляция

На каждом request должны одновременно соблюдаться:

- application найдена по route и активна;
- organization application активна;
- OAuth client принадлежит той же application;
- user/account/session/verification/token/consent принадлежат той же application;
- admin actor имеет permission в этой organization;
- пользователь не заблокирован;
- session/token не отозваны.

Нельзя полагаться только на application id из body, GraphQL input, JWT или adapter-created object. Scope поступает из доверенного route/admin context и принудительно добавляется сервером.

Cross-application атаки должны входить в обязательные негативные сценарии для каждого repository/adapter endpoint.

## 15. Интеграция с email delivery service

IAM зависит только от обязательного порта `ApplicationAuthEmailDeliveryPort`; конкретный platform transport не блокирует реализацию IAM. Production composition не открывает password/OTP/email-verification routes, пока adapter и все три purpose templates не прошли startup validation. Development использует явный local capture adapter, который доступен только в development environment и не логирует payload.

```text
enqueue({
  idempotencyKey,
  applicationId,
  deliveryProfileId,
  purpose: "email_verification_link" | "password_reset_link" | "email_otp_sign_in",
  recipient,
  templateId,
  payload: { url } | { otp }
}) -> { accepted: true, messageId } | { accepted: false, retryable }
```

Timeout handoff — 3 секунды. Один IAM request не выполняет inline retry, чтобы не дублировать письмо; durable retries являются ответственностью delivery service. `idempotencyKey` детерминирован из application, Better Auth verification/context id и purpose, но не содержит email/OTP/token. `accepted=false`, timeout и malformed adapter response дают одинаковую generic временную ошибку. Startup validation проверяет distinct template id для трех purposes и запрещает включение соответствующего auth flow при отсутствующем template.

IAM подключает три отдельные Better Auth callback к одному typed delivery adapter:

| Better Auth callback | IAM purpose | Payload v1 |
| --- | --- | --- |
| `emailVerification.sendVerificationEmail` | `email_verification_link` | recipient + подписанный verification URL |
| `emailAndPassword.sendResetPassword` | `password_reset_link` | recipient + подписанный reset URL |
| `emailOTP.sendVerificationOTP` с `type="sign-in"` | `email_otp_sign_in` | recipient + исходный OTP |

Фактические callback inputs установленной версии Better Auth фиксируются в typed adapter без общего `unknown` payload: `{ user, url, token }` для verification/reset link callbacks и `{ email, otp, type }` для email OTP. Для link delivery IAM передает утвержденный URL; отдельный raw token не дублируется в delivery request или logs.

`emailOTP.sendVerificationOTP` с `type="forget-password"`, `type="change-email"` или иным purpose не передается в delivery service в v1: соответствующие routes не входят в effective manifest, а adapter дополнительно отклоняет неподдерживаемый type. Email verification и password reset используют отдельные link callbacks, а не OTP callback.

Каждый callback:

- загружает разрешенный application delivery profile;
- выбирает template только по server-controlled IAM purpose;
- формирует typed request внешнему platform email delivery service с `applicationId`, нормализованным recipient, точным purpose, template id и соответствующим OTP/URL;
- всегда передает обязательный idempotency key по `ApplicationAuthEmailDeliveryPort` contract;
- ожидает только подтверждение приема задания внешним service, а не фактическую отправку письма;
- маскирует recipient в логах и не логирует OTP, URL или link token;
- не сохраняет plaintext OTP/URL в IAM database, cache, outbox или audit;
- публикует только метрики результата handoff без high-cardinality PII labels.

Email worker, durable queue/outbox, retries, dead-letter state, шифрование и retention delivery payload реализуются внешним platform email delivery service и находятся вне scope этого плана. IAM должен документировать требования к этому контракту, но не реализует собственную delivery infrastructure.

User-facing response не ждет фактической отправки и не различает `user_not_found`, `provider_failed` и `accepted`. Ошибка handoff отображается как generic временная недоступность без раскрытия существования account.

## 16. Rate limits и защита от злоупотреблений

Минимальные отдельные policies:

| Операция | Ключи ограничения | Baseline v1 |
| --- | --- | --- |
| Password signin | application + normalized email HMAC + IP | 5/мин identity, 30/15 мин IP |
| Email OTP request | application + email HMAC + IP/device | 3/15 мин identity, resend cooldown 60 сек, 20/сутки identity, 100/сутки IP |
| Email OTP verify | application + verification id + IP | максимум 3 попытки на OTP, 10/15 мин IP |
| OAuth authorize | application + client + IP | 60/мин client+IP |
| Token endpoint | application + client + IP | 30/мин client+IP, burst 10/10 сек |
| Password reset | application + email HMAC + IP | 3/час identity, 20/час IP, 10/сутки identity |

Baseline числа являются обязательным safe default. Load/security review может только уменьшить их либо увеличить через versioned platform policy с зафиксированным обоснованием; произвольная per-application настройка выше platform maximum запрещена. Identity key вычисляется HMAC отдельным rate-limit key, а не простым hash email. Counter backend обязан быть общим для всех IAM replicas; недоступность backend для OTP/password reset — fail closed, для authorize/token применяется локальный аварийный tighter limit и operational alert.

После лимита возвращать стандартную/generic ошибку и `Retry-After`, не подтверждая существование account. CAPTCHA/risk challenge оставить расширением после появления telemetry.

## 17. Аудит и наблюдаемость

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

Метрики:

- latency/error rate по endpoint и method;
- active realms/factory cache hit/miss/rebuild;
- OTP delivery handoff latency/failure;
- token refresh/revoke;
- rate-limit count;
- provider callback failure;
- adapter cross-scope rejection;

Не использовать raw user ID, email, token, code, client secret или provider response как metric label.

Audit event contract v1 имеет поля `eventId`, `schemaVersion`, `occurredAt`, `category`, `action`, `outcome`, `reasonCategory`, `actorType`, optional opaque/hashed `actorId`, `organizationId`, `applicationId`, optional `clientId`, `requestId` и allowlisted `safeDiff`. Event payload проходит централизованный redaction до записи. Запрещены email, password, OTP, URL с token/query, authorization code, session/token/client/provider secrets и provider response.

Security audit является append-only; минимальный retention — 180 дней, operational logs — 30 дней, metrics — согласно platform observability policy. Ошибка записи административного audit event отклоняет соответствующую admin operation; ошибка отправки operational auth event не ломает protocol flow, но увеличивает durable error counter и alert. High-severity alerts: cross-tenant adapter rejection, массовый `invalid_target`, signing/encryption key failure, cache invalidation lag >30 секунд, delivery failure rate >10% за 5 минут и рост token replay/reuse.

## 18. Этапы реализации

Оценка ниже означает готовность описания к выполнению, а не процент уже написанного кода:

| Этап | Готовность к выполнению | Обязательный вход | Бинарный выходной артефакт |
| --- | ---: | --- | --- |
| 0. Compatibility/security spike | 98% | установленная exact dependency во временной/проектной composition | ADR + generated schema snapshot + полный route manifest + executable compatibility report |
| 1. Schema/config/secrets | 96% | закрыт этап 0 schema contract | migration, models, repositories, keyring, backfill и DB invariant report |
| 2. Better Auth factory | 96% | этап 1 | production composition, scoped adapter contract report, cache/invalidation report |
| 3. Public HTTP OAuth/OIDC | 95% | этап 2 | Fastify plugins, raw bridge, guard и полный protocol contract report |
| 4. Hosted UI/password | 94% | этап 3 + delivery port adapter | IAM UI bundle/pages и Playwright flow report |
| 5. Email OTP | 95% | этап 4 + delivery templates | OTP flow и abuse/anti-enumeration report |
| 6. Social/linking | 94% | этап 4 + provider credentials | provider/linking contract and audit report |
| 7. Live validation/lifecycle | 95% | этапы 3, 5, 6 | typed validation service, cache/invalidation and revocation report |
| 8. Hardening/release | 93% | этапы 0–7 | threat model, load report, dashboards, alerts, runbooks и release checklist |

Этапы выполняются по dependency gates таблицы. Разрешена параллельная работа только над независимыми артефактами внутри уже открытого этапа; downstream код не может подменять незакрытый upstream contract предположением или permissive fallback.

### Этап 0. Compatibility и security spike

Подробный результат выполненного spike: [Compatibility и security spike OAuth 2.1 / OIDC для `application_users`](./application-users-oauth-oidc-compatibility-spike.ru.md).

Задачи:

1. Добавить exact dependency `@better-auth/oauth-provider@1.6.23`.
2. Зафиксировать generated schema и endpoint paths установленной версии.
3. Классифицировать каждый endpoint полного Better Auth instance, включая OAuth Provider, password, emailOTP и social plugins, как public protocol/hosted-flow или internal/forbidden и зафиксировать default-deny manifest по method + normalized pathname.
4. Подтвердить, что session-authenticated client-management endpoint недоступны application users и закрыты до `auth.handler`; внутренний management service и Admin GraphQL реализуются последующим планом без публичной HTTP-экспозиции.
5. Подтвердить Fastify integration, path-prefixed issuer, issuer-relative OIDC discovery, отдельный root OAuth Authorization Server Metadata route RFC 8414 и multi-cookie responses.
6. Проверить возможность application scoping всех plugin models через текущий adapter.
7. Подтвердить application-scoped `resource`, поведение `validAudiences: [application.resource]`, отсутствие resource binding в plugin и необходимость `ApplicationOAuthResourcePolicyGuard` для authorize/code exchange/refresh.
8. Проверить custom claims/application binding.
9. Зафиксировать глобальный `oauthProvider.grantTypes=["authorization_code", "refresh_token"]`, public/confidential client behavior и обязательные client-level `grant_types=["authorization_code", "refresh_token"]`, `response_types=["code"]`.
10. Подтвердить, что discovery не рекламирует `client_credentials`, а token endpoint отклоняет этот grant для каждого public/confidential v1 client.

Результат:

- короткий ADR с выбранным plugin и отклонением deprecated `oidcProvider`;
- подтвержденная схема таблиц;
- versioned route manifest с точными HTTP methods и public/internal endpoint всего Better Auth handler;
- подтвержденные issuer-relative OIDC discovery и root `GET /.well-known/oauth-authorization-server/auth/applications/:applicationId` с согласованными issuer/endpoints;
- негативное подтверждение, что application user не может читать, создавать, изменять, удалять client или ротировать его secret;
- contract-подтверждение guard contract: обязательный единственный resource конкретной application выдает JWT с ожидаемым `aud`, а отсутствующий, повторяющийся или resource другой application отклоняется до `auth.handler`;
- contract-подтверждение, что `client_credentials` отсутствует в discovery и public/confidential v1 clients не получают token через этот grant;

Критерий выхода: все перечисленные результаты существуют в repository; полный manifest покрывает 100% routes итоговой composition и не содержит unclassified route; public/confidential flows, discovery metadata, `client_credentials` denial, resource guard и cross-tenant OAuth model operations подтверждены executable contract-сценариями. Любое расхождение зафиксировано обновленным ADR и отражено в плане; нет неизвестных, требующих самописного OAuth server, permissive token fallback или небезопасного хранения OTP.

### Этап 1. Схема, конфигурация и secrets

Задачи:

1. Создать миграции application auth config и authorization context, включая обязательный immutable `resource`, `realm_enabled`, независимые password/OTP flags, `registration_mode`, origins/providers и purpose-specific delivery metadata.
2. Добавить OAuth Provider plugin tables с `application_id`.
3. Добавить индексы, tenant constraints и cleanup behavior.
4. Реализовать encryption service для provider credentials.
5. Реализовать `ApplicationAuthKeyring`, encryption/decryption `application_jwks.private_key`, HKDF realm secret derivation и fail-safe rotation/versioning из разделов 10.3 и 11.1.
6. Добавить repository и Zod schemas для configuration, включая `email_otp_sign_up_enabled => email_otp_sign_in_enabled`.
7. Добавить IAM effective auth policy calculator, который применяет `registration_mode=disabled` как глобальный запрет создания user поверх method/provider flags.
8. Добавить IAM domain service, который атомарно создает application auth configuration и `urn:shopana:application:{applicationId}` без приема resource из input.
9. Идемпотентно backfill создать auth configuration и resource для существующих `iam.application`.
10. Добавить `realm_enabled`, emergency disable repository operation и active realm predicate.
11. Добавить DB CHECK/unique/composite FK constraints и документированный cutover/rollback для encrypted signing keys.

Критерий выхода: migration и повторный backfill идемпотентны; 100% applications имеют одну configuration и уникальный immutable resource; PostgreSQL constraints отклоняют cross-application relations и invalid enum/TTL states; `realm_enabled=false` отключает runtime без удаления данных; provider/signing private keys существуют в database только как versioned ciphertext; root key absence fail-closed; secret не читается через публичный API; migration rollback/cutover procedure документирована.

### Этап 2. Application-scoped Better Auth factory

Задачи:

1. Расширить adapter plugin models.
2. Собирать plugins и effective route manifest согласно независимым application settings; явно преобразовать password/OTP/social signup policy в Better Auth `disableSignUp`.
3. Добавить account token encryption/linking policy.
4. Добавить OAuth scopes, `validAudiences: [application.resource]`, автоматическое наследование единственного resource clients и custom claims policy; JWT plugin нельзя отключать.
5. Глобально задать `oauthProvider.grantTypes=["authorization_code", "refresh_token"]`, чтобы token endpoint не поддерживал и discovery не рекламировал `client_credentials`.
6. Принудительно задавать client `grantTypes=["authorization_code", "refresh_token"]` и `responseTypes=["code"]`, сделав эти поля неизменяемыми для обычного configuration flow.
7. Добавить revision-aware cache invalidation.
8. Проверять active organization/application перед созданием instance.
9. Подключать `emailVerification.sendVerificationEmail`, `emailAndPassword.sendResetPassword` и `emailOTP.sendVerificationOTP` только для разрешенных flows и purpose.

Критерий выхода: два application одновременно используют разные users, clients, keys, cookies, providers и resources без пересечения; contract report покрывает create/find/update/delete/count/transaction для каждой plugin model, nested where и чужой application input; factory rebuild происходит по revision/key version и во всех replicas не позднее 30 секунд; invalid configuration/secret никогда не создает default instance.

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
12. Реализовать scoped raw-buffer content-type parsers, 64 KiB limit и Fetch Request/Response bridge без повторной сериализации form/query.
13. Зафиксировать `iam_http` как имя общего listener port configuration; старое `admin_graphql` поддержать только как временный deprecated alias с startup warning на один migration cycle.
14. Добавить production startup validation `IAM_PUBLIC_BASE_URL`, trusted proxy allowlist и external reverse-proxy path manifest.

Критерий выхода: один IAM Fastify listener обслуживает изолированные sibling scopes application auth и Admin GraphQL; публичный auth request не проходит через admin middleware, `/graphql` отсутствует во внешнем proxy allowlist; raw query/form bytes и multiple `Set-Cookie` сохраняются; malformed/duplicate/oversize request отклоняется до Better Auth; issuer-relative OIDC discovery и root RFC 8414 metadata согласованы; public и confidential reference clients проходят Authorization Code + S256 PKCE только с exact application resource; guard покрыт positive/negative matrix и не допускает opaque fallback; 100% неизвестных, management и выключенных routes дают `404` до `auth.handler`; `client_credentials` отсутствует в metadata и не выдает token; untrusted Host/proxy headers не меняют URL/IP policy.

### Этап 4. Hosted UI и password flow

Задачи:

1. Сделать OAuth context persistence/resume.
2. Реализовать signin/signup/password reset/email verification UI.
3. Реализовать consent и end-session pages.
4. Добавить localization/branding schema.
5. Подключить anti-enumeration, CSRF и rate limits.
6. Подключить отдельные `emailVerification.sendVerificationEmail` и `emailAndPassword.sendResetPassword` callbacks к typed delivery adapter.
7. Реализовать server-side password policies: независимые signin/signup/reset flags и глобальный `registration_mode` без влияния на вход существующего пользователя.
8. Реализовать server-rendered UI/CSP/static asset pipeline внутри IAM и одноразовую `application_authorization_context` model.

Критерий выхода: public и confidential clients проходят разрешенные signup/signin/reset/verification/consent/logout flows через server-rendered UI; authorization context одноразовый, истекает за 10 минут и защищен от fixation/CSRF; CSP/cookie/cache headers соответствуют разделу 12; WCAG keyboard/focus и locale fallback подтверждены Playwright; выключенные endpoint закрыты до Better Auth; `registration_mode=disabled` запрещает password signup, но не signin/reset существующего пользователя; delivery callbacks используют только свои typed purposes; redirect/state/nonce/PKCE negative matrix проходит.

### Этап 5. Email OTP

Задачи:

1. Подключить `emailOTP` со стандартным `storeOTP: "hashed"`, не вводя custom hasher/HMAC и отдельный lifecycle ключей.
2. Интегрировать Better Auth `emailOTP.sendVerificationOTP` только для `type="sign-in"` с утвержденным внешним platform email delivery service без собственного IAM worker/outbox.
3. Добавить request/verify UI.
4. Реализовать generic responses, resend cooldown и attempt limits.
5. Реализовать независимые `email_otp_sign_in_enabled`/`email_otp_sign_up_enabled`, validation invariant signup → signin и effective `disableSignUp` с учетом `registration_mode`.

Критерий выхода: email passwordless работает на стандартном Better Auth `storeOTP: "hashed"`; database/log/audit snapshot не содержит plaintext OTP; resend cooldown, три попытки, rotation, expiry, one-time use и baseline distributed limits подтверждены; ответы существующего/несуществующего email эквивалентны по status/schema, а разница median latency после 100 warm requests не превышает 50 мс и 20% более медленного варианта; при закрытой регистрации существующий пользователь входит, новый не создается; reset/change-email routes и purposes недоступны; delivery timeout/failure дает generic fail-closed response.

### Этап 6. Google/Facebook и account linking

Задачи:

1. Подключить per-application socialProviders.
2. Включить upstream OAuth token encryption.
3. Настроить стандартный Better Auth `linkSocial()` с `disableImplicitLinking=true`, `allowDifferentEmails=false` и `trustedProviders=["facebook"]`; собственный OAuth linking flow не реализовывать.
4. Обработать provider без email и конфликт account.
5. Добавить application-user link/unlink runtime contract и аудит security events; административные operations будут добавлены последующим Admin API plan.
6. Применить `disableSignUp=true` ко всем providers при `registration_mode=disabled` и проверить отдельно существующий linked account и первый social login.

Критерий выхода: обычный social sign-in никогда не выполняет implicit linking; при закрытой регистрации existing linked account входит, а first login не создает user/account/session; authenticated `linkSocial()` требует свежую session не старше 10 минут, связывает account только внутри application и отклоняет absent/different email или account другого user; unlink последнего login method отклоняется server-side; provider callback/application mismatch и replay отклоняются; encrypted provider credentials/upstream tokens отсутствуют в response/log/audit snapshots.

### Этап 7. IAM live validation и token lifecycle

Задачи:

1. Зафиксировать JWT-only claims contract с `aud=application.resource`, `application_id`, `actor_type=application_user` и обязательным `sub`.
2. Реализовать IAM introspection/live validation с проверкой application, OAuth client, user, session и token family.
3. Обработать block/revoke/application disable в refresh и live-validation lifecycle.
4. Добавить короткий cache contract и invalidation для live state.
5. Реализовать `ApplicationTokenValidationService` и привязать к нему OAuth introspection без раскрытия internal reason category.

Критерий выхода: IAM выдает только JWT access tokens с обязательными claims; `ApplicationTokenValidationService` реализует закрытый result/reason contract раздела 13.4; standard introspection не раскрывает internal reason; block/revoke/realm-disable отражаются в refresh и validation не позднее 5 секунд при event delivery и 30 секунд при fallback revision read; database/cache failure дает inactive; positive/negative TTL не превышают contract; cross-application issuer/audience/session/token-family checks покрыты executable matrix.

### Этап 8. Hardening

Задачи:

1. Threat model review.
2. Security/contract/e2e scenarios.
3. Нагрузочная проверка authorize/token/OTP limits.
4. Signing/provider secret rotation runbooks.
5. Dashboards/alerts/audit retention.
6. Документация IAM OAuth/OIDC client contract.

Критерий выхода: выполнен Definition of Done; threat model подписан владельцами IAM/security; обязательные contract/Playwright сценарии проходят через `shopana-cli`; build успешен; при baseline 50 concurrent clients, 100 token RPS и 25 authorize RPS в течение 15 минут без внешнего provider p95 не выше 300 мс, p99 не выше 750 мс и error rate ниже 1%; rate-limit behavior проверен под конкурентной нагрузкой; dashboards/alerts и 180-day audit retention включены; signing/provider/root-secret rotation и delivery outage runbooks отрепетированы; emergency realm disable прекращает новый signin/refresh и делает live validation inactive в пределах 30 секунд без удаления users.

## 19. Предполагаемые изменения файлов

Базовая структура реализации фиксируется так; этап 0 может изменить только plugin-generated model/route filenames через обновленный ADR:

```text
services/iam/package.json
services/iam/src/auth/auth.ts
services/iam/src/auth/ApplicationAuthFactory.ts
services/iam/src/auth/scopedDrizzleAdapter.ts
services/iam/src/auth/applicationAuthConfiguration.ts
services/iam/src/auth/applicationOAuthClaims.ts
services/iam/src/api/graphql-admin/server.ts
services/iam/src/api/http/application-auth/ApplicationOAuthResourcePolicyGuard.ts
services/iam/src/api/http/application-auth/applicationAuthHttpPlugin.ts
services/iam/src/api/http/application-auth/rawRequestBridge.ts
services/iam/src/api/http/application-auth/routeManifest.ts
services/iam/src/api/http/application-auth/ui/*
services/iam/src/api/http/application-auth/*
services/iam/src/repositories/models/application-auth.ts
services/iam/src/repositories/models/authorization.ts
services/iam/src/repositories/ApplicationAuthConfigurationRepository.ts
services/iam/src/repositories/ApplicationOAuthClientRepository.ts
services/iam/src/repositories/ApplicationAuthorizationContextRepository.ts
services/iam/src/services/ApplicationAuthKeyring.ts
services/iam/src/services/ApplicationAuthSecretService.ts
services/iam/src/services/ApplicationAuthEmailDeliveryPort.ts
services/iam/src/services/ApplicationTokenValidationService.ts
services/iam/src/services/ApplicationAuthAuditService.ts
services/iam/src/events/application-auth/*
services/iam/migrations/*
services/iam/docs/application-users-oauth-oidc-integration.md
```

Hosted UI размещается в `services/iam/src/api/http/application-auth/ui`, собирается и версионируется вместе с IAM согласно разделу 12.

## 20. Обязательные сценарии проверки

Проверки готовятся как targeted contract/Playwright сценарии и запускаются только через `shopana-cli` согласно правилам проекта. `test` и `tsc` не используются как способ проверки; когда нужна новая собранная версия, выполняется build через проектный инструмент.

### 20.1. Protocol

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
- authorize с точным `resource=application.resource` выдает JWT access token с таким же `aud`;
- отсутствующий, пустой, неизвестный, повторенный дважды даже с одинаковым значением, resource другой application или не совпадающий с application resource отклоняется как `invalid_target` до `auth.handler`;
- authorization error не перенаправляется на непроверенный `redirect_uri`;
- code exchange без resource не создает opaque access token и не достигает OAuth Provider;
- token exchange не позволяет заменить resource из authorization request;
- refresh без resource или с другим resource отклоняется до OAuth Provider, не ротирует refresh family и не выдает opaque token;
- успешный refresh с exact resource сохраняет исходный resource/audience;
- resource guard одинаково определяет confidential `client_id` из HTTP Basic и public `client_id` из form body, а конфликт источников отклоняется;
- resource guard сохраняет исходный raw query/form body для OAuth Provider без повторного decode или изменения encoding;
- malformed form, duplicate security parameter, unsupported content type/encoding и body >64 KiB отклоняются до OAuth Provider;
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

### 20.2. Tenant isolation

- client application A не авторизуется через issuer B;
- user/session/account/token/consent A не читается adapter B;
- одинаковый email допустим в A и B как разные users;
- Google/Facebook account A не связывается в B;
- OTP A не проверяется в B;
- signing key A не используется issuer B;
- private signing key A/B хранится только как ciphertext и не расшифровывается adapter другого application;
- application A и B имеют разные canonical resources, и resource A отклоняется issuer/client application B;
- IAM формирует resource A/B только как `urn:shopana:application:{applicationId}` и отклоняет попытку передать resource через application create/update input;
- backfill повторно возвращает тот же application resource и не создает вторую auth configuration;

### 20.3. Password/email OTP

- разрешенные signup/signin работают;
- выключенный method недоступен и в UI, и прямым HTTP вызовом;
- при `password_sign_up_enabled=true`, `password_sign_in_enabled=false` signup создает пользователя без session (`autoSignIn=false`), а прямой password signin закрыт;
- при `password_sign_up_enabled=false`, `password_sign_in_enabled=true` существующий password user входит, а новый не создается;
- `password_reset_enabled=false` скрывает reset UI и возвращает `404` для прямых reset request/complete endpoint до Better Auth;
- при `password_reset_enabled=true` reset существующего пользователя вызывает `emailAndPassword.sendResetPassword` с purpose `password_reset_link` и подписанным URL;
- email verification вызывает отдельный `emailVerification.sendVerificationEmail` с purpose `email_verification_link`, а не OTP callback;
- `email_otp_sign_up_enabled=true` при `email_otp_sign_in_enabled=false` отклоняется validation слоем;
- при `email_otp_sign_in_enabled=true`, `email_otp_sign_up_enabled=false` существующий пользователь входит по OTP, а отсутствующий не создается;
- email OTP delivery вызывает `emailOTP.sendVerificationOTP` только с `type="sign-in"` и purpose `email_otp_sign_in`;
- OTP `forget-password`, `change-email` и прочие неподдерживаемые purposes не достигают delivery adapter;
- `registration_mode=disabled` server-side запрещает создание пользователя через password signup и первый email OTP flow независимо от method flags/UI, но разрешенные signin/reset существующего пользователя продолжают работать;
- generic response одинаков для существующего/несуществующего email;
- OTP истекает, ротируется, имеет limit и одноразовый;
- email OTP хранится стандартным Better Auth способом `storeOTP: "hashed"`;
- блокировка user отзывает sessions и запрещает новый signin;

### 20.4. Social/linking

- Google/Facebook callback привязан к правильной application;
- disabled/misconfigured provider закрыт безопасно;
- при `registration_mode=disabled` существующий пользователь с linked Google/Facebook account входит, но первый social login не создает user, account или session;
- provider secrets/tokens отсутствуют в runtime responses/logs/errors;
- обычный Google/Facebook sign-in при совпадающем email возвращает account-not-linked и не выполняет implicit linking;
- authenticated `linkSocial()` связывает Google и Facebook account со свежей session текущего application user;
- Facebook `emailVerified=false` не блокирует explicit `linkSocial()`, поскольку Facebook является trusted provider только при глобально отключенном implicit linking;
- отсутствующий/отличающийся email не связывается;
- нельзя unlink последний login method;
- provider account уже другого user вызывает конфликт, а не merge.

### 20.5. IAM runtime и token lifecycle

- factory перестраивается после config change;
- потерянный invalidation event компенсируется revision read не позднее 30 секунд;
- IAM выдает JWT access token только с ожидаемым issuer/audience/scope/actor;
- IAM не выдает opaque access token в v1;
- IAM не выдает userless token без `sub` или с `actor_type`, отличным от `application_user`;
- OAuth client application A не получает token с resource или claims application B;
- block/revoke отражается в live validation;
- disabled application/client/user отклоняется live validation и не может обновить token.
- `realm_enabled=false` не удаляет auth rows, но прекращает authorize/signin/refresh и делает validation inactive;
- неизвестный encryption/signing key version дает fail-closed result;

### 20.6. Web security

- wildcard/open redirect отсутствует;
- untrusted Host не меняет issuer, callback, root OAuth Authorization Server Metadata URL и его response;
- CSRF form request отклоняется;
- cookies имеют ожидаемые Secure/HttpOnly/SameSite/path attributes;
- authorization context одноразовый, истекает через 10 минут и ротируется после login/перед consent;
- CSP, no-store, no-referrer, nosniff и CSRF работают на всех hosted UI forms;
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

## 21. Security checklist перед релизом

- [ ] Используется актуальный `@better-auth/oauth-provider`, а не deprecated provider.
- [ ] Authorization Code + S256 PKCE обязателен.
- [ ] OAuth Provider глобально настроен с `grantTypes=["authorization_code", "refresh_token"]`; discovery не рекламирует `client_credentials`.
- [ ] Все v1 clients имеют только `grant_types=["authorization_code", "refresh_token"]` и `response_types=["code"]`.
- [ ] `client_credentials` отсутствует в runtime/client policy и не выдает token ни public, ни confidential client.
- [ ] Authorize flow требует единственный канонический `application.resource` и выдает JWT с точным `aud`.
- [ ] `ApplicationOAuthResourcePolicyGuard` до `auth.handler` требует ровно один exact resource на authorize, code exchange и каждом refresh; missing/duplicate/foreign resource возвращает `invalid_target` без opaque fallback.
- [ ] JWT plugin включен; IAM не выдает opaque access tokens в v1.
- [ ] Каждая application имеет ровно один provisioned resource; OAuth clients наследуют только его, а `oauthProvider.validAudiences` равно `[application.resource]`.
- [ ] Resource формируется IAM как `urn:shopana:application:{applicationId}`, создается вместе с application, immutable и отсутствует во всех application/client mutation inputs.
- [ ] Code exchange/refresh не позволяют сменить или расширить исходный resource.
- [ ] Implicit/password grants отсутствуют.
- [ ] Dynamic Client Registration выключен.
- [ ] Все OAuth client-management endpoint закрыты в публичном application realm до `auth.handler`.
- [ ] Весь application Better Auth handler использует versioned default-deny manifest по `(HTTP method, normalized pathname)` без широких plugin-prefix/wildcard правил.
- [ ] Неизвестные и выключенные OAuth/password/OTP/social endpoint возвращают `404` до `auth.handler`.
- [ ] Application auth и Admin GraphQL зарегистрированы как sibling plugins одного Fastify instance/listener; GraphQL admin middleware не применяется к auth routes.
- [ ] Reverse proxy публикует только утвержденные auth/metadata paths и не публикует IAM `/graphql` во внешний network boundary.
- [ ] Отдельный `GET /.well-known/oauth-authorization-server/auth/applications/:applicationId` публикует RFC 8414 metadata текущей active application, строит URL из `IAM_PUBLIC_BASE_URL` и не открывает другие `/.well-known/*` routes.
- [ ] Redirect/post-logout URI проверяются точным совпадением.
- [ ] Issuer строится из server config, не request Host.
- [ ] Все OAuth plugin модели application-scoped.
- [ ] Organization/application/client/user/session live state проверяется.
- [ ] Provider credentials зашифрованы с versioned key/AAD.
- [ ] `application_jwks.private_key` зашифрован на adapter boundary; plaintext отсутствует в database snapshot.
- [ ] Отсутствующий/неизвестный key version приводит к fail-closed startup/request, а не к default secret.
- [ ] Realm-secret rotation отзывает sessions/contexts/verification/token families и перестраивает factory во всех replicas.
- [ ] Upstream OAuth tokens зашифрованы.
- [ ] `registration_mode=disabled` запрещает создание `application_user` через password, email OTP и первый social login, не запрещая вход существующих пользователей через включенные методы.
- [ ] Password signin/signup/reset имеют независимые flags; выключенный flow отсутствует в UI и effective route manifest.
- [ ] Password signup при выключенном password signin использует `autoSignIn=false`, создает пользователя без session и не обходит выключенный signin.
- [ ] `email_otp_sign_up_enabled => email_otp_sign_in_enabled` проверяется configuration validation, а `emailOTP.disableSignUp` учитывает и OTP signup flag, и `registration_mode`.
- [ ] Email verification, password reset и email OTP подключены через отдельные Better Auth callbacks и разные server-controlled delivery purposes/templates.
- [ ] OTP delivery принимает в v1 только `type="sign-in"`; OTP reset/change-email routes и purposes закрыты.
- [ ] Email OTP хранится стандартным Better Auth способом `storeOTP: "hashed"`.
- [ ] Custom email OTP hasher/HMAC, его ключи и миграция hash-формата не входят в release scope v1.
- [ ] State, nonce, CSRF, cookie policies проверены.
- [ ] Generic responses защищают от enumeration.
- [ ] Rate limits и email delivery limits включены.
- [ ] Distributed rate-limit backend и аварийное fail-closed/tighter-limit поведение проверены.
- [ ] `realm_enabled=false` прекращает signin/authorize/refresh и делает live validation inactive без удаления данных.
- [ ] Hosted UI CSP, CSRF, context one-time use, fixation protection и security headers проверены.
- [ ] Live validation соблюдает 5/30-second invalidation SLA и fail-closed при database/cache error.
- [ ] Логи/трейсы/метрики не содержат PII/secrets/tokens/codes.
- [ ] Signing/provider secret rotation runtime contract описан и проверен.

## 22. Definition of Done

Решение считается готовым, когда:

1. Каждая application имеет отдельный issuer, users, sessions, providers, OAuth clients, tokens, consents и keys.
2. Каждая application получает при создании ровно один immutable resource `urn:shopana:application:{applicationId}`; ни OAuth client, ни администратор не передают и не изменяют его. `ApplicationOAuthResourcePolicyGuard` требует exact single value до Better Auth на authorize/code exchange/каждом refresh и исключает opaque fallback; public и confidential clients наследуют resource, проходят стандартный OIDC Authorization Code + PKCE flow и получают JWT access token с точным audience; OAuth Provider глобально поддерживает только `authorization_code`/`refresh_token`, а `client_credentials` отсутствует в discovery и запрещен также на уровне каждого client.
3. Password signin/signup/reset и email OTP signin/signup управляются явными flags; OTP signup требует OTP signin. `registration_mode=disabled` единообразно запрещает создание пользователя через password, email OTP и первый social login, но не мешает существующим пользователям входить через включенные методы.
4. Email verification, password reset и email OTP используют отдельные Better Auth callbacks и server-controlled delivery purposes/templates; email OTP принимает только `type="sign-in"` и хранится стандартным Better Auth способом `storeOTP: "hashed"`; custom hasher/HMAC и lifecycle его ключей не требуются для v1.
5. Account linking не пересекает applications и не доверяет unverified email.
6. IAM live validation проверяет application, OAuth client, user, session и token family state.
7. Block/revoke/disable действуют на live validation и refresh lifecycle.
8. Все негативные tenant/security сценарии runtime подтверждены targeted проверками.
9. Есть документация IAM OAuth/OIDC client contract и operations.
10. Есть runbooks для signing keys, provider secrets, delivery outage и emergency realm disable.
11. Runtime готов предоставить безопасные domain services/repositories и configuration invariants последующему Admin API plan.
12. Signing/provider/root secrets и private JWKS keys имеют versioned encryption/rotation contract; plaintext отсутствует в persistence и observability.
13. `realm_enabled=false` реализует emergency disable в пределах 30 секунд без удаления auth data.
14. Hosted UI выпускается вместе с IAM и проходит CSP/CSRF/cookie/WCAG/locale verification.
15. Load, observability, audit retention и incident runbooks соответствуют критериям этапа 8.

## 23. Риски и решения

| Риск | Решение |
| --- | --- |
| Deprecated встроенный OIDC provider | Использовать отдельный актуальный `@better-auth/oauth-provider` |
| Новый или неиспользуемый Better Auth/plugin endpoint становится публичным через catch-all | Versioned default-deny manifest всего handler по method + normalized pathname, effective allowlist по application configuration и обязательная повторная сверка при изменении plugin composition |
| Public OAuth routes случайно наследуют Admin GraphQL middleware или публикация общего порта раскрывает `/graphql` | Sibling encapsulated Fastify plugins на одном instance, GraphQL hooks только внутри admin scope и path-based reverse-proxy allowlist для public network |
| Plugin model leakage между applications | Явно расширить adapter и schema application scope, негативные contract-сценарии |
| Небезопасное auto-linking | `disableImplicitLinking=true` для всех providers; только стандартный authenticated `linkSocial()`, а `trustedProviders=["facebook"]` применяется исключительно при отключенном implicit linking |
| Закрытая регистрация обходится через email OTP или первый social login | Единый effective signup gate из `registration_mode`; `disableSignUp=true` в password/emailOTP/social provider options, default-deny route policy и негативные сценарии для каждого метода |
| Email verification, password reset и OTP отправляются через неверный callback/template | Три явных Better Auth callbacks, typed purpose union, server-controlled purpose → template mapping и отказ для неподдерживаемых OTP types |
| Secret leakage в runtime/logs | Encryption и redaction; административный one-time reveal относится к последующему Admin API plan |
| Signing private key попадает в database snapshot | Versioned AES-256-GCM encryption/decryption на scoped adapter boundary с application/model/row/field AAD |
| Потеря root encryption key либо неизвестная версия | Startup/request fail closed, startup key-version inventory и re-encryption runbook до удаления старой версии |
| Realm secret rotation оставляет старые sessions/token families активными | V1 revoke-and-rebuild: atomic revision/key version update, session/context/verification/token-family revoke и distributed invalidation |
| Open redirect/custom scheme abuse | Exact allowlist и отдельная mobile URI policy |
| Устаревшая factory config после изменения конфигурации | Revisioned cache key + invalidation event |
| Потеря cache invalidation event | Database revision fallback не реже 30 секунд, hard cache TTL и security-sensitive refresh/callback recheck |
| Client или admin подставляет чужой/произвольный resource либо изменение audience нарушает уже выданный grant | IAM генерирует resource только как `urn:shopana:application:{applicationId}` при создании application; поле immutable, отсутствует во входных DTO и защищено repository invariant |
| OAuth Provider выдает opaque token без audience или client меняет resource между authorize/exchange/refresh | `ApplicationOAuthResourcePolicyGuard` до `auth.handler` требует ровно один exact `application.resource` на каждом шаге и возвращает `invalid_target`; `validAudiences`, client binding и включенный JWT plugin дают дополнительные независимые слои |
| OAuth Provider поддерживает `client_credentials` по умолчанию | Глобально задать `oauthProvider.grantTypes=["authorization_code", "refresh_token"]`, дублировать ограничение в каждом v1 client, не принимать grant policy из изменяемой конфигурации и проверять discovery/отказ token endpoint contract-сценариями |
| Мгновенная ревокация JWT | Короткий access TTL + live validation/introspection для чувствительных операций |
| Email delivery adapter недоступен или не настроен | Startup закрывает зависимые routes; runtime handoff timeout 3 секунды, generic fail-closed response и alert |
| Distributed rate-limit backend недоступен | OTP/reset fail closed; authorize/token переходят на локальный tighter emergency limit |
| Смешение Application и integration apps service | Зафиксировать IAM application как auth realm и отдельный OAuth client resource |

## 24. Зафиксированные v1 решения вместо открытых вопросов

1. **Email transport:** IAM реализует обязательный `ApplicationAuthEmailDeliveryPort`. Конкретный production transport выбирается platform composition; отсутствие adapter/templates закрывает email-dependent routes при startup validation и не требует изменения IAM domain/runtime design.
2. **Mobile redirect URI:** v1 production принимает только HTTPS universal/app links. Custom schemes разрешены только client с `environment=development`, по exact URI allowlist, без wildcard; production support требует отдельного threat model и protocol-policy version.
3. **TTL policy:** defaults зафиксированы разделом 10.1. Platform ranges: access token 5–30 минут, ID token 5–60 минут, authorization code неизменяемые 5 минут, refresh token 1–30 дней, session 1–30 дней, authorization context неизменяемые 10 минут. Admin configuration может выбирать только целое значение внутри range; увеличение maximum требует versioned platform policy.
4. **Consent:** `skipConsent=true` разрешен только IAM-controlled first-party client. Все остальные clients всегда показывают consent; application default не может отключить его. Изменение trust class клиента является audited admin operation последующего Admin API plan.
5. **Hosted UI:** server-rendered UI находится в `services/iam/src/api/http/application-auth/ui`, собирается и версионируется одним артефактом IAM, обслуживается с IAM origin и не создает отдельный listener/CDN/session boundary.
6. **Realm disable:** `application_auth_configuration.realm_enabled` является единственным операционным выключателем runtime; `deleted_at` сохраняет lifecycle semantics, а `registration_mode` управляет только созданием users.
7. **Signing keys:** private JWKS key шифруется через `ApplicationAuthKeyring` на границе scoped adapter; plaintext storage не допускается после migration cutover.
8. **Realm secret rotation:** v1 использует controlled revoke-and-rebuild без dual-secret grace period согласно разделу 11.1.
9. **Public client discovery:** metadata рекламирует `none` только после executable contract-подтверждения; конкретная Storefront library не меняет standards-based IAM contract.
10. **Live validation:** единая semantics принадлежит `ApplicationTokenValidationService`; OAuth introspection и будущий межсервисный adapter являются transport bindings одного domain contract.

Таким образом, в этапе 0 остаются только проверяемые факты совместимости конкретной версии Better Auth/plugin. Ни один product/security/placement выбор не остается открытым для исполнителя.

## 25. Официальные источники

- [Better Auth OAuth Provider](https://better-auth.com/docs/plugins/oauth-provider)
- [RFC 8707: Resource Indicators for OAuth 2.0](https://www.rfc-editor.org/rfc/rfc8707.html)
- [Better Auth Email OTP](https://better-auth.com/docs/plugins/email-otp)
- [Better Auth Google](https://better-auth.com/docs/authentication/google)
- [Better Auth OAuth concepts](https://better-auth.com/docs/concepts/oauth)
- [Better Auth Users & Accounts](https://better-auth.com/docs/concepts/users-accounts)
- [Better Auth Fastify integration](https://better-auth.com/docs/integrations/fastify)
