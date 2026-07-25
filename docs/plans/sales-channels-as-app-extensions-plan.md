# План: Sales Channels как Apps

## Статус

- Дата: 2026-07-25.
- Тип: архитектурный и implementation plan.
- Стратегия: clean cutover без backward compatibility, backfill и dual write.
- Основная модель: `AppDefinition -> AppInstallation -> SalesChannelConnection`.

## Цель

Заменить самостоятельную модель `project.sales_channel` на App-driven sales
channels:

- App объявляет поддержку sales channels через versioned manifest extension;
- App устанавливается один раз для store;
- одна installation может создать один или несколько channel connections;
- Admin обнаруживает sales-channel Apps по manifest;
- Admin получает реальные channels из persisted connections текущего store;
- bundled `shopana-online-store` предоставляет Online Store specification;
- first-party и third-party channels используют один connection contract;
- lifecycle App и lifecycle connection остаются раздельными;
- legacy enum типов и строковый channel code удаляются.

## Scope

План включает:

- `packages/app-sdk`;
- `packages/app-runtime`;
- `packages/broker-types`;
- `services/apps`;
- bundled App `apps/online-store`;
- Apps Admin GraphQL;
- удаление legacy sales-channel models из Project Service.

План не добавляет другие commerce-контексты, API credentials, product
distribution, feed synchronization, billing, analytics или attribution.

## Shopify reference model

### App объявляет sales channel через extension

Shopify App становится sales channel через Channel config extension. Extension
содержит channel specifications:

- [Start building a sales channel app](https://shopify.dev/docs/apps/build/sales-channels/start-building)
- [Channel config extension](https://shopify.dev/docs/apps/build/sales-channels/channel-config-extension)

Для Shopana:

```text
App manifest
  └── extensions.salesChannels.specifications
```

### Connection создаётся отдельно от App installation

После установки App и подключения внешнего account App вызывает
`channelCreate`. Mutation получает specification и account identity, а
результатом является отдельный Channel:

- [Shopify `channelCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/channelCreate)
- [Managing channel connections](https://shopify.dev/docs/apps/build/sales-channels/channel-connections)

Для Shopana:

```text
AppInstallation != SalesChannelConnection
```

### Одна App может иметь несколько connections

Shopify поддерживает несколько channel connections для одной App:

- [Multi-channel support for sales channel apps](https://shopify.dev/changelog/multi-channel-support-for-sales-channel-apps)
- [Shopify `Channel`](https://shopify.dev/docs/api/admin-graphql/latest/objects/Channel)

Для Shopana:

```text
AppInstallation
  ├── SalesChannelConnection
  └── SalesChannelConnection
```

`appCode` и `installationId` поэтому не являются channel identity.

## Локальное архитектурное решение Shopana

Публичная документация Shopify не раскрывает внутренние границы их сервисов.
Размещение connection control plane в Apps Service — решение Shopana,
основанное на уже существующих компонентах:

- App installation lifecycle;
- manifest snapshots;
- permissions;
- App runtime registry;
- DBOS workflows;
- App execution context;
- Admin GraphQL.

Apps Service владеет только:

```text
AppDefinition
AppInstallation
SalesChannelSpecification
SalesChannelConnection
SalesChannel lifecycle operations
```

## Domain model

```text
AppDefinition
  └── Manifest version
        └── SalesChannelExtension
              └── SalesChannelSpecification

Store
  └── AppInstallation
        ├── SalesChannelConnection
        └── SalesChannelConnection
```

### Термины

| Термин | Значение |
| --- | --- |
| `AppDefinition` | Bundled App и её manifest |
| `AppInstallation` | Установка App в конкретный store |
| `SalesChannelExtension` | Manifest declaration поддержки channels |
| `SalesChannelSpecification` | Versioned шаблон channel connection |
| `SalesChannelConnection` | Конкретный канал текущего store |
| `SalesChannelOperation` | Durable lifecycle operation connection |

## Инварианты

1. App installation и channel connection — разные entities.
2. Одна installation имеет `0..N` connections.
3. Connection принадлежит ровно одной installation.
4. Connection ID — UUIDv7 и единственная platform identity канала.
5. `appCode`, specification handle и display name не являются connection ID.
6. App без sales-channel extension не может создавать connections.
7. Connection ссылается на immutable specification snapshot.
8. App может управлять только connections своей installation.
9. Connection существует без дополнительных обязательных сущностей.
10. Generic capability slot не используется для enumeration connections.
11. App suspend делает connections runtime-недоступными, не уничтожая state.
12. Ошибка connection не переводит installation в failed state.
13. Disconnect является terminal lifecycle state, а не physical delete.
14. Online Store использует тот же connection aggregate.
15. Online Store App не устанавливается при создании store.
16. Online Store connection не создаётся при установке App.
17. Установка App и создание connection выполняются отдельными явными Admin
    GraphQL mutations.
18. Online Store не использует legacy channel type enum.
19. Tenant scope всегда берётся из trusted request/App context.
20. Lifecycle mutation имеет idempotency key.
21. Manifest update не меняет specification старого connection молча.
22. Legacy uppercase channel code не сохраняется как identity.

## Текущее состояние

### Legacy Project model

`services/project/src/repositories/models/salesChannel.ts` сейчас хранит:

- `id`;
- `storeId`;
- uppercase `code`;
- closed enum `type`;
- `status`;
- `isDefault`;
- `metadata`;
- soft-delete timestamps.

`services/project/src/repositories/models/marketSalesChannel.ts` создаёт
дополнительную legacy association.

Проблемы:

- closed enum требует изменения core platform для нового provider;
- lifecycle дублирует App installation lifecycle;
- один code не выражает несколько accounts одной App;
- Project не владеет App runtime;
- одна строка смешивает definition, installation и connection;
- `isDefault` смешивает channel identity и внешнюю policy.

### Apps Platform

Apps Service уже имеет:

- strict Zod manifest v1;
- runtime registry;
- App installation lifecycle;
- manifest snapshots;
- scopes;
- DBOS lifecycle operations;
- runtime routing;
- Admin GraphQL.

Новая модель расширяет эту платформу изолированным sales-channels module.

### Почему не generic capability

Текущие `slots` и `slot_assignments` выбирают одну реализацию
`capability + operation` и деактивируют конкурирующие assignments.

Sales channels должны работать одновременно:

```text
Online Store
External channel A
External channel B
Second account of External channel A
```

Поэтому connection разрешается по `connectionId`, а не через global provider
selection.

## Manifest contract v2

### Причина новой версии

Текущий manifest strict и принимает только `schemaVersion: 1`. Extension model
является breaking contract и добавляется как `schemaVersion: 2`.

### Contract

```ts
interface SalesChannelSpecification {
  readonly handle: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: string;
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

### Online Store manifest

```ts
export const onlineStoreManifest = defineAppManifest({
  schemaVersion: 2,
  code: "shopana-online-store",
  version: "1.0.0",
  displayName: "Online Store",
  description: "Shopana first-party online storefront channel.",
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
          handle: "online-store",
          label: "Online Store",
          connection: {
            allowMultipleConnections: false,
            requiresExternalAccount: false,
          },
          operations: {
            connect: "channelConnect",
            update: "channelUpdate",
            suspend: "channelSuspend",
            resume: "channelResume",
            disconnect: "channelDisconnect",
            health: "channelHealth",
          },
        },
      ],
    },
  },
  graphql: {
    admin: true,
    storefront: true,
  },
});
```

### Validation

Manifest validator проверяет:

- `handle` соответствует `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`;
- handles уникальны внутри App version;
- label не пустой;
- operation names являются local names;
- все declared operations зарегистрированы App runtime;
- specification не содержит installation-specific configuration;
- specification не содержит credentials;
- обычная App может не иметь sales-channel extension;
- `allowMultipleConnections = false` применяется как database/domain invariant.

## Specification snapshots

Полный manifest уже snapshot-ится Apps Service. Для connection нужна
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

Connection не ссылается на mutable current manifest.

## SalesChannelConnection persistence

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

Для `allowMultipleConnections = false`:

```text
unique (store_id, installation_id, specification_snapshot_id)
where status <> 'DISCONNECTED'
```

Для multiple connections и external accounts:

```text
unique (
  store_id,
  installation_id,
  specification_snapshot_id,
  external_account_id
)
where status <> 'DISCONNECTED'
  and external_account_id is not null
```

## Lifecycle operations

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

Types:

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

### `SalesChannelSpecificationService`

Responsibilities:

- извлекать specifications из manifest v2;
- валидировать contracts;
- создавать immutable snapshots;
- находить snapshot по installation + handle;
- проверять совместимость App update;
- запрещать silent reassignment connection.

### `SalesChannelConnectionStore`

Responsibilities:

- tenant-scoped create/read/update;
- optimistic `configurationVersion`;
- lifecycle row locks;
- operation idempotency;
- ownership checks;
- external account metadata;
- terminal disconnect без physical delete.

### Exact-connection runtime router

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
4. Загружает specification snapshot.
5. Получает declared target action.
6. Проверяет App runtime code/version.
7. Создаёт trusted App execution context.
8. Вызывает только App-владельца connection.

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

### Effective availability

Connection доступен только если:

```text
installation.status == ACTIVE
AND connection.status == ACTIVE
```

App suspend не переписывает statuses всех connections. Он делает их временно
runtime-недоступными.

### App update

1. Сохранить новый manifest snapshot.
2. Создать новые specification snapshots.
3. Найти connections installation.
4. Проверить наличие прежнего handle.
5. Проверить compatibility contract.
6. Выполнить explicit connection UPDATE operation.
7. Переключить snapshot только после успешного operation.

Удаление handle при наличии active connections блокирует App update до явного
disconnect или migration policy.

### App uninstall

1. Запретить новые connection operations.
2. Запустить controlled disconnect всех non-terminal connections.
3. Дождаться terminal results.
4. При failure оставить App uninstall в recoverable failed state.
5. Не удалять connection records каскадом.

## Events и broker contracts

Events:

```text
apps.sales-channel.connection.created.v1
apps.sales-channel.connection.activated.v1
apps.sales-channel.connection.updated.v1
apps.sales-channel.connection.suspended.v1
apps.sales-channel.connection.resumed.v1
apps.sales-channel.connection.disconnected.v1
apps.sales-channel.connection.health-changed.v1
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

Broker actions:

```text
apps.salesChannels.resolveConnection
apps.salesChannels.listConnections
apps.salesChannels.invokeConnection
apps.salesChannels.getSpecification
```

## Apps Admin GraphQL

### Discovery sales-channel Apps

App определяется как sales-channel App только по manifest:

```text
manifest.extensions.salesChannels.specifications.length > 0
```

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

Запрос:

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
        allowMultipleConnections
        requiresExternalAccount
      }
    }
  }
}
```

### GraphQL types

```graphql
type SalesChannelSpecification {
  id: ID!
  appCode: String!
  appVersion: String!
  handle: String!
  label: String!
  allowMultipleConnections: Boolean!
  requiresExternalAccount: Boolean!
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

Lifecycle mutations возвращают connection и durable operation.

Inputs:

- содержат `clientMutationId`;
- configuration update содержит `expectedConfigurationVersion`;
- не принимают `storeId`;
- не принимают `organizationId`;
- не принимают произвольный `appCode`.

## Bundled Online Store App

Создать:

```text
apps/online-store/
  app.manifest.ts
  package.json
  build.config.json
  tsconfig.json
  src/
    OnlineStoreApp.ts
    index.ts
```

Зарегистрировать App в:

```text
services/apps/src/runtime/bundled-apps.ts
services/apps/package.json
```

Online Store App:

- является доступной bundled App;
- устанавливается только явной App install mutation;
- имеет specification `online-store`;
- разрешает только один non-terminal connection на store;
- не требует external account;
- connection `Online Store` создаётся только после отдельной явной Admin
  GraphQL mutation;
- использует общий lifecycle contract;
- не имеет специального enum type;
- не создаёт дополнительных commerce-context entities.

### Explicit Online Store flow

```text
App install mutation
  → install shopana-online-store
  → отдельная Admin GraphQL connection create mutation
  → create Online Store connection
  → lifecycle operation activates connection
```

Правила:

- создание store само по себе ничего не устанавливает;
- установка App сама по себе не создаёт connection;
- повторная install mutation обрабатывается существующей App idempotency;
- второй non-terminal Online Store connection отклоняется;
- disconnect и uninstall используют общие lifecycle mutations;
- Health проверяет runtime availability.

## Security

- [ ] Все connection queries tenant-scoped.
- [ ] Store/organization IDs не принимаются из mutation input.
- [ ] App context совпадает с connection installation.
- [ ] App не может читать connection другой App.
- [ ] Specification принадлежит manifest installation.
- [ ] Configuration не содержит platform secrets.
- [ ] External account metadata не является credential storage.
- [ ] Runtime action существует в manifest snapshot.
- [ ] Typed global IDs декодируются по ожидаемому entity type.
- [ ] Disconnect не выполняет destructive cascade в других contexts.
- [ ] Logs/events не содержат arbitrary configuration.

## Implementation phases

### Phase 0. Contract

1. Зафиксировать термины.
2. Зафиксировать Apps ownership connection control plane.
3. Зафиксировать отсутствие обязательных дополнительных сущностей.
4. Зафиксировать Online Store как bundled App с явной установкой.
5. Зафиксировать global ID namespaces и events.

Exit criteria:

- installation, specification и connection не объединены;
- Online Store использует общий connection aggregate;
- generic capability slot не используется для channels.

### Phase 1. Manifest v2

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
3. Добавить specification validation.
4. Добавить runtime action verification.
5. Расширить App execution context.
6. Перевести hello-world manifest на v2.

Exit criteria:

- duplicate handle отклоняется;
- обычная App работает без extension;
- undeclared action отклоняется;
- manifest hash учитывает extension.

### Phase 2. Apps persistence

1. Добавить specification snapshot model.
2. Добавить connection model.
3. Добавить lifecycle operation model.
4. Добавить repositories.
5. Добавить tenant scopes.
6. Добавить idempotency.
7. Добавить optimistic configuration version.
8. Добавить typed global IDs.

Exit criteria:

- одна installation может иметь несколько connections;
- single-connection specification защищена constraint/domain validation;
- cross-store lookup запрещён;
- disconnected record сохраняется.

### Phase 3. Lifecycle и routing

1. Реализовать specification service.
2. Реализовать connection store.
3. Реализовать DBOS lifecycle workflow.
4. Реализовать exact-connection router.
5. Связать App suspend/resume/update/uninstall.
6. Добавить events.
7. Добавить broker contracts.
8. Добавить health.

Exit criteria:

- connections одной App независимы;
- разные channel Apps работают одновременно;
- connection failure не ломает installation;
- App update проверяет specification compatibility;
- uninstall controlled-disconnects connections.

### Phase 4. Apps Admin GraphQL

1. Добавить extension discovery.
2. Добавить specification types.
3. Добавить connection Relay queries.
4. Добавить lifecycle mutations.
5. Добавить federation entity.
6. Добавить user error mapping.
7. Обновить schema composition.

Exit criteria:

- Admin различает App и connection;
- tenant ID не приходит из client input;
- list и totalCount используют одинаковый scope;
- lifecycle mutation возвращает operation.

### Phase 5. Bundled Online Store

1. Создать `apps/online-store`.
2. Добавить manifest.
3. Реализовать lifecycle actions.
4. Зарегистрировать bundled App.
5. Подключить обычную App install mutation.
6. Подключить обычную connection create mutation.
7. Ограничить specification одним non-terminal connection.

Exit criteria:

- создание store не устанавливает Online Store;
- App устанавливается только явной mutation;
- connection создаётся только явной mutation;
- второй non-terminal Online Store connection отклоняется;
- disconnect и uninstall используют общий lifecycle.

### Phase 6. Legacy cleanup

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

1. Удалить legacy exports.
2. Удалить legacy GraphQL/scripts/repositories, если существуют.
3. Перегенерировать migrations штатным механизмом.
4. Перегенерировать GraphQL types.
5. Проверить отсутствие fixed channel type enums.

Не создавать:

- backfill;
- compatibility views;
- mapping по uppercase code;
- dual write;
- compatibility adapter, автоматически создающий legacy channel.

## Verification

Следовать project instructions:

- development/build/migration/codegen/schema operations выполнять через
  `shopana-cli`;
- не использовать `test` или `tsc` как способ проверки;
- для новой версии кода выполнять build.

Сценарии:

1. Создать новый store и проверить, что Online Store App не установлена.
2. Получить sales-channel Apps через extension filter.
3. Явно установить Online Store App.
4. Проверить отсутствие connection сразу после install.
5. Явно создать Online Store connection.
6. Получить connections текущего store.
7. Попробовать создать второй Online Store connection и получить user error.
8. Установить optional sales-channel App.
9. Создать два connections для multi-connection specification.
10. Проверить independent lifecycle connections.
11. Проверить cross-store isolation.
12. Проверить cross-App ownership.
13. Проверить suspend/resume App.
14. Проверить disconnect connection.
15. Проверить App update compatibility.
16. Проверить controlled uninstall App.
17. Проверить GraphQL federation composition.
18. Применить migrations на пустой database.
19. Выполнить build затронутых packages/services.

## Acceptance criteria

### Architecture

- [ ] Sales-channel App определяется по manifest extension.
- [ ] App installation и connection разделены.
- [ ] Одна installation поддерживает несколько connections.
- [ ] Connection identity — UUID.
- [ ] Connection не требует дополнительных обязательных entities.
- [ ] Generic capability router не выбирает channel.

### Online Store

- [ ] Online Store реализован bundled App.
- [ ] App устанавливается только явной mutation.
- [ ] Для Online Store можно создать не более одного non-terminal connection.
- [ ] Connection создаётся только явной mutation.
- [ ] Нет специального channel type enum.
- [ ] Нет external account requirement.
- [ ] Disconnect и uninstall используют общие lifecycle mutations.

### Apps

- [ ] Specification immutable и versioned.
- [ ] Connection lifecycle durable и idempotent.
- [ ] App update проверяет compatibility.
- [ ] App suspend влияет на effective availability.
- [ ] App uninstall controlled-disconnects connections.
- [ ] App управляет только своими connections.

### API и Admin

- [ ] Discovery фильтрует Apps по `SALES_CHANNEL`.
- [ ] Connections tenant-scoped.
- [ ] GraphQL использует typed global IDs.
- [ ] Admin разделяет installation и connection.
- [ ] Lifecycle operation status виден Admin.

### Cleanup

- [ ] Legacy sales-channel tables удалены.
- [ ] Legacy association удалена.
- [ ] Closed channel type enum удалён.
- [ ] Uppercase channel code не используется как identity.
- [ ] Нет backfill, compatibility или dual write.

## Риски

| Риск | Последствие | Мера |
| --- | --- | --- |
| Считать installation каналом | Нельзя создать несколько accounts | Отдельный connection |
| Использовать generic capability slot | Channels деактивируют друг друга | Exact-connection router |
| Использовать mutable manifest | App update меняет старый connection | Immutable snapshot |
| Хранить channel в Project | Дублируется App lifecycle | Apps ownership |
| Физически удалять connection | Теряется lifecycle history | Terminal disconnect |
| Не проверять tenant scope | Cross-store access | Context-scoped repositories |
| Оставить uppercase code identity | Коллизии multiple connections | UUID connection ID |

## Definition of done

Работа завершена, когда:

1. Sales-channel Apps обнаруживаются по manifest extension.
2. App installation может иметь несколько connections.
3. Online Store App устанавливается только явной mutation.
4. Online Store connection создаётся только явной mutation.
5. Online Store использует общий connection lifecycle.
6. Optional App создаёт независимые connections.
7. Admin GraphQL предоставляет Apps и connections как разные сущности.
8. Legacy Project SalesChannel model полностью удалена.
9. Admin schema успешно композируется.
10. Migrations применяются на пустой database.
11. Затронутые packages/services успешно собираются через `shopana-cli`.
