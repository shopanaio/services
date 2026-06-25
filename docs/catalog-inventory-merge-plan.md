# План объединения сервисов Catalog и Inventory

## Цель

Объединить текущие сервисы `catalog` и `inventory` в один runtime-сервис, чтобы каталог товаров, варианты, цены, склады, остатки, физические характеристики и inventory widget жили в одном bounded context и одном GraphQL subgraph.

Документ описывает полный порядок работ: от выбора имени и копирования файлов до очистки конфигурации, federation, bootstrap, e2e/admin ссылок и устаревших артефактов.

## Исходное состояние

### Текущие сервисы

| Сервис | Пакет | Модуль | Назначение |
| --- | --- | --- | --- |
| `catalog` | `@shopana/catalog-service` | `CatalogModule` | Products, variants, categories, tags, options, features, pricing, bundles, collections, facets, media registry |
| `inventory` | `@shopana/inventory-service` | `InventoryModule` | InventoryItem, warehouses, stock, cost, physical dimensions/weight, inventory widget |

### Важные текущие детали

- `services/catalog/src/catalog.module.ts` уже импортирует `CatalogNestService` из файла `inventory.nest-service.ts`; это исторический след переименования.
- Оба сервиса имеют одинаковую базовую структуру: `build.config.json`, `codegen.ts`, `drizzle.config.ts`, `src/api/graphql-admin`, `src/repositories`, `src/scripts`, `src/loaders`, `src/resolvers`.
- `config.yml` содержит отдельные секции `services.catalog` и `services.inventory`.
- `services/bootstrap/src/bootstrap.module.ts` импортирует оба модуля: `InventoryModule` и `CatalogModule`.
- Federation сейчас разделяет ownership:
  - `catalog` владеет `Product`, `Variant`, `Category`, `Tag` и другими catalog-типами.
  - `inventory` расширяет `Variant` через `extend type Variant @key(fields: "id")` и добавляет `inventoryItem`, `sku`, `stock`, `inStock`, `dimensions`, `weight`, cost/widget-поля.
- В `e2e` и `admin` ещё есть ссылки на `inventory-api` и `catalog-api`, поэтому объединение должно включать миграцию клиентских operation paths.

## Целевое решение по имени

### Рекомендуемое имя: `catalog`

Оставить один сервис с runtime-именем `catalog`, пакетом `@shopana/catalog-service`, модулем `CatalogModule` и broker namespace `catalog`.

Причины:

- Product/Variant являются корневыми сущностями домена, а inventory-данные привязаны к variant.
- `catalog` уже содержит больше бизнес-сущностей и является владельцем GraphQL entity types.
- Удаление federation extension внутри одного сервиса проще, чем перенос всего catalog ownership обратно в `inventory`.
- Название лучше соответствует внешней Admin API модели: товарная карточка с inventory-панелями внутри.

### Что переименовать

| Было | Стало |
| --- | --- |
| `services/catalog/src/inventory.nest-service.ts` | `services/catalog/src/catalog.nest-service.ts` |
| `InventoryType` в переносимых inventory resolver base classes | либо `CatalogType`, либо отдельный `InventoryType` как внутренний base class только если это снижает diff |
| `InventoryBrokerActions` при переносе | `CatalogInventoryBrokerActions` или объединить в `CatalogBrokerActions` |
| `InventoryEventHandlers` при переносе | `CatalogInventoryEventHandlers` или объединить в `CatalogEventHandlers` |
| broker calls `inventory.*` | `catalog.*` |
| GraphQL root namespace `inventoryQuery` / `inventoryMutation` | перенести операции в `catalogQuery` / `catalogMutation` без алиасов |

## Стратегия миграции

Работу лучше выполнять как in-place merge в `services/catalog`, а `services/inventory` удалить только после переноса и проверки всех ссылок.

Главный принцип: сначала сделать `catalog` способным обслуживать обе зоны ответственности, затем выключить `inventory` из bootstrap/federation, затем очистить старые файлы.

Важный инвариант: модели базы данных и физическая структура БД не меняются. Это перенос runtime ownership и TypeScript-кода из `inventory` в `catalog`, а не redesign таблиц, колонок, schema namespace или migrations. Drizzle model files переносятся с сохранением существующих table/schema names и без генерации DDL.

