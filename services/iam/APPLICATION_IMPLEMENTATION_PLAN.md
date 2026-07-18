# IAM Application Implementation Plan

## Статус и исходные условия

Этот документ описывает greenfield-реализацию сущности `Application` в IAM-сервисе Shopana.

Исходные условия:

- сервис не запущен в stage/production;
- пользователей и пользовательских данных нет;
- обратная совместимость с текущим форматом JWT не требуется;
- перенос и backfill данных не требуются;
- OAuth 2.0, OpenID Connect, сторонние клиенты и social login не входят в scope;
- тесты и тестовая инфраструктура не входят в scope этого плана;
- Better Auth остаётся механизмом проверки credentials и управления сессиями;
- Casbin остаётся источником истины для пользовательских ролей и разрешений.

`Application` в этом плане — внутренняя first-party граница безопасности IAM. Она описывает, какое приложение Shopana инициировало сессию, какие возможности ему доступны, какие правила аутентификации применяются и какие claims IAM добавляет в выпущенный для него JWT.

Термин не связан с устанавливаемыми расширениями платформы из сервиса `apps`. В TypeScript-коде и GraphQL следует использовать имя `IamApplication`, чтобы избежать неоднозначности.

---

## Цели

1. Создать управляемую сущность `IamApplication` для first-party приложений, например `admin` и `storefront`.
2. Разрешить отдельно для каждого приложения настраивать:
   - правила входа и сессии;
   - максимальный набор доступных ресурсов и действий;
   - audience и время жизни access token;
   - состав встроенных и пользовательских JWT claims.
3. Привязать каждую сессию и каждый JWT к конкретному приложению.
4. Обеспечить default-deny при неизвестном, отключённом или неправильно настроенном приложении.
5. Позволить инвалидировать ранее выпущенные токены после критического изменения конфигурации.
6. Не дублировать пользовательские роли и permissions из Casbin в конфигурации приложения.

## Не входит в scope

- OAuth/OIDC endpoints и протоколы;
- `client_id`/`client_secret`, redirect URI, grant types, consent и PKCE;
- регистрация внешних приложений;
- machine-to-machine authentication;
- API keys;
- social providers;
- произвольный JavaScript для вычисления claims;
- UI в Admin frontend;
- миграция существующих пользователей, сессий или токенов;
- тесты любого уровня.

---

## Архитектурные решения

### 1. Application является first-party контекстом, а не OAuth-клиентом

Приложение идентифицируется стабильным публичным `key`, например:

- `admin`;
- `storefront`;
- `internal-tools`.

`key` не является секретом и может передаваться в GraphQL input или заголовке `X-Application-Key`. Доверие к приложению не строится на знании этого значения: безопасность обеспечивается credentials пользователя, проверкой сессии, application capability ceiling и Casbin.

### 2. Application policy ограничивает Casbin, но не расширяет его

Итоговое решение об авторизации вычисляется как пересечение:

```text
allowed = applicationAllows(request) && casbinAllows(user, request)
```

Таким образом:

- Casbin определяет, что разрешено пользователю;
- Application определяет, какие операции вообще доступны из конкретного приложения;
- Application никогда не может выдать пользователю право, отсутствующее в Casbin;
- отсутствие application rule означает запрет.

### 3. JWT configuration отделяется от authentication и authorization

У приложения должны быть независимые конфигурации:

- `ApplicationAuthenticationPolicy` — правила входа и сессии;
- `ApplicationPermission` — capability ceiling приложения;
- `ApplicationTokenProfile` — параметры JWT;
- `ApplicationClaim` — декларативные custom claims.

Не следует хранить все настройки в одном невалидируемом JSONB-поле.

### 4. Better Auth не выпускает API access token

Better Auth отвечает за:

- email/password authentication;
- password hashing;
- создание и проверку сессии;
- lifecycle сессии.

Новый `TokenIssuer` IAM отвечает за:

- загрузку Application и TokenProfile;
- вычисление effective permissions;
- построение claims;
- подпись JWT;
- применение application-specific TTL и audience.

Текущий вызов `auth.api.getToken()` необходимо удалить из основного sign-in/refresh flow. Глобальная JWT-конфигурация в `createAuth()` не должна оставаться вторым способом выпуска access token.

### 5. JWT claims описываются декларативно

