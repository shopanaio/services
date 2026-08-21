# План реализации API управления OAuth clients в IAM

Статус: проектный план  
Дата: 2026-07-19  
Сервис: `services/iam`  
Целевая область: административное создание и управление OAuth clients для application realms

Связанные документы:

- [План OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md);
- [Последующий общий план Admin API для application auth](./application-auth-admin-api-implementation-plan.ru.md);
- [Compatibility и security spike OAuth Provider 1.6.23](./application-users-oauth-oidc-compatibility-spike.ru.md).

Этот документ является детализированным подпланом OAuth client management внутри общего Admin API
plan. Он выполняется после завершения OAuth/OIDC runtime plan, а не как его фаза.

## 1. Цель

Создать внутренний API управления OAuth clients, который:

- аутентифицирует администратора через platform Better Auth session;
- авторизует операцию через Casbin и проверяет принадлежность organization/application;
- создает и изменяет OAuth Provider-совместимые записи в application realm;
- не требует `application_user` session;
- не имперсонирует покупателя и не создает технического application user;
- не публикует Better Auth client-management endpoints в application HTTP realm;
- сохраняет совместимость с `@better-auth/oauth-provider@1.6.23` для authorize, token, refresh,
  consent, revocation и logout flows.

API предоставляется через Admin GraphQL. Внутри IAM его реализует
`ApplicationOAuthClientManagementService`, работающий через application-scoped repository и
транзакции.

## 2. Основание в документации Better Auth

Официальная документация OAuth Provider:

- [Create Client](https://www.better-auth.com/docs/plugins/oauth-provider#create-client) — создание
  public/confidential client и использование `token_endpoint_auth_method`;
- [создание clients через custom APIs, company admin portals или server initialization](https://www.better-auth.com/docs/plugins/oauth-provider#create-client)
  — назначение server-only `adminCreateOAuthClient` для restricted fields;
- [Update Client](https://www.better-auth.com/docs/plugins/oauth-provider#update-client) —
  ограничения изменения типа клиента и client secret;
- [Rotate Client Secret](https://www.better-auth.com/docs/plugins/oauth-provider#rotate-client-secret)
  — немедленная ротация и инвалидация предыдущего secret;
- [Delete Client](https://www.better-auth.com/docs/plugins/oauth-provider#delete-client) — удаление
  client владельцем;
- [Organizations](https://www.better-auth.com/docs/plugins/oauth-provider#organizations) — привязка
  client к user или immutable `reference_id` из активной сессии;
- [Client CRUD Privileges](https://www.better-auth.com/docs/plugins/oauth-provider#client-crud-privileges)
  — permission callback для уже аутентифицированного пользователя;
- [Storage](https://www.better-auth.com/docs/plugins/oauth-provider#storage) — хранение client
  secrets в hashed виде по умолчанию;
- [OAuth Client schema](https://www.better-auth.com/docs/plugins/oauth-provider#oauth-client) — поля
  plugin-модели `oauthClient`;
- [Dynamic Registration Endpoint](https://www.better-auth.com/docs/plugins/oauth-provider#dynamic-registration-endpoint)
  — альтернативная динамическая регистрация согласно RFC 7591.

Документация рекомендует server-only endpoint для custom admin portals, но пример передает
`headers`. Compatibility spike версии `1.6.23` подтвердил, что `adminCreateOAuthClient` и
`adminUpdateOAuthClient` без сессии того же Better Auth instance возвращают `401`. Server-only
означает отсутствие публичного HTTP route, но не sessionless service authorization.

В Shopana platform admin и application user обслуживаются разными Better Auth instances и adapters.
Поэтому platform session используется на внешней границе Admin GraphQL, а plugin-compatible
persistence выполняется внутренним IAM service.

## 3. Решение

### 3.1. Граница авторизации

```text
Admin client
  -> Admin GraphQL
  -> platform Better Auth session validation
  -> trusted admin actor + client-provided organizationId
  -> Casbin permission check
  -> application/organization ownership check
  -> ApplicationOAuthClientManagementService
  -> application-scoped transaction/repository
  -> oauthClient + IAM client metadata
```

Platform session не передается в `applicationAuth.api.adminCreateOAuthClient`, потому что
application Better Auth instance ищет сессию в `application_session` и связывает ее с
`application_user`.

`organizationId` приходит в Admin GraphQL input/arguments согласно существующему IAM contract; этот
контракт не меняется в рамках плана. `organizationId` является client-provided tenant selector, а не
trusted context. Trusted actor берется только из валидированной platform session; доступ проверяется
через Casbin и ownership predicate по `applicationId + organizationId`.

### 3.2. Почему не используются альтернативы

Не использовать:

- технического `application_user` и искусственную application session;
- impersonation platform admin как application user;
- перенос OAuth Provider в platform Better Auth instance;
- `allowUnauthenticatedClientRegistration`;
- публичные `/oauth2/create-client`, `/oauth2/get-client`, `/oauth2/get-clients`,
  `/oauth2/update-client`, `/oauth2/delete-client`, `/oauth2/client/rotate-secret`;
- прямой GraphQL input для plugin metadata, grants, response types или resource audience.

Dynamic Client Registration остается выключен. Документация Better Auth указывает, что
unauthenticated registration предназначена для public clients; она не заменяет организационную
авторизацию, Casbin, application ownership и trusted restricted fields.

## 4. Внешний Admin GraphQL контракт

### 4.1. Queries

```graphql
type ApplicationOAuthClient {
  id: ID!
  organizationId: ID!
  applicationId: ID!
  clientId: String!
  name: String!
  clientType: ApplicationOAuthClientType!
  environment: ApplicationOAuthClientEnvironment!
  redirectUris: [String!]!
  postLogoutRedirectUris: [String!]!
  resources: [String!]!
  grantTypes: [String!]!
  responseTypes: [String!]!
  requirePkce: Boolean!
  skipConsent: Boolean!
  enableEndSession: Boolean!
  disabled: Boolean!
  revision: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: ID!
  updatedBy: ID!
}

enum ApplicationOAuthClientType {
  PUBLIC
  CONFIDENTIAL
}

enum ApplicationOAuthClientEnvironment {
  DEVELOPMENT
  PRODUCTION
}
```

Нужны queries:

- получить client по `organizationId + applicationId + clientId`;
- получить список clients по `organizationId + applicationId` с pagination и фильтром
  disabled/environment/type.

Ответы никогда не содержат `clientSecret`, secret hash, registration access token, authorization
code или OAuth tokens.

### 4.2. Create mutation

```graphql
input ApplicationOAuthClientCreateInput {
  organizationId: ID!
  applicationId: ID!
  name: String!
  clientType: ApplicationOAuthClientType!
  environment: ApplicationOAuthClientEnvironment!
  redirectUris: [String!]!
  postLogoutRedirectUris: [String!]
  skipConsent: Boolean
  enableEndSession: Boolean
}

type ApplicationOAuthClientCreatePayload {
  client: ApplicationOAuthClient
  clientSecret: String
  userErrors: [UserError!]!
}
```

Правила ответа:

- для public client `clientSecret = null`;
- для confidential client plaintext secret возвращается ровно один раз;
- повторный query/read никогда не возвращает secret;
- GraphQL transport, Pino, audit и tracing не логируют plaintext secret.

### 4.3. Update mutation

Update разрешает менять только:

- name;
- redirect URIs;
- post-logout URIs;
- `skipConsent` для подтвержденного first-party client;
- `enableEndSession`;
- environment в пределах URI policy;

Update запрещает менять:

- `organizationId`;
- `applicationId`;
- `clientId`;
- public/confidential type;
- `tokenEndpointAuthMethod`;
- `grantTypes`;
- `responseTypes`;
- `requirePkce`;
- `resources` и protocol policy version через обычную mutation.

### 4.4. Дополнительные mutations

- enable/disable client;
- rotate confidential client secret;
- archive client;
- при необходимости отдельное hard-delete только для отсутствующих tokens/consents и до production
  rollout.

Secret rotation возвращает новый plaintext secret один раз и сразу инвалидирует старый, как
определено в
[Better Auth Rotate Client Secret](https://www.better-auth.com/docs/plugins/oauth-provider#rotate-client-secret).

Все OAuth client mutations принимают `organizationId` и `applicationId`. Оба значения считаются
client-provided selectors; management boundary обязана повторно загрузить application по обоим
значениям и не раскрывать существование client другой organization.

## 5. Неизменяемая protocol policy v1

GraphQL input не принимает protocol grants или resource. Management service загружает active
`application_auth_configuration` и всегда устанавливает:

```text
grant_types = ["authorization_code", "refresh_token"]
response_types = ["code"]
require_pkce = true
resource_audience = application.resource
protocol_policy_version = 1
```

Application-scoped OAuth Provider instance также ограничивает grants и audience:

```text
oauthProvider.grantTypes = ["authorization_code", "refresh_token"]
oauthProvider.validAudiences = [application.resource]
oauthProvider.disableJwtPlugin = false
```

`application.resource` создается IAM вместе с application как immutable
`urn:shopana:application:{applicationId}` и является единственным resource всех clients этой
application. Он отсутствует в application/client create/update inputs; management service копирует
exact значение в IAM-controlled metadata. GraphQL client type возвращает read-only `resources`,
которое в v1 всегда равно `[application.resource]`. Обычной application-level операции изменения
resource нет; смена namespace/audience требует отдельной versioned protocol migration.

`client_credentials`, implicit и password grants не поддерживаются. Поля `grantTypes`,
`responseTypes` и `resources` возвращаются read-only для прозрачности и аудита.

Public client:

```text
public = true
token_endpoint_auth_method = "none"
client_secret = null
type = "native" | "user-agent-based"
```

Confidential client:

```text
public = false
token_endpoint_auth_method = "client_secret_basic"
type = "web"
client_secret = hash(one-time plaintext secret)
```

`client_secret_post` может приниматься token endpoint библиотекой, но Admin API создает confidential
clients с одной канонической policy, пока отдельное решение не разрешит другой метод.

## 6. ApplicationOAuthClientManagementService

Предлагаемый внутренний контракт:

```typescript
interface ApplicationOAuthClientManagementService {
  list(input: ListOAuthClientsInput, actor: AdminActor): Promise<OAuthClientPage>;
  get(input: GetOAuthClientInput, actor: AdminActor): Promise<OAuthClient>;
  create(input: CreateOAuthClientInput, actor: AdminActor): Promise<CreateOAuthClientResult>;
  update(input: UpdateOAuthClientInput, actor: AdminActor): Promise<OAuthClient>;
  setEnabled(input: SetOAuthClientEnabledInput, actor: AdminActor): Promise<OAuthClient>;
  rotateSecret(input: RotateOAuthClientSecretInput, actor: AdminActor): Promise<RotateSecretResult>;
  archive(input: ArchiveOAuthClientInput, actor: AdminActor): Promise<OAuthClient>;
}
```

Каждая write-операция выполняет:

1. Проверку platform actor из trusted request context.
2. Прием и валидацию `organizationId` из Admin GraphQL input как tenant selector.
3. Casbin authorization в domain `org` для resource `org.application-oauth-clients` и action,
   определенного матрицей раздела 10.
4. Загрузку application с predicate по `applicationId + organizationId`.
5. Проверку active/non-deleted organization и application.
6. Загрузку active auth configuration и проверку наличия единственного `application.resource`.
7. Нормализацию и валидацию URI.
8. Принудительное применение protocol policy v1 и наследование exact `application.resource`.
9. Application-scoped транзакцию.
10. Запись безопасного audit event без secrets.
11. Revision increment и invalidation `ApplicationAuthFactory` cache.

Queries выполняют ту же последовательность platform actor -> client-provided `organizationId` ->
Casbin `read` -> ownership predicate `applicationId + organizationId` до чтения OAuth client. List
repository всегда фильтрует clients по trusted application scope, полученному после ownership check.

## 7. Repository и схема хранения

Добавить `ApplicationOAuthClientRepository`. Все методы repository требуют trusted `applicationId`;
это значение не берется из client-controlled metadata и не изменяется через update.

Plugin-compatible `oauthClient` содержит поля, зафиксированные в compatibility spike, включая:

- `id`, `application_id`, `clientId`;
- `clientSecret` nullable;
- `disabled`, `skipConsent`, `enableEndSession`;
- `name`, `redirectUris`, `postLogoutRedirectUris`;
- `tokenEndpointAuthMethod`, `grantTypes`, `responseTypes`;
- `public`, `type`, `requirePKCE`;
- `referenceId`, `metadata` при фактической необходимости plugin;
- `createdAt`, `updatedAt`.

IAM-controlled metadata хранит:

- `application_id`;
- `client_id`;
- exact `resource_audience`;
- `protocol_policy_version`;
- `environment`;
- `created_by`, `updated_by`;
- `revision`;
- `deleted_at`/archive state.

Физическое поле `resource_audience` всегда равно текущему `application.resource`; GraphQL проецирует
его как `resources: [resource_audience]`. Это IAM-owned compatibility field, потому что plugin
schema `1.6.23` не содержит `resources`; он не является независимой настройкой OAuth client.
Repository отклоняет создание client без настроенного application resource и любое обычное update,
пытающееся изменить `resource_audience` отдельно от application-level resource migration.

Обязательны:

- глобально уникальный, криптографически случайный `clientId`;
- tenant-first indexes;
- составные application-scoped foreign keys;
- запрет изменения `application_id`;
- cross-application relation checks для tokens и consents;
- атомарная запись plugin client и IAM metadata.

## 8. Генерация и хранение client secret

Для confidential client:

1. Сгенерировать secret через криптографически безопасный RNG с достаточной энтропией.
2. Применить immutable prefix, если он утвержден до первого production client.
3. Сохранить только plugin-compatible hash.
4. Вернуть plaintext только из create/rotate result.
5. Немедленно удалить plaintext из объектов после формирования ответа, не сохраняя его в
   cache/outbox/audit.

Better Auth документирует hashed storage по умолчанию в разделе
[Storage](https://www.better-auth.com/docs/plugins/oauth-provider#storage). Для совместимости с
default hashed-secret policy версии `1.6.23` использовать тот же утвержденный SHA-256 + base64url
contract, зафиксированный документацией миграции OAuth Provider. Алгоритм покрыть compatibility test
vector, чтобы upgrade пакета не изменил поведение незаметно.

Нельзя импортировать нестабильный internal symbol пакета без compatibility wrapper и ADR.
Предпочтительно локализовать совместимость в одном `OAuthClientSecretCodec`, versioned по версии
plugin.

## 9. Валидация URI и client metadata

Для redirect URI:

- exact URI, без wildcard;
- fragment и userinfo запрещены;
- production требует HTTPS;
- HTTP разрешен только для localhost development client;
- custom mobile schemes разрешаются только утвержденной mobile policy;
- число URI и длина каждого URI ограничены;
- URI нормализуется один раз без изменения его OAuth semantic identity;
- duplicate URI отклоняются после канонической проверки.

Post-logout URI валидируются отдельно по тем же базовым правилам. Trusted origins являются
application configuration и не выводятся автоматически из redirect URI без отдельного решения.

`resources`, actor claims и signed-token metadata формируются только из trusted server-side данных.
`resources` проецируется как `[application.resource]`, а не принимается из client input.
Произвольный JSON из GraphQL не переносится в plugin metadata или JWT claims.

## 10. Permissions и аудит

Permissions следуют текущей модели `@shopana/rbac`: permission — это пара `resource + action`,
domain передается отдельно. Произвольные составные permissions и custom actions не используются.

Единый RBAC resource:

```text
domain = "org"
resource = "org.application-oauth-clients"
actions = "read" | "write" | "admin"
```

Матрица операций:

| Operations                                | Domain | Resource                        | Action  |
| ----------------------------------------- | ------ | ------------------------------- | ------- |
| list/get OAuth client                     | `org`  | `org.application-oauth-clients` | `read`  |
| create/update/enable/disable OAuth client | `org`  | `org.application-oauth-clients` | `write` |
| rotate client secret                      | `org`  | `org.application-oauth-clients` | `admin` |
| change `skipConsent`                      | `org`  | `org.application-oauth-clients` | `admin` |
| archive/hard-delete OAuth client          | `org`  | `org.application-oauth-clients` | `admin` |

Если update одновременно изменяет обычные поля и `skipConsent`, вся operation требует action
`admin`; понижать ее до `write` нельзя. Действующая Casbin-иерархия сохраняется:
`admin -> write -> read`.

Для подключения resource нужно:

1. Добавить `org.application-oauth-clients` в `packages/rbac/src/definitions.ts` с actions
   `read | write | admin`.
2. Выдать action `admin` для этого resource стандартной organization-роли `admin`; organization-роль
   `member` не получает permission по умолчанию.
3. Идемпотентно добавить policy в существующие standard organization roles и инвалидировать Casbin
   enforcer cache для затронутых organizations.
4. Проверить owner, standard organization `admin`, custom role с `read`/`write`/`admin`,
   organization `member`, unauthenticated actor и actor другой organization.

Site admin и organization owner сохраняют текущий project-wide bypass только после успешной
валидации `domain/resource/action` через `@shopana/rbac`. Локальный bypass в resolver/service не
добавляется.

Audit event содержит:

- admin actor id;
- organization id;
- application id;
- client id;
- operation;
- request id;
- timestamp;
- безопасный diff URI/type/environment/status;
- success/failure category.

Audit, logs, errors, traces и metrics не содержат plaintext/hash secret, authorization code,
refresh/access token или session token.

## 11. Ошибки API

Ожидаемые business errors возвращаются через GraphQL `userErrors`:

- application не найдена в organization actor;
- недостаточно прав;
- URI не соответствует environment policy;
- client type нельзя изменить;
- first-party policy не разрешает `skipConsent`;
- client disabled/archived;
- rotation запрошена для public client;
- достигнут лимит clients или URI.

Ошибки ownership не должны раскрывать существование application/client другой organization.
Unexpected database/crypto failures возвращаются как generic internal error и логируются без
secrets.

## 12. Публичная HTTP-граница

До вызова `applicationAuth.handler` возвращать `404` для:

- `/oauth2/register`;
- `/oauth2/create-client`;
- `/oauth2/get-client`;
- `/oauth2/get-clients`;
- `/oauth2/update-client`;
- `/oauth2/delete-client`;
- `/oauth2/client/rotate-secret`;
- будущих неизвестных `/oauth2/*` management routes.

Проверка выполняется versioned allowlist по HTTP method и нормализованному pathname. Application
user session не дает административного доступа к OAuth clients.

Для разрешенных `/oauth2/authorize` и `/oauth2/token` основной implementation plan дополнительно
требует `ApplicationOAuthResourcePolicyGuard` до `auth.handler`. Guard принимает ровно один exact
`application.resource` на authorize, authorization-code exchange и каждом refresh, сверяет
IAM-controlled client binding и возвращает `invalid_target` для missing/duplicate/foreign resource
без opaque-token fallback. `oauthProvider.validAudiences` остается дополнительным, а не единственным
enforcement layer.

## 13. Этапы реализации

### Этап 0. Зафиксировать контракт

1. Утвердить GraphQL schema и error model.
2. Утвердить RBAC contract `org.application-oauth-clients + read|write|admin`, standard-role
   policies и передачу `organizationId` через Admin GraphQL input/arguments.
3. Утвердить application-level `resource` contract: IAM-generated immutable
   `urn:shopana:application:{applicationId}`, уникальность и запрет application/client-level
   override.
4. Утвердить secret prefix/length/hash compatibility vector.
5. Зафиксировать поля `oauthClient` версии `1.6.23` и protocol policy v1.
6. Решить archive versus hard-delete semantics.

Критерий выхода: нет client-controlled полей, способных включить новый grant, audience или signed
claim.

### Этап 1. Схема и repository

1. Добавить application-scoped OAuth Provider models и IAM metadata migration.
2. Реализовать repository с tenant predicates и транзакциями.
3. Реализовать `OAuthClientSecretCodec` и генератор client ID/secret.
4. Добавить cross-tenant constraints и indexes.

Критерий выхода: client невозможно создать, прочитать или изменить через repository другого
application.

### Этап 2. Management service

1. Реализовать create/list/get/update.
2. Реализовать enable/disable/archive.
3. Реализовать one-time secret create/rotation.
4. Добавить audit и cache invalidation.
5. Принудительно применять protocol policy v1.

Критерий выхода: service не принимает application user session и не доверяет tenant/resource
metadata из input.

### Этап 3. Admin GraphQL

1. Добавить queries/mutations/payloads/user errors.
2. Подключить trusted platform actor, `organizationId` из GraphQL input/arguments и Casbin matrix
   `org.application-oauth-clients + read|write|admin`.
3. Обеспечить one-time secret response без попадания в логирование.
4. Возвращать grants/audience/policy только read-only.

Критерий выхода: organization admin управляет clients своего application и не может обратиться к
client другой organization.

### Этап 4. OAuth Provider integration

1. Подключить created client к application-scoped OAuth Provider instance.
2. Проверить public/confidential Authorization Code + PKCE.
3. Проверить наследование `application.resource`, `validAudiences: [application.resource]` и
   `ApplicationOAuthResourcePolicyGuard` на authorize/code exchange/refresh.
4. Проверить disable, rotation, archive и revocation behavior.
5. Закрыть все публичные management routes versioned Fastify manifest.

Критерий выхода: созданный через Admin GraphQL client работает в стандартном OAuth flow без
application session на этапе административного создания.

## 14. Обязательные сценарии проверки

Проверки выполняются через `shopana-cli` согласно правилам проекта; `test` и `tsc` не используются
как команды проверки, при необходимости новой версии выполняется build.

- platform admin session авторизует create через Admin GraphQL;
- отсутствие/просроченная platform session отклоняется;
- list/get требуют `org.application-oauth-clients + read`;
- create/update/enable/disable требуют `org.application-oauth-clients + write`;
- rotate secret, change `skipConsent`, archive/hard-delete требуют
  `org.application-oauth-clients + admin`;
- custom role с `write` не может rotate secret, изменить `skipConsent` или archive client;
- organization `member` без явной custom policy не читает и не изменяет OAuth clients;
- unknown resource/action отклоняется до owner/site-admin bypass;
- admin organization A не создает client для application B;
- public client создается без secret;
- confidential client получает secret один раз;
- get/list/update не возвращают secret;
- rotate возвращает новый secret один раз и инвалидирует старый;
- public client secret rotation отклоняется;
- client type, grants, response types, PKCE и audience нельзя изменить через GraphQL;
- client нельзя создать без provisioned `application.resource`, а созданный client получает exact
  application resource read-only;
- client create/update input не принимает `resource`/`resources`, read-only response всегда
  возвращает `[application.resource]` и не позволяет заменить application audience;
- `client_credentials` отклоняется для public/confidential clients;
- wildcard, fragment, userinfo и production HTTP redirect отклоняются;
- localhost HTTP разрешается только development policy;
- disabled/archived client не проходит authorize/token flow;
- write mutations применяют изменения к текущему состоянию после проверки scope и domain invariants;
- application user session не вызывает client-management endpoints;
- Dynamic Client Registration и неизвестные management paths возвращают `404`;
- authorize/code exchange/refresh с missing, duplicate или foreign resource отклоняются
  `ApplicationOAuthResourcePolicyGuard` до `auth.handler` без opaque-token fallback;
- secret отсутствует в Pino, audit, traces, metrics и errors;
- OAuth Provider `1.6.23` принимает сохраненный hash при token endpoint client authentication.

## 15. Предполагаемые изменения файлов

```text
services/iam/src/api/graphql-admin/application-oauth-client/*
services/iam/src/services/ApplicationOAuthClientManagementService.ts
services/iam/src/services/OAuthClientSecretCodec.ts
services/iam/src/repositories/ApplicationOAuthClientRepository.ts
services/iam/src/repositories/models/application-auth.ts
services/iam/src/auth/scopedDrizzleAdapter.ts
services/iam/src/auth/applicationAuthConfiguration.ts
services/iam/src/api/http/application-auth/*
services/iam/src/casbin/*
services/iam/src/events/application-auth/*
services/iam/migrations/*
packages/rbac/src/definitions.ts
services/e2e/.../iam/application-oauth-client/*
```

Точные пути GraphQL resolver/action должны соответствовать существующей структуре IAM при
реализации.

## 16. Definition of Done

- Admin GraphQL использует platform Better Auth session и Casbin.
- Все operations используют domain `org`, resource `org.application-oauth-clients` и только actions
  `read | write | admin` по зафиксированной матрице.
- `organizationId` приходит из Admin GraphQL input/arguments, не считается trusted и проверяется
  через Casbin и ownership predicate.
- OAuth client создается без `application_user` session и impersonation.
- Все данные client application-scoped.
- Protocol grants, response type и PKCE задаются сервером; audience наследуется только из
  единственного `application.resource` и не управляется OAuth client mutation.
- Confidential secret хранится hashed и показывается один раз.
- Public management endpoints закрыты до `auth.handler`.
- Audit и observability не содержат secrets.
- Созданные public/confidential clients проходят Authorization Code + S256 PKCE.
- Negative tenant, URI, grant, resource и secret lifecycle scenarios подтверждены.
- Compatibility contract привязан к exact `@better-auth/oauth-provider@1.6.23` и пересматривается
  при upgrade.