## Фаза 1. Инвентаризация перед изменениями

1. Зафиксировать текущий список файлов:
   - `services/catalog/**`
   - `services/inventory/**`
   - `config.yml`
   - `services/bootstrap/src/bootstrap.module.ts`
   - root `package.json` workspaces/dependencies
   - `admin/**`
   - `e2e/**`
   - `schema/**`, `supergraph-*.graphql`, mesh configs, если они есть в рабочем дереве.
2. Найти все runtime-ссылки:
   - `@shopana/inventory-service`
   - `InventoryModule`
   - `inventory.module`
   - `serviceName: "inventory"`
   - `InjectBroker("inventory")`
   - `broker.call("inventory.`
   - `runWorkflow("inventory.`
   - `getServiceConfig("inventory")`
   - `inventory-api/`
   - `catalog-api/`
3. Разделить ссылки на категории:
   - ссылки внутри `services/inventory`, которые будут перенесены;
   - внешние ссылки, которые нужно переписать на `catalog`;
   - документация/архивы, которые можно обновить отдельным cleanup-коммитом или оставить как исторические.

## Фаза 2. Подготовка Catalog как целевого сервиса

1. Переименовать `services/catalog/src/inventory.nest-service.ts` в `catalog.nest-service.ts`.
2. Обновить импорт в `services/catalog/src/catalog.module.ts`.
3. Проверить, что `CatalogNestService` использует:
   - `getServiceConfig("catalog")`;
   - bucket `catalog`;
   - port `services.catalog.ports.admin_graphql`;
   - logger/service name `catalog`.
4. Убрать устаревшие комментарии вроде `Renamed from Inventory to Catalog`.
5. Сохранить `BrokerModule.forFeature({ serviceName: "catalog" })` как единственный broker namespace целевого сервиса.

## Фаза 3. Копирование Inventory файлов в Catalog

Переносить файлы не механически поверх существующих, а по группам.

### 3.1 GraphQL schema

Скопировать из `services/inventory/src/api/graphql-admin/schema/` в `services/catalog/src/api/graphql-admin/schema/`:

- `inventory-item.graphql`
- `inventory-widget.graphql`
- `physical.graphql`
- `stock.graphql`

Не копировать без проверки:

- `base.graphql`
- `relay.graphql`
- `__generated__/base-filters.graphql`
- `__generated__/filters.graphql`

Эти файлы уже есть в `catalog`; их нужно объединять только если inventory-версия содержит недостающие фильтры или общие root-типы.

### 3.2 Resolvers

Скопировать или перенести в `services/catalog/src/resolvers/admin/`:

- `InventoryItemResolver.ts`
- `InventoryItemConnectionResolver.ts`
- `InventoryWidgetResolver.ts`
- `StockResolver.ts`
- `StockConnectionResolver.ts`
- `WarehouseResolver.ts`
- `WarehouseConnectionResolver.ts`
- inventory-specific helpers из `interfaces/`, `filter-normalizers.ts`, если они отличаются от catalog.

`VariantFederationResolver.ts` не переносить как federation resolver в прежнем виде. Его поля нужно встроить в `services/catalog/src/resolvers/admin/VariantResolver.ts`, потому что после объединения `Variant` и inventory-поля находятся в одном subgraph.

`InventoryType.ts`:

- предпочтительно заменить наследование на `CatalogType`;
- если перенос слишком большой, оставить файл как внутренний base class, но без service-level имени `inventory` в GraphQL/broker/config.

### 3.3 GraphQL root resolvers

Объединить методы:

- из `services/inventory/src/resolvers/admin/QueryResolver.ts` в `services/catalog/src/resolvers/admin/QueryResolver.ts`;
- из `services/inventory/src/resolvers/admin/MutationResolver.ts` в `services/catalog/src/resolvers/admin/MutationResolver.ts`;
- из `services/inventory/src/api/graphql-admin/resolvers/types.ts` в catalog `types.ts`.

Правило:

- inventory operations должны стать частью `catalogQuery` / `catalogMutation`;
- `inventoryQuery` / `inventoryMutation` не сохраняются в schema.

### 3.4 Repositories

Скопировать в `services/catalog/src/repositories/`:

- `cost/`
- `inventory-item/`
- `inventory-widget/`
- `physical/`
- `stock/`
- `warehouse/`
- inventory-specific `translation/`, если она содержит warehouse translations, которых нет в catalog translation repository.

