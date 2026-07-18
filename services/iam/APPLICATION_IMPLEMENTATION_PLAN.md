# IAM Application Implementation Plan

## Статус и исходные условия

Этот документ описывает greenfield-реализацию сущности `Application` в IAM-сервисе Shopana.

Исходные условия:

- сервис не запущен в stage/production;
- существующих пользователей и пользовательских данных нет;
- перенос данных и обратная совместимость не требуются;
- OAuth 2.0, OpenID Connect и внешние клиенты не входят в scope;
- тесты и тестовая инфраструктура не входят в scope;
- Better Auth является единственным владельцем аутентификации, сессий и JWT lifecycle;
- существующая бизнес-авторизация Shopana не изменяется этим планом.

`Application` — конфигурация first-party приложения Shopana, например `admin` или `storefront`. Она определяет, с каким приложением связана Better Auth session и какие настройки Better Auth применяет к входу, сессии и JWT.

Чтобы не путать сущность с устанавливаемыми расширениями из сервиса `apps`, в TypeScript и GraphQL используется имя `IamApplication`.

---

## Термины и границы

В рамках этого плана необходимо разделять:

- **Authentication** — проверка credentials, sign-up/sign-in, session, bearer token;
- **JWT lifecycle** — payload, подпись, JWKS, выпуск и проверка токена;
- **Business authorization** — доступ к товарам, заказам, магазинам и другим ресурсам Shopana.

Первые два пункта полностью принадлежат Better Auth.

Business authorization не является частью `IamApplication`:

- роли не хранятся в Application;
- permissions не хранятся в Application;
- Application не принимает решение `allow/deny` для бизнес-операций;
- существующий RBAC проекта не заменяется;
- Better Auth `dynamicAccessControl` не требуется для реализации Application;
- изменение Casbin, role tables и authorization scripts не входит в scope.

Настройки Application следует называть `AuthenticationConfig`, а не authorization rules, чтобы не смешивать их с RBAC.

---

## Обязательный архитектурный принцип

IAM не реализует собственный authentication или JWT engine.

Допустимо:

- хранить конфигурацию `IamApplication`;
- использовать официальные Better Auth options;
- использовать Better Auth request hooks и database hooks;
- использовать Better Auth plugins;
- вызывать Better Auth server API из GraphQL adapters;
- возвращать результат Better Auth в GraphQL contract;
- читать Application config внутри официальных Better Auth callbacks.

Запрещено:

- реализовывать собственный `TokenIssuer`;
- реализовывать собственный `TokenVerifier`;
- подписывать или проверять JWT напрямую через `jose`;
- создавать собственный JWKS cache;
- создавать собственный refresh-token protocol;
- создавать отдельный claim execution engine;
- реализовывать собственные password/session algorithms;
- копировать Better Auth session lifecycle в repository;
- использовать JWT claims как замену существующей бизнес-авторизации.

GraphQL является transport adapter над Better Auth для auth/session/token операций.

---

## Распределение ответственности

| Задача | Владелец |
| --- | --- |
| Email/password sign-up и sign-in | Better Auth core |
| Password hashing и accounts | Better Auth core |
| Создание и обновление session | Better Auth core |
| Отзыв session | Better Auth session APIs |
| Внутренний refresh/reissue credential | Better Auth session token + `bearer` plugin |
| JWT payload callback | Better Auth `jwt.definePayload` |
| JWT подпись и JWKS | Better Auth `jwt` plugin |
| JWT выпуск | Better Auth `auth.api.getToken` |
| JWT verification | Better Auth `auth.api.verifyJWT` |
| Дополнительные session fields | Better Auth `session.additionalFields` |
| Application configuration persistence | IAM Application repository |
| Business authorization | Существующий RBAC, вне scope этого плана |

---

## Цели

1. Добавить first-party сущность `IamApplication`.
2. Привязать каждую Better Auth session к одному Application.
3. Разрешить Application настраивать поддерживаемые Better Auth параметры:
   - доступность sign-up и sign-in;
   - список разрешённых способов входа из зарегистрированного Better Auth method registry;
   - session TTL;
   - trusted origins;
   - JWT TTL;
   - включение поддерживаемых JWT claims;
   - namespaced static JWT claims.
4. Выпускать и проверять JWT только через Better Auth.
5. Удалить текущую ручную JWT verification.
6. Не менять бизнес-авторизацию и RBAC проекта.

