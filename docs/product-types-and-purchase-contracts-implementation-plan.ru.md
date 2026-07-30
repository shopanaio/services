# План реализации расширяемых типов продуктов и контрактов покупки

## 1. Назначение

Этот план переводит архитектуру из
`docs/product-types-and-purchase-contracts.ru.md` в последовательность
реализуемых изменений для текущего monorepo Shopana.

Целевой результат:

- Catalog хранит `ProductShell`, immutable `ProductRevision`,
  `ProductTypeDefinitionRevision` и opaque provider resource reference;
- native-сервисы и Apps регистрируют namespaced product types без изменения
  Checkout, Orders и общего GraphQL enum;
- Checkout принимает только недоверенный `PurchaseSelection`, компилирует его в
  `PurchaseCompilationV1`, получает authoritative pricing и запечатывает
  `PurchaseContractV1`;
- Catalog Inventory резервирует только validated requirements из sealed
  contract;
- Orders сохраняет полный immutable contract и исполняет fulfillment
  obligations без чтения Catalog или App для отображения заказа;
- существующие `ProductKind`, bundle-specific checkout fields, checkout/order
  snapshots и current-route fallback удаляются, а не поддерживаются параллельно.

План является greenfield cutover. Dual-write, backfill, legacy adapters и
совместимость со старыми событиями не входят в реализацию.

## 2. Зафиксированное текущее состояние

Перед реализацией необходимо исходить из следующих существующих связей:

- `services/catalog/src/repositories/models/products.ts` хранит
  `product_kind = BASE | BUNDLE` и дублирует kind в Product и Variant;
- Catalog service snapshots и GraphQL API экспортируют `ProductKind`;
- common Product, Variant, bundle, pricing и inventory data находятся в одной
  Catalog-модели;
- Checkout line state содержит доверяемый unit snapshot и bundle-specific
  `parentLineId`, `ChildPriceConfig`;
- текущий cost flow вычисляет корзину из materialized lines, а не из
  `PurchaseCompilationV1` и Pricing snapshot;
- Orders создается из checkout snapshot и имеет собственное line DTO вместо
  полного sealed purchase contract;
- Apps уже возвращает `capabilityRouteId` и вычисляемый `routeRevision`, но
  route discovery выбирает active/current route, а immutable runtime revisions
  не являются самостоятельной retained сущностью;
- Function Runner уже имеет target registry, binding set, execution plan,
  limits и trace; его нужно расширить и использовать, а не создавать второй
  механизм исполнения;
- Catalog Inventory уже является bounded module Catalog и владеет stock и
  reservations;
- Pricing имеет discount authoring domain, но authoritative runtime API,
  принимающий base allocations и возвращающий `PurchasePricingSnapshot`, еще
  должен быть выделен.

## 3. Принципы реализации

1. Контракты платформы принадлежат отдельному platform package, но действия и
   persisted models остаются во владеющих сервисах.
2. Все persisted JSON имеет `schemaKey`, `schemaVersion`, `schemaHash` и
   проверяется Zod-схемой до попадания в domain/event store.
3. Canonical JSON и digest реализуются один раз в shared package и используются
   Catalog, Apps, Checkout, Pricing и Orders.
4. Все ссылки Store-scoped; для App provider дополнительно проверяется
   `installationId`.
5. Native provider проходит тот же decode/validation pipeline, что и App
   provider.
6. Сначала реализуется минимальный end-to-end путь `catalog.standard`, затем
   bundle, extensions и App-backed gift card.
7. Каждая фаза завершается удалением замененного старого пути. Длительный
   параллельный runtime двух моделей запрещен.
8. Межсервисные операции реализуются broker actions и DBOS workflows; прямые
   cross-schema reads и foreign keys запрещены.

## 4. Целевая декомпозиция

### Shared platform contracts

Создать package, например `packages/purchase-contracts`, который содержит:

- `ProductTypeManifestV1` и feature policies;
- `ProductTypeProviderRef`, `ProductTypeRef`,
  `ProviderProductResourceRef`;
- `PurchaseSelectionInput`;
- `ProviderPurchaseOutputV1`;
- `PurchaseCompilationV1`;
- `PurchasePricingSnapshot`;
- `PurchaseContractV1`;
- inventory requirement и fulfillment obligation contracts;
- Zod decoders, limits, canonicalization и digest helpers;
- stable domain error codes.

Package не содержит repositories, broker calls, service-specific authorization
или provider implementations.

### Broker contracts