Скопировать Drizzle model files в `services/catalog/src/repositories/models/` как есть, сохранив существующие имена таблиц, колонок, индексов, constraints и schema namespace:

- `catalog-refs.ts`
- `cost.ts`
- `inbound-supply.ts`
- `inventory-item.ts`
- `inventory-item-list-views.ts`
- `physical.ts`
- `product-inventory-settings.ts`
- `reservations.ts`
- `stock.ts`
- `stock-changes.ts`
- inventory `translations.ts` только после сравнения с catalog `translations.ts`.

Затем обновить `services/catalog/src/repositories/models/index.ts`, чтобы он экспортировал перенесённые таблицы и views.

Запрещено в рамках этого merge:

- переименовывать таблицы или колонки;
- менять Drizzle definitions ради нового `catalog` ownership;
- менять SQL migrations;
- запускать generation, которая создаёт новую DB migration для перенесённых inventory models.

### 3.5 Repository aggregator

Расширить `services/catalog/src/repositories/Repository.ts`:

- добавить imports для `InventoryItemRepository`, `InventoryWidgetRepository`, `CostRepository`, `PhysicalRepository`, `StockRepository`, `WarehouseRepository`;
- добавить public readonly поля:
  - `inventoryItem`
  - `inventoryWidget`
  - `cost`
  - `physical`
  - `stock`
  - `warehouse`
  - при необходимости `warehouseTranslation`;
- создать инстансы в `Repository.create`;
- передать их в constructor.

После объединения комментарий `Does not contain inventory-related repositories` нужно удалить.

### 3.6 Loaders

Скопировать в `services/catalog/src/loaders/`:

- `InventoryItemLoader.ts`
- `StockLoader.ts`
- `WarehouseLoader.ts`

Обновить `services/catalog/src/loaders/Loader.ts`:

- добавить inventory item loaders;
- добавить stock loaders;
- добавить warehouse loaders;
- убедиться, что `VariantResolver` использует loaders вместо прямых N+1 запросов.

### 3.7 Scripts

Скопировать в `services/catalog/src/scripts/`:

- `inventory-item/`
- `warehouse/`
- inventory-specific DTO/types, если их нет в catalog.

Сравнить `GetOffersScript.ts` и `processInventoryUpdate.ts`: в обоих сервисах есть файлы с одинаковыми именами, поэтому их нельзя перезаписывать без diff. Нужно объединить поведение вручную.

Обновить `services/catalog/src/scripts/index.ts`, чтобы экспортировать новые scripts.

### 3.8 Broker actions и event handlers

Перенести:

- `services/inventory/src/InventoryBrokerActions.ts`
- `services/inventory/src/InventoryEventHandlers.ts`

Варианты целевой структуры:

- `services/catalog/src/actions/CatalogInventoryBrokerActions.ts`
- `services/catalog/src/handlers/CatalogInventoryEventHandlers.ts`

Затем зарегистрировать providers в `CatalogModule`.

Все action names сменить с `inventory.*` на `catalog.*`.

## Фаза 4. Объединение GraphQL Federation

### 4.1 Убрать cross-subgraph extension

В inventory schema сейчас ожидается `extend type Variant @key(fields: "id")`. После объединения это должно стать обычными полями на `type Variant` в `services/catalog/src/api/graphql-admin/schema/variant.graphql`.

Перенести поля:

- `inventoryItem`
- `sku`
- `dimensions`
- `weight`
- `stock`
- `inStock`
- cost/widget-поля, если они сейчас доступны через Variant.

Удалить или не переносить:

- `extend type Variant`
- `id: ID! @external`
- federation resolver `Variant.__resolveReference`, если он был нужен только inventory subgraph.

`Product`, `Variant`, `InventoryItem`, `Warehouse` могут оставаться `@key(fields: "id")`, если entity resolution нужна gateway или другим сервисам.

### 4.2 Объединить root schema

В `base.graphql` или соответствующих schema-файлах проверить:

- нет ли двух определений `type Query`;
- нет ли двух определений `type Mutation`;
- namespace root fields не конфликтуют;
- scalar/directive definitions приходят только из shared references или одного локального места.

### 4.3 Обновить codegen