## Не входит в scope

- OAuth/OIDC;
- `client_id`, `client_secret`, redirect URI, PKCE и consent;
- external applications;
- social providers;
- machine-to-machine authentication;
- API keys;
- роли и permissions;
- Casbin policies;
- resource/action catalogs;
- собственный policy DSL;
- произвольные executable JWT expressions;
- Admin frontend UI;
- миграция существующих пользователей и sessions;
- тесты.

---

## Поддерживаемые Better Auth extension points

Целевая реализация использует только официальные механизмы Better Auth:

```typescript
betterAuth({
  database: drizzleAdapter(db, { schema }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    additionalFields: {
      applicationId: {
        type: "string",
        required: true,
        input: false,
      },
      applicationKey: {
        type: "string",
        required: true,
        input: false,
      },
    },
  },
  trustedOrigins: resolveApplicationTrustedOrigins,
  hooks: {
    before: applicationRequestHook,
  },
  databaseHooks: {
    session: {
      create: {
        before: applicationSessionCreateHook,
      },
    },
  },
  plugins: [
    bearer(),
    emailOTP(IAM_EMAIL_OTP_OPTIONS),
    magicLink(IAM_MAGIC_LINK_OPTIONS),
    username(IAM_USERNAME_OPTIONS),
    phoneNumber(IAM_PHONE_NUMBER_OPTIONS),
    jwt({
      jwt: {
        issuer: IAM_ISSUER,
        audience: IAM_AUDIENCE,
        definePayload: defineApplicationJwtPayload,
      },
      jwks: IAM_JWKS_OPTIONS,
    }),
  ],
});
```

Callback-функции в примере являются адаптерами Application config к lifecycle Better Auth. Они не подписывают токены, не проверяют passwords и не принимают решения бизнес-авторизации.

Все способы входа сначала регистрируются официальными Better Auth core options/plugins. Application не загружает plugins динамически, а только включает или выключает уже зарегистрированный method.

---

## Модель данных

Все новые таблицы находятся в PostgreSQL schema `iam` и описываются через Drizzle.

### `application`

| Поле | Тип | Назначение |
| --- | --- | --- |
| `id` | `uuid` | Внутренний идентификатор |
| `key` | `varchar(64)` | Стабильный публичный идентификатор |
| `name` | `varchar(128)` | Отображаемое имя |
| `description` | `text nullable` | Назначение приложения |
| `status` | `varchar(16)` | `active` или `disabled` |
| `created_at` | `timestamptz` | Дата создания |
| `updated_at` | `timestamptz` | Дата изменения |

Ограничения:

- `key` unique и immutable;
- формат `key`: `^[a-z][a-z0-9-]{2,63}$`;
- `key` не является secret;
- неизвестное или disabled Application нельзя использовать для нового sign-in/sign-up;
- таблица не содержит credentials, session tokens, roles или permissions.

### `application_authentication_config`

One-to-one конфигурация, применяемая Better Auth hooks.

| Поле | Тип | Назначение |
| --- | --- | --- |
| `application_id` | `uuid`, PK/FK | Application |
| `sign_in_enabled` | `boolean` | Разрешён ли Better Auth sign-in |
| `sign_up_enabled` | `boolean` | Разрешён ли Better Auth sign-up |
| `session_ttl_seconds` | `integer` | `expiresAt` создаваемой Better Auth session |
| `trusted_origins` | `jsonb` | Origins для Better Auth `trustedOrigins` callback |
| `updated_at` | `timestamptz` | Дата изменения |

Ограничения:

- `sessionTtlSeconds` проверяется по серверному min/max диапазону;
- origins должны быть абсолютными URL;
- production origins используют HTTPS;
- wildcard origins запрещены по умолчанию;
- конфигурация не определяет роли, permissions или resource access.

### `application_authentication_method`

Allow-list способов входа для конкретного Application.

| Поле | Тип | Назначение |
| --- | --- | --- |
| `id` | `uuid` | Внутренний идентификатор |
| `application_id` | `uuid`, FK | Application |
| `method` | `varchar(32)` | Ключ зарегистрированного Better Auth method |
| `enabled` | `boolean` | Доступен ли method для Application |
| `created_at` | `timestamptz` | Дата создания |
| `updated_at` | `timestamptz` | Дата изменения |

Первая версия registry:

