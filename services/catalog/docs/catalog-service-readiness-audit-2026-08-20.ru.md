# Аудит готовности Catalog Service

**Дата аудита:** 2026-08-20  
**Статус:** service not ready  
**Оценка готовности:** 55% ± 10%  
**Критерий оценки:** всё заявленное публичное API и связанная с ним бизнес-логика должны быть завершены и подтверждены автоматизированными проверками.

## 1. Итоговый вывод

Catalog Service содержит значительный объём рабочего кода: модели и миграции основных доменов, Admin и Storefront GraphQL, DBOS workflows, broker actions, checkout snapshots, inventory reservations, comparison и configurable product components. Это уже не прототип.

При этом сервис не удовлетворяет строгому критерию завершённости. В публичном контракте присутствует как минимум одна гарантированно неработающая операция, Relay Node API покрывает лишь часть объявленных Node-типов, media lifecycle допускает некорректные и висячие ссылки, создание вариантов не обеспечивает целостность option selections, а значительная часть e2e-набора либо является placeholder, либо рассинхронизирована с текущей схемой.

До устранения блокирующих findings сервис нельзя считать API-complete или production-ready.

## 2. Методика и ограничения

Аудит выполнен статически по следующим источникам:

- Admin GraphQL SDL: `src/api/graphql-admin/schema/`;
- Storefront GraphQL SDL: `src/api/graphql-storefront/schema/`;
- root, entity и connection resolvers;
- scripts, sagas и DBOS workflows;
- broker actions и event handlers;
- repositories, Drizzle models и SQL migrations;
- активные e2e-файлы под `e2e/tests/` и их GraphQL operations;
- архитектурные правила из `AGENTS.md` и `knowledge/vault/`.

В соответствии с правилами проекта не запускались:

- tests и Playwright;
- `tsc`;
- dev/start server;
- browser;
- schema/codegen commands.

Build также не запускался: новая версия кода не создавалась, аудит не изменяет runtime implementation. Поэтому оценка отражает статически подтверждённую готовность, а не результат выполнения полного runtime acceptance suite.

## 3. Фактический scope сервиса

### 3.1. Домены данных

В текущем Catalog Service находятся:

- products и localized product content;
- variants;
- vendors;
- categories, hierarchy и product ordering;
- tags;
- product options, option categories, values и swatches;
- features и feature values;
- product/category/collection media references и SEO;
- warehouses, inventory items, stock, reservations и inbound supply;
- price/cost history и price ranges;
- product components, groups, items, pricing templates и dependency rules;
- comparison profiles и product comparison configuration;
- manual/rule collections;
- bulk product edit;
- listing/facet read models;
- checkout merchandise, delivery facts и inventory reservation broker contracts.

### 3.2. Admin GraphQL entry points

Admin API объявляет три query namespace:

- `catalogQuery`;
- `inventoryQuery`;
- `widgetQuery`.

И два mutation namespace:

- `catalogMutation`;
- `inventoryMutation`.

Основные объявленные read operations:

- Relay `node` и `nodes`;
- product/products;
- variant/variants;
- vendor/vendors;
- product option category/categories;
- category/categories;
- collection/collectionByHandle/collections;
- tag/tags;
- bulk update job/jobs;
- comparison profile/profiles и product comparison configuration;
- warehouse/warehouses;
- inventory item/items и lookup by variant;
- warehouse-assignable variants;
- pricing и inventory widgets.

Основные mutation families:

- product create/update/delete и bulk update;
- option category create/update/delete;
- category create/update/move/rebalance/delete;
- collection lifecycle, manual membership, rules и preview;
- tag create/update/delete;
- comparison profile/configuration mutations;
- warehouse lifecycle;
- warehouse stock create/delete.

### 3.3. Storefront GraphQL entry points

Storefront API объявляет:

- Relay `node` и `nodes`;
- product by ID и handle;
- product variant by ID;
- category by ID и handle;
- category connection;
- collection by ID и handle;
- product presentation, availability, variants, options, features, comparison и components;
- category/collection/product/variant media connections;
- federated `Customer.productComparisons`.