В `packages/broker-types` добавить versioned actions для:

- registry registration/read;
- Catalog definition and publication operations;
- provider resource operations;
- purchase resolution and finalization permits;
- Pricing calculation;
- inventory validation/reservation/release/transfer;
- Order creation by sealed contract;
- obligation lifecycle;
- App contribution, route revision and installation lifecycle.

Broker envelope должен содержать bounded input. Большие upgrades используют job
ID и cursor, а не неограниченный массив Product IDs.

### Service ownership

- Catalog: definitions, product revisions, publication, native providers,
  availability projection, inventory.
- Apps: immutable contribution and runtime route revisions, installation
  lifecycle and retention.
- Checkout: compile orchestration, extensions, contract revisions, sealing and
  finalization saga.
- Pricing: authoritative merchandise pricing snapshot.
- Orders: immutable contract snapshot, order events, obligation state and
  execution.

## 5. Этапы реализации

## Этап 0. Зафиксировать исполнимые platform contracts

### Работы

1. Создать shared package с TypeScript types и Zod schemas.
2. Ввести platform limits:
   - input/output bytes;
   - JSON depth;
   - line count/tree depth;
   - rules, obligations, PII refs;
   - quantity and money safe-integer bounds.
3. Реализовать canonical JSON:
   - сортировка object keys;
   - запрет non-finite numbers, cycles и custom prototypes;
   - stable UTF-8 serialization;
   - SHA-256 digest.
4. Определить stable error taxonomy по владельцам:
   `PRODUCT_TYPE_*`, `PRODUCT_PROVIDER_*`, `PURCHASE_*`,
   `INVENTORY_REQUIREMENT_*`, `FULFILLMENT_OBLIGATION_*`.
5. Создать schema registry interfaces для selection, provider data,
   extension output и obligation payload.
6. Зафиксировать manifest narrowing algorithm:
   platform invariants → provider manifest → Store definition → effective
   manifest.

### Результат

Все сервисы используют один contract package; ни один сервис не объявляет свою
вариацию `PurchaseContractV1` или digest algorithm.

### Gate

- каждый V1 contract декодируется из `unknown`;
- hash fixtures одинаковы во всех потребителях;
- invalid JSON и overflow отклоняются до domain logic;
- manifest narrowing не может включить `DISABLED`, выключить `REQUIRED` или
  изменить compiler target.

## Этап 1. Immutable registries и revision identity

### Работы

1. Реализовать immutable platform registries:
   - manifest schemas;
   - selection schemas;
   - provider resource schemas;
   - extension schemas;
   - inventory requirement policies;
   - fulfillment obligation types.
2. Для каждой записи хранить owner, version, canonical snapshot, hash, limits,
   createdAt и retention state.
3. Запретить повторную регистрацию другого content под тем же
   `(schemaKey, schemaVersion)`.
4. Реализовать product type namespace registry:
   - native service namespace;
   - `app.${appCode}.`;
   - immutable owner;
   - запрет semantic reuse существующего key.
5. Добавить bootstrap contributions для native типов:
   `catalog.standard` и `catalog.bundle`.

### Результат

Manifest и произвольный JSON не могут попасть в definition или purchase flow
без immutable registry entry и совпадающего hash.

### Gate

- registration идемпотентна;
- collision возвращает стабильную domain error;
- registry read поддерживает exact version/hash, а не только current.

## Этап 2. Catalog definitions и product revision model

### Схема данных

Добавить Catalog-owned таблицы:

- `product_type_definition_revision`;
- `product_type_definition_state`;
- `product_type_definition_state_transition`;
- `product_type_binding_revision`;
- `product_shell`;
- `product_revision`;
- `product_publication_validation`;
- `provider_availability_projection`;
- `purchase_finalization_permit`.

Минимальные constraints:

- immutable key definition: `(store_id, definition_id, revision)`;
- state адресует exact definition revision;
- `RETIRED → ACTIVE` запрещен;
- Product revision с `READY` требует provider resource ref;
- `PUBLISHED` shell требует существующий `published_revision`;
- `published_revision` принадлежит тому же Store/Product;
- обычный update не меняет type reference;
- все optimistic writes проверяют expected content/resource revision.

### Domain операции

Реализовать:

- create/list/read/update definition;
- suspend/resume/retire definition;
- create Product shell and initial revision;
- update common shell data;
- update provider resource ref;
- validate and publish exact Product revision;
- explicit product type change;
- definition upgrade job;
- create/complete/fail/expire finalization permit.