```typescript
type ApplicationAuthenticationMethod =
  | "email_password"
  | "email_otp"
  | "magic_link"
  | "username_password"
  | "phone_otp";
```

Ограничения:

- unique `(application_id, method)`;
- значение `method` должно существовать в server-side registry;
- `enabled=true` допустим только для подключённого Better Auth core option/plugin;
- строка method не содержит plugin options и не исполняется как код;
- изменение `enabled` не изменяет глобальную конфигурацию Better Auth plugin;
- таблица не хранит passwords, OTP, magic-link tokens или provider secrets.

Application создаётся вместе минимум с одним enabled method. Пустой allow-list запрещён для active Application.

### `application_jwt_config`

One-to-one конфигурация, используемая Better Auth `jwt.definePayload`.

| Поле | Тип | Назначение |
| --- | --- | --- |
| `application_id` | `uuid`, PK/FK | Application |
| `ttl_seconds` | `integer` | Значение `exp` для нового JWT |
| `include_email` | `boolean` | Включать `user.email` |
| `include_name` | `boolean` | Включать `user.name` |
| `include_email_verified` | `boolean` | Включать `user.emailVerified` |
| `include_session_id` | `boolean` | Включать `session.id` как `sid` |
| `static_claims` | `jsonb` | Namespaced scalar claims |
| `updated_at` | `timestamptz` | Дата изменения |

Ограничения:

- `ttlSeconds` проверяется по серверному min/max диапазону;
- `staticClaims` допускает только string/number/boolean;
- custom claim names должны быть namespaced;
- roles и permissions нельзя добавлять через эту конфигурацию;
- зарезервированные claims нельзя переопределить;
- размер итогового payload ограничивается.

Зарезервированные claims:

```text
iss sub aud exp iat nbf jti sid azp application_id application_key
```

### Изменение Better Auth `session`

Добавить поля через `session.additionalFields` и соответствующие Drizzle columns:

| Поле | Тип | Назначение |
| --- | --- | --- |
| `application_id` | `uuid/text not null` | Application текущей session |
| `application_key` | `varchar(64) not null` | Immutable snapshot key |

Application fields являются частью Better Auth session model. Отдельная IAM session table или session repository не создаются.

---

## Application resolution

### Better Auth method registry

IAM содержит статический registry, связывающий Application method с официальными Better Auth endpoints:

```typescript
const APPLICATION_AUTH_METHODS = {
  email_password: {
    endpoints: [
      "/sign-in/email",
      "/sign-up/email",
      "/request-password-reset",
      "/reset-password",
    ],
  },
  email_otp: {
    endpoints: [
      "/email-otp/send-verification-otp",
      "/email-otp/check-verification-otp",
      "/email-otp/verify-email",
      "/sign-in/email-otp",
      "/email-otp/request-password-reset",
      "/email-otp/reset-password",
    ],
  },
  magic_link: {
    endpoints: [
      "/sign-in/magic-link",
      "/magic-link/verify",
    ],
  },
  username_password: {
    endpoints: [
      "/sign-in/username",
      "/is-username-available",
    ],
  },
  phone_otp: {
    endpoints: [
      "/sign-in/phone-number",
      "/phone-number/send-otp",
      "/phone-number/verify",
      "/phone-number/request-password-reset",
      "/phone-number/reset-password",
    ],
  },
} as const;
```

Registry выполняет только маршрутизацию endpoint к Better Auth plugin. Он не проверяет credentials, OTP, password или magic-link token.

Правила registry:

- endpoint принадлежит ровно одному method;
- request hook проверяет method до выполнения Better Auth endpoint;
- неизвестный method/endpoint обрабатывается fail-closed для application-scoped auth flow;
- новый method добавляется только вместе с официальным Better Auth plugin и его schema;
- включение/выключение уже зарегистрированного method не требует сборки;
- добавление нового Better Auth plugin требует изменения конфигурации IAM и новой сборки.

### Входной contract

Для unauthenticated Better Auth operations Application передаётся через:

```http
X-Application-Key: admin
```

Header обязателен для:

- sign-up;
- sign-in;
- password reset request, когда эта функция будет включена;
- email verification request, когда эта функция будет включена.

### Better Auth request hook

Официальный Better Auth `hooks.before`:

1. читает `X-Application-Key`;
2. загружает Application и AuthenticationConfig;
3. отклоняет неизвестное/disabled Application через Better Auth `APIError`;
4. определяет method по Better Auth endpoint registry;
5. загружает `application_authentication_method`;
6. отклоняет endpoint, если method отключён для Application;
7. отклоняет sign-in при `signInEnabled=false`;
8. отклоняет sign-up при `signUpEnabled=false`;
9. сохраняет проверенный Application context в рамках текущего Better Auth request.

Запрещён fallback на default Application при отсутствующем или неверном header.

Этот hook не проверяет бизнес-permissions и не заменяет RBAC.

### Изменение способов входа

Изменение конфигурации выполняется атомарной заменой allow-list:

```typescript
await setApplicationAuthenticationMethods({
  applicationId,
  methods: ["email_password", "email_otp"],
});
```

После commit следующий Better Auth request использует новый список. Перезапуск не требуется, потому что меняются только строки `enabled` для уже зарегистрированных plugins.

UI может запросить публичную конфигурацию Application и показать доступные кнопки входа, но UI не является enforcement point. Тот же allow-list обязательно проверяется Better Auth request hook на сервере.

### Глобальные настройки методов

Application управляет доступностью method, но не внутренними plugin options.

Глобальными остаются:

- password min/max length;
- `requireEmailVerification`;
- email OTP length/expiry/attempts;
- magic-link expiry;
- phone OTP length/expiry/attempts;
- username validation;
- callbacks отправки email/SMS;
- token storage strategy;
- rate-limit baseline каждого plugin.

Чтобы `signUpEnabled=false` нельзя было обойти через passwordless method, первая версия использует:

```typescript
emailOTP({
  ...IAM_EMAIL_OTP_OPTIONS,
  disableSignUp: true,
});

magicLink({
  ...IAM_MAGIC_LINK_OPTIONS,
  disableSignUp: true,
});

phoneNumber({
  ...IAM_PHONE_NUMBER_OPTIONS,
  signUpOnVerification: undefined,
});
```

Создание пользователя выполняется только через Better Auth `/sign-up/email`, который контролируется Application `signUpEnabled`. Разрешение passwordless sign-up для отдельных Applications потребует официальной per-request возможности Better Auth; собственная проверка существования пользователя не добавляется.

### Session creation hook

Официальный `databaseHooks.session.create.before`:

1. получает Application context текущего Better Auth request;
2. добавляет `applicationId/applicationKey` в session data;
3. устанавливает `expiresAt` из `sessionTtlSeconds`;
4. возвращает изменённые data Better Auth;
5. не создаёт и не сохраняет session самостоятельно.

Better Auth adapter остаётся единственным владельцем persistence session.

### Trusted origins

Better Auth `trustedOrigins` callback:

1. получает текущий request;
2. определяет Application по проверенному key;
3. возвращает сохранённые origins;
4. не отключает Better Auth origin/CSRF checks;
5. использует fail-closed при неизвестном Application.

---

## Внутренняя Better Auth session и API JWT

Shopana API является JWT-based. Better Auth session не используется как credential бизнес-API.

Session необходима внутри IAM, потому что официальный Better Auth `jwt` plugin выпускает JWT через `auth.api.getToken` только для уже аутентифицированной Better Auth session. Эта session также даёт официальный механизм повторного выпуска JWT и отзыва дальнейшего доступа без собственной refresh-token реализации.

### Sign-up

```text
GraphQL input + X-Application-Key
  -> auth.api.signUpEmail
  -> Better Auth hooks.before
  -> Better Auth password/user lifecycle
  -> Better Auth databaseHooks.session.create.before
  -> Better Auth session
  -> auth.api.getToken
  -> access JWT + Better Auth session token
```

GraphQL resolver не создаёт user/session напрямую.

### Sign-in

```text
GraphQL input + X-Application-Key
  -> auth.api.signInEmail
  -> Better Auth hooks.before
  -> Better Auth credentials verification
  -> Better Auth databaseHooks.session.create.before
  -> Better Auth session
  -> auth.api.getToken
  -> access JWT + Better Auth session token
```

Auth response сохраняет текущий внешний contract:

```typescript
interface AuthTokenResult {
  accessToken: string;  // JWT from Better Auth jwt plugin
  refreshToken: string; // Better Auth session token
  expiresIn: number;
}
```

`refreshToken` здесь является именем поля API contract. IAM не генерирует отдельный refresh token: значение полностью принадлежит Better Auth session lifecycle.