Claim может получать значение только из зарегистрированного источника. Выполнение пользовательского кода запрещено.

Разрешённые источники первой версии:

- `user.id`;
- `user.email`;
- `user.name`;
- `session.id`;
- `application.id`;
- `application.key`;
- `organization.id`;
- `store.id`;
- `authorization.roles`;
- `authorization.permissions`;
- `literal` для заранее провалидированного JSON-значения.

---

## Целевая модель данных

Все таблицы находятся в PostgreSQL schema `iam` и описываются через Drizzle.

### `application`

Основная сущность и aggregate root.

| Поле | Тип | Ограничения | Назначение |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default random | Внутренний идентификатор |
| `organization_id` | `uuid nullable` | FK organization | `null` для системных приложений |
| `key` | `varchar(64)` | unique, immutable | Публичный идентификатор приложения |
| `name` | `varchar(128)` | not null | Отображаемое имя |
| `description` | `text nullable` | | Описание назначения |
| `status` | `varchar(16)` | `active`/`disabled` | Возможность создавать и использовать сессии |
| `tokens_valid_after` | `timestamptz` | not null | Отсечение ранее выпущенных JWT |
| `config_version` | `integer` | not null, default `1` | Версия конфигурации для cache invalidation |
| `created_at` | `timestamptz` | not null | Дата создания |
| `updated_at` | `timestamptz` | not null | Дата изменения |

Ограничения:

- `key` имеет формат `^[a-z][a-z0-9-]{2,63}$`;
- после создания `key` не изменяется;
- системное приложение нельзя удалить через публичный GraphQL API;
- отключённое приложение не может создавать, обновлять или использовать access token.

### `application_authentication_policy`

One-to-one конфигурация входа и сессии.

| Поле | Тип | Значение по умолчанию |
| --- | --- | --- |
| `application_id` | `uuid`, PK/FK | |
| `sign_up_enabled` | `boolean` | `false` |
| `password_enabled` | `boolean` | `true` |
| `require_email_verification` | `boolean` | `false` до появления email service |
| `session_ttl_seconds` | `integer` | `604800` |
| `session_update_age_seconds` | `integer` | `86400` |
| `max_active_sessions` | `integer nullable` | `null` |
| `organization_required` | `boolean` | зависит от приложения |
| `store_required` | `boolean` | зависит от приложения |
| `updated_at` | `timestamptz` | now |

Валидация:

- TTL задаётся в допустимом сервером диапазоне;
- `store_required=true` требует `organization_required=true`;
- нельзя выключить все поддерживаемые способы входа;
- правила применяются сервером, а не клиентским интерфейсом.

### `application_token_profile`

One-to-one профиль выпуска access token.

| Поле | Тип | Назначение |
| --- | --- | --- |
| `application_id` | `uuid`, PK/FK | Владелец профиля |
| `audience` | `varchar(128)` | Ожидаемый `aud` |
| `access_token_ttl_seconds` | `integer` | Время жизни access token |
| `include_email` | `boolean` | Добавлять email при наличии |
| `include_name` | `boolean` | Добавлять display name |
| `include_organization` | `boolean` | Добавлять organization context |
| `include_store` | `boolean` | Добавлять store context |
| `include_roles` | `boolean` | Добавлять ограниченный список ролей |
| `include_permissions` | `boolean` | Добавлять effective permissions |
| `updated_at` | `timestamptz` | Дата изменения |

Требования:

- `audience` уникален среди активных приложений;
- рекомендуемый TTL — 5–15 минут;
- размер итогового JWT ограничивается на уровне `TokenIssuer`;
- включение permissions является оптимизацией UI, а не заменой серверной проверки Casbin.

### `application_claim`

Декларативные custom claims.

| Поле | Тип | Назначение |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `application_id` | `uuid` | FK application |
| `name` | `varchar(256)` | Имя claim |
| `source` | `varchar(64)` | Зарегистрированный источник |
| `source_argument` | `jsonb nullable` | Параметр для `literal` или зарегистрированного resolver |
| `required` | `boolean` | Ошибка выпуска токена, если значение отсутствует |
| `enabled` | `boolean` | Включение правила |
| `position` | `integer` | Детерминированный порядок вычисления |
| `created_at` | `timestamptz` | Дата создания |
| `updated_at` | `timestamptz` | Дата изменения |

Ограничения:

- unique `(application_id, name)`;
- имя custom claim должно быть namespaced, например `https://shopana.io/claims/store_id`;
- зарезервированные claims нельзя создать или переопределить;
- итоговое значение проверяется на JSON-совместимый тип и лимит размера;
- secrets, password hashes, session token и внутренние credentials не являются допустимыми источниками.

Зарезервированные claims:

```text
iss sub aud exp iat nbf jti sid azp application_id application_key
```

### `application_permission`

Allow-only capability ceiling приложения.

| Поле | Тип | Назначение |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `application_id` | `uuid` | FK application |
| `domain` | `varchar(256)` | `org`, `store:*` или конкретный domain |
| `resource` | `varchar(256)` | Resource из registry IAM/RBAC |
| `action` | `varchar(64)` | Действие из resource definition |
| `created_at` | `timestamptz` | Дата создания |

Ограничения:

- unique `(application_id, domain, resource, action)`;
- разрешены только зарегистрированные resources/actions;
- wildcard разрешён только системному администратору;
- deny-правила в первой версии отсутствуют: default-deny и allow-only уменьшают неоднозначность;
- иерархия действий должна совпадать с `@shopana/rbac`.

### Изменение `session`

Поскольку данных нет, существующая session schema меняется напрямую без compatibility layer.

Добавить:

| Поле | Тип | Назначение |
| --- | --- | --- |
| `application_id` | `uuid not null` | FK application |
| `organization_id` | `uuid nullable` | Выбранная организация |
| `store_id` | `uuid/text nullable` | Выбранный магазин |
| `auth_policy_version` | `integer not null` | Policy version при создании сессии |

Refresh/session token всегда связан с одним Application. Его нельзя использовать для выпуска JWT другого приложения.

---

## JWT contract

### Обязательный payload

```json
{
  "iss": "https://iam.shopana.io",
  "sub": "user-id",
  "aud": "shopana-admin-api",
  "iat": 1784370000,
  "exp": 1784370900,
  "jti": "token-id",
  "sid": "session-id",
  "azp": "admin",
  "application_id": "application-uuid",
  "application_key": "admin",
  "config_ver": 4
}
```

Контекстные claims добавляются только при наличии и если это разрешено TokenProfile:

```json
{
  "organization_id": "organization-uuid",
  "store_id": "store-uuid",
  "roles": ["owner"],
  "permissions": ["store.products:write"]
}
```

### Правила подписи и проверки

- единый доверенный `issuer` управляется IAM config и не редактируется через Application API;
- JWT подписывается текущим приватным ключом из JWKS;
- `kid` обязателен;
- алгоритм задаётся IAM и не выбирается Application;
- verifier проверяет signature, `iss`, `aud`, `exp`, `iat`, `application_id` и status приложения;
- verifier отклоняет токен, если `iat < application.tokens_valid_after`;
- неизвестное или отключённое приложение приводит к unauthenticated context;
- `audience` берётся из сохранённого TokenProfile, а не из request header.

---

## Основные runtime-компоненты

### `ApplicationRepository`

Отвечает только за persistence:

- загрузка приложения по `id` и `key`;
- создание aggregate вместе с default policies;
- атомарное обновление AuthenticationPolicy и TokenProfile;
- CRUD claim rules и permissions;
- увеличение `configVersion` при каждом security-relevant изменении;
- обновление `tokensValidAfter` при принудительной инвалидации.

Все изменения aggregate выполняются в транзакции через существующий `TransactionManager`.

### `ApplicationResolver`

Request-scoped компонент:

1. получает application key из явно определённого источника;
2. загружает Application из cache/repository;
3. проверяет status;
4. возвращает immutable snapshot конфигурации;
5. не использует fallback application при неизвестном key.

Приоритет источников:

1. `applicationKey` в sign-in/sign-up input;
2. application, уже привязанное к session token при refresh;
3. `X-Application-Key` для authenticated API request.

Нельзя позволять заголовку переопределить Application, записанное в проверенном JWT.

### `ApplicationAuthorizationService`

Выполняет application-level проверку до Casbin:

```typescript
applicationAuthorization.authorize({
  applicationId,
  domain,
  resource,
  action,
});
```

Результат не зависит от пользователя. После него выполняется существующая проверка Casbin для user/domain/resource/action.

При изменении application permissions cache инвалидируется через `configVersion` и существующую cache infrastructure.

