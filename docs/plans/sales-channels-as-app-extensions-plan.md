# План: Sales Channels как App extensions и Headless storefronts

## Статус

- Дата: 2026-07-25.
- Тип: архитектурный и implementation plan.
- Стратегия: clean cutover без backward compatibility, backfill и dual write.
- Основная модель: `AppDefinition -> AppInstallation -> SalesChannelConnection`.
- Headless-модель: `SalesChannelConnection -> IAM Storefront API Client -> public/private credentials`.

## Цель

Заменить самостоятельную модель `project.sales_channel` на App-driven sales
channels:

- App объявляет поддержку sales channels через versioned manifest extension;
- App устанавливается один раз для store;
- одна installation может создать несколько независимых channel connections;
- Admin обнаруживает sales-channel Apps по manifest, а реальные каналы — по
  persisted connections текущего store;
- bundled Headless App позволяет создавать несколько custom storefronts;
- каждый Headless storefront получает собственные public/private Storefront API
  credentials;
- lifecycle App, connection и credential не смешиваются;
- first-party и third-party channels используют один connection contract.

## Scope

План включает:

- `packages/app-sdk`;
- `packages/app-runtime`;
- `packages/broker-types`;
- `packages/shared-context`;
- `services/apps`;
- `services/iam`;
- Storefront GraphQL Gateway и trusted storefront context;
- bundled App `apps/headless`;
- Apps/IAM Admin GraphQL;
- Admin frontend;
- удаление legacy `sales_channel` и `market_sales_channel` из Project Service.

План не включает:

- Markets и Channel Markets;
- Catalog, Publication и Product Feed;
- синхронизацию товаров с внешними marketplaces;
- buyer-specific commercial context;
- аналитику и attribution;
- billing и commissions;
- customer authentication;
- автоматическое создание региональных сущностей;
- compatibility adapters для строкового channel code.

Перечисленные области должны проектироваться отдельно после стабилизации
connection и credential contracts.

## Что подтверждено Shopify

### App становится sales channel через extension

Shopify требует добавить Channel config extension в App. Extension объявляет
channel specifications, а не создаёт merchant connection сама по себе:

- [Start building a sales channel app](https://shopify.dev/docs/apps/build/sales-channels/start-building)
- [Channel config extension](https://shopify.dev/docs/apps/build/sales-channels/channel-config-extension)

Следствие для Shopana:

```text
App manifest
  └── extensions.salesChannels.specifications
```

### Channel connection создаётся после установки App

Shopify App вызывает `channelCreate` после подключения merchant к внешнему
account. Input содержит `accountId`, `accountName`, `handle` и
`specificationHandle`; Market/Catalog identifiers там отсутствуют:

- [Shopify `channelCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/channelCreate)
- [Managing channel connections](https://shopify.dev/docs/apps/build/sales-channels/channel-connections)

Следствие:

```text
AppInstallation != SalesChannelConnection
```

и:

```text
AppInstallation
  └── 0..N SalesChannelConnections
```

### App может создать несколько channels

Одна sales-channel App может управлять несколькими connections, включая разные
regions или seller accounts:

- [Multi-channel support for sales channel apps](https://shopify.dev/changelog/multi-channel-support-for-sales-channel-apps)
- [Shopify `Channel`](https://shopify.dev/docs/api/admin-graphql/latest/objects/Channel)

Следствие: `appCode` или `installationId` нельзя использовать как channel
identity.

### Headless channel создаёт несколько storefronts

Shopify Headless channel является местом создания custom storefronts. Каждый
storefront получает public и private Storefront API tokens:

- [Building with the Storefront API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api)
- [Getting started with the Storefront API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started)
- [Manage the Headless channel](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/manage-headless-channels)

Следствие для Shopana:

```text
Headless AppInstallation
  ├── Connection "Main website"
  └── Connection "Mobile app"
```

Каждый connection является отдельным Headless storefront.

### Public и private tokens имеют разные threat models

Shopify определяет:

- public token — для browser/mobile client;
- private token — только для server-side context;
- private token нельзя помещать в client bundle;
- private token поддерживает rotation;
- server-side buyer-driven запрос должен передавать buyer IP.

Источник:

- [Shopify API authentication](https://shopify.dev/docs/api/usage/authentication)

Следствие: это не криптографическая public/private key pair, а два типа access
credentials.

## Что намеренно не выводится из Shopify

Публичная документация не раскрывает внутренние границы микросервисов Shopify.
Поэтому размещение Shopana connection control plane в Apps Service — локальное
архитектурное решение, основанное на уже существующих компонентах:

- App installation lifecycle;
- manifest snapshots;
- permissions;
- secrets;
- runtime registry;
- DBOS workflows;
- App execution context.

Если domain существенно вырастет, модуль sales channels можно вынести в
отдельный service без изменения внешнего GraphQL contract.

## Исправленная domain model

```text
AppDefinition
  └── Manifest version
        └── SalesChannelExtension
              └── SalesChannelSpecification

Store
  └── AppInstallation
        ├── SalesChannelConnection
        └── SalesChannelConnection

Headless SalesChannelConnection
  └── IAM StorefrontApiClient
        ├── PUBLIC credential
        ├── PRIVATE credential v1
        └── PRIVATE credential v2
```

### Термины

| Термин | Значение | Владелец |
| --- | --- | --- |
| `AppDefinition` | Bundled App и её текущий manifest | Apps |
| `AppInstallation` | Установка App в конкретный store | Apps |
| `SalesChannelExtension` | Manifest declaration поддержки channels | App manifest |
| `SalesChannelSpecification` | Versioned шаблон connection | Apps |
| `SalesChannelConnection` | Конкретный подключённый channel/storefront | Apps |
| `StorefrontApiClient` | IAM subject Headless storefront | IAM |
| `StorefrontCredential` | Public/private token | IAM |
| `StorefrontGrant` | Разрешение credential/client | IAM |

## Архитектурные инварианты

1. App installation и channel connection — разные entities.
2. Одна installation имеет `0..N` connections.
3. Connection принадлежит ровно одной installation.
4. Connection ID — UUIDv7 и единственная platform identity канала.
5. `appCode`, specification handle и display name не являются connection ID.
6. App без sales-channel extension не может создавать connections.
7. Connection всегда ссылается на immutable specification snapshot.
8. App может читать и изменять только собственные connections.
9. Connection не требует Market, ChannelMarket, Catalog или Publication.
10. Generic capability slot не используется для enumeration connections.
11. App suspend делает connections runtime-недоступными, не уничтожая их state.
12. Ошибка connection не переводит installation в failed state.
13. Headless connection соответствует одному custom storefront.
14. Storefront credentials принадлежат IAM, а не Apps configuration.
15. Public token имеет только unauthenticated/storefront scopes.
16. Private token показывается один раз и никогда не возвращается list/query API.
17. Raw tokens не передаются downstream subgraphs.
18. Token определяет store и connection; клиент не выбирает tenant header-ом.
19. Customer identity не выводится из Storefront credential.
20. Disconnect connection отзывает связанные storefront credentials.

## Текущее состояние Shopana

### Legacy SalesChannel в Project

`services/project/src/repositories/models/salesChannel.ts` хранит:

- `id`;
- `storeId`;
- uppercase `code`;
- closed enum `type`;
- `status`;
- `isDefault`;
- `metadata`;
- soft-delete timestamps.

`services/project/src/repositories/models/marketSalesChannel.ts` создаёт
локальную связь с Market.

Проблемы:

- closed enum требует изменения платформы для нового provider;
- lifecycle дублирует App installation lifecycle;
- строковый code не выражает несколько accounts одной App;
- Project не владеет App runtime и specification;
- один `sales_channel` не разделяет App, installation и connection.

### Apps Platform

Apps Service уже имеет:

- strict Zod manifest v1;
- App runtime registry;
- installation lifecycle;
- manifest snapshots;
- granted scopes;
- encrypted installation secrets;
- DBOS lifecycle operations;
- runtime action routing;
- Admin GraphQL.

Эти компоненты расширяются новым изолированным sales-channels module.

### Generic capability router

Текущие `slots` и `slot_assignments` выбирают одну реализацию для
`capability + operation` и деактивируют конкурирующие routes.

Sales channels имеют cardinality `MANY`:

```text
Online Store
Headless Main Website
Headless Mobile App
Amazon seller A
Amazon seller B
```

Поэтому connection разрешается по `connectionId`, а не через global capability
selection.

### Storefront middleware

`packages/shared-context/src/storefrontContextMiddleware.ts` сейчас:

- требует `x-store-name`;
- требует `x-api-key`;
- не валидирует API key;
- оставляет customer lookup как TODO.

Эта схема должна быть заменена trusted token resolution через IAM.

### Legacy Project API keys

`project.api_key` нельзя переиспользовать для Headless:

- ключ store-wide, а не connection-scoped;
- нет public/private distinction;
- нет storefront grants;
- repository/scripts не реализованы;
- GraphQL model возвращает поле `key`;
- отсутствует безопасная rotation model.

Legacy Project API keys остаются отдельной задачей и не становятся Storefront
credentials.

## Manifest contract v2

### Почему нужна версия 2

Текущий manifest strict и принимает только `schemaVersion: 1`. Extension model
меняет семантику App, поэтому новые Apps должны использовать manifest v2.

Поддержка чтения v1 может оставаться только для уже существующей bundled
`hello-world` App на время одного code cutover. Новые creation APIs v1 не
добавляются.

### Contract

```ts
type SalesChannelDeliveryMode =
  | "STOREFRONT_API"
  | "EXTERNAL_PLATFORM";

interface SalesChannelSpecification {
  readonly handle: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: string;
  readonly deliveryMode: SalesChannelDeliveryMode;
  readonly connection: {
    readonly allowMultipleConnections: boolean;
    readonly requiresExternalAccount: boolean;
  };
  readonly operations: {
    readonly connect?: string;
    readonly update?: string;
    readonly suspend?: string;
    readonly resume?: string;
    readonly disconnect?: string;
    readonly health?: string;
  };
}

interface AppExtensions {
  readonly salesChannels?: {
    readonly specifications:
      readonly SalesChannelSpecification[];
  };
}
```

`STOREFRONT_API` означает, что connection потребляет Shopana Storefront API.
Этот plan реализует такой mode для bundled Headless App.

`EXTERNAL_PLATFORM` резервирует connection type для внешнего provider, но его
data distribution contract в этот plan не входит.

### Headless manifest

```ts
export const headlessManifest = defineAppManifest({
  schemaVersion: 2,
  code: "shopana-headless",
  version: "1.0.0",
  displayName: "Headless",
  description:
    "Create custom storefronts powered by the Storefront API.",
  lifecycle: {
    installWorkflow: "install",
    updateWorkflow: "update",
    suspendAction: "suspend",
    resumeAction: "resume",
    uninstallWorkflow: "uninstall",
    healthAction: "health",
  },
  permissions: [],
  capabilities: [],
  extensions: {
    salesChannels: {
      specifications: [
        {
          handle: "headless-storefront",
          label: "Headless storefront",
          deliveryMode: "STOREFRONT_API",
          connection: {
            allowMultipleConnections: true,
            requiresExternalAccount: false,
          },
          operations: {
            connect: "storefrontConnect",
            update: "storefrontUpdate",
            suspend: "storefrontSuspend",
            resume: "storefrontResume",
            disconnect: "storefrontDisconnect",
            health: "storefrontHealth",
          },
        },
      ],
    },
  },
  graphql: {
    admin: true,
    storefront: false,
  },
});
```

### Validation

Manifest validator проверяет:

- `handle` соответствует `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`;
- handles уникальны внутри App version;
- label не пустой;
- delivery mode известен;
- operation names являются local names без чужого prefix;
- все declared operations зарегистрированы runtime;
- Headless specification имеет `STOREFRONT_API`;
- specification не содержит merchant secrets;
- обычная App может не иметь `salesChannels`.

## Apps persistence

### Specification snapshots

Полный manifest уже snapshot-ится Apps Service. Для connection lookup нужна
query-friendly immutable projection:

```text
platform.app_sales_channel_specification_snapshots
──────────────────────────────────────────────────
id                    uuidv7 PK
installation_id       uuid FK app_installations
app_code              varchar
app_version           varchar
manifest_hash         varchar
handle                varchar
label                 varchar
delivery_mode         enum
definition            jsonb
definition_hash       varchar
created_at            timestamptz
```

Ограничения:

```text
unique (installation_id, app_version, manifest_hash, handle)
index  (installation_id, handle)
```

Snapshot создаётся при успешном App install/update.

### Connections

```text
platform.app_sales_channel_connections
──────────────────────────────────────
id                         uuidv7 PK
organization_id            uuid
store_id                   uuid
installation_id            uuid FK app_installations
specification_snapshot_id  uuid FK specification_snapshots
display_name               varchar(255)
external_account_id        varchar(255) nullable
external_account_label     varchar(255) nullable
status                     enum
configuration              jsonb
configuration_version      int
health_status              enum
last_error_code            varchar nullable
last_error_message         text nullable
connected_at               timestamptz nullable
suspended_at               timestamptz nullable
disconnected_at            timestamptz nullable
created_at                 timestamptz
updated_at                 timestamptz
```

Statuses:

```text
DRAFT
CONNECTING
ACTIVE
CONNECT_FAILED
UPDATING
UPDATE_FAILED
SUSPENDING
SUSPENDED
RESUMING
DISCONNECTING
DISCONNECTED
DISCONNECT_FAILED
```

Health:

```text
UNKNOWN
HEALTHY
DEGRADED
UNHEALTHY
```

Индексы:

```text
index (store_id, status, id)
index (installation_id, status, id)
index (specification_snapshot_id)
```

Для specifications с `allowMultipleConnections = false`:

```text
unique (store_id, installation_id, specification_snapshot_id)
where status <> 'DISCONNECTED'
```

Для `allowMultipleConnections = true` допускается несколько connections. Уникальность
внешнего account валидируется только когда `externalAccountId` присутствует.

### Connection operations

```text
platform.app_sales_channel_operations
─────────────────────────────────────
id                         uuidv7 PK
connection_id              uuid FK connections
type                       enum
status                     enum
target_specification_id    uuid nullable
idempotency_key            varchar
workflow_id                varchar
actor_type                 USER | APP | SERVICE | SYSTEM
actor_id                   varchar nullable
correlation_id             varchar nullable
previous_status            enum nullable
error_code                 varchar nullable
error_message              text nullable
started_at                 timestamptz nullable
completed_at               timestamptz nullable
created_at                 timestamptz
updated_at                 timestamptz
```

Operation types:

```text
CONNECT
UPDATE
SUSPEND
RESUME
DISCONNECT
```

Operation statuses:

```text
PENDING
RUNNING
SUCCEEDED
FAILED
```

Ограничения:

```text
unique (connection_id, idempotency_key)
index  (connection_id, created_at)
index  (status, created_at)
```

## Apps module structure

```text
services/apps/src/sales-channels/
  control-plane/
    SalesChannelConnectionStore.ts
    SalesChannelLifecycleService.ts
    SalesChannelLifecycleWorkflow.ts
    SalesChannelSpecificationService.ts
    types.ts
  repositories/
    SalesChannelConnectionRepository.ts
    SalesChannelOperationRepository.ts
    SalesChannelSpecificationSnapshotRepository.ts
  runtime/
    SalesChannelRuntimeRouter.ts
    SalesChannelManifestContracts.ts
  resolvers/
    admin/
```

### Exact-connection routing

```ts
invokeForConnection<TResult, TInput>(
  connectionId: string,
  contract:
    | "connect"
    | "update"
    | "suspend"
    | "resume"
    | "disconnect"
    | "health",
  input: TInput,
): Promise<TResult>;
```

Router:

1. Загружает connection tenant-scoped.
2. Загружает installation.
3. Проверяет installation status.
4. Загружает immutable specification snapshot.
5. Получает declared target action.
6. Проверяет App runtime code/version.
7. Создаёт trusted App context.
8. Вызывает runtime только App-владельца connection.

`AppExecutionContext` расширяется:

```ts
interface AppExecutionContext {
  // existing fields
  readonly extension?: {
    readonly kind: "sales-channel";
    readonly instanceId: string;
    readonly specificationHandle: string;
  };
}
```

### Effective availability

Connection обслуживает runtime request только если:

```text
installation.status == ACTIVE
AND connection.status == ACTIVE
```

App suspend не переписывает persisted status всех connections. После resume
connections возвращают effective availability без потери своего lifecycle
state.

### Uninstall

App uninstall:

1. Запрещает новые connection operations.
2. Запускает controlled disconnect non-terminal connections.
3. Дожидается terminal results либо фиксирует uninstall failure.
4. Emit-ит connection disconnected events.
5. Не выполняет физический delete connection records.

## Apps Admin GraphQL

### Discovery

Sales-channel App определяется только наличием manifest extension:

```text
manifest.extensions.salesChannels.specifications.length > 0
```

Добавить:

```graphql
enum AppExtensionKind {
  SALES_CHANNEL
}

input AppDefinitionWhereInput {
  extensionKinds: [AppExtensionKind!]
  installed: Boolean
}

extend type AppsQuery {
  availableApps(
    where: AppDefinitionWhereInput
  ): [AppDefinition!]!
}
```

Запрос доступных sales-channel Apps:

```graphql
query AvailableSalesChannelApps {
  appsQuery {
    availableApps(
      where: {
        extensionKinds: [SALES_CHANNEL]
      }
    ) {
      code
      displayName
      installed
      installation {
        id
        status
      }
      salesChannelSpecifications {
        handle
        label
        deliveryMode
      }
    }
  }
}
```

### Connection types

```graphql
enum SalesChannelDeliveryMode {
  STOREFRONT_API
  EXTERNAL_PLATFORM
}

type SalesChannelSpecification {
  id: ID!
  appCode: String!
  appVersion: String!
  handle: String!
  label: String!
  deliveryMode: SalesChannelDeliveryMode!
}

type SalesChannelConnection implements Node @key(fields: "id") {
  id: ID!
  installation: AppInstallation!
  specification: SalesChannelSpecification!
  displayName: String!
  externalAccountId: String
  externalAccountLabel: String
  status: SalesChannelConnectionStatus!
  effectiveActive: Boolean!
  configuration: JSON!
  configurationVersion: Int!
  healthStatus: SalesChannelHealthStatus!
  lastError: SalesChannelError
  connectedAt: DateTime
  suspendedAt: DateTime
  disconnectedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

Queries:

```graphql
extend type AppsQuery {
  salesChannelConnection(id: ID!): SalesChannelConnection
  salesChannelConnections(
    first: Int
    after: String
    last: Int
    before: String
    where: SalesChannelConnectionWhereInput
    orderBy: [SalesChannelConnectionOrderByInput!]
  ): SalesChannelConnectionConnection!
}

extend type AppDefinition {
  extensionKinds: [AppExtensionKind!]!
  salesChannelSpecifications:
    [SalesChannelSpecificationDefinition!]!
}

extend type AppInstallation {
  salesChannelConnections(
    first: Int
    after: String
    last: Int
    before: String
  ): SalesChannelConnectionConnection!
}
```

Mutations:

```text
salesChannelConnectionCreate
salesChannelConnectionUpdate
salesChannelConnectionSuspend
salesChannelConnectionResume
salesChannelConnectionDisconnect
```

Lifecycle mutations возвращают connection и durable operation. Inputs содержат
`clientMutationId`; configuration updates — `expectedConfigurationVersion`.

`storeId`, `organizationId` и `appCode` не принимаются из client input.

## Bundled Headless App

Создать:

```text
apps/headless/
  app.manifest.ts
  package.json
  build.config.json
  tsconfig.json
  src/
    HeadlessApp.ts
    index.ts
```

Headless App:

- объявляет specification `headless-storefront`;
- не требует external account;
- поддерживает несколько connections;
- не хранит API credentials;
- lifecycle actions координируют только connection state;
- provisioning credentials делегируется IAM.

Одна installation:

```text
Headless
  ├── Main website
  ├── Mobile application
  └── Partner portal
```

Каждый connection является отдельным Storefront API authorization subject.

## IAM Storefront API model

### Storefront clients

```text
iam.storefront_api_clients
──────────────────────────
id                       uuidv7 PK
organization_id          uuid
store_id                 uuid
channel_connection_id    uuid
name                     varchar(255)
status                   ACTIVE | SUSPENDED | REVOKED
allowed_origins          text[]
created_by_user_id       uuid nullable
created_at               timestamptz
updated_at               timestamptz
suspended_at             timestamptz nullable
revoked_at               timestamptz nullable
```

Ограничения:

```text
unique (channel_connection_id)
index  (store_id, status, id)
```

`channel_connection_id` не имеет database FK к Apps Service.

### Credentials

```text
iam.storefront_api_credentials
──────────────────────────────
id                       uuidv7 PK
client_id                uuid FK storefront_api_clients
type                     PUBLIC | PRIVATE
token_prefix             varchar
token_hash               varchar
token_last_four          varchar(4)
status                   ACTIVE | REVOKED | EXPIRED
expires_at               timestamptz nullable
last_used_at             timestamptz nullable
created_at               timestamptz
revoked_at               timestamptz nullable
```

Один client может иметь:

- один или несколько public credentials;
- несколько private credentials во время rotation overlap;
- только явно active credentials.

### Grants

```text
iam.storefront_api_grants
─────────────────────────
client_id
scope
granted_at
revoked_at
```

Начальный scope vocabulary:

```text
unauthenticated:products:read
unauthenticated:collections:read
unauthenticated:search:read
unauthenticated:content:read
unauthenticated:customer-auth:write
```

Фактическое включение scope в schema выполняется только вместе с
соответствующей resolver policy.

### Token format

```text
PUBLIC:
shp_sf_pub_<credential-id>_<random-secret>

PRIVATE:
shp_sf_prv_<credential-id>_<random-secret>
```

Требования:

- random secret содержит минимум 256 бит entropy;
- credential ID позволяет indexed lookup;
- в основной credential row хранится только keyed hash;
- hash вычисляется как HMAC-SHA-256 с platform-managed pepper;
- constant-time comparison;
- public token может повторно отображаться только из отдельного encrypted
  representation;
- private token после one-time reveal не имеет долговременного recoverable
  plaintext;
- logs содержат только credential ID/prefix/last four.

### One-time private reveal

Async provisioning не должен помещать private token в DBOS operation payload
или event.

Добавить:

```text
iam.storefront_credential_reveals
─────────────────────────────────
id
credential_id
ciphertext
expires_at
consumed_at
created_at
```

Flow:

1. IAM генерирует private token.
2. Сохраняет HMAC в credential row.
3. Временно сохраняет token encrypted в reveal row.
4. Возвращает opaque `revealId`.
5. Authorized Admin вызывает consume mutation.
6. IAM возвращает private token один раз.
7. Reveal помечается consumed и ciphertext уничтожается/очищается.
8. Expired reveal нельзя восстановить; создаётся новый credential.

Public token можно показывать повторно только authorized store admins.

## Headless storefront provisioning workflow

Создание Headless storefront — durable orchestration:

```text
Admin
  → create Headless connection
  → Apps connection ACTIVE
  → IAM client provision
  → public credential create
  → private credential create
  → one-time reveal available
```

Шаги:

1. Проверить installed active Headless App.
2. Resolve `headless-storefront` specification.
3. Создать `DRAFT` connection idempotently.
4. Выполнить Headless App connect action.
5. Перевести connection в `ACTIVE`.
6. Emit `apps.sales-channel.connection.activated.v1`.
7. IAM consumer создаёт client idempotently по `connectionId`.
8. IAM создаёт initial public/private credentials.
9. IAM сохраняет private one-time reveal.
10. Admin polling получает provisioning status и `revealId`.

Если IAM provisioning упал:

- connection остаётся `ACTIVE`;
- storefront credential state показывается как `PROVISION_FAILED`;
- retry использует тот же provisioning idempotency key;
- duplicate client/credentials не создаются;
- connection lifecycle не откатывается из-за временной IAM ошибки.

Это разделяет:

```text
Connection работает как platform entity
Credential provisioning временно не завершён
```

## IAM Admin GraphQL

IAM расширяет federated connection:

```graphql
extend type SalesChannelConnection @key(fields: "id") {
  id: ID! @external
  storefrontApiClient: StorefrontApiClient
}

type StorefrontApiClient implements Node @key(fields: "id") {
  id: ID!
  channelConnectionId: ID!
  name: String!
  status: StorefrontApiClientStatus!
  allowedOrigins: [String!]!
  grants: [StorefrontApiGrant!]!
  credentials: [StorefrontApiCredential!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type StorefrontApiCredential implements Node @key(fields: "id") {
  id: ID!
  type: StorefrontApiCredentialType!
  prefix: String!
  lastFour: String!
  status: StorefrontApiCredentialStatus!
  expiresAt: DateTime
  lastUsedAt: DateTime
  createdAt: DateTime!
  publicToken: String
}
```

`publicToken` возвращается только authorized Admin и только для PUBLIC
credential. PRIVATE value отсутствует в query schema.

Mutations:

```text
storefrontPublicCredentialCreate
storefrontPrivateCredentialRotate
storefrontCredentialRevoke
storefrontCredentialRevealConsume
storefrontApiClientGrantsUpdate
storefrontApiClientAllowedOriginsUpdate
```

Private rotation:

```text
private-v1 ACTIVE
  → private-v1 ACTIVE + private-v2 ACTIVE
  → deploy new token
  → revoke private-v1
```

## Credential validation

### Headers

Public request:

```http
X-Shopana-Storefront-Access-Token: shp_sf_pub_...
```

Private request:

```http
Shopana-Storefront-Private-Token: shp_sf_prv_...
Shopana-Storefront-Buyer-IP: 203.0.113.10
```

Правила:

- нельзя передавать public и private headers одновременно;
- private token запрещён из untrusted browser context;
- buyer IP обязателен для private buyer-driven request;
- `x-store-name` не определяет tenant;
- если hostname/store hint присутствует, он только проверяется на совпадение.

### Validation contract

```ts
interface ValidateStorefrontCredentialInput {
  readonly token: string;
  readonly type: "PUBLIC" | "PRIVATE";
  readonly buyerIp?: string;
  readonly origin?: string;
}

interface ValidateStorefrontCredentialResult {
  readonly credentialId: string;
  readonly clientId: string;
  readonly credentialType: "PUBLIC" | "PRIVATE";
  readonly organizationId: string;
  readonly storeId: string;
  readonly channelConnectionId: string;
  readonly scopes: readonly string[];
}
```

IAM проверяет:

1. Token prefix/type.
2. Credential lookup.
3. HMAC в constant time.
4. Credential status и expiration.
5. Client status.
6. Allowed origin для public request, если configured.
7. Grants.
8. Connection status через cached Apps projection или broker.
9. Rate-limit subject.
10. Обновляет `lastUsedAt` асинхронно, не блокируя request.

### Trusted storefront context

```ts
interface StorefrontRequestContext {
  readonly organizationId: string;
  readonly storeId: string;
  readonly channelConnectionId: string;
  readonly credential: {
    readonly id: string;
    readonly clientId: string;
    readonly type: "PUBLIC" | "PRIVATE";
  };
  readonly scopes: readonly string[];
  readonly buyerIp?: string;
}
```

Raw token не включается в context и не пересылается subgraphs.

## Storefront Gateway integration

Gateway является единственной внешней точкой credential validation:

```text
Browser / Server
  → Storefront Gateway
  → IAM validate
  → trusted StorefrontRequestContext
  → federated subgraphs
```

Обновить shared middleware:

1. Удалить обязательность `x-api-key`.
2. Parse public/private headers.
3. Вызвать IAM validation.
4. Resolve store из validation result.
5. Вложить trusted connection identity.
6. Передать scopes в GraphQL authorization context.
7. Не логировать raw headers.

Introspection/service composition path остаётся отдельным trusted mode.

Rate limiting:

- public: credential + buyer IP;
- private buyer-driven: credential + forwarded buyer IP;
- private machine-driven: credential;
- отдельный complexity budget;
- rejected origin/token не достигает subgraphs.

## Disconnect и revoke

Connection disconnect:

1. Apps завершает connection lifecycle.
2. Emit `apps.sales-channel.connection.disconnected.v1`.
3. IAM consumer находит client по connection ID.
4. Переводит client в `REVOKED`.
5. Отзывает все active credentials.
6. Очищает unconsumed reveal ciphertext.
7. Новые Storefront API requests получают unauthorized.

Suspend:

- App/connection suspend делает client effectively unavailable;
- credentials можно не переписывать массово;
- validation проверяет current/effective connection state;
- explicit credential revoke остаётся terminal.

## Events и broker contracts

Apps events:

```text
apps.sales-channel.connection.created.v1
apps.sales-channel.connection.activated.v1
apps.sales-channel.connection.updated.v1
apps.sales-channel.connection.suspended.v1
apps.sales-channel.connection.resumed.v1
apps.sales-channel.connection.disconnected.v1
```

Envelope:

```ts
interface SalesChannelConnectionEvent {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly connectionId: string;
  readonly installationId: string;
  readonly appCode: string;
  readonly specificationHandle: string;
  readonly correlationId?: string;
}
```

Apps broker:

```text
apps.salesChannels.resolveConnection
apps.salesChannels.listConnections
apps.salesChannels.invokeConnection
apps.salesChannels.getSpecification
```

IAM broker:

```text
iam.storefrontClients.provision
iam.storefrontCredentials.validate
iam.storefrontCredentials.revokeByConnection
```

Events и broker results не содержат token values.

## Admin frontend

### Navigation

```text
Sales channels
  ├── Apps
  └── Connections
```

Headless App detail:

```text
Headless
  ├── Main website
  ├── Mobile application
  └── Add storefront
```

### Apps page

Запрашивает:

```graphql
availableApps(
  where: {
    extensionKinds: [SALES_CHANNEL]
  }
)
```

Показывает:

- App name;
- install state;
- available specifications;
- delivery mode;
- number of connections.

### Connections page

Columns:

- display name;
- App;
- specification;
- delivery mode;
- connection status;
- effective active;
- health;
- credential provisioning status для Headless;
- updated at.

Actions:

- create;
- continue setup;
- update;
- suspend;
- resume;
- disconnect;
- retry failed lifecycle/provisioning operation.

### Headless storefront detail

Sections:

1. Connection identity/status.
2. Storefront API endpoint.
3. Public credentials.
4. Private credentials metadata.
5. One-time reveal.
6. Scopes.
7. Allowed origins.
8. Rotation/revoke actions.

Private token:

- показывается в one-time modal;
- не сохраняется в UI state дольше modal lifetime;
- не пишется в URL, localStorage, analytics или notification;
- после закрытия повторно не запрашивается.

### Module structure

```text
admin/src/domains/sales-channels/
  apps/
    graphql/
    hooks/
    page/
  connections/
    graphql/
    hooks/
    mappers/
    components/
    modals/
    page/
  headless/
    graphql/
    hooks/
    mappers/
    components/
    modals/
```

Следовать `knowledge/vault/patterns/admin-graphql-layer.md`: generated API types
импортируются напрямую из `@/graphql/types`; output view models не создаются.

## Security checklist

- [ ] Connection queries tenant-scoped.
- [ ] Store/organization IDs не принимаются из mutation input.
- [ ] App может управлять только своими connections.
- [ ] Headless client связан ровно с одним connection.
- [ ] Public credential не имеет privileged scopes.
- [ ] Private token не возвращается query API.
- [ ] Private reveal one-time и TTL-limited.
- [ ] Token hashes используют platform pepper.
- [ ] Token comparison constant-time.
- [ ] Raw tokens отсутствуют в logs/events/traces.
- [ ] Allowed origins применяются только как дополнительная защита.
- [ ] Token определяет tenant и connection.
- [ ] Downstream получает только trusted context.
- [ ] Disconnect отзывает все credentials.
- [ ] Rotation допускает контролируемый overlap.
- [ ] Customer identity не выводится из storefront token.

## Implementation phases

### Phase 0. Contract correction

1. Зафиксировать термины и ownership.
2. Удалить из base design обязательные Markets, publications и feeds.
3. Зафиксировать delivery modes.
4. Зафиксировать typed global ID namespaces.
5. Зафиксировать clean-cutover policy.

Exit criteria:

- connection существует без дополнительных commerce context entities;
- Headless credential model отделена от Apps secrets;
- документация не приписывает Shopify неподтверждённый ownership.

### Phase 1. App manifest v2

Изменить:

```text
packages/app-sdk/src/index.ts
packages/app-runtime/...
services/apps/src/runtime/AppManifestContracts.ts
services/apps/src/runtime/AppsRuntimeHost.ts
```

Работы:

1. Добавить manifest v2.
2. Добавить `extensions.salesChannels`.
3. Добавить delivery modes.
4. Добавить validation.
5. Добавить runtime action verification.
6. Расширить App execution context.
7. Перевести hello-world manifest на v2.

Exit criteria:

- duplicate specification handle отклоняется;
- обычная App работает без extension;
- undeclared operation не запускается;
- manifest hash учитывает extension.

### Phase 2. Apps persistence

1. Добавить specification snapshots.
2. Добавить connections.
3. Добавить lifecycle operations.
4. Добавить tenant-scoped repositories.
5. Добавить optimistic configuration version.
6. Добавить operation idempotency.
7. Добавить typed global IDs.

Exit criteria:

- одна installation имеет несколько connections;
- cross-store lookup запрещён;
- idempotent retry возвращает existing operation;
- disconnected record сохраняется.

### Phase 3. Lifecycle и runtime routing

1. Реализовать lifecycle service/workflow.
2. Реализовать exact-connection router.
3. Связать App suspend/resume/uninstall.
4. Добавить events.
5. Добавить broker contracts.
6. Добавить health.

Exit criteria:

- connections маршрутизируются независимо;
- concurrent channel Apps не деактивируют друг друга;
- connection failure не меняет installation в failed;
- uninstall controlled-disconnects connections.

### Phase 4. Apps Admin GraphQL

1. Добавить extension discovery filter.
2. Добавить specification types.
3. Добавить connection Relay queries.
4. Добавить lifecycle mutations.
5. Добавить federation entity.
6. Добавить user error mapping.
7. Обновить schema composition.

Exit criteria:

- Admin различает App и connection;
- store ID не передаётся клиентом;
- list/totalCount используют единый tenant scope;
- lifecycle mutation возвращает durable operation.

### Phase 5. Bundled Headless App

1. Создать `apps/headless`.
2. Зарегистрировать bundled App.
3. Реализовать connection lifecycle actions.
4. Разрешить несколько storefront connections.
5. Добавить Headless-specific Admin metadata.

Exit criteria:

- Headless устанавливается один раз;
- merchant создаёт несколько storefronts;
- connection не создаёт Market или другую commerce context entity;
- App не хранит Storefront API tokens.

### Phase 6. IAM storefront clients

1. Добавить client/credential/grant/reveal tables.
2. Добавить repositories.
3. Добавить provisioning service.
4. Добавить public/private generation.
5. Добавить one-time reveal.
6. Добавить rotation/revoke.
7. Добавить Admin GraphQL.
8. Добавить audit events.

Exit criteria:

- каждый Headless connection имеет один client;
- public token доступен authorized Admin;
- private token выдаётся один раз;
- rotation имеет overlap;
- DB не хранит постоянный private plaintext.

### Phase 7. Storefront Gateway authentication

1. Добавить IAM validation broker action.
2. Обновить shared storefront middleware.
3. Добавить public/private headers.
4. Убрать `x-api-key` как storefront credential.
5. Перестать доверять `x-store-name` для tenant resolution.
6. Добавить trusted context.
7. Добавить scope enforcement plumbing.
8. Добавить rate limiting и complexity budget.

Exit criteria:

- public и private token валидируются;
- raw token не достигает subgraph;
- tenant/connection разрешаются из credential;
- revoked/disconnected token отклоняется.

### Phase 8. Admin UI

1. Добавить sales-channel Apps page.
2. Добавить connections page.
3. Добавить create/update/disconnect flows.
4. Добавить Headless storefront detail.
5. Добавить public credential management.
6. Добавить one-time private reveal.
7. Добавить rotation/revoke.
8. Добавить scopes/origins UI.

Exit criteria:

- Admin находит Apps через manifest extension;
- Admin видит реальные channels через connections;
- private token не сохраняется клиентом;
- lifecycle и credential provisioning показываются отдельно.

### Phase 9. Legacy cleanup

Удалить:

```text
store.sales_channel
store.market_sales_channel
store.sales_channel_status
store.sales_channel_type
services/project/src/repositories/models/salesChannel.ts
services/project/src/repositories/models/marketSalesChannel.ts
```

Также:

1. Удалить exports legacy models.
2. Удалить legacy GraphQL, scripts и repositories, если существуют.
3. Перегенерировать migrations штатным механизмом.
4. Перегенерировать GraphQL types.
5. Проверить отсутствие fixed channel type enums.

Не создавать:

- backfill;
- compatibility views;
- mapping по uppercase code;
- dual write;
- automatic App-installation-to-connection adapter.

## Verification

Следовать project instructions:

- development/build/migration/codegen/schema operations выполнять через
  `shopana-cli`;
- не использовать `test` или `tsc` как способ проверки;
- для новой версии кода выполнять build.

Сценарии:

1. Установить Headless App.
2. Создать Main Website connection.
3. Создать Mobile App connection той же installation.
4. Проверить independent connection lifecycle.
5. Проверить Admin discovery по extension.
6. Provision public/private credentials.
7. Consume private reveal один раз.
8. Повторный reveal отклоняется.
9. Выполнить запрос public token.
10. Выполнить server-side запрос private token.
11. Проверить wrong origin.
12. Проверить expired/revoked token.
13. Проверить cross-store token isolation.
14. Rotate private token с overlap.
15. Revoke старый private token.
16. Suspend connection.
17. Resume connection.
18. Disconnect connection и проверить revoke всех credentials.
19. Suspend/resume Headless App с несколькими connections.
20. Uninstall Headless App и проверить controlled disconnect.
21. Проверить отсутствие raw token в logs/events/traces.
22. Проверить GraphQL federation composition.
23. Применить migrations на пустой database.
24. Выполнить build затронутых packages/services.

## Acceptance criteria

### Apps

- [ ] Manifest v2 поддерживает sales-channel extension.
- [ ] Sales-channel Apps обнаруживаются по extension, не enum/type.
- [ ] Installation и connection разделены.
- [ ] Одна installation поддерживает несколько connections.
- [ ] Connection ссылается на immutable specification.
- [ ] Exact-connection router не использует global provider selection.
- [ ] Connection lifecycle durable и idempotent.

### Headless

- [ ] Headless — bundled sales-channel App.
- [ ] Один Headless connection соответствует одному storefront.
- [ ] Storefront создаётся без Market/ChannelMarket.
- [ ] Несколько storefronts принадлежат одной installation.
- [ ] Headless App не хранит API token values.

### IAM

- [ ] Один Storefront API client связан с одним Headless connection.
- [ ] Поддерживаются PUBLIC и PRIVATE credentials.
- [ ] Private token выдаётся только one-time reveal.
- [ ] Token hashes защищены platform pepper.
- [ ] Поддерживаются grants, origins, expiration, revoke и rotation.
- [ ] Disconnect отзывает credentials.

### Gateway

- [ ] Credential определяет store и connection.
- [ ] `x-store-name` не является source of truth.
- [ ] Raw token не передаётся downstream.
- [ ] Public/private policies различаются.
- [ ] Trusted context содержит connection identity и scopes.

### Admin

- [ ] Apps list фильтруется по `SALES_CHANNEL` extension.
- [ ] Connections отображаются отдельно от installations.
- [ ] Headless storefront показывает credential metadata.
- [ ] Private token отсутствует в query responses.
- [ ] Rotation/revoke доступны с явным confirmation.

### Cleanup

- [ ] Legacy SalesChannel tables и enums удалены.
- [ ] Нет uppercase channel code identity.
- [ ] Нет обязательного ChannelMarket.
- [ ] Нет обязательной Publication или ProductFeed.
- [ ] Нет backfill, compatibility или dual write.

## Риски

| Риск | Последствие | Мера |
| --- | --- | --- |
| Считать installation каналом | Нельзя создать несколько storefronts/accounts | Отдельный connection aggregate |
| Использовать generic capability slot | Channels деактивируют друг друга | Exact-connection router |
| Хранить token в Apps JSON | Утечка через API/logs | IAM credential store |
| Возвращать private token query API | Повторная компрометация | One-time reveal |
| Доверять store header | Cross-tenant spoofing | Resolve tenant из credential |
| Хранить обычный token hash без pepper | Offline lookup attack | HMAC с platform pepper |
| Делать IAM failure App failure | Нестабильный distributed lifecycle | Отдельный provisioning status/retry |
| Смешать customer и storefront identity | Ошибочная авторизация buyer | Раздельные auth contexts |
| Добавить Markets без требования | Лишний bounded-context coupling | Исключить из base plan |
| Добавить feeds для Headless | Ненужная синхронизация данных | `STOREFRONT_API` delivery mode |

## Definition of done

Работа завершена, когда:

1. Admin находит sales-channel Apps по manifest extension.
2. Headless App устанавливается в store.
3. Merchant создаёт несколько Headless storefront connections.
4. Каждый storefront имеет IAM-managed public/private credentials.
5. Storefront Gateway разрешает store и connection только из credential.
6. Private token поддерживает one-time reveal и rotation.
7. Disconnect отзывает все credentials storefront.
8. Connection lifecycle не требует Market, Catalog, Publication или Feed.
9. Legacy Project SalesChannel model полностью удалена.
10. Admin schema композируется, migrations применяются на пустой database, а
    затронутые packages/services успешно собираются через `shopana-cli`.