### JWT-authenticated API request

Единственный credential бизнес-API:

```http
Authorization: Bearer <better-auth-jwt>
```

JWT проверяется только Better Auth:

```typescript
const result = await auth.api.verifyJWT({
  body: { token },
});
```

Request context получает `userId`, `sessionId`, `applicationId` и `applicationKey` из проверенного JWT payload.

Business resolver не вызывает `auth.api.getSession` и не принимает Better Auth session token в `Authorization` header.

После authentication существующая бизнес-авторизация Shopana выполняется своим текущим механизмом. Этот план её не меняет.

### JWT refresh/reissue

```text
refreshToken (Better Auth session token)
  -> auth.api.getSession
  -> auth.api.getToken
  -> новый access JWT
```

GraphQL `tokenRefresh` остаётся тонким adapter:

1. принимает Better Auth session token в поле `refreshToken`;
2. передаёт его в Better Auth `bearer`/session API;
3. проверяет session через `auth.api.getSession`;
4. получает новый JWT через `auth.api.getToken`;
5. не создаёт и не подписывает token самостоятельно.

### Session revoke

Использовать только Better Auth APIs:

- `auth.api.getSession`;
- `auth.api.listSessions`;
- `auth.api.revokeSession`;
- `auth.api.revokeSessions`;
- `auth.api.signOut`.

Отзыв Better Auth session запрещает дальнейший выпуск JWT. Уже выпущенный stateless access JWT действует до короткого `exp`.

---

## Better Auth JWT flow

### Выпуск

JWT получается только через Better Auth:

```typescript
const result = await auth.api.getToken({ headers });
```

Запрещено:

- импортировать `SignJWT` в IAM business code;
- читать private JWK для ручной подписи;
- создавать собственный token endpoint;
- подписывать token в repository/script;
- возвращать самостоятельно сформированный JWT.

### Payload

Claims формируются только официальным Better Auth callback `jwt.definePayload`:

```typescript
jwt({
  jwt: {
    issuer: IAM_ISSUER,
    audience: IAM_AUDIENCE,
    definePayload: async ({ user, session }) => {
      const config = await loadApplicationJwtConfig(session.applicationId);
      const now = Math.floor(Date.now() / 1000);

      return {
        sub: user.id,
        azp: session.applicationKey,
        application_id: session.applicationId,
        application_key: session.applicationKey,
        ...(config.includeSessionId ? { sid: session.id } : {}),
        ...(config.includeEmail ? { email: user.email } : {}),
        ...(config.includeName ? { name: user.name } : {}),
        ...(config.includeEmailVerified
          ? { email_verified: user.emailVerified }
          : {}),
        ...config.staticClaims,
        exp: now + config.ttlSeconds,
      };
    },
  },
});
```

`loadApplicationJwtConfig` является загрузкой конфигурации для Better Auth callback. Он не подписывает token, не проверяет token и не является отдельным claim engine.

### Issuer, audience и keys

Эти параметры являются глобальной конфигурацией Better Auth:

- `issuer`;
- `audience`;
- signing algorithm;
- JWKS storage;
- key rotation;
- grace period.

Application не может их переопределять. Это сохраняет единый Better Auth verification contract.

Application определяется claims:

- `azp`;
- `application_id`;
- `application_key`.

### Verification

JWT проверяется только через Better Auth:

```typescript
const result = await auth.api.verifyJWT({
  body: { token },
});
```

Удалить из IAM:

- прямой `jwtVerify` из `jose`;
- ручную загрузку JWKS;
- `createLocalJWKSet`;
- собственный `parseJwt`;
- собственную проверку issuer/audience;
- собственный JWKS cache.

JWT verification подтверждает identity и token integrity. Она не заменяет business authorization.

### Изменение JWT config

Изменения применяются при следующем `auth.api.getToken`.

Уже выпущенный stateless JWT действует до `exp`. Собственная blacklist/version validation не добавляется.

При disabled Application:

- Better Auth hook блокирует новые sign-in/sign-up;
- Better Auth `jwt.definePayload` отклоняет выпуск нового JWT;
- sessions отзываются официальными Better Auth APIs;
- уже выпущенный JWT действует до короткого `exp`.

---

## GraphQL API

### Общий принцип

Для auth/session/JWT операций resolver:

1. валидирует форму GraphQL input;
2. передаёт headers/body в Better Auth server API;
3. преобразует Better Auth response/error в GraphQL payload;
4. не выполняет authentication/token logic самостоятельно.