### Cutover

Удалить:

- `catalog.product_kind`;
- `ProductKind` из Catalog GraphQL и broker snapshots;
- kind из Variant;
- ветвление authoring logic по `BASE | BUNDLE`.

Текущие Product/Variant таблицы не мигрируются в новый формат. Target migration
создает конечную модель для disposable/greenfield database.

### Результат

Storefront всегда читает exact immutable `publishedRevision`, Admin редактирует
`currentRevision`, а тип продукта определяется `ProductTypeRef`.

### Gate

- draft resource change не изменяет published purchase;
- suspend/uninstall не меняет merchant publication status;
- stale validation result нельзя использовать для publication;
- type change возможен только отдельным use case.

## Этап 3. Provider resource protocol и Catalog authoring

### Работы

1. Добавить platform-owned provider actions V1:
   - create;
   - update;
   - validate;
   - readForAdmin;
   - tombstone.
2. Реализовать native dispatcher в Catalog для статического registry
   providerKey → broker action.
3. Реализовать DBOS saga создания Product:
   - create shell/revision `PENDING_PROVIDER`;
   - idempotent provider create;
   - validate returned ref;
   - create `READY` revision;
   - при ошибке записать `PROVIDER_SETUP_FAILED` и tombstone resource.
4. Реализовать provider update с new resource revision и optimistic checks.
5. Добавить optional
   `ProviderProductPublicationProjection` с version/hash validation.
6. Внедрить backend feature policy guards во все Catalog mutations.
7. Реализовать publication validation с pinning:
   Product, definition, resource, route, manifest and schema hashes.

### Native providers

Сначала реализовать `catalog.standard`:

- aggregate `catalog.standard_product`;
- selection schema variant/quantity;
- static or variant base pricing proposal;
- variant inventory requirement;
- physical fulfillment.

После прохождения первого vertical slice реализовать `catalog.bundle`:

- aggregate `catalog.bundle_product` и versioned rule revisions;
- normalized group/item selection;
- deterministic root/component topology;
- composite base allocations;
- component inventory requirements.

Существующие bundle tables можно переразметить как provider-owned aggregate,
но Checkout больше не читает и не интерпретирует bundle rules.

### Gate

- Catalog не декодирует opaque resource ID;
- resource ownership проверяется provider action;
- provider update всегда создает новую revision;
- disabled feature отклоняется backend mutation;
- required feature и provider validation блокируют publication.

## Этап 4. Function Runner и immutable App routes

Этот этап должен завершиться до App-backed product types.

### Работы в Apps

1. Сделать capability route revision persisted immutable entity, а не только
   hash текущей active binding.
2. Хранить exact tuple:
   `(installationId, functionKey, routeRevision)`.
3. Добавить runtime artifact revision и lifecycle:
   `PREPARED`, `ACTIVE`, `RETAINED`, `RETIRED`.
4. Route discovery должен разрешать exact revision для:
   - purchase compile;
   - active finalization permit;
   - pinned order obligation.
5. Удалить fallback на current installation route.
6. Сохранять old runtime/route до исчезновения permits и pinned obligations.

### Работы в Function Runner

1. Зарегистрировать target `checkout.purchase.compile.v1`:
   - `SINGLE`;
   - одна native implementation — dispatcher;
   - required failure;
   - contract limits.
2. Для native definition план должен выбрать dispatcher, который проверит
   pinned provider ref и вызовет конкретный native provider.
3. Для App definition план должен содержать ровно один App binding и не
   выполнять native dispatcher.
4. Возвращать `unknown` плюс trusted execution trace.
5. Исключить timestamps/duration/deadline из business digest.

### Gate

- неизвестный providerKey отклоняется до broker call;
- 0 или более 1 App compile binding является configuration error;
- exact retained route продолжает исполняться после App update;
- current route никогда не подменяет pinned revision.

## Этап 5. Purchase compilation pipeline

### Checkout components

Создать application services:

- `PurchasableResolver`;
- `PurchaseCompiler`;
- `ProviderOutputDecoder`;
- `PurchaseLineTopologyValidator`;
- `PurchaseExtensionPipeline`;
- `PurchaseCompilationFactory`;
- `PurchaseContractSealer`.

### Flow

1. Decode `PurchaseSelectionInput`.
2. Resolve purchasable в exact published Product revision.
3. Проверить authoritative definition/installation/provider state.
4. Построить trusted compile input и immutable binding set.
5. Выполнить target `checkout.purchase.compile.v1`.
6. Decode `ProviderPurchaseOutputV1`.
7. Применить line, price, quote, inventory, obligation and ownership
   invariants.