Buyer-side Catalog mutations намеренно отсутствуют, кроме технического `_catalog` field. Это соответствует заявленному разделению ответственности между Catalog и Checkout/Cart.

### 3.4. Broker API и workflows

Реализованы broker entry points для:

- typed Catalog snapshot query;
- customer comparison variant validation;
- Loyalty reference validation;
- checkout merchandise snapshot;
- checkout delivery facts;
- listing facet affected products;
- collection listing snapshot;
- facet source/value candidates;
- inventory reserve/release/renew/confirm;
- inventory item create/delete/update;
- variant cost lookup.

Основные durable workflows/sagas:

- product create;
- product update;
- category update;
- product bulk edit;
- collection mutation/rules preview/product sync;
- media back-reference notification;
- entity deletion notification.

## 4. Сводная оценка

| Область | Оценка | Статус | Основная причина |
| --- | ---: | --- | --- |
| Products / variants / options / features | ~65% | Частично готово | Большой CRUD/update workflow, но create-path не гарантирует корректные option selections и атомарность |
| Categories / tags / vendors | ~75% | Близко к готовности | Основные операции реализованы; остаются Node/media/integration gaps |
| Collections | ~40% | Не готово | `collections` отсутствует, acceptance specs являются placeholder |
| Inventory / stock / pricing | ~65% | Частично готово | Основная логика присутствует, но контракт и e2e-набор рассинхронизированы; low-stock handler пуст |
| Storefront API | ~60% | Частично готово | Publication filtering реализован, media polymorphism нарушен |
| Comparison | ~65% | Частично готово | Существенная реализация есть, но интеграционное покрытие недостаточно |
| Product components | ~65% | Частично готово | Модель и resolver layer широкие, Node API и acceptance confidence неполны |
| Broker/checkout integration | ~70% | Частично готово | Контракты и services реализованы, но нет достаточного полного evidence |
| Media lifecycle/federation | ~40% | Не готово | Raw IDs, неверный concrete media type, неполная cleanup-логика, слабая preflight validation |
| Automated verification | ~35% | Не готово | Placeholder suites, conditional skips и schema drift |

Итоговая оценка 55% является инженерной оценкой, а не арифметическим средним. Блокирующие контрактные и data-integrity defects имеют больший вес, чем количество уже написанных классов и миграций.

## 5. Блокирующие findings

### CAT-001 — `CatalogQuery.collections` объявлен, но отсутствует

**Severity:** Blocker  
**Область:** Admin GraphQL / Collections

Schema объявляет:

```graphql
collections(first: Int, after: String, last: Int, before: String): CollectionConnection!
```

В `src/resolvers/admin/QueryResolver.ts` вместо метода находится:

```ts
// TODO: Implement collections() with keyset pagination
```

**Эффект:** GraphQL default field resolution не найдёт функцию/значение `collections`. Поскольку return type non-null, запрос завершится execution error и null-propagation.

**Что должно быть завершено:**

- store-scoped Collection repository connection;
- forward/backward keyset pagination;
- deterministic tie-breaker;
- totalCount независимо от page size;
- исключение soft-deleted rows;
- malformed/stale cursor errors;
- Admin visibility: drafts, scheduled и inactive collections должны присутствовать;
- реальные e2e tests для isolation и pagination.

### CAT-002 — Relay `catalogQuery.node/nodes` покрывает лишь малую часть Node-типов

**Severity:** Blocker  
**Область:** Admin GraphQL / Relay

В Admin SDL более 30 типов реализуют `Node`. Текущий `CatalogQueryResolver.node` распознаёт только:

- Product;
- ComparisonProfile;
- ComparisonGroup;
- ComparisonField;
- ComparisonFieldOption.

Он не разрешает, среди прочих:

- Variant;
- Vendor;
- Category;
- Collection;
- Tag;
- ProductOption, ProductOptionCategory, ProductOptionValue и ProductOptionSwatch;
- ProductFeature и ProductFeatureValue;
- VariantPrice и VariantCost;
- все ProductComponent Node-типы.

Inventory namespace отдельно покрывает Warehouse, InventoryItem и WarehouseStock, но это не исправляет контракт `catalogQuery.node` для catalog-owned типов.

**Эффект:** корректный Global ID существующего объекта возвращает `null`, хотя тот же объект доступен через dedicated query или nested field.

**Что должно быть завершено:** единый registry `GlobalIdEntity -> existence loader -> resolver`, используемый и `node`, и `nodes`, с tests для каждого Node type, malformed ID, wrong namespace, deleted entity и tenant isolation.

### CAT-003 — Нарушена сериализация Global ID для части Admin media API

**Severity:** High  
**Область:** Admin GraphQL / Federation

`CollectionResolver.media` возвращает `row.fileId` как обычный UUID, хотя federated `File.id` должен использовать `GlobalIdEntity.File` encoding.

`OptionValueResolver.swatch` аналогично возвращает:

- raw `swatch.id`, хотя `ProductOptionSwatch implements Node`;
- raw `swatch.imageId` для federated File reference.

Product, Variant, Category и SEO resolvers используют Global ID encoding корректно, поэтому поведение внутри одного API непоследовательно.

**Эффект:** federation reference resolution и Relay clients получают ID неправильного формата; file lookup может завершаться decode error.

### CAT-004 — Storefront media всегда объявляется как `MediaImage`

**Severity:** High  
**Область:** Storefront GraphQL / Media Federation

Catalog хранит только file UUID, но `mediaReference()` безусловно возвращает:

```ts
{ __typename: "MediaImage", id: encodeGlobalIdByType(fileId, GlobalIdEntity.File) }
```

При этом storefront schema явно допускает `MediaImage`, `Video`, `ExternalVideo` и `Model3d`. Media subgraph проверяет concrete content type в соответствующем resolver preload.

**Эффект:** video/external video/model3d, прикреплённые к product, variant, category или collection, будут запрошены через `MediaImageResolver` и не смогут корректно разрешиться.

**Возможные решения:**

1. Хранить immutable media kind вместе с Catalog reference.
2. Получать batch media descriptors из Media service перед формированием connection.
3. Пересмотреть федеративный контракт так, чтобы concrete type определялся owning Media subgraph без ложного typename со стороны Catalog.

### CAT-005 — Media reference validation выполняется после persistence и не является обязательной

**Severity:** High  
**Область:** Product creation / Media integration

Product create-path декодирует File Global IDs и сразу сохраняет UUID в `product_media`. Предварительный вызов `media.validateOwnedFile` отсутствует.

После commit вызывается `media.syncEntityFiles`, но:

- вызов объявлен best-effort;
- exception только логируется;
- `SyncEntityFilesResult.skippedCount` не проверяется;
- GraphQL mutation всё равно может вернуть успешный Product.

Category и Collection media/SEO paths также сохраняют file UUID локально без доказанной обязательной ownership validation.

**Эффект:** Catalog может сохранить неизвестный, inactive или принадлежащий другому store file ID; API будет содержать dangling/cross-owner reference.

**Требуемый invariant:** каждый новый media/OG/swatch reference должен быть validated для `{ owner: store }` до Catalog commit. Любой invalid reference должен возвращать typed `userErrors` и откатывать всю mutation.

### CAT-006 — Hard-delete cleanup покрывает только product media registry

**Severity:** High  
**Область:** Event handling / Data integrity

`FileHardDeletedScript` вызывает только `MediaRepository.removeProductMediaByFileId`.

Не очищаются:

- `category_media.file_id`;
- `collection_media.file_id`;
- `product_seo.og_image_id`;
- `category_seo.og_image_id`;
- `collection_seo.og_image_id`;
- `product_option_swatch.image_id`.

**Эффект:** после hard delete API продолжает публиковать ссылки на отсутствующий File. Некоторые non-null nested selections способны вызвать GraphQL errors.