### `ClaimResolverRegistry`

Registry связывает строковый `source` с доверенным resolver:

```typescript
type ClaimResolver = (context: TokenContext) => unknown | Promise<unknown>;
```

Registry должен:

- содержать только resolver-ы, зарегистрированные в коде;
- валидировать входной `sourceArgument`;
- исключать `undefined` для optional claim;
- завершать выпуск ошибкой для отсутствующего required claim;
- детерминированно ограничивать массивы roles/permissions;
- вести structured log без записи значения чувствительного claim.

### `TokenIssuer`

Единственная точка выпуска IAM access token.

Алгоритм:

1. Проверить активную Better Auth session.
2. Загрузить Application, привязанное к session.
3. Проверить application status и `tokensValidAfter`.
4. Проверить обязательный organization/store context согласно AuthenticationPolicy.
5. Получить роли и effective permissions пользователя из Casbin.
6. Ограничить permissions через `ApplicationPermission`.
7. Построить стандартный payload.
8. Добавить claims, разрешённые TokenProfile.
9. Выполнить custom claim rules через `ClaimResolverRegistry`.
10. Проверить зарезервированные имена и максимальный размер payload.
11. Подписать JWT текущим JWKS key.
12. Вернуть token и фактический `expiresIn`.

### `TokenVerifier`

Заменяет application-unaware проверку JWT.

Результат:

```typescript
interface VerifiedAccessToken {
  userId: string;
  sessionId: string;
  applicationId: string;
  applicationKey: string;
  organizationId: string | null;
  storeId: string | null;
  audience: string;
  configVersion: number;
}
```

`TokenVerifier` не должен считать roles/permissions из JWT окончательным источником истины для критических серверных операций.

---

## Изменения authentication flow

### Sign up

```text
applicationKey
  -> resolve active Application
  -> verify signUpEnabled
  -> Better Auth signUp
  -> create application-bound session
  -> TokenIssuer.issue
```

`applicationKey` становится обязательным полем `UserSignUpInput`.

### Sign in

```text
applicationKey + credentials
  -> resolve active Application
  -> apply AuthenticationPolicy
  -> Better Auth signIn
  -> bind session to Application
  -> TokenIssuer.issue
```

`applicationKey` становится обязательным полем `UserSignInInput`.

### Refresh

```text
session token
  -> validate Better Auth session
  -> read applicationId from session
  -> reject disabled/invalidated Application
  -> TokenIssuer.issue for the same Application
```

Refresh input не принимает новый `applicationKey`: application switching через refresh запрещён.

### Authenticated request

```text
Bearer JWT
  -> TokenVerifier
  -> verified Application context
  -> ServiceContext
  -> ApplicationAuthorizationService
  -> Casbin
  -> resolver/script
```

Целевой `ServiceContext.currentUser`:

```typescript
interface CurrentUserContext {
  id: string;
  sessionId: string;
  applicationId: string;
  applicationKey: string;
  organizationId: string | null;
  storeId: string | null;
}
```

---

## GraphQL Admin API

### Queries

```graphql
type IAMApplicationQuery {
  application(id: ID!): IamApplication
  applications(first: Int, after: String): IamApplicationConnection!
}
```

Application type должен возвращать:

- основные данные и status;
- AuthenticationPolicy;
- TokenProfile;
- custom claims;
- application permissions;
- `configVersion` и `tokensValidAfter`.

### Mutations

```graphql
type IAMApplicationMutation {
  create(input: IamApplicationCreateInput!): IamApplicationCreatePayload!
  update(input: IamApplicationUpdateInput!): IamApplicationUpdatePayload!
  updateAuthenticationPolicy(
    input: IamApplicationAuthenticationPolicyInput!
  ): IamApplicationUpdatePayload!
  updateTokenProfile(
    input: IamApplicationTokenProfileInput!
  ): IamApplicationUpdatePayload!
  setPermissions(
    input: IamApplicationPermissionsInput!
  ): IamApplicationUpdatePayload!
  setClaims(
    input: IamApplicationClaimsInput!
  ): IamApplicationUpdatePayload!
  setStatus(input: IamApplicationStatusInput!): IamApplicationUpdatePayload!
  invalidateTokens(
    input: IamApplicationInvalidateTokensInput!
  ): IamApplicationUpdatePayload!
}
```

