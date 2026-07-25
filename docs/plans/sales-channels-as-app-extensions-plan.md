# План: Sales Channels как App extensions

## Статус документа

- Дата: 2026-07-25.
- Тип: архитектурный и implementation plan.
- Целевой подход: Shopify-compatible модель `App -> Installation -> Channel specification -> Channel connection`.
- Миграционная стратегия: clean cutover без backward compatibility, backfill и dual write.

## Цель

Перенести владение sales channels из самостоятельной сущности Project Service в
Apps Platform и сделать канал multi-instance extension установленного
приложения.

Итоговая модель должна позволять:

- одной App объявлять несколько типов каналов;
- одной App installation создавать несколько channel connections;
- подключать несколько внешних accounts к одной App installation;
- связывать channel connection с одним или несколькими markets;
- отдельно управлять установкой App и подключениями каналов;
- публиковать каталог в конкретный channel connection;
- использовать один и тот же контракт для first-party и third-party каналов;
- удалять или приостанавливать App без уничтожения исторических и внешних
  cross-service references.

## Scope

План включает:

- `packages/app-sdk`;
- `packages/app-runtime`;
- `packages/broker-types`;
- `services/apps`;
- bundled Apps в `apps/`;
- `services/project`;
- `services/catalog`;
- Admin GraphQL federation;
- Admin frontend;
- platform events и broker contracts;
- удаление существующей модели `project.sales_channel`.

Изменения расчёта корзины, оформления заказа и скидок вынесены за границы этого
плана. План не предусматривает dual-write или временные адаптеры для их текущих
строковых channel fields.

## Shopify reference model

План ориентируется на актуальную multi-channel модель Shopify, а не на legacy
поведение «одна установленная App автоматически создаёт один channel».

Основные источники:

1. [Apps as sales channels](https://shopify.dev/docs/apps/build/sales-channels/index)
   описывает sales channel как App, которая подключает магазин к внешней
   торговой поверхности.
2. [Start building a sales channel app](https://shopify.dev/docs/apps/build/sales-channels/start-building)
   показывает, что App становится sales channel через отдельный channel config
   extension.
3. [Channel config extension](https://shopify.dev/docs/apps/build/sales-channels/channel-config-extension)
   разделяет App и channel specifications. Одна App может объявить несколько
   specifications с разными регионами, валютами, языками и capabilities.
4. [Managing channel connections](https://shopify.dev/docs/apps/build/sales-channels/channel-connections)
   описывает отдельную runtime-сущность channel connection, связывающую
   specification с конкретным merchant account.
5. [Multi-channel support for sales channel apps](https://shopify.dev/changelog/multi-channel-support-for-sales-channel-apps)
   фиксирует модель, в которой одна App создаёт несколько channels на одном
   магазине.
6. [Migrating to a multi-channel app](https://shopify.dev/docs/apps/build/sales-channels/migrating-channel-connection-apis)
   объясняет переход от автоматически созданного legacy channel к явным
   `channelCreate` / `channelUpdate`.
7. [Options to sync product data](https://shopify.dev/docs/apps/build/sales-channels/product-sync)
   описывает варианты синхронизации catalog data.
8. [Contextual product feeds](https://shopify.dev/docs/apps/build/sales-channels/contextual-product-feeds)
   связывает channel specification, regions, languages, markets и product
   feeds.
9. [App extensions](https://shopify.dev/docs/apps/build/app-extensions/index)
   определяет extension как механизм добавления App-функциональности в
   платформу, но не как отдельную App.

### Что именно заимствуется у Shopify

- App installation и channel connection являются разными сущностями.
- Sales channel объявляется через versioned App extension.
- App может иметь несколько channel specifications.
- App installation может иметь несколько channel connections.
- Connection содержит merchant-visible account identity.
- Markets и catalog feeds настраиваются относительно connection.
- Product publication и feedback не являются частью App installation lifecycle.

### Что не копируется буквально

- TOML и Shopify CLI extension packaging не обязательны. Shopana использует
  TypeScript/Zod manifests и bundled runtime.
- Shopify OAuth, billing и App Store review не входят в этот план.
- Shopify Admin API names не должны копироваться, если они конфликтуют с
  существующим Shopana GraphQL naming.
- Shopify-hosted product feeds заменяются Shopana Catalog workflows, events и
  Apps runtime routing.

## Текущее состояние Shopana

### Project Service

`services/project/src/repositories/models/salesChannel.ts` сейчас владеет:

- `sales_channel.id`;
- открытым uppercase `code`;
- enum `type`;
- `status`;
- `isDefault`;
- произвольным `metadata`;
- soft-delete lifecycle.

`services/project/src/repositories/models/marketSalesChannel.ts` связывает
локальный `market` с локальным `sales_channel` через database foreign key.

Проблемы:

- Project Service владеет lifecycle сущности, которая должна создаваться App;
- enum типов закрыт и требует изменения платформы для каждого нового класса
  каналов;
- одна строка `sales_channel` не выражает отдельно App, specification и внешний
  merchant account;
- `isDefault` смешивает connection identity и store policy;
- локальный FK не подходит после переноса владельца connection в Apps Service.

### Apps Platform

Apps Platform уже имеет:

- versioned strict manifest;
- одну non-terminal App installation на `(storeId, appCode)`;
- installation lifecycle через DBOS;
- manifest snapshots;
- granted scopes;
- encrypted installation secrets;
- runtime registry;
- App execution context;
- capabilities и operation routing;
- Admin GraphQL для definition, installation и lifecycle.

Эта база должна быть расширена, а не заменена.

### Ограничение текущего capability router

Текущие `slots` / `slot_assignments` реализуют provider selection:

- route определяется по `capability + operation`;
- resolver выбирает одну активную assignment;
- синхронизация новой capability route деактивирует конкурирующие assignments.

Это корректно для extension point с cardinality `SINGLE`, но некорректно для
sales channels:

- Online Store, POS и marketplace connections должны быть активны одновременно;
- два connections одной App не являются конкурирующими providers;
- connection должен маршрутизироваться по собственному ID, а не только по
  capability name.

Sales channels поэтому нельзя реализовывать как обычную capability
`sales-channel`.

### Catalog Service

Catalog имеет глобальный editorial publish state продукта через `publishedAt`,
но не имеет:

- channel publication;
- product listing membership по channel connection;
- connection-aware feed;
- channel feedback;
- full/incremental sync cursor.

Глобальный `publishedAt` должен остаться eligibility state продукта, а channel
publication должна стать отдельным распределительным слоем.

## Термины

| Термин | Значение | Владелец |
| --- | --- | --- |
| `AppDefinition` | Bundled versioned App и её manifest | Apps runtime |
| `AppInstallation` | Установка App для одного store | Apps Service |
| `SalesChannelExtension` | Manifest extension, объявляющий sales-channel behavior | App manifest |
| `ChannelSpecification` | Immutable versioned описание одного типа target channel | Apps Service |
| `ChannelConnection` | Подключение specification к конкретному внешнему account | Apps Service |
| `ChannelMarket` | Настройка market для channel connection | Project Service |
| `ChannelPublication` | Catalog destination для connection + market context | Catalog Service |
| `ChannelProductListing` | Состояние публикации продукта в destination | Catalog Service |
| `ChannelFeedback` | Ошибка или warning внешнего channel для ресурса | Catalog Service |

## Архитектурные инварианты

1. `AppInstallation != ChannelConnection`.
2. Одна App installation имеет `0..N` channel connections.
3. Один connection принадлежит ровно одной installation.
4. Один connection ссылается на одну immutable specification snapshot.
5. Только manifest с `salesChannels` extension может создавать connections.
6. App не может читать, изменять или маршрутизировать connections другой App.
7. Connection ID — UUIDv7 и единственный platform identity канала.
8. `appCode` и `specificationHandle` не используются как connection identity.
9. Connection lifecycle не дублирует App lifecycle.
10. Неактивная App installation не может обслуживать active connection.
11. Ошибка одного connection не переводит всю installation в failed state.
12. Project и Catalog хранят cross-service UUID без database FK.
13. Disconnect не приводит к cascade delete cross-service history.
14. `Product.publishedAt` и channel listing state — разные понятия.
15. First-party channels используют тот же extension contract, что и
    third-party Apps.
16. Default connection является store policy, а не полем connection.
17. Generic capability slots не используются для перечисления или выбора
    channel connections.
18. Любая lifecycle mutation и full sync имеют idempotency key.
19. Tenant scope всегда берётся из trusted execution/request context.
20. Внешний account secret никогда не хранится в connection JSON.

## Целевая модель

```text
AppDefinition
  └── AppVersion / Manifest
        └── SalesChannelExtension
              ├── ChannelSpecification "amazon-us"
              └── ChannelSpecification "amazon-de"

Store
  └── AppInstallation "amazon"
        ├── ChannelConnection "Amazon US / seller-1"
        ├── ChannelConnection "Amazon US / seller-2"
        └── ChannelConnection "Amazon DE / seller-1"

ChannelConnection
  ├── ChannelMarket
  │     └── Market
  └── ChannelPublication
        ├── ChannelProductListing
        └── ChannelFeedback
```

## Manifest contract v2

### Причина новой версии

Текущий `AppManifestSchema` strict и принимает только `schemaVersion: 1`.
Добавление extension contract должно быть явным breaking change с
`schemaVersion: 2`, а не optional полем, незаметно меняющим семантику v1.

### Предлагаемый TypeScript contract

```ts
interface SalesChannelCountrySpecification {
  readonly code: string;
  readonly languages: readonly string[];
  readonly currencies: readonly string[];
}

interface SalesChannelCapabilities {
  readonly bundles?: boolean;
  readonly digitalProducts?: boolean;
  readonly managedProductFeed?: boolean;
  readonly externalOrderCapture?: boolean;
}

interface SalesChannelRequirements {
  readonly merchantOfRecord: "shopana" | "channel";
  readonly expectsOnlineStoreParity: boolean;
}

interface SalesChannelOperationContracts {
  readonly connect?: string;
  readonly updateConnection?: string;
  readonly disconnect?: string;
  readonly health?: string;
  readonly productBatchUpsert?: string;
  readonly productBatchDelete?: string;
  readonly fullSyncStarted?: string;
  readonly fullSyncCompleted?: string;
}

interface SalesChannelSpecification {
  readonly handle: string;
  readonly label: string;
  readonly icon?: string;
  readonly capabilities: SalesChannelCapabilities;
  readonly requirements: SalesChannelRequirements;
  readonly countries: readonly SalesChannelCountrySpecification[];
  readonly operations: SalesChannelOperationContracts;
}

interface AppExtensions {
  readonly salesChannels?: {
    readonly specifications: readonly SalesChannelSpecification[];
  };
}
```

Пример:

```ts
export const amazonManifest = defineAppManifest({
  schemaVersion: 2,
  code: "amazon",
  version: "1.0.0",
  displayName: "Amazon",
  description: "Publish and sell products on Amazon marketplaces.",
  lifecycle: {
    installWorkflow: "install",
    updateWorkflow: "update",
    suspendAction: "suspend",
    resumeAction: "resume",
    uninstallWorkflow: "uninstall",
    healthAction: "health",
  },
  permissions: [
    "catalog.products.read",
    "catalog.channel-publications.write",
  ],
  capabilities: [],
  extensions: {
    salesChannels: {
      specifications: [
        {
          handle: "amazon-us",
          label: "Amazon US",
          capabilities: {
            bundles: true,
            digitalProducts: false,
            managedProductFeed: true,
            externalOrderCapture: true,
          },
          requirements: {
            merchantOfRecord: "channel",
            expectsOnlineStoreParity: false,
          },
          countries: [
            {
              code: "US",
              languages: ["en"],
              currencies: ["USD"],
            },
          ],
          operations: {
            connect: "channelConnect",
            updateConnection: "channelUpdate",
            disconnect: "channelDisconnect",
            health: "channelHealth",
            productBatchUpsert: "productBatchUpsert",
            productBatchDelete: "productBatchDelete",
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

### Manifest validation

Zod schema должна проверять:

- `handle`: `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`;
- уникальность handles внутри App version;
- непустой label;
- ISO alpha-2 country codes;
- уникальные countries;
- уникальные languages и currencies;
- отсутствие operation names с чужим App prefix;
- required operation contracts для `managedProductFeed`;
- все declared actions реально зарегистрированы App runtime;
- requested permissions покрывают вызовы Catalog Service;
- specification не содержит credentials или installation configuration.

### Manifest snapshots

При install/update Apps Service уже сохраняет полный manifest snapshot. Для
channel connections нужна дополнительно query-friendly immutable projection:

```text
platform.app_sales_channel_specification_snapshots
──────────────────────────────────────────────────
id                    uuidv7 PK
installation_id       FK app_installations
app_code              varchar
app_version           varchar
manifest_hash         varchar
handle                varchar
label                 varchar
definition            jsonb
definition_hash       varchar
created_at            timestamptz
```

Ограничения:

```text
unique (installation_id, app_version, manifest_hash, handle)
unique (installation_id, definition_hash)
```

Projection создаётся внутри Apps lifecycle transaction при успешном install или
update. Connection всегда ссылается на конкретный snapshot ID.

## Apps Service: persistence model

### `app_sales_channel_connections`

```text
platform.app_sales_channel_connections
──────────────────────────────────────
id                         uuidv7 PK
organization_id            uuid
store_id                   uuid
installation_id            FK app_installations
specification_snapshot_id  FK app_sales_channel_specification_snapshots
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

Connection statuses:

| Status | Значение |
| --- | --- |
| `DRAFT` | Connection создан, внешний account ещё не подключён |
| `CONNECTING` | Выполняется durable connect workflow |
| `ACTIVE` | Connection готов принимать platform operations |
| `CONNECT_FAILED` | Connect workflow завершился ошибкой |
| `UPDATING` | Обновляется configuration/specification |
| `UPDATE_FAILED` | Update не завершился |
| `SUSPENDING` | Выполняется suspend |
| `SUSPENDED` | Connection временно недоступен |
| `RESUMING` | Выполняется resume |
| `DISCONNECTING` | Выполняется disconnect |
| `DISCONNECTED` | Terminal state connection |
| `DISCONNECT_FAILED` | Disconnect требует retry или действия merchant |

Health status:

```text
UNKNOWN | HEALTHY | DEGRADED | UNHEALTHY
```

Индексы:

```text
index  (store_id, status, id)
index  (installation_id, status, id)
index  (specification_snapshot_id)
unique (store_id, installation_id, specification_snapshot_id,
        external_account_id)
  where status <> 'DISCONNECTED'
```

`external_account_id` — отображаемая или opaque identity внешнего account, но не
credential. Tokens, API keys и client secrets сохраняются через существующий
`AppInstallationSecretStore` с connection-scoped namespace:

```text
sales-channel/<connection-id>/<secret-name>
```

### `app_sales_channel_operations`

Connection lifecycle должен быть durable и idempotent отдельно от installation
lifecycle:

```text
platform.app_sales_channel_operations
─────────────────────────────────────
id                         uuidv7 PK
connection_id              FK app_sales_channel_connections
type                       enum
status                     enum
target_specification_id    uuid nullable
idempotency_key            varchar
workflow_id                varchar
actor_type                 USER | APP | SERVICE | SYSTEM
actor_id                   varchar nullable
correlation_id             varchar nullable
previous_connection_status enum nullable
error_code                 varchar nullable
error_message              text nullable
started_at                 timestamptz nullable
completed_at               timestamptz nullable
created_at                 timestamptz
updated_at                 timestamptz
```

Operation types:

```text
CONNECT | UPDATE | SUSPEND | RESUME | DISCONNECT
```

Operation statuses:

```text
PENDING | RUNNING | SUCCEEDED | FAILED
```

Ограничения:

```text
unique (connection_id, idempotency_key)
index  (connection_id, created_at)
index  (status, created_at)
```

## Apps Service: domain services и workflows

Добавить:

```text
services/apps/src/sales-channels/
  control-plane/
    SalesChannelConnectionStore.ts
    SalesChannelLifecycleService.ts
    SalesChannelLifecycleWorkflow.ts
    SalesChannelSpecificationService.ts
    SalesChannelAuthorization.ts
    types.ts
  repositories/
    SalesChannelConnectionRepository.ts
    SalesChannelOperationRepository.ts
    SalesChannelSpecificationSnapshotRepository.ts
  runtime/
    SalesChannelRuntimeRouter.ts
    SalesChannelManifestContracts.ts
  resolvers/
    ...
```

### `SalesChannelSpecificationService`

Responsibilities:

- извлечь specifications из manifest v2;
- валидировать уникальность и contracts;
- создать immutable projections при install/update;
- найти active/current snapshot для installation + handle;
- проверить совместимость connection при App update;
- не менять connection автоматически при несовместимом specification.

### `SalesChannelConnectionStore`

Responsibilities:

- tenant-scoped create/read/update;
- optimistic `configurationVersion`;
- row lock lifecycle transitions;
- idempotency lookup;
- хранение safe external account metadata;
- сохранение и очистка connection-scoped secrets;
- запрет operations для чужой installation;
- запрет создания connection из App без extension;
- terminal disconnect без физического удаления строки.

### `SalesChannelLifecycleWorkflow`

Flow `CONNECT`:

1. Зафиксировать connection `DRAFT -> CONNECTING`.
2. Создать idempotent operation.
3. Разрешить exact App runtime по `installationId`.
4. Проверить App installation status `ACTIVE`.
5. Проверить specification snapshot и declared `connect` operation.
6. Построить trusted `AppExecutionContext`.
7. Вызвать App connect workflow/action.
8. Сохранить safe account metadata, возвращённую App.
9. Записать secrets только в secret store.
10. Перевести connection в `ACTIVE`.
11. Emit `apps.sales-channel.connection.activated.v1`.

Flow `UPDATE`:

1. Проверить `expectedConfigurationVersion`.
2. При смене App version выбрать target specification snapshot.
3. Запустить App update contract.
4. Сохранить новую configuration/version.
5. Переключить snapshot только после успешного App callback.
6. Emit `apps.sales-channel.connection.updated.v1`.

Flow `DISCONNECT`:

1. Перевести connection в `DISCONNECTING`.
2. Уведомить Catalog о прекращении новых sync jobs.
3. Выполнить App disconnect contract.
4. Отозвать connection-scoped secrets.
5. Перевести connection в `DISCONNECTED`.
6. Emit `apps.sales-channel.connection.disconnected.v1`.
7. Не удалять cross-service rows каскадом.

### Взаимодействие с App installation lifecycle

`SUSPEND App`:

- новые connection operations запрещаются;
- active connections становятся runtime-unavailable;
- persisted connection status не переписывается массово в `SUSPENDED`;
- эффективная доступность вычисляется как:

```text
installation.status == ACTIVE
AND connection.status == ACTIVE
```

Это сохраняет собственный status connections и позволяет resume App без
потери предыдущего состояния.

`UNINSTALL App`:

- installation workflow должен запустить controlled disconnect всех
  non-terminal connections;
- uninstall завершается только после terminal результата disconnect operations
  либо фиксирует явный recoverable failure;
- после uninstall нельзя создавать или возобновлять connections;
- specification snapshots и disconnected connection records сохраняются для
  разрешения historical references.

`UPDATE App`:

- создать новые specification snapshots;
- сравнить handles существующих connections;
- compatible handle может быть обновлён через отдельную connection UPDATE
  operation;
- удалённый или несовместимый handle блокирует завершение update с понятной
  ошибкой либо требует явной migration policy в manifest;
- молчаливое переподключение account запрещено.

## Runtime routing

Добавить `SalesChannelRuntimeRouter`, который маршрутизирует по
`channelConnectionId`, а не по global capability slot:

```ts
invokeForConnection<TResult, TInput>(
  connectionId: string,
  contract: SalesChannelContract,
  input: TInput,
): Promise<TResult>;
```

Router:

1. Загружает connection в tenant scope.
2. Загружает installation.
3. Проверяет effective availability.
4. Загружает specification snapshot.
5. Получает target action из snapshot.
6. Проверяет, что runtime App code/version соответствует installation.
7. Создаёт `AppExecutionContext` с `installationId`.
8. Добавляет `salesChannelConnectionId` в scoped invocation context.
9. Вызывает только action App-владельца connection.

`AppExecutionContext` расширить:

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

Это не должно менять generic `AppsRuntimeRouter` для обычных capabilities.

## Authorization model

### App-side commands

Создание и изменение connection со стороны App разрешено только когда:

- есть trusted App execution context;
- `context.installationId` совпадает с connection installation;
- `context.storeId` совпадает с connection store;
- specification принадлежит manifest этой App;
- scope разрешает требуемую platform operation.

### Admin-side commands

Merchant через Admin API может:

- начать создание connection;
- передать non-secret configuration;
- начать authorization/onboarding flow;
- suspend/resume connection;
- disconnect connection;
- повторить failed lifecycle operation;
- читать health и last error.

Admin API не должен:

- принимать `storeId` или `organizationId` из input;
- позволять выбрать чужую installation;
- возвращать secrets;
- позволять вручную изменить `appCode`;
- позволять заменить specification без compatibility validation;
- физически удалять connection.

## Apps GraphQL API

### Types

```graphql
enum SalesChannelConnectionStatus {
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
}

type SalesChannelSpecification {
  id: ID!
  appCode: String!
  appVersion: String!
  handle: String!
  label: String!
  definition: JSON!
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
  healthStatus: AppInstallationHealthStatus!
  lastError: AppInstallationError
  createdAt: DateTime!
  updatedAt: DateTime!
  connectedAt: DateTime
  suspendedAt: DateTime
  disconnectedAt: DateTime
}
```

### Queries

```graphql
extend type AppsQuery {
  salesChannelSpecification(id: ID!): SalesChannelSpecification
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
  salesChannelSpecifications: [SalesChannelSpecificationDefinition!]!
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

### Mutations

```graphql
extend type AppsMutation {
  salesChannelConnectionCreate(
    input: SalesChannelConnectionCreateInput!
  ): SalesChannelLifecyclePayload!

  salesChannelConnectionUpdate(
    input: SalesChannelConnectionUpdateInput!
  ): SalesChannelLifecyclePayload!

  salesChannelConnectionSuspend(
    input: SalesChannelConnectionActionInput!
  ): SalesChannelLifecyclePayload!

  salesChannelConnectionResume(
    input: SalesChannelConnectionActionInput!
  ): SalesChannelLifecyclePayload!

  salesChannelConnectionDisconnect(
    input: SalesChannelConnectionActionInput!
  ): SalesChannelLifecyclePayload!
}
```

Все lifecycle inputs содержат `clientMutationId`, а configuration update —
`expectedConfigurationVersion`.

### Global IDs

Добавить entity namespaces в `@shopana/shared-graphql-guid`:

```text
SalesChannelSpecification
SalesChannelConnection
SalesChannelOperation
ChannelMarket
ChannelPublication
ChannelProductListing
ChannelFeedback
```

Resolvers обязаны декодировать ожидаемый entity type, а не generic ID.

## Broker contracts и events

### Apps broker actions

Добавить typed contracts:

```text
apps.salesChannels.resolveConnection
apps.salesChannels.listActiveConnections
apps.salesChannels.invoke
apps.salesChannels.getSpecification
```

`resolveConnection` возвращает только platform-safe projection:

```ts
interface ResolvedSalesChannelConnection {
  readonly id: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly installationId: string;
  readonly appCode: string;
  readonly appVersion: string;
  readonly specificationHandle: string;
  readonly status: "ACTIVE";
}
```

### Domain events

Versioned event names:

```text
apps.sales-channel.connection.created.v1
apps.sales-channel.connection.activated.v1
apps.sales-channel.connection.updated.v1
apps.sales-channel.connection.suspended.v1
apps.sales-channel.connection.resumed.v1
apps.sales-channel.connection.disconnected.v1
apps.sales-channel.connection.health-changed.v1
```

Минимальный envelope:

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

Events не содержат credentials, arbitrary configuration или full specification
JSON.

## Project Service: Channel Markets

### Ownership

Project Service продолжает владеть:

- Markets;
- countries/locales/currencies market configuration;
- store-level default connection policy;
- связью market с внешним channel connection.

Apps Service остаётся единственным владельцем connection identity и lifecycle.

### Замена таблиц

Удалить:

```text
store.sales_channel
store.market_sales_channel
store.sales_channel_status
store.sales_channel_type
```

Добавить:

```text
store.channel_market
────────────────────
id                         uuidv7 PK
store_id                   uuid
market_id                  FK store.market
channel_connection_id      uuid
status                     ACTIVE | INACTIVE
reference_status           VALID | STALE
configuration              jsonb
created_at                 timestamptz
updated_at                 timestamptz
```

Ограничения:

```text
unique (market_id, channel_connection_id)
index  (store_id, channel_connection_id, market_id)
index  (store_id, market_id, status)
```

`channel_connection_id` намеренно не имеет database FK: entity принадлежит
другому bounded context.

### Default connection policy

Вместо `sales_channel.is_default` добавить:

```text
store.store_sales_channel_policy
────────────────────────────────
store_id                       uuid PK
default_channel_connection_id  uuid nullable
updated_at                     timestamptz
```

При изменении policy Project Service:

1. Получает connection через Apps broker.
2. Проверяет совпадение `storeId`.
3. Проверяет effective active state.
4. Сохраняет cross-service UUID.

При disconnect connection event policy очищается либо получает invalid state в
одной явно выбранной domain policy. Рекомендуемый вариант для текущей стадии
проекта — очищать default reference и требовать от merchant выбрать новый
default, не назначая его автоматически.

### Write validation

При `ChannelMarketCreate`:

1. Взять `storeId` из context.
2. Загрузить local Market tenant-scoped.
3. Resolve connection через Apps broker.
4. Проверить `connection.storeId == context.storeId`.
5. Проверить `connection.status == ACTIVE`.
6. Проверить пересечение market countries/languages/currencies со
   specification.
7. Сохранить `referenceStatus = VALID`.

При disconnect event:

- найти все rows по `(storeId, channelConnectionId)`;
- установить `referenceStatus = STALE`;
- перевести active bindings в `INACTIVE`;
- не удалять rows автоматически.

### Project GraphQL

```graphql
type ChannelMarket implements Node @key(fields: "id") {
  id: ID!
  market: Market!
  salesChannelConnection: SalesChannelConnection!
  status: ChannelMarketStatus!
  referenceStatus: ReferenceStatus!
  configuration: JSON!
  createdAt: DateTime!
  updatedAt: DateTime!
}

extend type Market {
  salesChannelConnections(
    first: Int
    after: String
    last: Int
    before: String
  ): ChannelMarketConnection!
}

extend type SalesChannelConnection @key(fields: "id") {
  id: ID! @external
  markets(
    first: Int
    after: String
    last: Int
    before: String
  ): ChannelMarketConnection!
}
```

Mutations:

```text
channelMarketCreate
channelMarketUpdate
channelMarketDelete
storeDefaultSalesChannelConnectionSet
```

Delete удаляет только association `ChannelMarket`, но не connection.

## Catalog Service: publications и feeds

### Разделение publish states

Существующий `product.published_at` остаётся состоянием:

> продукт редакционно готов и может быть опубликован.

Новая channel publication отвечает:

> в каких channel destinations продукт должен присутствовать и что произошло
> при внешней публикации.

Product с `publishedAt = null` не может иметь effective published listing.
Изменение global product state не должно физически удалять listing history.

### `channel_publication`

```text
catalog.channel_publication
───────────────────────────
id                         uuidv7 PK
store_id                   uuid
channel_connection_id      uuid
channel_market_id          uuid nullable
name                       varchar
status                     DRAFT | ACTIVE | PAUSED | ARCHIVED
reference_status           VALID | STALE
sync_mode                  AUTOMATIC | MANUAL
last_full_sync_id          uuid nullable
last_full_sync_at          timestamptz nullable
created_at                 timestamptz
updated_at                 timestamptz
```

Ограничения:

```text
unique (store_id, channel_connection_id, channel_market_id)
index  (store_id, status, id)
index  (store_id, channel_connection_id, status)
```

Ни `channel_connection_id`, ни `channel_market_id` не имеют cross-service FK.

### `channel_product_listing`

```text
catalog.channel_product_listing
───────────────────────────────
id                         uuidv7 PK
store_id                   uuid
publication_id             FK channel_publication
product_id                 FK catalog.product
desired_state              PUBLISHED | UNPUBLISHED
sync_status                PENDING | SYNCING | SYNCED | REJECTED | ERROR
content_revision           bigint
external_resource_id       varchar nullable
last_synced_revision       bigint nullable
last_synced_at             timestamptz nullable
created_at                 timestamptz
updated_at                 timestamptz
```

Ограничения:

```text
unique (publication_id, product_id)
index  (store_id, publication_id, sync_status, product_id)
index  (store_id, product_id, desired_state)
```

`content_revision` фиксирует, какую версию catalog projection требуется
доставить. Повторное изменение продукта обновляет desired revision и делает
listing `PENDING`.

### `channel_resource_feedback`

```text
catalog.channel_resource_feedback
─────────────────────────────────
id                         uuidv7 PK
store_id                   uuid
publication_id             FK channel_publication
listing_id                 FK channel_product_listing
severity                   INFO | WARNING | ERROR
code                       varchar
message                    text
field_path                 text[] nullable
external_reference         varchar nullable
active                     boolean
reported_at                timestamptz
resolved_at                timestamptz nullable
created_at                 timestamptz
updated_at                 timestamptz
```

Feedback write разрешён только App installation, владеющей connection
publication.

### Publication creation

Publication создаётся после создания valid ChannelMarket либо явно merchant
mutation, в зависимости от `sync_mode`.

Рекомендуемый первый вариант:

- `AUTOMATIC`: создать publication при active ChannelMarket;
- `MANUAL`: merchant создаёт publication отдельно;
- default bundled Online Store использует automatic publication.

Перед create Catalog Service:

1. Resolve connection через Apps broker.
2. Resolve ChannelMarket через Project broker.
3. Проверить совпадение store.
4. Проверить, что ChannelMarket ссылается на тот же connection.
5. Сохранить cross-service references.

### Feed contract

Shopana feed строится как immutable batch:

```text
catalog.channel_feed_sync
─────────────────────────
id
store_id
publication_id
kind              FULL | INCREMENTAL
status            PENDING | RUNNING | SUCCEEDED | FAILED
from_revision
to_revision
cursor
workflow_id
started_at
completed_at
error_code
error_message
```

Flow:

1. Catalog выбирает pending listings ограниченным batch.
2. Строит contextual product documents для publication/market.
3. Фиксирует batch и content revisions до внешнего вызова.
4. Через `SalesChannelRuntimeRouter` вызывает exact connection contract
   `productBatchUpsert` или `productBatchDelete`.
5. App возвращает per-item result.
6. Catalog атомарно обновляет listing statuses.
7. Ошибки сохраняются как feedback.
8. Retry использует тот же sync ID и idempotency content.

Нельзя:

- вызывать App по global `sales-channel` capability;
- отправлять products App, которая не владеет connection;
- считать transport success подтверждением всех listing items;
- удалять listing при первой внешней ошибке;
- запускать полный store scan на каждое product update event.

### Full sync

Full sync:

1. Создаёт durable `channel_feed_sync(kind=FULL)`.
2. Snapshot-ит верхнюю catalog revision.
3. Обходит eligible products keyset batches.
4. Создаёт/обновляет desired listing revisions.
5. Доставляет batches exact connection runtime.
6. После snapshot range обрабатывает накопившийся incremental tail.
7. Завершает sync только при согласованном high-water mark.

Повторный request с тем же idempotency key возвращает существующий sync.

### Incremental sync

Catalog product events должны содержать:

```ts
interface ProductChangedForPublication {
  readonly storeId: string;
  readonly productId: string;
  readonly revision: number;
  readonly changedFields: readonly string[];
}
```

Consumer:

- находит publications, где продукт имеет desired listing;
- обновляет только affected listings;
- coalesce-ит несколько revisions до последней;
- не вызывает Apps runtime внутри транзакции product update.

### Catalog GraphQL

```graphql
type ChannelPublication implements Node @key(fields: "id") {
  id: ID!
  salesChannelConnection: SalesChannelConnection!
  channelMarketId: ID
  name: String!
  status: ChannelPublicationStatus!
  syncMode: ChannelPublicationSyncMode!
  products(
    first: Int
    after: String
    last: Int
    before: String
    where: ChannelProductListingWhereInput
    orderBy: [ChannelProductListingOrderByInput!]
  ): ChannelProductListingConnection!
  feedback(
    first: Int
    after: String
    last: Int
    before: String
  ): ChannelFeedbackConnection!
}

extend type SalesChannelConnection @key(fields: "id") {
  id: ID! @external
  publications(
    first: Int
    after: String
    last: Int
    before: String
  ): ChannelPublicationConnection!
}

extend type Product {
  channelListings(
    first: Int
    after: String
    last: Int
    before: String
  ): ChannelProductListingConnection!
}
```

Mutations:

```text
channelPublicationCreate
channelPublicationUpdate
channelPublicationArchive
channelPublicationFullSync
channelProductListingsPublish
channelProductListingsUnpublish
channelResourceFeedbackReport
channelResourceFeedbackResolve
```

Bulk publish/unpublish mutation должна создавать durable operation и возвращать
operation ID, а не удерживать GraphQL request до внешней синхронизации.

## Bundled first-party Apps

### `shopana-online-store`

Создать:

```text
apps/online-store/
  app.manifest.ts
  src/
  package.json
  build.config.json
  tsconfig.json
```

Manifest:

```text
code: shopana-online-store
specification handle: online-store
merchantOfRecord: shopana
managedProductFeed: true
externalOrderCapture: false
```

Bootstrap нового store:

1. Устанавливает bundled App system actor-ом.
2. Создаёт connection `Online Store`.
3. Активирует connection без external account authorization.
4. Связывает connection с default Market.
5. Создаёт automatic Catalog publication.
6. Устанавливает connection как store default policy.

Bootstrap должен быть DBOS workflow с детерминированным ID и idempotent шагами.

### POS и B2B

POS/B2B не реализуются в первой фазе, но будущие bundled Apps обязаны использовать
тот же contract:

```text
shopana-pos
shopana-b2b
```

Нельзя возвращать `sales_channel_type` enum ради first-party distinction.
First-party определяется trusted App distribution metadata, а не channel type.

## Admin frontend

### Information architecture

Apps остаются в Apps section. Sales channels получают отдельный operational
section, построенный поверх installed Apps:

```text
Sales channels
  ├── Connections
  ├── Markets
  ├── Publications
  └── Sync activity
```

App detail показывает:

- available channel specifications;
- active connections;
- connection health;
- onboarding action;
- granted permissions;
- linked markets;
- publication summary.

### Module structure

Следовать `knowledge/vault/patterns/admin-graphql-layer.md`:

```text
admin/src/domains/sales-channels/
  connections/
    graphql/
    hooks/
    mappers/
    components/
    modals/
    page/
  markets/
    graphql/
    hooks/
    mappers/
    components/
    modals/
  publications/
    graphql/
    hooks/
    mappers/
    components/
    modals/
  sync-activity/
    graphql/
    hooks/
    components/
    page/
```

Generated API types импортируются напрямую из `@/graphql/types`; не создавать
отдельные API-output view models.

### Connections page

Columns:

- display name;
- App;
- specification;
- external account label;
- status;
- effective active state;
- health;
- linked markets count;
- publications count;
- updated at.

Actions:

- add connection;
- continue onboarding;
- edit configuration;
- suspend;
- resume;
- disconnect;
- retry failed operation;
- open App details.

### Create connection UX

1. Выбрать installed App с sales channel extension.
2. Выбрать specification.
3. Ввести merchant-visible name.
4. Ввести non-secret initial configuration.
5. Показать permissions и regional coverage.
6. Создать `DRAFT` connection.
7. Запустить App-owned onboarding UI/action.
8. После activation предложить market binding.
9. После market binding предложить publication setup.

UI не должен считать App installed достаточным условием готовности канала.

### Disconnect UX

Confirmation показывает:

- connection identity;
- linked markets;
- active publications;
- что новые sync jobs будут остановлены;
- что App останется установленной;
- что исторические records не удаляются.

После accepted mutation UI показывает lifecycle operation status, а не
оптимистично удаляет строку.

## Federation boundaries

Owning types:

| Type | Owning service |
| --- | --- |
| `AppDefinition` | Apps |
| `AppInstallation` | Apps |
| `SalesChannelSpecification` | Apps |
| `SalesChannelConnection` | Apps |
| `ChannelMarket` | Project |
| `Market` | Project |
| `ChannelPublication` | Catalog |
| `ChannelProductListing` | Catalog |
| `ChannelFeedback` | Catalog |

Extensions:

- Project extends `SalesChannelConnection.markets`.
- Catalog extends `SalesChannelConnection.publications`.
- Catalog extends `Product.channelListings`.
- Apps не резолвит Project или Catalog data напрямую.

Все extended entity resolvers:

- декодируют typed global IDs;
- tenant-scope cross-service lookup;
- используют DataLoader для списков;
- не выполняют N+1 broker calls.

## Failure model

### App runtime unavailable

- connection сохраняет собственный status;
- effective active становится `false`;
- operation получает retryable error;
- Catalog sync остаётся pending/failed с retry state;
- Project associations не удаляются.

### Connection disconnected

- Apps emits terminal event;
- Project marks ChannelMarkets stale/inactive;
- Catalog pauses publications and marks reference stale;
- Admin показывает причину;
- физического cascade delete нет.

### Specification removed by App update

- App update preflight находит affected connections;
- update блокируется до migration policy или disconnect;
- существующие connections не переключаются на случайный handle;
- manifest update error содержит affected connection IDs.

### External account revoked

- connection health становится unhealthy;
- App может emit/report stable error code;
- публикации приостанавливают delivery, но desired state сохраняется;
- merchant проходит reconnect через connection update operation.

### Partial feed failure

- successful items получают `SYNCED`;
- failed items получают `REJECTED` или `ERROR`;
- feedback записывается per item;
- batch operation не теряет per-item result;
- retry выбирает только unsynced revisions.

## Observability

Structured log fields:

```text
appCode
appVersion
installationId
salesChannelConnectionId
specificationHandle
channelMarketId
publicationId
syncId
operationId
storeId
organizationId
correlationId
```

Metrics:

```text
apps_sales_channel_connections_total{status,appCode}
apps_sales_channel_operation_duration_seconds{type,status,appCode}
apps_sales_channel_health_total{health,appCode}
catalog_channel_sync_duration_seconds{kind,status,appCode}
catalog_channel_sync_items_total{result,appCode}
catalog_channel_feedback_active_total{severity,appCode}
project_channel_market_references_total{referenceStatus}
```

Не добавлять external account IDs, secrets и arbitrary configuration в metric
labels.

## Security checklist

- [ ] Все connection queries tenant-scoped.
- [ ] `storeId` и `organizationId` не принимаются из mutation input.
- [ ] App context совпадает с connection installation.
- [ ] App не может получить connection другой App.
- [ ] Connection secret values никогда не возвращаются API.
- [ ] Secret storage использует connection-scoped namespace.
- [ ] Manifest action names валидируются до runtime start.
- [ ] Specification JSON не допускает credentials.
- [ ] Project проверяет cross-service connection перед write.
- [ ] Catalog проверяет ownership connection перед feedback write.
- [ ] Disconnect отзывает connection-scoped secrets.
- [ ] Logs и events не содержат configuration/secrets.
- [ ] Global IDs декодируются по ожидаемому entity type.

## Implementation phases

### Phase 0. Architecture contract

Результат:

- согласованы термины;
- утверждены ownership boundaries;
- зафиксировано отличие capability от multi-instance extension;
- утверждены statuses, events и global ID namespaces;
- утверждён clean-cutover подход.

Файлы:

```text
docs/plans/sales-channels-as-app-extensions-plan.md
knowledge/vault/architecture/... (отдельное обновление после утверждения)
```

Exit criteria:

- нет сущности, одновременно принадлежащей Apps и Project;
- connection, specification и installation не объединены;
- generic slot router не используется для channel enumeration.

### Phase 1. App SDK manifest v2

Изменить:

```text
packages/app-sdk/src/index.ts
packages/app-runtime/...
services/apps/src/runtime/AppManifestContracts.ts
services/apps/src/runtime/AppsRuntimeHost.ts
```

Работы:

1. Добавить discriminated union manifest v1/v2 на этапе parsing.
2. Сделать creation API новых Apps v2-only.
3. Добавить `extensions.salesChannels`.
4. Добавить Zod validation и uniqueness checks.
5. Добавить runtime action contract validation.
6. Расширить `AppExecutionContext`.
7. Обновить manifest GraphQL projection.
8. Обновить hello-world App на schema v2 без sales channel extension.

Exit criteria:

- manifest с duplicate handle отклоняется;
- undeclared action отклоняется при runtime start;
- обычная App работает без sales channel extension;
- manifest snapshot hash учитывает extension definition.

### Phase 2. Apps persistence

Добавить models/repositories/migrations:

```text
app_sales_channel_specification_snapshots
app_sales_channel_connections
app_sales_channel_operations
```

Работы:

1. Drizzle models.
2. Tenant-scoped repositories.
3. Transactional stores.
4. Optimistic configuration version.
5. Operation idempotency.
6. Connection-scoped secret helpers.
7. Specification snapshot projection.
8. Repository pagination/filter/order definitions.

Exit criteria:

- один installation поддерживает несколько connections;
- повтор idempotent command возвращает ту же operation;
- cross-store lookup возвращает not found;
- disconnected row остаётся доступным для historical resolution.

### Phase 3. Apps lifecycle и runtime routing

Работы:

1. Реализовать `SalesChannelLifecycleService`.
2. Реализовать DBOS lifecycle workflow.
3. Реализовать exact-connection runtime router.
4. Связать App suspend/resume/uninstall.
5. Добавить versioned events.
6. Добавить typed broker actions.
7. Добавить structured logging и health projection.

Exit criteria:

- connection lifecycle не меняет installation status;
- два connections одной App маршрутизируются независимо;
- две sales-channel Apps активны одновременно;
- App не может вызвать чужой connection;
- uninstall контролируемо завершает connections.

### Phase 4. Apps Admin GraphQL

Работы:

1. Добавить schema types/inputs/payloads.
2. Добавить typed global IDs.
3. Добавить Relay queries.
4. Добавить lifecycle mutations.
5. Добавить `AppDefinition.salesChannelSpecifications`.
6. Добавить `AppInstallation.salesChannelConnections`.
7. Добавить user error mapping.
8. Обновить federation composition.

Exit criteria:

- API не возвращает secrets;
- lifecycle mutation возвращает operation;
- filters и totalCount используют один tenant scope;
- federation entity resolution работает по typed IDs.

### Phase 5. Bundled Online Store App

Работы:

1. Создать `apps/online-store`.
2. Зарегистрировать bundled definition.
3. Реализовать no-external-account connect contract.
4. Реализовать bootstrap workflow.
5. Создать default connection для нового store.
6. Добавить system distribution metadata.

Exit criteria:

- новый store получает installed Online Store App;
- connection создаётся idempotently;
- повтор bootstrap не создаёт duplicate installation/connection;
- Online Store не использует специальный channel type enum.

### Phase 6. Project Channel Markets

Работы:

1. Добавить `channel_market`.
2. Добавить default connection policy.
3. Добавить Apps broker validation.
4. Добавить disconnect event consumer.
5. Добавить Project GraphQL.
6. Добавить federation extension connection -> markets.
7. Перевести store bootstrap на новый ChannelMarket.
8. Удалить старые SalesChannel repositories/scripts/resolvers, если они
   существуют.

Exit criteria:

- Market связывается с connection другого bounded context без DB FK;
- cross-store association запрещена;
- disconnect делает reference stale;
- default policy не хранится на connection.

### Phase 7. Catalog publications

Работы:

1. Добавить publication/listing/feedback/sync models.
2. Добавить repositories и tenant scopes.
3. Добавить publication lifecycle.
4. Добавить full sync workflow.
5. Добавить incremental product-change consumer.
6. Добавить exact-connection App dispatch.
7. Добавить per-item result/feedback processing.
8. Добавить Catalog GraphQL и federation extensions.
9. Связать Online Store bootstrap с automatic publication.

Exit criteria:

- global product publication не заменяет channel listing state;
- одна connection имеет независимую publication;
- full sync поддерживает retry и high-water mark;
- partial external failure сохраняется per product;
- disconnect pauses publication без удаления desired state.

### Phase 8. Admin UI

Работы:

1. Добавить Connections page.
2. Добавить create/onboarding flow.
3. Добавить connection detail.
4. Добавить lifecycle operation progress.
5. Добавить Market bindings UI.
6. Добавить Publications UI.
7. Добавить Sync activity и feedback.
8. Интегрировать connection summary в App details.
9. Удалить UI, завязанный на fixed channel type enum.

Exit criteria:

- merchant различает installed App и connected channel;
- несколько connections одной App отображаются отдельно;
- disconnect не изображается как uninstall App;
- failed sync и failed connection lifecycle имеют разные UI states.

### Phase 9. Clean cutover

Так как production data отсутствуют и backfill запрещён:

1. Удалить `store.sales_channel`.
2. Удалить `store.market_sales_channel`.
3. Удалить enums `sales_channel_status`, `sales_channel_type`.
4. Удалить Drizzle models и exports.
5. Удалить старые GraphQL types/inputs.
6. Удалить старые broker contracts и fixed channel codes в затронутом scope.
7. Перегенерировать service migrations штатным механизмом.
8. Перегенерировать GraphQL types/codegen.
9. Проверить отсутствие `SalesChannelType`, `marketSalesChannel` и legacy
   uppercase channel constants в Apps/Project/Catalog/Admin scope.

Не создавать:

- compatibility views;
- legacy ID mapping table;
- backfill migration;
- dual-write;
- fallback по channel code;
- автоматическое превращение App installation в connection.

## Verification strategy

Следовать project instruction: не использовать `test` или `tsc` как способ
проверки. Development/build/migration/codegen/schema operations выполнять через
`shopana-cli`.

Проверки по фазам:

1. Build затронутых packages/services через `shopana-cli`.
2. GraphQL schema composition Admin gateway.
3. Применение migrations на пустой database.
4. Bootstrap нового store.
5. Установка двух channel Apps.
6. Создание двух connections для одной App.
7. Создание connections с одинаковым specification, но разными accounts.
8. Создание ChannelMarket.
9. Создание publication.
10. Full sync с partial per-item failure.
11. Retry того же lifecycle/full-sync idempotency key.
12. Suspend/resume одного connection без влияния на второй.
13. Suspend/resume App с сохранением connection states.
14. Disconnect connection и проверка stale references.
15. Uninstall App с несколькими connections.
16. Cross-store и cross-App authorization attempts.
17. Проверка отсутствия secrets в GraphQL, logs и events.

## Acceptance criteria

### Architecture

- [ ] Sales channel реализован как App extension.
- [ ] Installation, specification и connection — разные entities.
- [ ] Одна installation поддерживает несколько connections.
- [ ] First-party Online Store использует тот же contract.
- [ ] Generic capability route не выбирает channel connection.
- [ ] Apps, Project и Catalog имеют однозначное ownership.

### Apps

- [ ] Manifest v2 поддерживает sales channel specifications.
- [ ] Specifications immutable и versioned.
- [ ] Connection lifecycle durable и idempotent.
- [ ] Connection secrets изолированы.
- [ ] App update проверяет compatibility connections.
- [ ] App uninstall не оставляет active runtime connections.

### Project

- [ ] Старый `sales_channel` удалён.
- [ ] ChannelMarket хранит cross-service connection UUID без FK.
- [ ] Default connection хранится как store policy.
- [ ] Disconnect event переводит association в stale/inactive.

### Catalog

- [ ] Channel publication отделена от global product publish state.
- [ ] Listing state хранится per publication/product.
- [ ] Full и incremental sync используют durable operations.
- [ ] App вызывается по exact connection.
- [ ] Feedback хранится per listing.

### API и Admin

- [ ] GraphQL entities используют typed global IDs.
- [ ] Relay lists tenant-scoped.
- [ ] Admin различает App installation и channel connection.
- [ ] Admin показывает lifecycle, health, markets, publications и feedback.
- [ ] API не раскрывает secrets.

### Cleanup

- [ ] Нет `sales_channel_type`.
- [ ] Нет `market_sales_channel`.
- [ ] Нет channel identity на основе `appCode` или uppercase code.
- [ ] Нет compatibility/backfill/dual-write слоя.

## Риски и меры

| Риск | Последствие | Мера |
| --- | --- | --- |
| Использовать generic capability slot | Только один channel provider останется active | Отдельный exact-connection router |
| Считать installation каналом | Нельзя подключить несколько accounts/regions | Отдельная connection entity |
| Хранить текущий manifest без snapshot | App update меняет смысл старых connections | Immutable specification snapshots |
| Cascade delete при uninstall | Потеря cross-service history | Terminal disconnect + stale references |
| Смешать global publish и channel listing | Невозможно выразить разные destinations | Отдельные publication/listing tables |
| Вызвать App внутри catalog transaction | Долгие locks и неатомарный внешний side effect | Durable sync workflow после commit |
| Сохранить secrets в configuration JSON | Утечка через GraphQL/logs | Connection-scoped secret store |
| Автоматически выбрать новый default | Неявное изменение merchant behavior | Очистить policy и запросить выбор |
| Silent specification migration | Connection работает с несовместимой схемой | Update preflight + explicit migration |
| Полный scan на каждое изменение | Нелинейная нагрузка Catalog | Revision-based incremental queue |

## Definition of done

Работа завершена, когда:

1. Новый store получает Online Store как bundled App installation и отдельный
   active channel connection.
2. Third-party App может объявить несколько specifications.
3. Merchant может создать несколько connections одной App.
4. Connections независимо связываются с Markets.
5. Catalog независимо публикует products в каждую connection destination.
6. App suspend, connection suspend и feed failure представлены разными
   состояниями.
7. Disconnect не удаляет cross-service records, а делает references stale.
8. Старые Project SalesChannel tables, enums и code identity полностью удалены.
9. Admin schema успешно композируется.
10. Затронутые packages/services успешно собираются через `shopana-cli`.