**Что должно быть завершено:** одна transactional cleanup operation по всем Catalog-owned reference tables плюс событие/refresh для затронутых storefront projections.

### CAT-007 — ProductCreate выводит option selections из строки handle

**Severity:** High  
**Область:** Product / Variants business logic

`ProductCreateScript.createVariants` выполняет:

```ts
const valueSlugs = variantInput.handle.split("-");
```

После этого option/value mapping ищется позиционно. Если значение не найдено, link просто не создаётся; user error отсутствует.

Проблемы:

- slug с дефисом неоднозначен;
- количество значений может не совпадать с количеством options;
- неизвестный value slug silently ignored;
- duplicate variant option combinations не проверяются на уровне понятной business error;
- correctness зависит от порядка options;
- handle одновременно используется как identity и как скрытый transport format.

**Требуемый контракт:** Variant create input должен содержать явный полный набор `{ optionId/valueId }` либо стабильных `{ optionHandle/valueHandle }`. Handle должен вычисляться после валидации, а не использоваться для восстановления доменной связи.

### CAT-008 — ProductCreate saga может оставить частично созданный агрегат

**Severity:** High  
**Область:** DBOS / Product lifecycle

Product, variants и options фиксируются в первом saga step. Затем inventory items создаются отдельными broker calls по одному variant.

Для inventory step существует compensation, но для уже выполненного product creation step нет компенсации. Ошибка после Catalog commit может оставить:

- Product и variants без полного набора InventoryItem;
- часть variants с InventoryItem, часть без;
- успешный durable Catalog state без завершённой интеграции.

Дополнительный риск: product-level `inventoryItem.sku` применяется ко всем создаваемым variants. При нескольких variants один и тот же non-null SKU конфликтует с unique constraint.

**Что должно быть завершено:** формально определить aggregate boundary и один из вариантов:

- создавать Catalog + Inventory records в одной локальной transaction, поскольку сейчас обе области находятся в одном service/database;
- либо реализовать полноценную компенсацию Product aggregate;
- либо хранить explicit creation status и запрещать чтение/публикацию до завершения всех steps.

### CAT-009 — Low-stock event handler подтверждает успех без бизнес-действия

**Severity:** Medium  
**Область:** Inventory events

`handleStockLevelChanged` содержит TODO для low-stock alerts и всегда возвращает `{ success: true }`.

Если low-stock notifications входят в заявленную бизнес-логику Inventory/Catalog, событие сейчас фактически поглощается. Если не входят, handler и комментарий следует удалить, а ответственность явно передать Notifications/Automation service.

## 6. Проблемы automated verification

### 6.1. Collection suites являются executable placeholders

Все активные файлы в следующих каталогах не содержат реальных assertions и API calls:

- `e2e/tests/collections-admin-api/`;
- `e2e/tests/collections-storefront-api/`.

Они объявляют `test(...)`, внутри которого находится только комментарий вида `// Verify ...`. Такой test будет отмечен как passed, хотя ничего не проверяет.

Это объясняет, почему отсутствующий `CatalogQuery.collections` не был обнаружен suite.

### 6.2. E2E GraphQL operations используют отсутствующие mutation fields

Активные operations и tests продолжают использовать:

- `catalogMutation.variantUpdatePricing`;
- `inventoryMutation.inventoryItemUpdate`.

В текущем Catalog SDL эти поля отсутствуют: pricing/inventory updates перенесены в unified `productUpdate` operation.

Следовательно, по крайней мере одна из систем устарела:

- service SDL;
- federation artifacts;
- e2e schema/codegen;
- query documents;
- tests/Admin consumers.

До reconciliation результаты старых e2e нельзя использовать как доказательство готовности текущего API.

### 6.3. Product create fixtures не соответствуют текущему input contract

Текущая SDL требует:

- `InventoryItemInput.requiresShipping: Boolean!`;
- `ProductCreateOptionInput.categoryId: ID!`.