8. Выполнить extension phases в фиксированном порядке.
9. Создать immutable `PurchaseCompilationV1`.

### Extensions

Реализовать slot registry и compositors отдельно для:

- purchase validation;
- line enrichment;
- supplemental line;
- pricing adjustment proposal;
- fulfillment obligation.

Каждый compositor принимает decoded output и не применяет generic JSON patch.
Порядок вычисляется по precedence, activationSequence, functionBindingId.

### Gate

- provider не задает trusted identity, source, executor или execution trace;
- существует ровно одна valid ROOT line;
- line tree bounded, connected и acyclic;
- ROOT display берется из published Catalog revision;
- selection с разным digest создает разную line identity;
- optional/required extension failures имеют разные зафиксированные outcomes.

## Этап 6. Authoritative Pricing API

### Работы

1. Добавить Pricing broker action V1:
   `pricing.calculatePurchase.v1`.
2. Input:
   - Store/currency/customer context;
   - validated base allocations;
   - extension adjustment proposals;
   - pinned pricing/rule revisions.
3. Output:
   - `PurchasePricingSnapshot`;
   - authoritative discounts;
   - final line allocations;
   - unique adjustment keys;
   - pricing revision.
4. Вынести safe-integer money invariants в shared contract validation.
5. Отделить merchandise pricing от tax, shipping, duties, tips и payment fees.
6. Provider-owned applied rules оставить в compilation; platform promotions
   хранить только в Pricing snapshot.

### Gate

- provider/extension не может назначить final total;
- все суммы сходятся по line and aggregate invariants;
- currency совпадает с Checkout currency;
- Pricing snapshot детерминирован для pinned inputs.

## Этап 7. Checkout contract revisions и cart read model

### Event/domain cutover

Заменить текущий line unit snapshot и bundle-specific fields на:

- original `PurchaseSelection`;
- `selectionDigest`;
- `lineIdentityDigest`;
- current `PurchaseContractV1`;
- contract revision/status;
- materialized root/component/charge/entitlement lines;
- invalidation reason.

Удалить:

- `ChildPriceConfig`;
- клиентский child topology;
- доверяемые `title`, `sku`, `price`, `snapshot`;
- старый `purchasableSnapshot` event contract.

### Use cases

Перевести create/add/replace/update quantity/currency/customer context на общий
recompile flow. Старый successful contract остается в event history, но не
используется для finalize после invalidation.

Line merge:

```text
hash(typeKey, purchasableId, selectionDigest, mergeDiscriminator)
```

`clientLineKey` используется только для response correlation.

### Gate

- любое релевантное изменение создает новую contract revision;
- expired quote приводит к recompile;
- provider unavailable переводит line в invalid state;
- materialized lines всегда восстанавливаются из sealed contract.

## Этап 8. Catalog Inventory requirements

### Работы

1. Добавить actions:
   - validate availability read-only;
   - reserve exact requirements;
   - release reservation;
   - transfer reservation ownership to Order.
2. Проверять:
   - Store;
   - inventory item revision;
   - relationship provider resource → inventory item;
   - physical/inventory-tracked line;
   - allowed owner policy;
   - aggregated quantity and overflow.
3. Идемпотентность reservation привязать к contract digest.
4. Удалить текущий inventory offer flow из purchase authority path.
   `GetOffersScript` не должен определять authoritative purchasable price или
   reservation requirements.

### Gate

- compile не резервирует stock;
- чужой inventory item отклоняется даже при существующем ID;
- повторная reservation с тем же key возвращает тот же result;
- release и ownership transfer безопасны при retry/unknown outcome.

## Этап 9. Finalization permit и Order creation saga

### Catalog permit

Реализовать serialized operation, которая атомарно:

- проверяет exact Product/definition/installation state;
- проверяет lifecycle fence;
- создает Store-scoped active permit.

### Checkout DBOS saga

1. Optimistic lock checkout revision.
2. Получить finalization permit.
3. Выполнить final compile/extensions/Pricing.
4. Seal новый contract.
5. Проверить quote and source revisions.
6. Зарезервировать exact inventory requirements.
7. Идемпотентно создать Order с sealed contract.
8. Передать reservation ownership Order.
9. Завершить checkout и permit.

Idempotency key:

```text
storeId + checkoutId + checkoutRevision + contractDigest
```

### Compensation