После изменения schema выполнить генерацию через проектный CLI:

```bash
shopana codegen --service catalog
```

Если в проекте используется npm wrapper, использовать его, но не запускать `test` или `tsc`.

Сгенерированные файлы допустимо обновлять:

- `services/catalog/src/resolvers/admin/generated/types.ts`
- `services/catalog/src/resolvers/admin/generated/schemas.ts`
- schema filter files, если команда их обновляет.

## Фаза 5. Перенос DB ownership без изменения базы

### 5.1 Drizzle models

Целевой `services/catalog/drizzle.config.ts` уже указывает на `./src/repositories/models/index.ts`. После добавления inventory model files catalog repository сможет обращаться к уже существующим inventory tables.

Правило для этой фазы: никаких изменений физической БД.

Проверить:

- перенесённые model files указывают на те же physical table names, что и в `services/inventory`;
- schema-level namespace, если он есть в models, сохранён без переименования;
- catalog repositories используют перенесённые models без попытки создать новые таблицы;
- `services/catalog/src/repositories/models/index.ts` экспортирует перенесённые models, но сами model definitions не меняют shape базы.

### 5.2 Migrations

Не копировать inventory migration files в catalog как новые migration files и не генерировать новую migration для этого merge. Уже применённые inventory migrations остаются историей создания текущих таблиц; merge сервиса не должен повторно применять DDL.

Рекомендуемый порядок:

1. Оставить существующие inventory tables без физического rename.
2. Добавить catalog models, которые указывают на существующие таблицы.
3. Не запускать `db generate` / migration generation для этого переноса.
4. Не редактировать существующие SQL migration files.
5. Удаление `services/inventory` из runtime делать только после подтверждения, что catalog repositories работают с теми же таблицами.

Если позже понадобится изменить структуру БД, это должна быть отдельная задача и отдельный план, не часть текущего merge.

### 5.3 S3 bucket

В `config.yml` сейчас:

- `catalog.s3.bucket: catalog`
- `inventory.s3.bucket: inventory`

Нужно выбрать одну стратегию:

- оставить `catalog` как основной bucket и мигрировать inventory objects, если они реально используются.

План должен явно проверить, есть ли inventory service реально пишет в S3. Если нет, удалить inventory bucket config без data migration.

## Фаза 6. Конфигурация runtime

### 6.1 `config.yml`

Удалить секцию:

```yaml
services:
  inventory:
```

Сохранить в `services.catalog`:

- `ports.admin_graphql`;
- `ports.metrics`;
- `db`;
- `s3`;
- любые настройки, которые были нужны inventory и теперь нужны catalog.

Старый inventory subgraph endpoint не публиковать. В целевом состоянии отдельного `inventory` service config быть не должно.

### 6.2 Bootstrap

В `services/bootstrap/src/bootstrap.module.ts`:

- удалить import `InventoryModule` из `@shopana/inventory-service`;
- удалить `InventoryModule` из массива imports;
- оставить `CatalogModule`.

### 6.3 Package/workspaces

Проверить root `package.json`:

- удалить workspace/package reference на `services/inventory`, если workspaces перечислены явно;
- удалить зависимости на `@shopana/inventory-service`;
- оставить `@shopana/catalog-service`;
- если `@shopana/inventory-plugin-shopana` нужен в объединённом сервисе, перенести dependency из `services/inventory/package.json` в `services/catalog/package.json`.

`services/catalog/package.json` обновить:

- description: catalog + inventory domain;
- dependencies: добавить inventory plugin dependency, если используется перенесённым кодом.

`services/inventory/package.json` удалить вместе с сервисом только после завершения фазы очистки.

## Фаза 7. Обновление Admin frontend и e2e operation paths

### 7.1 GraphQL operation files

Найти и обновить:

- `admin/**/inventory-api/*`
- `e2e/queries/inventory-api/*`
- вызовы `api.admin.query("inventory-api/...")`
- вызовы `api.admin.mutation("inventory-api/...")`

Целевой путь:

- `catalog-api/...`, если операции теперь входят в catalog schema;
- либо новый унифицированный каталог operation namespace, если в e2e уже есть соглашение для generated operations.

### 7.2 GraphQL payload paths

Если root namespace меняется:

- `data.inventoryQuery.*` -> `data.catalogQuery.*`
- `data.inventoryMutation.*` -> `data.catalogMutation.*`

Все e2e/admin обращения должны быть переведены на catalog namespace в рамках этого merge.

### 7.3 Generated Admin types

После schema/codegen обновить admin GraphQL generated types через проектный codegen pipeline. Не редактировать generated types вручную.

## Фаза 8. Очистка старого Inventory сервиса

Удалить только после того, как `catalog` компилируется с перенесёнными inventory частями.

Удалить:

- `services/inventory/src/**`
- `services/inventory/build.config.json`
- `services/inventory/codegen.ts`
- `services/inventory/drizzle.config.ts`
- `services/inventory/package.json`
- `services/inventory/migrations/**`, если migration ownership больше не нужен в репозитории;
- `services/inventory/dist/**`, если dist хранится в репозитории как артефакт;
- `services/inventory/.env`, `.gitignore`, README/ARCHITECTURE после переноса актуальной информации.

Не удалять автоматически:

- исторические документы в `docs/`, если они нужны для контекста;
- archived e2e tests без отдельного решения;
- changeset files. По правилу проекта changeset файлы вручную не редактировать.

## Фаза 9. Проверки и генерация

По правилам проекта не запускать `test` и `tsc`.

Разрешённые проверки:

1. Поисковые проверки:
   - `rg "@shopana/inventory-service"`
   - `rg "InventoryModule"`
   - `rg "serviceName: ['\"]inventory"`
   - `rg "InjectBroker\\(['\"]inventory"`
   - `rg "broker\\.call\\(['\"]inventory\\."`
   - `rg "runWorkflow\\(['\"]inventory\\."`
   - `rg "getServiceConfig\\(['\"]inventory"`
   - `rg "inventory-api/"`
2. GraphQL/codegen generation:
   - `shopana codegen --service catalog`
   - `shopana schema --action build`
3. Build, когда нужна новая версия кода:
   - запускать через `shopana-cli` MCP tools, если доступно;
   - либо существующий npm build wrapper проекта, но не `test` и не `tsc`.

Не запускать для этой задачи:

- `shopana db generate`;
- любые команды генерации migrations;
- ручные изменения SQL migration files.

`npm install` запускать только вне sandbox с запросом разрешения, если после удаления/переноса packages меняется lockfile.

## Фаза 10. Rollout

Сразу удалить `inventory` subgraph и namespace.

Требования:

- не оставлять `inventoryQuery` / `inventoryMutation`;
- не оставлять `inventory-api` operation paths;
- не публиковать старый inventory endpoint;
- не оставлять broker actions с namespace `inventory.*`;
- атомарно обновить admin, e2e и внутренних клиентов на `catalog`.

## Риски

| Риск | Митигация |
| --- | --- |
| Повторное применение inventory migrations | Не копировать старые migrations как новые, не генерировать migrations для этого переноса; подключить models к существующим таблицам |
| Случайное изменение DB schema через Drizzle models | Переносить model files без изменения table/schema names, колонок, индексов и constraints |
| Дубли GraphQL типов после копирования schema | Переносить inventory schema вручную, убрать `extend type Variant` и external fields |
| Сломанные broker/workflow names | Атомарно переписать все `inventory.*` calls на `catalog.*` |
| N+1 после переноса Variant inventory fields | Перенести DataLoader и подключить их в catalog `Loader.ts` |
| Admin/e2e ждут `inventory-api` paths | Мигрировать все operation paths на catalog в рамках merge |
| Скрытые зависимости на package name | Проверить root package, bootstrap, imports, generated configs, e2e helpers |
| S3 данные inventory bucket | Проверить фактическое использование bucket и выбрать стратегию переноса данных |

## Итоговый чеклист