Несколько активных product creation tests передают inventory/options без этих обязательных fields. При текущей схеме такие requests должны быть отклонены на GraphQL validation до resolver.

### 6.4. Conditional `test.skip()` маскирует фундаментальные regressions

Inventory, stock и pricing tests часто выполняют `test.skip()`, если product create не вернул variant/inventoryItem/warehouse. Отсутствие основного prerequisite должно приводить к hard assertion failure, а не к skipped test.

Иначе поломка Product creation способна скрыть большую часть downstream suite.

### 6.5. Unit coverage недостаточно для размера домена

В Catalog Service найдено пять unit/spec-файлов:

- comparison formatter;
- comparison validation;
- checkout merchandise service;
- DBOS transaction bridge;
- repository transactional step.

Нет достаточного unit/contract coverage для:

- ProductCreate invariants;
- ProductUpdate operation matrix;
- category lifecycle;
- collection lifecycle/rules/membership;
- media cleanup and ownership;
- Relay node registry;
- pagination edge cases;
- inventory reservations concurrency/idempotency;
- component configuration/dependency rules;
- broker action authorization and retry semantics.

## 7. Доменные замечания

### 7.1. Products и variants

Сильные стороны:

- unified update workflow с optimistic concurrency;
- отдельные operations для product/category/tag/variant/components;
- variant pricing, inventory, dimensions, weight и media preflight присутствуют в update workflow;
- product listing repository использует Relay query infrastructure;
- product snapshot broker API поддерживает selection-driven reads.

Незавершённость:

- create contract значительно слабее update contract;
- нет явного per-variant create payload для SKU, price, inventory и selections;
- media validation не является commit gate;
- partial saga state возможен;
- create-side business validation в основном полагается на generated Zod structural schemas и DB constraints.

### 7.2. Categories

Сильные стороны:

- hierarchy, ancestors/children, path/depth;
- create/update/move/rebalance/delete;
- localized rich text, SEO и media;
- product assignment/order and primary category logic;
- category product count refresh;
- hierarchy/products scope filters.

Риски:

- category Node не разрешается через catalog Relay node;
- File lifecycle не завершён;
- media ownership validation требует подтверждения до commit;
- полнота event fan-out и listing refresh должна быть покрыта реальными acceptance tests.

### 7.3. Collections

Сильные стороны:

- manual и rule model;
- optimistic revisions;
- create/update/delete;
- manual add/remove/move/clear/rebalance;
- canonical rule normalization и preview workflow;
- Listing snapshot version/hash contract;
- storefront visibility lookup по ID/handle.

Блокеры:

- Admin list query отсутствует;
- все collection acceptance specs пустые;
- media Global ID ошибочен в Admin resolver;
- media hard-delete cleanup отсутствует;
- фактическая интеграция Catalog -> Listing не подтверждена выполняемыми tests.

### 7.4. Inventory, stock и reservations

Сильные стороны:

- warehouse и warehouse stock lifecycle;
- inventory item state;
- stock changes ledger;
- reservation/release/renew/confirm service;
- availability snapshot для checkout;
- delivery facts по locations и physical data;
- tenant filters широко применяются в repositories.

Риски:

- active e2e опирается на старые direct mutations;
- conditional skips ослабляют evidence;
- low-stock handler пуст;
- нужно отдельное concurrency/idempotency acceptance evidence для stock reservations и release/confirm races.

### 7.5. Pricing

Сильные стороны:

- temporal price/cost history;
- current price/cost views;
- product price range;
- Admin pricing widget;
- checkout merchandise snapshot содержит price revision.

Риски:

- старые tests вызывают отсутствующую `variantUpdatePricing`;
- необходимо подтвердить unified update replacement во всех Admin/e2e consumers;
- часть pricing tests может skip при upstream create failure.

### 7.6. Comparison

Сильные стороны:

- profiles/groups/fields/options/translations;
- feature/option mapping;
- category effective profile;
- product configuration sync;
- storefront matrix builder;
- customer persisted comparison federation;
- localized server-side formatting и difference detection.

