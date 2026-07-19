# План реализации OAuth 2.1 / OpenID Connect для `application_users` в IAM

Статус: проектный план  
Дата: 2026-07-19  
Сервис: `services/iam`  
Целевая область: аутентификация покупателей приложений (`application_users`)

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
- phone OTP/passwordless — `phoneNumber` с безопасным провайдером проверки OTP;
- Google/Facebook — встроенные `socialProviders`;
- JWT/JWKS, discovery, authorization code, PKCE, refresh token, userinfo, introspection, revocation и logout — возможности Better Auth и OAuth Provider plugin.

Хотя исходное бизнес-требование сформулировано как OAuth 2.0, для новой реализации принимается OAuth 2.1-профиль с OpenID Connect. Он сохраняет нужный Authorization Code flow, но требует PKCE и исключает небезопасные устаревшие варианты. Клиентский сценарий должен быть похож на Shopify Customer Account API: discovery → authorize → hosted login → callback с code → token exchange → refresh → end-session logout.

## 2. Цели

1. Дать каждой `iam.application` независимый пул `application_users`.
2. Позволить администраторам организации настраивать доступные способы входа без изменения кода IAM.
3. Поддержать:
   - регистрацию и вход по email/password;
   - passwordless-вход по одноразовому коду из email;
   - passwordless-вход по одноразовому коду из SMS;
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
- Dynamic Client Registration для внешних клиентов.
- wildcard redirect URI.
- Полноценный identity brokering между разными `iam.application`.
- Автоматическое объединение пользователей разных applications.
- Custom domains для issuer. Их можно добавить отдельным этапом после стабилизации канонических issuer.
- Passkeys/WebAuthn, TOTP MFA и recovery codes. Архитектура не должна мешать их добавлению позже.
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
- phone-полей и надежного phone OTP;
- механизма доставки email/SMS OTP;
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

### 5.2. Актуальный Better Auth OAuth Provider

Использовать `@better-auth/oauth-provider@1.6.23` вместе с `better-auth@1.6.23`.

Не использовать новый код на deprecated `oidcProvider` из `better-auth/plugins/oidc-provider`: Better Auth предупреждает о его удалении в следующей major-версии. Отдельный пакет уже предоставляет OAuth 2.1/OIDC endpoint, client management, consent, access/refresh token, revocation, introspection, discovery и end-session.

Версии `better-auth`, `@better-auth/core` и `@better-auth/oauth-provider` должны быть зафиксированы одинаково, без диапазона.

### 5.3. Канонический протокол — HTTP

OAuth/OIDC endpoint монтируются напрямую в Fastify. GraphQL используется только для административного управления настройками, пользователями и OAuth clients.

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

Dynamic Client Registration в первой версии выключен. OAuth client создается и меняется только организационным администратором через Admin GraphQL, а серверная операция выполняется через Better Auth admin API.

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

Фактические пути должны формироваться plugin и проверяться contract-тестами, но публичный контракт ожидается в следующем виде относительно issuer:

| Назначение | Endpoint |
| --- | --- |
| OIDC discovery | `/.well-known/openid-configuration` |
| OAuth authorization | `/oauth2/authorize` |
| Token exchange/refresh | `/oauth2/token` |
| UserInfo | `/oauth2/userinfo` |
| Token introspection | `/oauth2/introspect` |
| Token revocation | `/oauth2/revoke` |
| End session | `/oauth2/end-session` |
| JWKS | путь из discovery `jwks_uri` |
| Better Auth methods/callback | endpoint под application `basePath` |

После подключения OAuth Provider добавить `disabledPaths: ["/token"]`, чтобы не оставлять второй неоднозначный token endpoint Better Auth.

### 6.3. Fastify integration

Добавить catch-all handler под `/auth/applications/:applicationId/*`, который:

1. валидирует UUID;
2. загружает активную application и ее активную organization;
3. получает instance из `ApplicationAuthFactory`;
4. преобразует Fastify request в стандартный Fetch API `Request`;
5. передает его в `auth.handler`;
6. корректно переносит status, headers и body в Fastify reply.

Handler обязан сохранять:

- query string без повторного декодирования;
- JSON и `application/x-www-form-urlencoded` body;
- все `Set-Cookie`, включая несколько заголовков;
- redirect location;
- client IP только из доверенной proxy chain;
- исходный HTTP method;
- отсутствие общего CORS `*`.

Allowed origins берутся из application configuration и сопоставляются точным origin. Redirect URI проверяет OAuth Provider plugin по точному зарегистрированному URI.

## 7. Целевой пользовательский flow

### 7.1. Authorization Code + PKCE

1. Storefront получает discovery document application issuer.
2. Клиент генерирует `state`, `nonce`, `code_verifier` и `code_challenge=S256`.
3. Браузер переходит на `/oauth2/authorize` с:
   - `client_id`;
   - точным `redirect_uri`;
   - `response_type=code`;
   - `scope=openid profile email offline_access customer-account-api:full`;
   - `state`;
   - `nonce`;
   - `code_challenge`;
   - `code_challenge_method=S256`.
4. IAM проверяет OAuth client и сохраняет authorization context.
5. Если application-сессии нет, IAM показывает hosted login UI.
6. Пользователь выбирает разрешенный application способ входа.
7. Better Auth создает/проверяет `application_user`, account и session.
8. Для доверенного first-party client consent может быть заранее разрешен серверным флагом `skipConsent`; для остальных показывается consent page.
9. IAM возвращает одноразовый authorization code на зарегистрированный callback вместе со `state`.
10. Клиент проверяет `state` и обменивает code + `code_verifier` на token.
11. Клиент проверяет ID token: signature, `iss`, `aud`, `exp`, `nonce`.
12. Access token отправляется в Storefront API как bearer token.
13. Refresh token используется только через `/oauth2/token`; rotation/revocation контролирует plugin.

PKCE нельзя отключать. Для browser/mobile client используется public client с `token_endpoint_auth_method=none`. Для server-side client используется confidential client, PKCE и client authentication.

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
- `registrationMode`: `open | invite_only | disabled`.

### 8.2. Email OTP/passwordless

Использовать `emailOTP`:

- 6 цифр;
- TTL 5 минут;
- максимум 3 проверки;
- новый запрос ротирует предыдущий код;
- хранение OTP — `hashed`;
- ответ отправки всегда обобщенный, независимо от существования пользователя;
- отправка выполняется асинхронно после безопасной постановки в delivery outbox;
- email OTP нельзя отправлять на synthetic email phone-only пользователя.

Администратор может включать email OTP signin/signup и настраивать утвержденный email delivery profile, но не произвольный executable template.

### 8.3. Phone OTP/passwordless

Использовать `phoneNumber` plugin для endpoint, user lifecycle и session integration. Номер хранится только в каноническом E.164 после проверки.

Критическая оговорка: стандартная локальная реализация phone plugin сохраняет код в verification value в форме, неприемлемой для production plaintext storage. Перед production rollout обязателен security spike и один из вариантов:

1. рекомендуемый — внешний Verify-провайдер, который генерирует и проверяет код, а IAM хранит только opaque verification reference;
2. допустимый резервный — собственная Better Auth-compatible verification реализация с шифрованием/хешированием OTP и атомарным счетчиком попыток.

Нельзя выпускать production phone OTP, пока в БД или логах может появиться открытый код.

Параметры:

- TTL 5 минут;
- не более 3 попыток;
- resend cooldown 60 секунд;
- rate limits по application + normalized phone hash + IP;
- generic response;
- блокировка повторного использования;
- подтвержденный delivery status не означает подтверждение номера — подтверждается только правильный OTP.

Better Auth требует email в user model. Для phone-only пользователя создавать synthetic email:

```text
{base32(HMAC(applicationId + E164))[0..31]}@phone.invalid
```

Требования к synthetic email:

- не содержит исходный номер;
- отмечен `emailSynthetic=true`;
- не возвращается в `email` OIDC claim;
- на него нельзя отправлять email OTP или reset password;
- заменяется на реальный email только после его подтверждения;
- не используется для автоматического account linking.