Правила mutations:

- bulk `setPermissions` и `setClaims` заменяют конфигурацию атомарно;
- каждая mutation валидирует aggregate целиком до записи;
- security-relevant mutation увеличивает `configVersion`;
- `invalidateTokens` обновляет `tokensValidAfter` текущим временем;
- изменения пишутся в structured audit log;
- GraphQL errors следуют существующему `userErrors` pattern.

### Авторизация управления Application

Зарегистрировать IAM resource:

```text
iam.application
```

Действия:

```text
read write admin
```

- platform admin управляет системными приложениями;
- organization owner/admin управляет приложениями своей организации;
- организация не может читать или изменять чужое приложение;
- изменение wildcard permissions требует platform admin.

---

## Cache и инвалидация

Кэшировать immutable `ApplicationConfigSnapshot`:

```text
iam:application:{applicationId}:v{configVersion}
iam:application-key:{applicationKey}
```

Требования:

- L1 cache для request path;
- L2 cache через существующий cache-manager/Keyv;
- mutation публикует invalidation event после commit;
- status и `tokensValidAfter` имеют короткий cache TTL;
- cache miss никогда не превращается в allow;
- при недоступности конфигурации используется fail-closed поведение.

---

## Предлагаемая структура файлов

```text
services/iam/src/
├── application/
│   ├── ApplicationResolver.ts
│   ├── ApplicationAuthorizationService.ts
│   ├── ApplicationConfigCache.ts
│   └── index.ts
├── token/
│   ├── TokenIssuer.ts
│   ├── TokenVerifier.ts
│   ├── ClaimResolverRegistry.ts
│   ├── claims/
│   │   ├── userClaims.ts
│   │   ├── contextClaims.ts
│   │   └── authorizationClaims.ts
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
│       ├── ApplicationPolicyUpdateScript.ts
│       ├── ApplicationClaimsSetScript.ts
│       ├── ApplicationPermissionsSetScript.ts
│       ├── ApplicationStatusSetScript.ts
│       └── ApplicationTokensInvalidateScript.ts
├── resolvers/admin/
│   ├── ApplicationResolver.ts
│   ├── ApplicationQueryResolver.ts
│   └── ApplicationMutationResolver.ts
└── api/graphql-admin/schema/
    └── application.graphql
```

---

## Этапы реализации

### Этап 1. Domain model и schema

1. Добавить Drizzle-модели:
   - `application`;
   - `application_authentication_policy`;
   - `application_token_profile`;
   - `application_claim`;
   - `application_permission`.
2. Расширить `session` application/context полями.
3. Добавить relations, indexes, unique и check constraints.
4. Экспортировать модели из `repositories/models/index.ts`.
5. Сгенерировать новую Drizzle migration штатной командой проекта.
6. Не добавлять compatibility columns и backfill.

Результат: база данных может хранить валидный Application aggregate и application-bound session.

### Этап 2. Repository и application scripts

1. Реализовать `ApplicationRepository`.
2. Подключить repository к агрегатору `Repository`.
3. Реализовать create/update/status/invalidate scripts.
4. Реализовать атомарные `setClaims` и `setPermissions`.
5. Добавить Zod validation для application key, TTL, audience, claims и permissions.
6. Добавить structured audit logging.

Результат: конфигурация Application изменяется только через валидированный transaction boundary.

### Этап 3. Token pipeline

1. Добавить `ClaimResolverRegistry`.
2. Реализовать встроенные claim resolvers.
3. Реализовать `TokenIssuer` на существующей JWKS infrastructure.
4. Реализовать `TokenVerifier` с application-aware validation.
5. Удалить глобальный выпуск access token через Better Auth JWT plugin.
6. Оставить единственный публичный путь выпуска access token через `TokenIssuer`.

Результат: JWT всегда имеет проверенный Application context и управляемый TokenProfile.

### Этап 4. Authentication и request context

1. Добавить обязательный `applicationKey` в sign-up/sign-in DTO и GraphQL inputs.
2. Применять AuthenticationPolicy до создания сессии.
3. Привязать Better Auth session к Application.
4. Запретить refresh для другого приложения.
5. Заменить текущий JWT parsing в admin context middleware на `TokenVerifier`.
6. Расширить `ServiceContext` application/organization/store полями.
7. Удалить silent fallback на глобальные issuer/audience настройки.