Риски:

- ограниченное unit/integration evidence относительно размера подсистемы;
- Node coverage работает лишь для comparison types и тем самым непоследовательно с остальным Catalog;
- cache invalidation и stale selection behavior должны подтверждаться runtime tests.

### 7.7. Product components

Сильные стороны:

- configuration/group/item model;
- product/variant targets;
- pricing templates и rules;
- conditional dependency actions;
- storefront configuration evaluation;
- checkout component validation.

Риски:

- множество component types объявлены Node, но недоступны через `catalogQuery.node`;
- сложная dependency/pricing матрица почти не покрыта unit tests;
- требуется доказательство deterministic behavior для conflicting rules и invalid selections.

## 8. Architecture и data integrity

### 8.1. Multi-tenancy

Положительно: большинство repository queries явно добавляют `storeId` и используют context-bound `BaseRepository`.

Перед release необходим отдельный automated tenancy audit для всех public reads/writes, включая:

- Global ID lookup;
- federation references;
- connection totalCount;
- category/collection scopes;
- comparison profiles/configuration;
- component referenced IDs;
- broker action storeId/caller authorization;
- media references.

Особенно важно не считать Global ID достаточной авторизацией: каждый decoded UUID должен заново проверяться внутри текущего store scope.

### 8.2. Validation и error contracts

Generated Zod schemas в основном проверяют структуру GraphQL input, но не доменные ограничения. Business validation распределена между resolvers, scripts, workflows и DB constraints.

Требования к завершению:

- ожидаемые нарушения должны возвращать `userErrors`, а не generic `INTERNAL_ERROR`;
- Global ID decode errors должны нормализоваться одинаково;
- duplicate handles/SKU/option combinations должны иметь стабильные codes и field paths;
- mutations должны быть atomic относительно всех заявленных synchronous effects;
- background/best-effort effects должны быть явно отражены в API status или operational recovery model.

### 8.3. Migration/model drift

Drizzle model `product_title_bm25_search_index` присутствует в Catalog models, но соответствующая Catalog migration не найдена и сам model не используется runtime code. Это выглядит как orphaned/dead schema artifact после переноса search responsibility в Listing.

Перед готовностью следует либо удалить model из Catalog, либо добавить документированного owner и migration/use path. Мёртвые модели не должны выглядеть как поддерживаемый Catalog schema contract.

## 9. Рекомендуемая последовательность завершения

### Phase 0 — Зафиксировать canonical contract

1. Выбрать current Admin API: unified `productUpdate` либо legacy direct inventory/pricing mutations.
2. Перегенерировать federation schema, Admin types и e2e types из одного source of truth.
3. Исправить все query documents и consumers.
4. Запретить merge при schema/codegen drift.

### Phase 1 — Закрыть публичные contract blockers

1. Реализовать `CatalogQuery.collections`.
2. Реализовать полный Relay Node registry.
3. Исправить Global ID encoding для Collection media и option swatches.
4. Добавить contract tests, перечисляющие все root operations и Node types.

### Phase 2 — Завершить media lifecycle

1. Ввести обязательный batch ownership/existence preflight.
2. Запретить commit при invalid/inactive/cross-owner file.
3. Исправить concrete storefront media type resolution.
4. Синхронизировать backrefs для product/category/collection/SEO/swatch.
5. Очищать все Catalog references при hard delete.
6. Добавить tests для image/video/external video/model3d и tenant isolation.

### Phase 3 — Исправить ProductCreate aggregate

1. Заменить handle parsing на explicit selected options.
2. Валидировать полный option set и уникальность combination.
3. Добавить per-variant inventory/SKU/price/media payload либо явно ограничить create API и документировать follow-up update.
4. Сделать creation atomic или добавить полную compensation/state machine.
5. Возвращать typed user errors для всех expected failures.

### Phase 4 — Восстановить automated evidence