- до reservation: ничего;
- после reservation, до Order: release;
- unknown `createOrder`: lookup по тому же idempotency key;
- после успешного Order: Checkout reservation не освобождает.

### Gate

- fence и permit задают однозначный победивший lifecycle event;
- stale contract не финализируется;
- повторный workflow не создает второй Order;
- crash на каждом шаге дает recoverable state.

## Этап 10. Orders и fulfillment obligations

### Order cutover

Заменить checkout snapshot/line DTO в Orders на:

- exact sealed `PurchaseContractV1`;
- отдельные tax/shipping/duties/payment snapshots;
- order-facing line projection из contract;
- execution/audit refs.

Order read path не вызывает Catalog, Checkout, Pricing или Apps.

### Obligations

Добавить:

- obligation state table/read model;
- trigger routing `ORDER_CONFIRMED | PAYMENT_CAPTURED`;
- idempotency key
  `storeId + orderId + contractDigest + obligationKey`;
- DBOS execution workflow;
- retry/failure/cancel policy;
- `PLATFORM_COMMAND` executor;
- `PINNED_APP_RUNTIME` executor through restricted Apps route.

Value-bearing issuance разрешить только после `PAYMENT_CAPTURED`.

### Gate

- Order полностью отображается при недоступном provider/App;
- product/App update не меняет historical order;
- obligation повторно не исполняется;
- required pinned obligation блокирует ordinary uninstall.

## Этап 11. App product type contributions и lifecycle

### Contributions

Apps:

- валидирует App manifest contribution;
- сохраняет immutable manifest/resource-schema snapshots;
- регистрирует `commerce.function` route;
- отдает Catalog immutable contribution snapshot.

Catalog:

- отдельной mutation создает Store definition;
- pin-ит installation, functionKey and routeRevision;
- обеспечивает ровно один compile binding.

### Lifecycle workflows

Реализовать DBOS workflows:

- update/preflight/cutover;
- suspend/resume;
- uninstall/drain;
- explicit reinstall rebind;
- separate purge.

Lifecycle fence должен запрещать новые permits, но не ломать уже выданные
permits и pinned obligations.

### Reference App type

Реализовать `app.gift-cards.gift-card`:

- namespaced manifest;
- provider resource aggregate in App-owned schema;
- selection amount + PII ref;
- dynamic base pricing proposal;
- no variants/inventory/physical features;
- `ISSUE_GIFT_CARD` obligation at `PAYMENT_CAPTURED`.

### Gate

- установка App не меняет GraphQL schema;
- suspend запрещает новые purchases, но не чтение Orders;
- uninstall переводит definitions в `RETIRED`, не меняя merchant status;
- reinstall не активирует старые Products;
- purge невозможен при references/retention blockers.

## Этап 12. GraphQL, Storefront и Admin

### GraphQL

В Catalog schema:

- заменить `ProductKind` на стабильный `ProductType`;
- добавить merchant/effective availability;
- оставить provider-specific data versioned and namespaced;
- не выдавать raw locator, action names и secrets.

Storefront:

- возвращает только effective `AVAILABLE` published Products;
- принимает `PurchaseSelectionInput`;
- не принимает price/display/topology snapshots.

### Admin

Перестроить editor на effective manifest:

- hidden disabled sections;
- merchant toggle для optional;
- required state and publication issues;
- provider-specific registered UI extension;
- common shell fallback при unavailable provider;
- explicit definition upgrade/rebind flows.

### Gate

- прямой API вызов не обходит feature policy;
- динамическая App не требует schema/codegen;
- unavailable UI extension не делает shell нечитаемым;
- type definition revision и provider state видимы для диагностики без утечки
  secrets.

## Этап 13. Финальный cutover и удаление старой модели

В одной целевой release удалить:

- PostgreSQL `product_kind`;
- GraphQL/TypeScript `ProductKind`;
- старые Catalog product snapshots с kind;
- Checkout `ChildPriceConfig`, client topology и trusted unit snapshots;
- inventory offer как purchase authority;
- старые checkout/order event payloads;
- Order creation from checkout snapshot;
- Apps current-route fallback;
- bundle-specific branches в Checkout/Orders.

Disposable development database создается заново из target migrations. Старые
events и rows не мигрируются.

## 6. Рекомендуемый порядок pull requests