### 8.4. Google и Facebook

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
- synthetic email никогда не участвует в email-based linking.

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
| `registration_mode` | `open`, `invite_only`, `disabled` |
| `password_sign_up_enabled` | регистрация password |
| `password_sign_in_enabled` | вход password |
| `email_verification_required` | обязательная проверка email |
| `email_otp_enabled` | email passwordless |
| `phone_otp_enabled` | phone passwordless |
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

### 10.4. OTP delivery configuration

Не хранить произвольные SMTP/SMS secrets в обычном JSON. Ввести:

- `application_auth_delivery_profile` — ссылка на разрешенный email/SMS transport, sender identity и template id;
- секреты transport — только в secrets backend;
- шаблоны — versioned/validated, без executable code;
- outbox/event для доставки с idempotency key.

Если platform-wide transport достаточен для v1, application хранит только sender/template selection из allowlist.

### 10.5. Расширение `application_user`

Добавить Better Auth-compatible поля:

- `phone_number` nullable;
- `phone_number_verified` boolean;
- `email_synthetic` boolean;
- при необходимости `last_authenticated_at` как IAM-owned operational field.

Индексы:

- unique real/synthetic email внутри application согласно Better Auth normalization;
- partial unique `(application_id, phone_number)` where phone number is not null;
- все lookup индексы начинаются с `application_id`.

### 10.6. OAuth Provider plugin models

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

### 10.7. OAuth client metadata

Помимо plugin fields хранить контролируемую IAM metadata:

- `application_id`;
- `client_id`;
- `store_id` или другой resource binding;
- `environment`: `development | production`;
- `created_by`, `updated_by`;
- `created_at`, `updated_at`;
- `deleted_at`/disabled state.

`store_id` проверяется через внутренний Project service action: Store и application должны принадлежать одной организации. Межсервисный FK не создается.

## 11. Better Auth instance для application

`createApplicationAuth` должен собирать instance только из валидированной конфигурации и включать:

```text
emailAndPassword
socialProviders.google/facebook
plugins: jwt, emailOTP, phoneNumber, oauthProvider
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
- обновить разрешенные auth methods и policy;
- получить issuer, discovery URL и рассчитанные provider callback URLs;
- управлять trusted origins;
- обновить branding/localization.

Mutation обновления принимает ожидаемую `revision` для optimistic concurrency.

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

- list/get clients;
- create public/confidential client;
- update name, redirect URIs, post-logout URIs и store binding;
- disable/enable client;
- rotate confidential client secret;
- delete/archive client;
- управлять `skipConsent` только для first-party clients.

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
- phone OTP request/verify;
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
- `phone_number`/`phone_number_verified` только при отдельном scope и policy.

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

Не помещать в token:

- Casbin admin roles;
- password/account/provider tokens;
- synthetic email;
- Customer profile snapshot;
- произвольные admin-configured claims.

### 14.2. Scopes

Первая версия:

- `openid`;
- `profile`;
- `email`;
- `phone` при явной необходимости;
- `offline_access`;
- `customer-account-api:full` как resource scope.

Начать с малого утвержденного scope registry. Администратор может выбирать только разрешенные scopes, но не создавать исполняемую claim mapping логику.

### 14.3. Проверка в Storefront API

Storefront/Gateway обязан проверять:

- подпись по JWKS и допустимый алгоритм;
- точный `iss`;
- `aud`/resource;
- `exp`, `nbf`, `iat` с небольшим clock skew;
- `scope`;
- `application_id` и `store_id` из trusted routing context;
- `actor_type`;
- актуальное состояние application/user/session для чувствительных операций.

Для обычных запросов короткий JWT access token допускает локальную cryptographic verification. Для операций с повышенным риском и после block/revoke использовать IAM validation action или introspection с live checks. Результаты live validation кэшировать только на очень короткий срок и инвалидировать событиями.

Opaque access token, если будет выбран plugin configuration, всегда проверяется через introspection. Формат token не должен определяться клиентом.

## 15. Связь с Customers service

IAM владеет identity/security данными. Customers владеет business profile. Между таблицами нет cross-service FK.

После первого успешного создания/входа пользователя нужен идемпотентный процесс связывания:

1. IAM устанавливает `applicationId`, `applicationUserId` и trusted `storeId` из OAuth client metadata.
2. Публикуется versioned event либо вызывается внутренняя idempotent action `ensureCustomerForApplicationUser`.
3. Customers создает или находит Customer по `(storeId, iamPrincipalId)`.
4. `customer.iam_principal_id` указывает на application user id как внешний reference.
5. Проверенные email/phone проецируются в Customers только событием, без передачи credentials.

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

## 17. Доставка OTP и operational flow

Ввести единый `ApplicationAuthDeliveryService`:

```text
enqueueEmailOtp(applicationId, normalizedRecipient, purpose, otp/reference)
enqueuePhoneOtp(applicationId, normalizedRecipient, purpose, verificationReference)
enqueuePasswordReset(...)
enqueueEmailVerification(...)
```

Сервис:

- загружает разрешенный delivery profile;
- создает idempotency key;
- записывает outbox в той же транзакции, где это возможно;
- маскирует recipient в логах;
- не логирует OTP/link token;
- ограничивает retry и отправляет exhausted delivery в operational dead-letter state;
- публикует метрики без high-cardinality PII labels.

User-facing response не ждет фактической отправки и не различает `user_not_found`, `provider_failed` и `sent`.

## 18. Rate limits и защита от злоупотреблений

Минимальные отдельные policies:

| Операция | Ключи ограничения |
| --- | --- |
| Password signin | application + normalized email hash + IP |
| Email OTP request | application + email hash + IP/device |
| Email OTP verify | application + verification id + IP |
| Phone OTP request | application + phone hash + IP/device |
| Phone OTP verify | application + verification id + IP |
| OAuth authorize | application + client + IP |
| Token endpoint | application + client + IP |
| Password reset | application + email hash + IP |

Точные числа определить нагрузочным/security review, но обязателен layered limit: короткое окно, суточный budget и provider cost budget для SMS.

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
- OTP delivery latency/failure;
- token refresh/revoke;
- rate-limit count;
- provider callback failure;
- adapter cross-scope rejection;
- outbox lag.

Не использовать raw user ID, email, phone, token, code, client secret или provider response как metric label.

## 20. Этапы реализации

### Этап 0. Compatibility и security spike

Задачи:

1. Добавить exact dependency `@better-auth/oauth-provider@1.6.23`.
2. Зафиксировать generated schema и endpoint paths установленной версии.
3. Подтвердить Fastify integration, path-prefixed issuer и multi-cookie responses.
4. Проверить возможность application scoping всех plugin models через текущий adapter.
5. Проверить custom claims/store binding.
6. Выбрать безопасную стратегию phone OTP без plaintext storage.
7. Зафиксировать public/confidential client behavior и secret one-time return.

Результат:

- короткий ADR с выбранным plugin и отклонением deprecated `oidcProvider`;
- подтвержденная схема таблиц;
- список точных endpoint;
- закрытый phone OTP security decision.

Критерий выхода: нет неизвестных, требующих самописного OAuth server или небезопасного хранения OTP.

### Этап 1. Схема, конфигурация и secrets

Задачи:

1. Создать миграции application auth config/origins/providers/delivery metadata.
2. Расширить `application_user` phone/synthetic fields.
3. Добавить OAuth Provider plugin tables с `application_id`.
4. Добавить индексы, tenant constraints и cleanup behavior.
5. Реализовать encryption service для provider credentials.
6. Реализовать HKDF realm secret derivation/versioning.
7. Добавить repository и Zod schemas для configuration.

Критерий выхода: конфигурация и secrets изолированы по application, а secret не читается обратно через публичный API.

### Этап 2. Application-scoped Better Auth factory

Задачи:

1. Расширить adapter plugin models.
2. Собирать plugins согласно application settings.
3. Добавить account token encryption/linking policy.
4. Добавить OAuth scopes/audiences/claims policy.
5. Добавить revision-aware cache invalidation.
6. Проверять active organization/application перед созданием instance.

Критерий выхода: два application одновременно используют разные users, clients, keys, cookies и providers без пересечения.

### Этап 3. Публичный HTTP OAuth/OIDC слой

Задачи:

1. Реализовать Fastify catch-all route.
2. Настроить canonical public base URL/proxy handling.
3. Экспонировать discovery/JWKS/authorize/token/userinfo/introspection/revoke/end-session.
4. Отключить конфликтующий `/token` Better Auth path.
5. Реализовать exact CORS/trusted origins.
6. Добавить structured errors/request IDs без утечки данных.

Критерий выхода: стандартный OIDC client проходит discovery и Authorization Code + PKCE flow.

### Этап 4. Admin GraphQL

Задачи:

1. Application CRUD/list/read.
2. Auth settings/origins/branding.
3. Provider credentials/status.
4. OAuth clients и one-time secret rotation.
5. Application user security actions.
6. Casbin permissions и audit events.
7. Store ownership validation через internal action.

Критерий выхода: organization admin может полностью настроить realm без DB/manual config, но не может прочитать secrets.

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

1. Подключить `emailOTP` с hashed OTP.
2. Создать delivery outbox/transport abstraction.
3. Добавить request/verify UI.
4. Реализовать generic responses, resend cooldown и attempt limits.
5. Запретить synthetic recipient.

Критерий выхода: email passwordless работает без plaintext OTP, enumeration и повторного использования.

### Этап 7. Phone OTP

Задачи:

1. Подключить `phoneNumber` plugin.
2. Реализовать выбранный secure verify provider/custom verification.
3. Нормализовать E.164.
4. Реализовать synthetic email lifecycle.
5. Добавить SMS budget/rate limits и delivery telemetry.

Критерий выхода: phone-only signup/signin работает, открытый OTP нигде не сохраняется и не логируется.

### Этап 8. Google/Facebook и account linking

Задачи:

1. Подключить per-application socialProviders.
2. Добавить callback URL/status в Admin API.
3. Включить upstream OAuth token encryption.
4. Реализовать строгую linking policy.
5. Обработать provider без email и конфликт account.
6. Добавить link/unlink UI/API и аудит.

Критерий выхода: providers не могут связать account между applications или по неподтвержденному/synthetic email.

### Этап 9. Storefront API и Customers integration

Задачи:

1. Добавить JWT/JWKS validator и live validation path.
2. Ввести trusted auth context `application_user`.
3. Проверять application/store binding и scopes.
4. Реализовать идемпотентный Customer ensure/projection.
5. Обработать block/revoke/config disable events.

Критерий выхода: Storefront принимает только token правильного issuer/client/store, а Customer создается/связывается идемпотентно.

### Этап 10. Hardening и rollout

Задачи:

1. Threat model review.
2. Security/contract/e2e scenarios.
3. Нагрузочная проверка authorize/token/OTP limits.
4. Signing/provider/client secret rotation runbooks.
5. Dashboards/alerts/audit retention.
6. Feature flags per application/method.
7. Документация интеграции storefront SDK/client.

Критерий выхода: выполнен Definition of Done и есть rollback/disable процедура без удаления users.

## 21. Предполагаемые изменения файлов

Точная структура уточняется после compatibility spike, но ожидаются:

```text
services/iam/package.json
services/iam/src/auth/auth.ts
services/iam/src/auth/ApplicationAuthFactory.ts
services/iam/src/auth/scopedDrizzleAdapter.ts
services/iam/src/auth/applicationAuthConfiguration.ts
services/iam/src/auth/applicationOAuthClaims.ts
services/iam/src/api/http/application-auth/*
services/iam/src/api/graphql-admin/application/*
services/iam/src/repositories/models/application-auth.ts
services/iam/src/repositories/models/authorization.ts
services/iam/src/repositories/ApplicationAuthConfigurationRepository.ts
services/iam/src/repositories/ApplicationOAuthClientRepository.ts
services/iam/src/services/ApplicationAuthDeliveryService.ts
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

- discovery возвращает issuer и endpoint текущей application;
- JWKS валидирует выданный ID/access token;
- public client + S256 PKCE проходит flow;
- confidential client проходит flow с client authentication и PKCE;
- отсутствующий/неверный verifier отклоняется;
- повторное использование code отклоняется;
- неверные state/nonce обнаруживаются клиентом/flow;
- refresh rotation работает, старый refresh token не переиспользуется;
- revoke прекращает refresh;
- end-session принимает только зарегистрированный post-logout URI;
- disabled client/application/organization отклоняются;
- неизвестный scope/audience отклоняется.

### 22.2. Tenant isolation

- client application A не авторизуется через issuer B;
- user/session/account/token/consent A не читается adapter B;
- одинаковый email допустим в A и B как разные users;
- Google/Facebook account A не связывается в B;
- OTP A не проверяется в B;
- signing key A не используется issuer B;
- admin organization A не меняет application B;
- Store организации A нельзя привязать к OAuth client organization B.

### 22.3. Password/email OTP/phone OTP

- разрешенные signup/signin работают;
- выключенный method недоступен и в UI, и прямым HTTP вызовом;
- registration disabled/invite-only enforced server-side;
- generic response одинаков для существующего/несуществующего email/phone;
- OTP истекает, ротируется, имеет limit и одноразовый;
- email OTP хранится hashed;
- phone OTP не хранится plaintext;
- synthetic email не возвращается в claim и не получает email;
- блокировка user отзывает sessions и запрещает новый signin;
- password reset не работает через synthetic email.

### 22.4. Social/linking

- Google/Facebook callback привязан к правильной application;
- disabled/misconfigured provider закрыт безопасно;
- provider secrets/tokens отсутствуют в GraphQL/logs/errors;
- verified same-email linking следует policy;
- unverified/different/synthetic email не auto-links;
- нельзя unlink последний login method;
- provider account уже другого user вызывает конфликт, а не merge.

### 22.5. Admin и Storefront

- secret OAuth client показывается один раз;
- rotation инвалидирует старый secret;
- config revision предотвращает lost update;
- factory перестраивается после config change;
- Storefront отклоняет неверный issuer/audience/store/scope/actor;
- block/revoke отражается в live validation;
- Customer ensure идемпотентен при retry/duplicate event;
- недоступность Customers не ломает token endpoint.

### 22.6. Web security

- wildcard/open redirect отсутствует;
- untrusted Host не меняет issuer/callback;
- CSRF form request отклоняется;
- cookies имеют ожидаемые Secure/HttpOnly/SameSite/path attributes;
- несколько `Set-Cookie` не схлопываются Fastify adapter;
- CORS разрешает только точный configured origin;
- rate limit работает по application/identity/IP;
- PII/secrets отсутствуют в logs/traces/metrics.

## 23. Rollout

Так как проект не имеет production users/data, допустимо ввести чистую целевую схему без миграции legacy application OAuth tokens. При этом rollout должен быть обратимым на уровне feature flags:

1. развернуть таблицы и код с methods выключенными;
2. создать internal development application и OAuth client;
3. включить password flow;
4. включить email OTP после delivery readiness;
5. включить Google/Facebook по одному provider;
6. включить phone OTP только после security gate;
7. подключить Storefront validator и Customer projection;
8. включать production-configured applications индивидуально.

Откат method означает disable method/client/provider и отзыв активных сессий/tokens при необходимости, а не удаление пользователей или credentials без отдельной операции.

## 24. Security checklist перед релизом

- [ ] Используется актуальный `@better-auth/oauth-provider`, а не deprecated provider.
- [ ] Authorization Code + S256 PKCE обязателен.
- [ ] Implicit/password grants отсутствуют.
- [ ] Dynamic Client Registration выключен.
- [ ] Redirect/post-logout URI проверяются точным совпадением.
- [ ] Issuer строится из server config, не request Host.
- [ ] Все OAuth plugin модели application-scoped.
- [ ] Organization/application/client/user/session live state проверяется.
- [ ] Provider credentials зашифрованы с versioned key/AAD.
- [ ] Upstream OAuth tokens зашифрованы.
- [ ] OAuth client secret нельзя прочитать повторно.
- [ ] Email OTP хранится hashed.
- [ ] Phone OTP не хранится plaintext.
- [ ] Synthetic email не раскрывается и не участвует в linking.
- [ ] State, nonce, CSRF, cookie policies проверены.
- [ ] Generic responses защищают от enumeration.
- [ ] Rate limits и SMS cost limits включены.
- [ ] Логи/трейсы/метрики не содержат PII/secrets/tokens/codes.
- [ ] Signing/client/provider secret rotation описана и проверена.
- [ ] Customer projection идемпотентна.
- [ ] Audit log покрывает все admin/security mutations.

## 25. Definition of Done

Решение считается готовым, когда:

1. Каждая application имеет отдельный issuer, users, sessions, providers, OAuth clients, tokens, consents и keys.
2. Organization admin управляет настройками через Admin API с Casbin и audit trail.
3. Public и confidential clients проходят стандартный OIDC Authorization Code + PKCE flow.
4. Password, email OTP, phone OTP, Google и Facebook можно независимо включать на application.
5. Phone OTP не хранит открытый код; email OTP хранится hashed.
6. Account linking не пересекает applications и не доверяет synthetic/unverified email.
7. Storefront проверяет token и trusted store binding.
8. Customers получает идемпотентную проекцию identity без credentials.
9. Block/revoke/disable действуют на live validation и refresh lifecycle.
10. Все негативные tenant/security сценарии подтверждены targeted проверками.
11. Есть документация для storefront client, organization admin и operations.
12. Есть runbooks для signing keys, provider/client secrets, delivery outage и emergency realm disable.

## 26. Риски и решения

| Риск | Решение |
| --- | --- |
| Deprecated встроенный OIDC provider | Использовать отдельный актуальный `@better-auth/oauth-provider` |
| Plugin model leakage между applications | Явно расширить adapter и schema application scope, негативные contract-сценарии |
| Plaintext phone OTP | External Verify/custom secure verification как обязательный release gate |
| Better Auth требует email для phone-only user | Неперсональный HMAC synthetic email + отдельный flag/policy |
| Небезопасное auto-linking | Только реальный verified same-email или explicit authenticated linking |
| Secret leakage в admin/logs | Encryption, one-time reveal, redaction и audit без value |
| Open redirect/custom scheme abuse | Exact allowlist и отдельная mobile URI policy |
| Устаревшая factory config после admin update | Revisioned cache key + invalidation event |
| Мгновенная ревокация JWT | Короткий access TTL + live validation/introspection для чувствительных операций |
| Customers временно недоступен | Outbox/retry/idempotent ensure, не блокировать token endpoint |
| Смешение Application и integration apps service | Зафиксировать IAM application как auth realm и отдельный OAuth client resource |

## 27. Вопросы, которые нужно закрыть в этапе 0

Эти решения не меняют основную архитектуру, но должны быть зафиксированы до реализации соответствующего этапа:

1. Какой production SMS Verify provider используется и где хранится его credential?
2. Какой email transport/template service является platform default?
3. Нужны ли custom mobile URI schemes в первой версии или достаточно universal/app links?
4. Какой exact resource audience будет использовать Storefront API?
5. Какие TTL ranges организация может менять, а какие остаются platform policy?
6. Нужен ли consent screen для всех third-party clients уже в первой версии?
7. Где размещается hosted UI bundle и как он версионируется вместе с IAM?
8. Достаточен ли event-driven Customer ensure или первый Customer-bound request должен делать синхронный ensure?

До получения ответов применяются безопасные значения этого плана: platform delivery profiles, HTTPS/universal links, фиксированный Storefront audience, короткие TTL, consent для не-first-party clients и асинхронная Customer projection с idempotent fallback.

## 28. Официальные источники

- [Better Auth OAuth Provider](https://better-auth.com/docs/plugins/oauth-provider)
- [Better Auth Email OTP](https://better-auth.com/docs/plugins/email-otp)
- [Better Auth Phone Number](https://better-auth.com/docs/plugins/phone-number)
- [Better Auth Google](https://better-auth.com/docs/authentication/google)
- [Better Auth OAuth concepts](https://better-auth.com/docs/concepts/oauth)
- [Better Auth Users & Accounts](https://better-auth.com/docs/concepts/users-accounts)
- [Better Auth Fastify integration](https://better-auth.com/docs/integrations/fastify)
- [Shopify Customer Account API](https://shopify.dev/docs/api/customer/latest)
- [Shopify Customer Account API authentication](https://shopify.dev/docs/api/customer-authentication)