1. Заменить collection placeholder tests реальными Playwright tests.
2. Удалить conditional skips для обязательных prerequisites.
3. Добавить missing unit/contract coverage.
4. Запускать targeted suites по доменам через `shopana-cli`.
5. Добавить tenant isolation и concurrency suites.

### Phase 5 — Operational completeness

1. Решить ownership low-stock alerts.
2. Добавить retry/dead-letter/needs-attention semantics для media и projection sync.
3. Добавить metrics для skipped backrefs, stale comparison selections и partial workflow failures.
4. Проверить idempotency всех externally retried workflows/actions.

## 10. Definition of Done для Catalog Service

Catalog можно считать завершённым только если выполнены все условия ниже.

### API contract

- Каждое объявленное root field имеет resolver и acceptance test.
- Каждый тип `Node` разрешается через соответствующий `node/nodes` entry point.
- Все non-null fields доказанно не возвращают null в допустимом domain state.
- Global IDs единообразно encode/decode во всех subgraphs.
- Admin, Storefront, federation artifacts, generated types и consumers синхронизированы.

### Business logic

- Product, variant, category, tag, option, feature, collection, inventory, pricing, component и comparison invariants перечислены и покрыты tests.
- Expected failures возвращают стабильные typed user errors.
- Optimistic locking работает для всех revisioned aggregates.
- Cross-service references validated до commit.
- Durable workflows идемпотентны и имеют recovery/compensation semantics.
- Нет silent partial success для обязательных aggregate effects.

### Data integrity и tenancy

- Все store-owned reads/writes изолированы по store.
- Cross-store IDs не раскрывают existence и не изменяют данные.
- Hard delete очищает все ссылки либо переводит их в явно поддерживаемый tombstone state.
- Нет orphaned Drizzle models или runtime tables без понятного owner/migration.

### Verification

- Нет placeholder tests.
- Нет skip при отсутствии обязательного fixture/result.
- Targeted unit, integration и Playwright suites проходят.
- Schema composition/codegen verification проходит.
- Build проходит через `shopana-cli`.
- Для reservations, bulk edit, collection sync и product workflows есть concurrency/idempotency tests.

## 11. Release gate

Текущий release decision: **NO-GO**.

Минимальные blockers для пересмотра решения:

1. CAT-001: Collections connection.
2. CAT-002: Relay Node completeness.
3. CAT-003/CAT-004: Global ID и concrete Media correctness.
4. CAT-005/CAT-006: Media validation и lifecycle cleanup.
5. CAT-007/CAT-008: ProductCreate option integrity и atomicity.
6. Замена collection placeholder suites и reconciliation текущего e2e GraphQL contract.

После их исправления требуется повторный audit с targeted runtime verification. До этого количественная оценка выше 70% не будет обоснованной, даже если остальные feature paths продолжают расширяться.

## 12. Ключевые ссылки на код

- Declared Admin API: `src/api/graphql-admin/schema/base.graphql`.
- Declared Storefront API: `src/api/graphql-storefront/schema/base.graphql`.
- Missing Collection query и partial Node resolver: `src/resolvers/admin/QueryResolver.ts`.
- Collection raw File ID: `src/resolvers/admin/CollectionResolver.ts`.
- Option swatch raw IDs: `src/resolvers/admin/OptionValueResolver.ts`.
- Storefront hardcoded MediaImage: `src/resolvers/storefront/MediaConnectionResolver.ts`.
- Product create variant handle parsing: `src/scripts/product/ProductCreateScript.ts`.
- Product create saga boundaries/backrefs: `src/sagas/ProductCreateSaga.ts`.
- Incomplete hard-delete cleanup: `src/scripts/media/FileHardDeletedScript.ts`.
- Empty low-stock handler: `src/handlers/InventoryEventHandlers.ts`.
- Placeholder collection specs: `../../../e2e/tests/collections-admin-api/` и `../../../e2e/tests/collections-storefront-api/`.
- Stale direct mutation operations: `../../../e2e/queries/inventory-api/VariantSetPricing.gql` и `VariantSetStock.gql`.