1. Shared contracts, canonical JSON, limits and schemas.
2. Immutable registries and native contribution bootstrap.
3. Apps immutable route/runtime revisions and exact resolver.
4. Catalog definition/product revision schema and repositories.
5. Catalog provider protocol, publication validation and feature guards.
6. `catalog.standard` native provider.
7. Function target and Checkout compilation pipeline.
8. Pricing runtime calculation API.
9. Checkout event/read-model cutover.
10. Catalog Inventory requirements and reservations.
11. Finalization permit and Checkout → Orders saga.
12. Orders sealed contract and obligation runtime.
13. `catalog.bundle` provider cutover.
14. App contribution/lifecycle integration.
15. Gift card reference App.
16. GraphQL/Admin cutover and removal of all legacy contracts.

PR 6–11 образуют первый обязательный end-to-end vertical slice. Bundle и App
types не следует начинать до успешного standard-product slice.

## 7. Матрица зависимостей

| Возможность | Зависит от |
| --- | --- |
| Catalog definition | shared contracts, registries |
| Product publication | definition, provider protocol, exact route revision |
| Native compile | Function Runner target, native registry, standard provider |
| App compile | immutable App route/runtime, contribution binding |
| Pricing snapshot | validated PurchaseCompilation |
| Cart contract | compilation, Pricing, inventory availability |
| Order creation | finalization permit, reservation, sealed contract |
| Fulfillment | Order contract, obligation registry, retained runtime |
| App uninstall | lifecycle fence, permit drain, obligation query |
| Admin editor | effective manifest, definition/provider APIs |

## 8. Проверочные сценарии

Для каждой реализации добавить автоматизированные сценарии, запускаемые только
через `shopana-cli` согласно правилам проекта:

### Contracts

- hash fixtures and canonicalization;
- schema collision;
- JSON limits and overflow;
- manifest narrowing.

### Catalog

- definition revision/state transitions;
- product draft vs published revision;
- provider setup compensation;
- publication stale validation;
- feature mutation enforcement.

### Compilation

- standard product;
- bundle with different selections;
- malformed provider output;
- cyclic/deep/oversized lines;
- untrusted display/price/executor injection;
- quote expiry;
- optional and required extensions.

### Inventory and finalize

- foreign Store/inventory reference;
- reservation retry;
- failure before/after reservation;
- unknown Order creation outcome;
- lifecycle fence vs permit race.

### Orders and Apps

- Order reads with Catalog/App down;
- update retains old route/runtime;
- suspend/uninstall with active checkout;
- required pinned obligation blocks uninstall;
- reinstall requires explicit rebind;
- gift card issues exactly once after payment capture.

## 9. Наблюдаемость

Добавить structured logs and metrics по:

- typeKey, definition and resource revisions;
- compiler target, execution and binding set revisions;
- route revision and provider kind;
- input/output/contract digests;
- compilation rejection reason;
- permit lifecycle;
- reservation and Order idempotency keys;
- obligation status and retry class.

PII, selection payload, provider secret refs и full contract в logs не
записывать.

## 10. Критические риски и решения

### Слишком широкий первый cutover

Решение: сначала вертикальный slice `catalog.standard`; bundle и App type
подключаются к уже завершенному contract pipeline.

### Дублирование contract types

Решение: один shared package с runtime decoders; broker-types только ссылается
на эти contracts или re-export их.

### Неполная immutable route model

Решение: App product types блокируются до persisted exact route/runtime
resolution and retention.

### Смешение provider rules и Pricing discounts

Решение: provider возвращает base proposal/applied composition rules; только
Pricing создает discounts, final allocations and totals.

### Формальная, но не фактическая multi-tenancy

Решение: каждый repository/action принимает Store context; composite keys и
runtime ownership validation обязательны; opaque ID не является authorization.

### Order зависит от живого provider

Решение: Order event содержит полный sealed contract и отдельные финальные
snapshots; provider используется только для pinned obligation execution.

## 11. Definition of Done

Архитектура считается внедренной, когда:

- новый native/App type регистрируется без изменений Checkout/Orders;
- в runtime и schema отсутствует `ProductKind`;
- Product publication pin-ит exact definition/resource/route/schema revisions;
- Checkout не доверяет клиентским или provider final price/display/executor
  данным;
- Pricing единолично формирует authoritative merchandise result;
- Catalog Inventory резервирует только validated contract requirements;
- Orders создается идемпотентно из полного sealed contract;
- Order read не вызывает provider;
- obligations исполняются exactly-once по stable idempotency key;
- App update/suspend/uninstall/reinstall соблюдают fences, retention и immutable
  revisions;
- старые checkout/order formats и compatibility paths удалены.