- [ ] Принято целевое имя `catalog`.
- [ ] `CatalogNestService` переехал в `catalog.nest-service.ts`.
- [ ] Inventory GraphQL schema перенесена в catalog schema без federation extension.
- [ ] Inventory resolvers перенесены и подключены к catalog root/type resolvers.
- [ ] Inventory repositories/models/loaders/scripts перенесены в catalog.
- [ ] Drizzle model files перенесены без изменения physical DB schema/table/column definitions.
- [ ] Новые DB migrations не генерировались и SQL migration files не редактировались.
- [ ] `Repository.ts` catalog содержит inventory repositories.
- [ ] Broker actions/event handlers перенесены и зарегистрированы в `CatalogModule`.
- [ ] Все runtime `inventory.*` broker/workflow calls переписаны на `catalog.*`.
- [ ] `config.yml` больше не запускает отдельный `inventory` service.
- [ ] `BootstrapModule` больше не импортирует `InventoryModule`.
- [ ] `@shopana/inventory-service` удалён из workspace/dependencies.
- [ ] Admin/e2e operation paths обновлены с `inventory-api` на целевой catalog path.
- [ ] Codegen/schema build выполнены через проектный pipeline.
- [ ] Build выполнен, если нужна новая версия кода.
- [ ] `services/inventory` удалён после успешной проверки ссылок.
- [ ] Changeset не редактировался вручную.

## Строгий порядок выполнения

1. Зафиксировать текущие ссылки на `catalog`, `inventory`, `inventory-api`, `catalog-api`, `InventoryModule`, `@shopana/inventory-service`, `inventory.*` broker/workflow calls и `getServiceConfig("inventory")`.
2. Переименовать `services/catalog/src/inventory.nest-service.ts` в `services/catalog/src/catalog.nest-service.ts` и обновить imports.
3. Привести `CatalogNestService` к runtime-имени `catalog`: config, bucket, port, logger/service name и broker namespace.
4. Перенести inventory GraphQL schema files в catalog schema без `extend type Variant`, `@external` и старых root namespaces.
5. Добавить inventory-поля прямо в catalog `Variant` schema и `VariantResolver`.
6. Перенести inventory resolvers в catalog и подключить их к `catalogQuery` / `catalogMutation`.
7. Удалить из целевой schema root namespaces `inventoryQuery` / `inventoryMutation`.
8. Перенести inventory Drizzle model files в catalog models без изменения table/schema names, колонок, индексов и constraints.
9. Обновить catalog `repositories/models/index.ts`, чтобы он экспортировал перенесённые inventory models.
10. Перенести inventory repositories в catalog.
11. Расширить catalog `Repository.ts` inventory repositories и удалить устаревший комментарий про отсутствие inventory repositories.
12. Перенести inventory loaders в catalog и подключить их в `Loader.ts`.
13. Перенести inventory scripts в catalog, вручную объединив конфликтующие `GetOffersScript.ts` и `processInventoryUpdate.ts`.
14. Перенести broker actions и event handlers в catalog.
15. Переименовать все runtime broker/workflow actions с `inventory.*` на `catalog.*`.
16. Переписать все внешние runtime-вызовы `inventory.*` на `catalog.*`.
17. Проверить фактическое использование inventory S3 bucket и выполнить выбранную стратегию переноса данных, если bucket используется.
18. Удалить `services.inventory` из `config.yml` и перенести нужные inventory настройки в `services.catalog`.
19. Удалить `InventoryModule` и `@shopana/inventory-service` из `services/bootstrap/src/bootstrap.module.ts`.
20. Обновить package dependencies: убрать `@shopana/inventory-service`, оставить `@shopana/catalog-service`, перенести нужные inventory plugin dependencies в catalog.
21. Обновить Admin frontend operation paths с `inventory-api` на catalog path.
22. Обновить e2e operation paths с `inventory-api` на catalog path.
23. Обновить payload paths с `data.inventoryQuery.*` / `data.inventoryMutation.*` на `data.catalogQuery.*` / `data.catalogMutation.*`.
24. Выполнить `shopana codegen --service catalog`.
25. Выполнить admin GraphQL codegen pipeline для generated Admin types.
26. Выполнить `shopana schema --action build`.
27. Проверить, что generated federation artifacts больше не содержат inventory subgraph.
28. Выполнить поисковые проверки из фазы 9 и устранить все runtime-ссылки на старый inventory service/API.
29. Выполнить build через проектный pipeline, если нужна новая версия кода.
30. Только после успешной генерации, schema build, поисковых проверок и build удалить старый `services/inventory`.
31. После удаления package при необходимости обновить lockfile через `npm install` вне sandbox с запросом разрешения.
32. Не запускать `test`, `tsc`, `shopana db generate` и migration generation на всём протяжении merge.
33. Не редактировать SQL migrations и changeset files вручную.
