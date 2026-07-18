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
| Bearer session token | Better Auth `bearer` plugin |
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
4. отклоняет sign-in при `signInEnabled=false`;
5. отклоняет sign-up при `signUpEnabled=false`;
6. сохраняет проверенный Application context в рамках текущего Better Auth request.

Запрещён fallback на default Application при отсутствующем или неверном header.

Этот hook не проверяет бизнес-permissions и не заменяет RBAC.

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

## Better Auth session flow

### Sign-up

```text
GraphQL input + X-Application-Key
  -> auth.api.signUpEmail
  -> Better Auth hooks.before
  -> Better Auth password/user lifecycle
  -> Better Auth databaseHooks.session.create.before
  -> Better Auth session
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
```

### Authenticated request

Основным session credential остаётся Better Auth bearer token:

```http
Authorization: Bearer <better-auth-session-token>
```

Session проверяется только через:

```typescript
const session = await auth.api.getSession({ headers });
```

Request context получает `user`, `session`, `applicationId` и `applicationKey` из результата Better Auth.

После authentication существующая бизнес-авторизация Shopana выполняется своим текущим механизмом. Этот план её не меняет.

### Session refresh и revoke

Использовать только Better Auth APIs:

- `auth.api.getSession`;
- `auth.api.listSessions`;
- `auth.api.revokeSession`;
- `auth.api.revokeSessions`;
- `auth.api.signOut`.

Собственный refresh token не создаётся. Session refresh выполняет Better Auth согласно своим `expiresIn/updateAge` правилам.

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
}
```

### Application mutations

```graphql
type IAMApplicationMutation {
  create(input: IamApplicationCreateInput!): IamApplicationCreatePayload!
  update(input: IamApplicationUpdateInput!): IamApplicationUpdatePayload!
  setStatus(input: IamApplicationStatusInput!): IamApplicationUpdatePayload!
  updateAuthenticationConfig(
    input: IamApplicationAuthenticationConfigInput!
  ): IamApplicationUpdatePayload!
  updateJwtConfig(
    input: IamApplicationJwtConfigInput!
  ): IamApplicationUpdatePayload!
}
```

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
| `signOut` | `auth.api.signOut` |
| current session | `auth.api.getSession` |
| list sessions | `auth.api.listSessions` |
| revoke session | `auth.api.revokeSession` |
| revoke own sessions | `auth.api.revokeSessions` |
| issue JWT | `auth.api.getToken` |
| verify JWT | `auth.api.verifyJWT` |

Собственная `tokenRefresh` mutation удаляется либо заменяется тонким adapter над поддерживаемым Better Auth session flow. Новый refresh-token механизм не создаётся.

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
- собственный dual-token refresh flow.

Оставить или реализовать как тонкие adapters:

- вызов `auth.api.signUpEmail`;
- вызов `auth.api.signInEmail`;
- вызов `auth.api.getSession`;
- вызов `auth.api.getToken`;
- вызов `auth.api.verifyJWT`;
- вызов Better Auth session revoke APIs.

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
4. Добавить Zod validation для key, TTL, origins и static claims.
5. Подключить repository к существующему IAM Repository.
6. Не добавлять role/permission operations.

Результат: Application config изменяется через валидированный transaction boundary.

### Этап 3. Better Auth hooks

1. Настроить `session.additionalFields`.
2. Реализовать Better Auth `hooks.before` для Application resolution.
3. Реализовать Better Auth `databaseHooks.session.create.before`.
4. Подключить Better Auth dynamic `trustedOrigins` callback.
5. Не создавать session напрямую.

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
3. Перевести auth/session resolvers на Better Auth server APIs.
4. Добавить выдачу JWT через `auth.api.getToken` при необходимости GraphQL contract.
5. Удалить собственный refresh-token flow.
6. Выполнить штатный GraphQL codegen.

Результат: GraphQL предоставляет Shopana contract без дублирования Better Auth behavior.

### Этап 6. Bootstrap defaults

1. Создать системные Applications `admin` и `storefront`.
2. Определить для каждого AuthenticationConfig.
3. Определить для каждого JwtConfig.
4. Выполнить idempotent upsert при bootstrap.
5. Не создавать roles/permissions/Application policies.

Результат: новая установка IAM содержит необходимые first-party Applications.

### Этап 7. Удаление legacy auth/token path

1. Удалить ручную JWT verification из `UserRepository`.
2. Заменить context JWT parsing на Better Auth `auth.api.verifyJWT`.
3. Удалить собственный refresh-token flow.
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
- session TTL через Better Auth session database hook;
- trusted origins через Better Auth callback;
- JWT TTL и payload через Better Auth `definePayload`.

Остаются глобальными Better Auth options:

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
2. Любую session создаёт Better Auth.
3. Session хранится через Better Auth adapter.
4. Session application fields добавляются через Better Auth `additionalFields`/hook.
5. Любой JWT подписывает Better Auth `jwt` plugin.
6. Любой JWT проверяется Better Auth `auth.api.verifyJWT`.
7. Application не управляет signing keys/algorithm/issuer/audience.
8. Application JWT config не содержит roles или permissions.
9. JWT claims не заменяют существующую бизнес-авторизацию.
10. Собственный auth/token fallback отсутствует.
11. Неизвестное/disabled Application приводит к отказу нового auth request.
12. Отсутствие официального Better Auth extension point не обходится собственным auth механизмом.

---

## Definition of Done

- `IamApplication` хранит только application-specific Better Auth config.
- Системные `admin` и `storefront` Applications создаются bootstrap-процессом.
- Application context записывается в Better Auth session.
- Sign-up/sign-in/session lifecycle выполняются Better Auth.
- JWT выпускается `auth.api.getToken`.
- JWT проверяется `auth.api.verifyJWT`.
- JWT claims формируются только `jwt.definePayload`.
- Issuer, audience, JWKS и signing algorithm принадлежат Better Auth config.
- Роли, permissions и Casbin не изменены этим планом.
- GraphQL auth/session/token operations являются adapters над Better Auth.
- Собственные TokenIssuer, TokenVerifier и ClaimResolver отсутствуют.
- Собственный refresh-token protocol отсутствует.
- Codegen и Drizzle migration выполняются штатными средствами проекта.
- IAM успешно собирается штатной build-командой проекта.
- Тесты не добавляются и не запускаются в рамках реализации.