### Application queries

```graphql
type IAMApplicationQuery {
  application(id: ID!): IamApplication
  applicationByKey(key: String!): IamApplication
  applications(first: Int, after: String): IamApplicationConnection!
  publicAuthenticationConfig(key: String!): IamApplicationPublicAuthConfig
}
```

Публичная конфигурация возвращает только безопасные данные для построения формы входа:

```graphql
type IamApplicationPublicAuthConfig {
  applicationKey: String!
  signInEnabled: Boolean!
  signUpEnabled: Boolean!
  enabledMethods: [IamApplicationAuthenticationMethod!]!
}

enum IamApplicationAuthenticationMethod {
  EMAIL_PASSWORD
  EMAIL_OTP
  MAGIC_LINK
  USERNAME_PASSWORD
  PHONE_OTP
}
```

Она не возвращает plugin secrets, callbacks, JWT config или внутренние Better Auth options.

### Application mutations

```graphql
type IAMApplicationMutation {
  create(input: IamApplicationCreateInput!): IamApplicationCreatePayload!
  update(input: IamApplicationUpdateInput!): IamApplicationUpdatePayload!
  setStatus(input: IamApplicationStatusInput!): IamApplicationUpdatePayload!
  updateAuthenticationConfig(
    input: IamApplicationAuthenticationConfigInput!
  ): IamApplicationUpdatePayload!
  setAuthenticationMethods(
    input: IamApplicationAuthenticationMethodsInput!
  ): IamApplicationUpdatePayload!
  updateJwtConfig(
    input: IamApplicationJwtConfigInput!
  ): IamApplicationUpdatePayload!
}
```

`setAuthenticationMethods` атомарно заменяет allow-list:

```graphql
input IamApplicationAuthenticationMethodsInput {
  applicationId: ID!
  methods: [IamApplicationAuthenticationMethod!]!
}
```

Mutation отклоняет пустой список для active Application и method, для которого Better Auth plugin не зарегистрирован.

Application API не содержит:

- roles;
- permissions;
- authorization policies;
- token signing operations;
- token verification operations;
- custom refresh tokens.

Защита management operations использует существующий механизм IAM и не проектируется заново в этом плане.

### Auth/session/JWT mapping

| GraphQL operation | Better Auth API |
| --- | --- |
| `signUp` | `auth.api.signUpEmail` |
| `signIn` | `auth.api.signInEmail` |
| send email OTP | `auth.api.sendVerificationOTP` |
| sign in by email OTP | `auth.api.signInEmailOTP` |
| request magic link | `auth.api.signInMagicLink` |
| verify magic link | Better Auth magic-link verification endpoint |
| sign in by username | `auth.api.signInUsername` |
| send phone OTP | `auth.api.sendPhoneNumberOTP` |
| sign in by phone | `auth.api.signInPhoneNumber` |
| `signOut` | `auth.api.signOut` |
| `tokenRefresh` | `auth.api.getSession` + `auth.api.getToken` |
| issue JWT | `auth.api.getToken` |
| verify JWT | `auth.api.verifyJWT` |
| revoke refresh capability | Better Auth session revoke/sign-out API |

`tokenRefresh` сохраняется как thin adapter над Better Auth session и JWT plugins. Business API продолжает принимать только JWT.

---

## Изменения текущего IAM

### Better Auth остаётся владельцем auth lifecycle

`UserRepository` не должен оборачивать Better Auth собственной token/session реализацией.

Удалить:

- `parseJwt`;
- `verifyJwtToken`;
- `getLocalJWKS`;
- прямые импорты `jose`;
- собственный JWKS cache;
- ручное вычисление access-token expiration;
- ручную подпись JWT внутри dual-token flow.

Оставить или реализовать как тонкие adapters:

- вызов `auth.api.signUpEmail`;
- вызов `auth.api.signInEmail`;
- вызов `auth.api.getSession`;
- вызов `auth.api.getToken`;
- вызов `auth.api.verifyJWT`;
- вызов Better Auth session revoke APIs.

`auth.api.getSession` используется только внутри sign-in/refresh/revoke flow. JWT-authenticated business request использует `auth.api.verifyJWT`.

### Business authorization не изменяется

Не изменять в рамках этого плана:

- `CasbinService`;
- Casbin tables;
- organization roles;
- role hierarchy;
- `AuthorizeScript`;
- `BatchAuthorizeScript`;
- authorization cache;
- broker authorization contract;
- `@shopana/rbac`.

Application context может быть доступен в `ServiceContext`, но не участвует в RBAC до отдельного архитектурного решения.

---

## Предлагаемая структура файлов

```text
services/iam/src/
├── auth/
│   ├── auth.ts
│   ├── application-auth-methods.ts
│   ├── application-hooks.ts
│   ├── application-jwt-payload.ts
│   └── index.ts
├── repositories/
│   ├── application/
│   │   └── ApplicationRepository.ts
│   └── models/
│       └── application.ts
├── scripts/
│   └── application/
│       ├── ApplicationCreateScript.ts
│       ├── ApplicationUpdateScript.ts
│       ├── ApplicationAuthenticationConfigUpdateScript.ts
│       ├── ApplicationAuthenticationMethodsSetScript.ts
│       ├── ApplicationJwtConfigUpdateScript.ts
│       └── ApplicationStatusSetScript.ts
├── resolvers/admin/
│   ├── ApplicationResolver.ts
│   ├── ApplicationQueryResolver.ts
│   └── ApplicationMutationResolver.ts
└── api/graphql-admin/schema/
    └── application.graphql
```

Не создавать:

- `token/TokenIssuer.ts`;
- `token/TokenVerifier.ts`;
- `authorization/ApplicationAuthorizationService.ts`;
- `application_permission` table;
- `ClaimResolverRegistry`;
- новый role/permission subsystem.

---

## Этапы реализации

### Этап 1. Application schema

1. Добавить Drizzle models:
   - `application`;
   - `application_authentication_config`;
   - `application_authentication_method`;
   - `application_jwt_config`.
2. Добавить `applicationId/applicationKey` в Better Auth session schema.
3. Добавить indexes, unique и check constraints.
4. Экспортировать models из `repositories/models/index.ts`.
5. Сгенерировать Drizzle migration штатной командой проекта.
6. Не добавлять backfill или compatibility columns.

Результат: Application config и application-bound Better Auth session представлены в schema.

### Этап 2. Application repository и scripts

1. Реализовать repository только для Application config CRUD.
2. Реализовать create/update/status scripts.
3. Реализовать update AuthenticationConfig/JwtConfig scripts.
4. Реализовать атомарный `setAuthenticationMethods` script.
5. Добавить Zod validation для key, methods, TTL, origins и static claims.
6. Подключить repository к существующему IAM Repository.
7. Не добавлять role/permission operations.

Результат: Application config изменяется через валидированный transaction boundary.

### Этап 3. Better Auth hooks

1. Зарегистрировать поддерживаемые Better Auth core methods/plugins.
2. Создать статический endpoint-to-method registry.
3. Настроить `session.additionalFields`.
4. Реализовать Better Auth `hooks.before` для Application/method resolution.
5. Реализовать Better Auth `databaseHooks.session.create.before`.
6. Подключить Better Auth dynamic `trustedOrigins` callback.
7. Не создавать session и не проверять credentials напрямую.

Результат: Application config применяется внутри Better Auth lifecycle.

### Этап 4. Better Auth JWT

1. Оставить подпись, JWKS и rotation в Better Auth `jwt` plugin.
2. Реализовать application-aware `jwt.definePayload`.
3. Использовать глобальные Better Auth issuer/audience.
4. Выпускать JWT только через `auth.api.getToken`.
5. Проверять JWT только через `auth.api.verifyJWT`.
6. Удалить ручной `jose`/JWKS/token code.

Результат: JWT claims управляются Application config, а JWT lifecycle принадлежит Better Auth.

### Этап 5. GraphQL adapters

1. Добавить Application GraphQL schema.
2. Реализовать Application query/mutation resolvers.
3. Добавить public auth config query для формы входа.
4. Добавить `setAuthenticationMethods` mutation.
5. Перевести auth/session/method resolvers на Better Auth server APIs.
6. Возвращать access JWT из `auth.api.getToken` после успешного sign-in/sign-up.
7. Оставить `tokenRefresh` тонким adapter над Better Auth session + `auth.api.getToken`.
8. Не передавать Better Auth session token в business API `Authorization` header.
9. Выполнить штатный GraphQL codegen.

Результат: GraphQL предоставляет Shopana contract без дублирования Better Auth behavior.