Результат: любой authenticated request имеет однозначно определённое активное Application.

### Этап 5. Application authorization

1. Реализовать allow-only matcher для `ApplicationPermission`.
2. Подключить проверку до Casbin enforcement.
3. Использовать те же domain/resource/action definitions, что и `@shopana/rbac`.
4. Добавить cache и version-based invalidation.
5. Обеспечить fail-closed при неизвестном resource/action или ошибке загрузки policy.

Результат: effective access является пересечением application capabilities и пользовательских прав Casbin.

### Этап 6. GraphQL management API

1. Добавить `application.graphql`.
2. Добавить generated types/schemas через штатный codegen.
3. Реализовать query/mutation resolvers и connection.
4. Подключить scripts через Kernel.
5. Зарегистрировать `iam.application` resource и действия.
6. Не добавлять Admin frontend UI в рамках этого плана.

Результат: Application, policies и claims управляются через IAM Admin GraphQL API.

### Этап 7. Bootstrap defaults и удаление legacy path

1. Создать декларативные bootstrap definitions для `admin` и `storefront`.
2. Upsert выполнять при инициализации IAM или отдельной bootstrap-командой.
3. Для `admin` включить organization context и ограниченный admin audience.
4. Для `storefront` определить минимальный allow-list ресурсов.
5. Удалить старый глобальный JWT payload path и не поддерживать dual mode.
6. Удалить неиспользуемые environment options, если issuer/audience/TTL перенесены в новый контракт.
7. Обновить внутреннюю документацию IAM.

Результат: новая установка IAM сразу имеет необходимые first-party приложения и не содержит legacy token flow.

---

## Порядок изменения конфигурации

### Обычное изменение claims

1. Сохранить новые claim rules.
2. Увеличить `configVersion`.
3. Инвалидировать config cache.
4. Применять правила ко всем новым и обновлённым access token.
5. Существующие короткоживущие JWT могут жить до `exp`.

### Критическое изменение authorization policy

1. Сохранить новый allow-list.
2. Увеличить `configVersion`.
3. Обновить `tokensValidAfter`.
4. Инвалидировать cache.
5. Отклонять JWT с более старым `iat`.
6. Применять новую application policy до Casbin.

### Отключение приложения

1. Установить `status=disabled`.
2. Обновить `tokensValidAfter`.
3. Инвалидировать cache.
4. Запретить sign-up/sign-in/refresh.
5. Отклонять ранее выпущенные JWT этого приложения.

---

## Security invariants

Реализация считается корректной только при сохранении следующих инвариантов:

1. Токен нельзя выпустить без активного Application.
2. Session token нельзя использовать для другого Application.
3. Request header не может переопределить Application из проверенного JWT.
4. Application permission может только ограничить Casbin permission.
5. Неизвестный resource/action приводит к deny.
6. Зарезервированный claim нельзя переопределить конфигурацией.
7. Application не управляет issuer, алгоритмом подписи или ключами.
8. JWT не содержит password, session token, secrets или внутренние credentials.
9. Отключённое Application не может использовать существующий access token.
10. Любое security-relevant изменение увеличивает `configVersion`.
11. Критическое изменение может немедленно отсечь старые JWT через `tokensValidAfter`.
12. Ошибка cache/repository/claim resolution не превращается в allow.

---

## Definition of Done

- Application aggregate хранится в schema `iam` и не пересекается с доменом сервиса `apps`.
- Системные `admin` и `storefront` приложения создаются декларативно.
- Sign-up/sign-in принимают обязательный application key.
- Каждая сессия связана ровно с одним Application.
- Access token выпускается только новым `TokenIssuer`.
- JWT содержит `application_id`, `application_key`, `azp`, корректный `aud` и `config_ver`.
- Request context строится только после application-aware JWT validation.
- Application capability ceiling применяется перед Casbin.
- AuthenticationPolicy, TokenProfile, claims и permissions доступны через IAM Admin GraphQL API.
- Отключение Application и `invalidateTokens` отсекают старые JWT.
- Все изменения конфигурации атомарны, валидируются и инвалидируют cache.
- Codegen и Drizzle migration выполняются штатными средствами проекта.
- IAM service успешно собирается штатной build-командой проекта.
- Тесты не добавляются и не запускаются в рамках этой реализации.