### Этап 6. Bootstrap defaults

1. Создать системные Applications `admin` и `storefront`.
2. Определить для каждого AuthenticationConfig.
3. Определить enabled Better Auth methods для каждого Application.
4. Определить для каждого JwtConfig.
5. Выполнить idempotent upsert при bootstrap.
6. Не создавать roles/permissions/Application policies.

Результат: новая установка IAM содержит необходимые first-party Applications.

### Этап 7. Удаление legacy auth/token path

1. Удалить ручную JWT verification из `UserRepository`.
2. Заменить context JWT parsing на Better Auth `auth.api.verifyJWT`.
3. Перевести `tokenRefresh` на Better Auth `getSession/getToken` без ручной подписи.
4. Удалить неиспользуемые token helpers/cache.
5. Не изменять Casbin/RBAC code.
6. Обновить IAM документацию.
7. Собрать IAM штатной build-командой проекта.

Результат: Better Auth является единственным authentication/session/JWT engine, а RBAC остаётся независимым.

---

## Ограничения Better Auth-only подхода

Application может динамически менять только те параметры, для которых Better Auth предоставляет официальный callback/hook.

В первой версии динамически поддерживаются:

- sign-in/sign-up availability через Better Auth request hook;
- включение и выключение уже зарегистрированных Better Auth methods;
- session TTL через Better Auth session database hook;
- trusted origins через Better Auth callback;
- JWT TTL и payload через Better Auth `definePayload`.

Остаются глобальными Better Auth options:

- состав подключённых core methods/plugins;
- внутренние настройки каждого authentication method;
- `emailAndPassword.enabled`;
- issuer;
- audience;
- signing algorithm;
- JWKS configuration;
- key rotation;
- глобальный rate limiting baseline.

Если Better Auth не предоставляет официальный extension point для настройки, собственная реализация не добавляется. Функциональность остаётся глобальной или откладывается.

---

## Security invariants

1. User credentials проверяет Better Auth.
2. Authentication method исполняется только официальным Better Auth core/plugin endpoint.
3. Application method allow-list проверяется до выполнения endpoint.
4. Любую session создаёт Better Auth.
5. Session хранится через Better Auth adapter.
6. Session application fields добавляются через Better Auth `additionalFields`/hook.
7. Better Auth session token используется только для JWT reissue/revoke, но не для business API authorization.
8. Business API принимает только Better Auth JWT.
9. Любой JWT подписывает Better Auth `jwt` plugin.
10. Любой JWT проверяется Better Auth `auth.api.verifyJWT`.
11. Application не управляет signing keys/algorithm/issuer/audience.
12. Application JWT config не содержит roles или permissions.
13. JWT claims не заменяют существующую бизнес-авторизацию.
14. Собственный auth/token fallback отсутствует.
15. Неизвестное/disabled Application или disabled method приводит к отказу нового auth request.
16. Отсутствие официального Better Auth extension point не обходится собственным auth механизмом.

---

## Definition of Done

- `IamApplication` хранит только application-specific Better Auth config.
- Системные `admin` и `storefront` Applications создаются bootstrap-процессом.
- Application хранит allow-list зарегистрированных Better Auth methods.
- Allow-list проверяется server-side Better Auth request hook.
- Public auth config позволяет UI показать доступные способы входа.
- Уже зарегистрированные methods включаются/выключаются без новой сборки.
- Application context записывается в Better Auth session.
- Sign-up/sign-in/session lifecycle выполняются Better Auth.
- Business API использует только `Authorization: Bearer <JWT>`.
- Better Auth session token возвращается только как refresh/reissue credential.
- JWT выпускается `auth.api.getToken`.
- JWT проверяется `auth.api.verifyJWT`.
- JWT claims формируются только `jwt.definePayload`.
- Issuer, audience, JWKS и signing algorithm принадлежат Better Auth config.
- Роли, permissions и Casbin не изменены этим планом.
- GraphQL auth/session/token operations являются adapters над Better Auth.
- Собственные TokenIssuer, TokenVerifier и ClaimResolver отсутствуют.
- `tokenRefresh` использует Better Auth `getSession/getToken` и не подписывает JWT самостоятельно.
- Codegen и Drizzle migration выполняются штатными средствами проекта.
- IAM успешно собирается штатной build-командой проекта.
- Тесты не добавляются и не запускаются в рамках реализации.
