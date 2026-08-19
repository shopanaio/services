# Rule-based collections: implementation plan

## Статус документа

План описывает реализацию manual и rule-based collections на границе Catalog и
Listing:

- Catalog остаётся владельцем collection metadata, manual items и rules;
- Listing становится владельцем вычисления collection membership и product
  listing read path;
- rule-based membership вычисляется по отдельному raw rule index и не зависит
  от существования или конфигурации Facet;
- поверх manual и rule-based collection scope применяются обычные storefront
  facets, price, availability, vendor, search, sorting и Relay pagination;
- variant-level collection rules и пользовательские variant filters используют
  одного и того же variant witness.

План готов к поэтапной реализации correctness-контракта. Manual membership
синхронизируется eventual-consistently через product snapshots; атомарная
видимость bulk manual mutation не заявляется. Поддерживаемый масштаб
фиксируется только после profiling read path. Для store уровня 1M products
переход на segmented bitmap architecture может стать обязательным prerequisite.

Проект не имеет production/staging данных. Backfill, dual-read, dual-write и
обратная совместимость не предусматриваются. Миграции и контракты меняются
напрямую; старые collection API и незавершённые read paths не сохраняются.

## Источники решений

Обязательные источники:

- `AGENTS.md`;
- `knowledge/AGENTS.md`;
- `knowledge/vault/architecture/overview.md`;
- `knowledge/vault/architecture/multi-tenancy.md`;
- `knowledge/vault/patterns/federation.md`;
- `knowledge/vault/patterns/repository.md`;
- `knowledge/vault/patterns/resolver.md`;
- `knowledge/vault/listing/facets-architecture.ru.md`;
- `knowledge/vault/listing/segmented-bitmap-architecture.ru.md`;
- `services/catalog/src/repositories/models/collection.ts`;
- `services/catalog/src/scripts/collection/*`;
- `services/listing/docs/listing-index-db-contract.ru.md`;
- `services/listing/src/repositories/models/listingIndex.ts`;
- `services/listing/src/repositories/storefront/*`;
- `services/listing/src/workflows/catalogListingSnapshotMapper.ts`;
- `packages/broker-types/src/actions/catalog.ts`;
- `packages/broker-types/src/actions/listing.ts`;
- `packages/events/src/types.ts`;
- существующие collection и listing e2e tests.

Этот документ фиксирует целевой контракт. Draft-документы и текущие skipped
tests не являются source of truth, если противоречат решениям ниже.

## Scope

Входит:

- storefront `Collection` и `Collection.products`;
- manual collection membership и manual order в Listing;
- динамические rule-based collections;
- rules по category, tag, vendor, feature, option, price, availability и
  product creation time;
- collection search;
- collection default sort и разрешённые sorts;
- facet discovery, counts и filtering внутри коллекции;
- admin CRUD rules и точный preview count;
- Catalog-to-Listing collection projection;
- idempotency, event ordering, observability и consistency audits;
- unit, repository, integration и Playwright e2e coverage.

Не входит в первую версию:

- произвольное дерево `AND` / `OR` / `NOT`;
- `ANY` между отдельными rules;
- substring/full-text operators для tags, features и options;
- materialized membership для rule collections;
- per-collection индивидуальная facet configuration;
- scheduled rule evaluation;
- ML/personalized collections;
- storefront backward compatibility со старым collection schema;
- bidirectional синхронизация Listing → Catalog.

## Текущее состояние и обязательные исправления

### Catalog

Сейчас уже существуют:

- `catalog.collection`;
- `catalog.collection_item`;
- `catalog.collection_rule`;
- `CollectionType.MANUAL | RULE`;
- CRUD manual collections;
- `CollectionUpdateRulesScript`;
- незавершённые `Collection.products`, `productsCount` и
  `collectionRulesPreviewCount`.

Текущий rule contract недостаточен:

- `field`, `operator` и `value` фактически являются непроверенными
  `string/string/JSON`;
- проверяется только пара field/operator;
- referenced entities, tenant ownership и shape `value` не проверяются;
- `contains` не имеет однозначной bitmap semantics;
- rule update не создаёт durable событие;
- collection mutations не имеют общего aggregate optimistic revision;
- storefront Collection отсутствует;
- manual collection mutations не обновляют Listing.

### Listing

Сейчас уже существуют:

- canonical product/variant listing index;
- Roaring posting bitmaps;
- category scope;
- one-variant semantics для variant facets, price и availability;
- facet resolution и target-filter isolation;
- search, deterministic sorting и forward Relay cursors;
- `ListingCollectionScopeMembershipSnapshot` в broker types.

Обязательные gaps:

- `StorefrontListingScope` поддерживает только `global | category`;
- `listing_posting_bitmap` запрещает `field = 'collection'`;
- entity/field CHECK не разрешает collection и raw rule terms;
- `mapScopes()` индексирует только categories;
- после `ListingResolveFacetSelectionsScript` не остаётся независимого raw
  source index для rules;
- `FacetScopeType` содержит только `SEARCH | CATEGORY`;
- Listing не имеет collection definition projection;
- collection rules не участвуют в canonical variant algebra;
- Collection не расширяется Listing subgraph'ом.

Запрет `field = 'collection'` отражает текущий незавершённый контракт, а не
целевую архитектуру. Его можно снять только одновременно с writer, read path,
delete path, audit и tests из этого плана.

## Фиксированные архитектурные решения

### Ownership

- Catalog — authoritative owner collection metadata, lifecycle, rules и manual
  items.
- Listing — authoritative owner выполнения rules, collection product
  connection, facets/counts, search, sorting и pagination.
- GraphQL Federation возвращает Catalog-owned `Collection`, а поле `products`
  принадлежит Listing, как сейчас `Category.products`.
- Listing не читает Catalog database и не выполняет cross-schema SQL.
- Catalog не реализует отдельный SQL listing engine.

### Rule membership не материализуется

Rule collection не получает собственный `field = 'collection'` posting.
Listing хранит:

1. компактную проекцию collection definition и normalized rules;
2. raw product/variant rule facts;
3. существующие category, vendor, price, created-at и availability indexes.

На read path rules компилируются в bitmap predicates. Следствия:

- изменение rules не запускает reindex всех products;
- изменение product reindex-ит только этот product;
- нет fan-out `number_of_products × number_of_rule_collections`;
- rule definition соответствует `listingRevision`, подтверждённой Catalog
  representation, а membership вычисляется по текущему Listing index; lag
  definition projection обрабатывается fail-closed;
- preview использует тот же compiler, что storefront.

Materialized rule collection bitmap не добавляется как optimization первой
версии. Если profiling позже покажет необходимость, он проектируется как
derived cache с явной invalidation model, а не как второй source of truth.

### Manual membership материализуется

Manual membership приходит в product snapshot и записывается как:

```text
entity_type = product
field       = collection
value_key   = <collection UUID>
bitmap      = product_doc_ids
```

Manual rank записывается в существующий
`listing_posting_product_sort`:

```text
sort_kind       = manual
manual_scope_id = <collection UUID>
text_value      = <collection_item.lexo_rank>
```

Rule collection никогда не пишет эти rows.

### Rules и Facets — разные слои

Collection rule не может ссылаться на:

- `facet.id`;
- `facet_value.id`;
- `facet.slug`;
- group value;
- facet source reference status;
- facet scope.

Raw rule facts строятся непосредственно из Catalog product snapshot. Создание,
удаление, disabling или regrouping Facet не меняет collection membership.

Facet layer применяется после collection scope:

```text
Catalog raw facts
  ├─> rule_term postings ─> collection rule predicates
  └─> facet resolution ───> storefront facet predicates and counts
```

### Rule logic первой версии

- Между отдельными rules применяется только `AND`.
- Порядок rules влияет только на admin presentation, но не на результат.
- `RULE` collection без rules разрешена как draft, даёт preview count `0` и не
  может быть опубликована.
- Пустой rule set компилируется в explicit empty product bitmap. Нейтральный
  элемент `AND` к нему не применяется: admin connection, preview и любой
  internal read возвращают `0`, а storefront до compiler не допускается
  publication invariant'ом.
- Missing/stale reference компилируется в empty bitmap. Predicate нельзя
  пропускать, иначе collection станет шире.
- `MANUAL` collection не принимает rules.
- `RULE` collection не принимает manual product mutations.
- Collection type immutable после создания.
- `MANUAL` sort разрешён только для `MANUAL` collection.

`ANY` между rules откладывается, потому что смешанный OR между product-level и
variant-level branches требует отдельного boolean plan и распределения
пользовательских variant predicates по branches. Нельзя эмулировать его
ранней product projection без потери one-variant semantics.

### Same-variant semantics

Все variant-level collection rules и все активные storefront variant filters
пересекаются до projection в product bitmap.

Пример:

- collection rule: option `color = red`;
- collection rule: price `< 100 USD`;
- storefront filter: option `size = xl`;
- storefront filter: availability `AVAILABLE`.

Product совпадает только если одна и та же variant:

- red;
- xl;
- available;
- имеет USD price меньше 100.

Нельзя принять product с red дешёвой variant и отдельной xl available variant.

## Canonical rule contract

### Поля и operators

| Field | Level | Operators | Physical source |
| --- | --- | --- | --- |
| `CATEGORY` | product | `IN`, `ALL` | product/category posting |
| `TAG` | product | `IN`, `ALL` | product/rule_term posting |
| `VENDOR` | product | `IN` | product/vendor posting |
| `FEATURE` | product | `IN`, `ALL` | product/rule_term posting |
| `OPTION` | variant | `IN`, `ALL` | variant/rule_term posting |
| `PRICE` | variant | `EQ`, `GT`, `GTE`, `LT`, `LTE`, `BETWEEN` | variant price index |
| `IN_STOCK` | variant | `EQ` | canonical availability term |
| `CREATED_AT` | product | `EQ`, `GT`, `GTE`, `LT`, `LTE`, `BETWEEN` | product listing index |

Semantics:

- `IN` — OR между values одного rule;
- `ALL` — AND между values одного rule;
- отдельные rules всегда AND;
- `BETWEEN` включает обе границы;
- `GT/GTE/LT/LTE` применяются к minor amount или UTC instant;
- `IN_STOCK = false` означает canonical unavailable variant, а не отсутствие
  availability данных.

Для `OPTION + ALL` validation отклоняет несколько разных values одного
`sourceHandle`: текущая Catalog model связывает variant только с одним value
данного option, поэтому такой predicate заведомо невозможен.

`CONTAINS` удаляется. Для exact source values он неоднозначен и требует scan,
который несовместим с posting index.

### Canonical values

External GraphQL IDs декодируются в Catalog до записи:

- `CATEGORY`: `{ ids: UUID[] }`;
- `TAG`: `{ ids: UUID[] }`;
- `VENDOR`: `{ ids: UUID[] }`;
- `FEATURE`:
  `{ values: [{ sourceHandle: string, valueHandle: string }] }`;
- `OPTION`:
  `{ values: [{ sourceHandle: string, valueHandle: string }] }`;
- `PRICE` comparison:
  `{ currencyCode: string, amountMinor: string }`;
- `PRICE BETWEEN`:
  `{ currencyCode: string, minAmountMinor: string, maxAmountMinor: string }`;
- `IN_STOCK`: `{ value: boolean }`;
- `CREATED_AT` comparison: `{ instant: ISODateTime }`;
- `CREATED_AT BETWEEN`:
  `{ from: ISODateTime, to: ISODateTime }`.

UUID arrays и source/value pairs:

- deduplicated;
- sorted canonically before persistence/hash;
- non-empty;
- bounded by configured limits.

Feature и option definitions сейчас product-local, поэтому их cross-product
semantic identity — normalized pair `sourceHandle/valueHandle`. Это тот же
Catalog source identity, который существует до создания Facet, но rule не
ссылается на Facet. Handles:

- приводятся к единому Unicode/trim/case policy Catalog;
- не переводятся;
- не заменяются display names;
- считаются merchant-controlled semantic keys.

Tag, category и vendor имеют store-global identities, поэтому rules хранят их
UUID, а не mutable handles.

Reference semantics различаются по типу rule:

- `CATEGORY`, `TAG`, `VENDOR` являются entity references. При mutation Catalog
  проверяет Global ID type, существование, текущий store и non-deleted status.
  После последующего удаления entity их admin `referenceStatus` становится
  `STALE`, а Listing predicate даёт empty bitmap;
- `FEATURE` и `OPTION` не являются ссылками на store-global definition.
  Catalog проверяет только canonical syntax и limits пары handles. Наличие пары
  хотя бы у одного текущего product не является validation invariant: pair
  может появиться позже и исчезнуть со всех products;
- `PRICE`, `IN_STOCK`, `CREATED_AT` также не имеют entity reference.

Admin `CollectionRuleReferenceStatus` имеет значения
`VALID | STALE | NOT_APPLICABLE`. `VALID | STALE` используются только для
entity-reference rules; handle и scalar rules возвращают `NOT_APPLICABLE`.
Пустой posting для `NOT_APPLICABLE` означает обычный empty match, а не stale
reference.

### Limits

Первая версия вводит hard limits:

- не более 32 rules в collection;
- не более 100 values в одном set rule;
- не более 256 total set values во всех rules;
- source/value handle не более 255 Unicode code points после normalization;
- rules JSON не более 64 KiB в canonical serialized form.

Превышение limit возвращает business `UserError`, а не обрезает rules.

### Admin GraphQL

Существующий shape сохраняется концептуально, но strings заменяются enums:

```graphql
enum CollectionRuleField {
  CATEGORY
  TAG
  VENDOR
  FEATURE
  OPTION
  PRICE
  IN_STOCK
  CREATED_AT
}

enum CollectionRuleOperator {
  IN
  ALL
  EQ
  GT
  GTE
  LT
  LTE
  BETWEEN
}

input CollectionRuleInput {
  field: CollectionRuleField!
  operator: CollectionRuleOperator!
  value: JSON!
}
```

`value` остаётся JSON только на GraphQL edge. Resolver немедленно преобразует
его в discriminated Zod DTO. Repository и broker contracts не принимают
`unknown`.

Validation обязана проверять:

- допустимость operator для field;
- exact value shape и отсутствие лишних keys;
- Global ID type;
- для `CATEGORY`, `TAG`, `VENDOR` — существование referenced entities,
  принадлежность store и non-deleted status;
- для `FEATURE`, `OPTION` — canonical syntax handles без требования
  существования store-global definition или текущего matching product;
- currency code;
- range ordering;
- timestamp timezone;
- duplicate rules и duplicate values;
- limits.

### Canonical serialization и hashes

В `@shopana/broker-types` зафиксировать shared executable contract:

```typescript
const COLLECTION_RULE_HASH_VERSION = "v1" as const;

serializeCanonicalCollectionRulesV1(rules): string;
hashCanonicalCollectionRulesV1(rules): string;
hashCollectionListingPayloadV1(payload): string;
```

Catalog и Listing импортируют эти helpers; service-local реализации
serialization/hash запрещены. Contract `v1`:

- UTF-8 JSON без whitespace;
- object keys записываются в фиксированном порядке, заданном shared DTO codec;
- enums сериализуются canonical lowercase wire values;
- UUID — lowercase canonical form;
- currency code — uppercase ISO code;
- minor amounts — canonical base-10 strings без `+` и leading zeros, кроме
  самого `0`;
- timestamps нормализуются в UTC ISO-8601 с миллисекундами и suffix `Z`;
- values внутри rule deduplicate-ятся и сортируются по encoded tuple;
- rules для Listing projection сортируются по полному canonical encoded rule,
  потому что presentation `sortIndex` не влияет на membership.

`rulesHash` имеет wire format `sha256:v1:<lowercase hex>` и считается по
результату `serializeCanonicalCollectionRulesV1()`. `payloadHash` имеет тот же
format и считается по explicit ordered tuple всех live snapshot fields, включая
`rulesHash` и canonical `listingUpdatedAt`, но не по произвольному
`JSON.stringify(object)`. Listing при ingestion пересчитывает оба hash и
сравнивает constant-time. Неизвестная hash version является terminal contract
error.

Reorder semantically identical rules меняет aggregate `revision`, но не
`listing_revision`, `rulesHash` или Listing payload. Добавление, удаление либо
изменение canonical rule меняет обе revisions.

## Catalog persistence

### Aggregate revision и listing revision

В `catalog.collection` добавить:

```text
revision         integer NOT NULL DEFAULT 0
listing_revision integer NOT NULL DEFAULT 0
listing_updated_at timestamptz NOT NULL DEFAULT now()
```

`revision` — optimistic concurrency token всего Catalog aggregate. Каждая
semantic mutation делает atomic compare-and-swap по `expectedRevision` и
увеличивает `revision`:

- metadata/publication/effective window;
- replace rules;
- add/remove/move/rebalance manual items;
- soft delete.

`listing_revision` меняется только вместе с состоянием, которое влияет на
Listing definition/read contract:

- semantic rules payload; presentation-only reorder rules не входит;
- publication/effective window;
- default sort/direction;
- soft delete.

Display metadata, translations, SEO, media и manual item/rank mutations не
меняют `listing_revision`. Они не должны временно закрывать
`Collection.products` или инвалидировать listing cursor.

Admin GraphQL возвращает `revision: Int!`; mutation inputs принимают
`expectedRevision: Int!`. Поле `listingRevision: Int! @inaccessible`
передаётся только между subgraphs.

Одинаковая aggregate revision не может соответствовать двум payloads. Conflict
возвращается как `REVISION_CONFLICT`.

Одинаковая `listing_revision` также не может соответствовать двум различным
Listing definition payloads. Оба revision увеличиваются в той же Catalog
transaction, когда mutation затрагивает Listing definition; тогда же
`listing_updated_at` устанавливается по database clock. Остальные mutations не
меняют `listing_updated_at`.

### Constraints

Добавить Catalog migration
`0905_collections__rule_contract.sql`:

- allowed values CHECK для `collection.type`;
- allowed fields CHECK для `collection_rule.field`;
- allowed operators CHECK для `collection_rule.operator`;
- `sort_index >= 0`;
- unique `(store_id, collection_id, sort_index)`;
- index `(store_id, collection_id, sort_index)`;
- CHECK, запрещающий `default_sort = 'manual'` для `type = 'rule'`;
- CHECK допустимых sort/direction combinations:
  `manual/asc`, `newest/desc`, `price/asc|desc`, `name/asc|desc`;
- revision и listing revision non-negative CHECK.

Field-specific JSON validation остаётся в Zod/script layer. Cross-table
condition «published RULE has at least one rule» проверяется mutation script
в одной transaction.

### Scripts

Collection scripts привести к project patterns:

- mutation business logic — `BaseScript`;
- write scripts — `@Transactional()`;
- repositories используют `this.storeId` и `this.connection`;
- infrastructure exceptions не превращаются в generic business errors;
- expected constraint conflicts получают стабильные error codes;
- UUID создаются через `generateUuidV7()` / `generateUuidV7s()`.

Create defaults:

- `MANUAL` → `manual/asc`;
- `RULE` → `newest/desc`.

`CollectionUpdateRulesScript` должен:

1. lock collection;
2. проверить type и expected aggregate revision;
3. canonicalize и validate весь rule set;
4. заменить rules;
5. проверить publication invariant;
6. всегда increment aggregate revision; increment listing revision и
   `listing_updated_at` только если canonical semantic `rulesHash` изменился;
7. вернуть collection snapshot для event step.

Нельзя удалить старые rules до полной validation новых.

### Publication lifecycle

Storefront-visible collection одновременно:

- не deleted;
- `published_at <= database_clock`;
- `effective_from IS NULL OR effective_from <= database_clock`;
- `effective_to IS NULL OR database_clock < effective_to`;
- для `RULE` имеет non-empty valid canonical rule set.

Effective interval полуоткрытый: `[effective_from, effective_to)`.

Entity reference, который был валиден при записи, но позже удалён, не делает
predicate ignored. Listing получает canonical rule как есть, missing posting
даёт empty set. Admin resolver вычисляет `VALID | STALE` только для
`CATEGORY`, `TAG`, `VENDOR`; остальные rules получают `NOT_APPLICABLE`.

## Catalog product snapshot

### Manual collection scopes

В `packages/broker-types/src/actions/catalog.ts` добавить:

- `ProductSnapshotPopulate.collections`;
- `CatalogProductCollectionSnapshotSelection`;
- `CatalogProductCollectionSnapshot`.

Internal snapshot:

```typescript
interface CatalogProductCollectionSnapshot {
  id: string;
  manualRank: string;
}
```

Catalog query возвращает только:

- non-deleted collections;
- `type = 'manual'`;
- существующий `collection_item` данного product.

Publication/effective window намеренно не фильтруют snapshot. Membership можно
индексировать заранее, а visibility контролируется collection projection.
Изменение публикации не должно fan-out-ить все manual products.

`catalogProductSnapshotSelection.ts` запрашивает collections, а
`catalogListingSnapshotMapper.mapScopes()` добавляет:

```typescript
{
  scopeType: "collection",
  collectionId,
  manualRank,
}
```

### Raw rule facts

В Listing broker contract добавить:

```typescript
interface ListingRuleFactsSnapshot {
  productTerms: ListingProductRuleTermSnapshot[];
  variantTerms: Array<{
    variantId: string;
    terms: ListingVariantRuleTermSnapshot[];
  }>;
}

type ListingProductRuleTermSnapshot =
  | { kind: "tag"; tagId: string }
  | {
      kind: "feature";
      sourceHandle: string;
      valueHandle: string;
    };

interface ListingVariantRuleTermSnapshot {
  kind: "option";
  sourceHandle: string;
  valueHandle: string;
}
```

`ListingSellableItemSnapshot.ruleFacts` обязателен.

Facts строятся в `catalogListingSnapshotMapper.ts` непосредственно из
`CatalogProductSnapshot`:

- tags → product terms по tag UUID;
- features → product terms по source/value handles;
- options → variant terms по source/value handles.

Listing product snapshot selection обязана запрашивать tag `id`; отсутствие ID
в hydrated snapshot считается contract/integrity failure, а не приводит к
пропуску tag rule fact.

Category и vendor не дублируются в `ruleFacts`: для них уже существуют
canonical dedicated indexes.

Rule facts нельзя строить из результата
`ListingResolveFacetSelectionsScript`. Этот script намеренно отбрасывает
unconfigured facet source values. `ruleFacts`:

- присутствуют до facet resolution;
- не изменяются facet resolution;
- входят в snapshot/write-model hash;
- сортируются и deduplicate-ятся детерминированно.

Contract versions Catalog Product Snapshot и Listing Update bump-ятся одной
атомарной фазой. Compatibility branch не добавляется.

## Collection projection Catalog → Listing

### Broker snapshot

В `@shopana/broker-types` добавить protected Catalog action:

```text
catalog.getCollectionListingSnapshot
```

Input:

```typescript
interface GetCollectionListingSnapshotParams {
  storeId: string;
  collectionId: string;
}
```

Success snapshot:

```typescript
interface CatalogCollectionListingSnapshot {
  snapshotVersion: "2026-08-19";
  state: "live";
  id: string;
  storeId: string;
  listingRevision: number;
  type: "manual" | "rule";
  defaultSort: "manual" | "price" | "newest" | "name";
  defaultSortDirection: "asc" | "desc";
  publishedAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  rules: CanonicalCollectionRule[];
  rulesHash: string;
  listingUpdatedAt: string;
}
```

Для soft-deleted collection action возвращает authoritative tombstone:

```typescript
interface CatalogCollectionListingTombstone {
  snapshotVersion: "2026-08-19";
  state: "deleted";
  id: string;
  storeId: string;
  listingRevision: number;
  deletedAt: string;
}
```

Cross-store и неизвестный ID возвращают `NOT_FOUND`; deleted collection не
сворачивается в `NOT_FOUND`, потому что Listing нужен authoritative tombstone
revision. Остальные failures — discriminated union с `code`, `retryable`,
`message`.
Authorization разрешает caller service `listing`; `storeId` берётся из trusted
broker context и проверяется против snapshot.

Manual items не входят в collection snapshot: они синхронизируются через
product snapshots и не раздувают definition event.

### Domain events

В `@shopana/events` добавить:

```text
collectionCreated
collectionUpdated
collectionDeleted
```

Created/updated payload:

```typescript
interface CollectionChangedPayload {
  storeId: string;
  collectionId: string;
  revision: number;
  listingRevision: number;
  reasons: CollectionUpdatedReason[];
}
```

Reasons:

```text
metadata
rules
publication
schedule
sort
items
rank
```

`sort` используется для `defaultSort/defaultSortDirection` и всегда означает
изменение Listing definition. `metadata` относится только к display metadata,
translations, SEO и media и не меняет `listingRevision`.

Deleted payload дополнительно несёт `deletedAt`.

Event остаётся thin: Listing hydrate-ит current snapshot через protected
Catalog action. Full rules не копируются в event payload.

Definition `payloadHash` строится только из полей listing snapshot, включая
`listingUpdatedAt`; aggregate `updatedAt`, display metadata и aggregate
`revision` в hash не входят.

В `ProductUpdatedReason` добавить `collection`. Manual add/remove/move/rebalance
публикует `productUpdated` для всех products, чьи membership/rank изменились.

### Durable mutation flows

Collection mutation вызывается через Catalog `BrokerWorkflow`, а не через
последовательность «script + best-effort emit» в GraphQL resolver.

Definition mutation:

1. transactional mutation step;
2. durable collection event step;
3. return mutation result.

Rules/default sort/publication update не fan-out-ит products. Display metadata
может публиковать domain event для других consumers, но не меняет
`listingRevision`; Listing обрабатывает такой event как no-op по definition
hash/listing revision.

Manual item/rank mutation:

1. transactional mutation с increment aggregate `revision`;
2. durable paginated/batched `productUpdated(collection)` fan-out;
3. optional `collectionUpdated(items|rank)` для domain consumers;
4. return mutation result после durable enqueue fan-out, но не после завершения
   Listing indexing.

Manual mutation не меняет `listingRevision`. Поэтому порядок collection и
product events не используется как correctness barrier.

Bulk manual operations имеют bounded input. Clear/bulk remove и rebalance
больших collections перечисляют affected product IDs страницами и ставят
fan-out в queue; workflow state не хранит весь список. Soft delete collection
не fan-out-ит products: Listing закрывает state и удаляет posting/sort rows по
collection ID.

### Listing projection workflow

Добавить:

- `ListingCollectionEventHandlers`;
- `ListingCollectionProjectionWorkflow`;
- hydration step;
- transactional upsert/delete scripts.

Created/updated algorithm:

1. получить event sequence;
2. hydrate current authoritative Catalog live snapshot или tombstone;
3. validate version, store, listing revision и canonical rules hash;
4. взять tenant-scoped transaction advisory lock по
   `(storeId, collectionId)`, затем прочитать live state и tombstone;
5. если hydrated `listingRevision < event.listingRevision`, вернуть retryable
   source inconsistency: Catalog snapshot не может отставать от committed event;
6. если hydration вернул tombstone, применить delete algorithm по tombstone
   listing revision;
7. ignored stale, если hydrated listing revision меньше current projection;
8. no-op, если listing revision и payload hash совпадают;
9. terminal conflict, если listing revision совпадает, а hash различается;
10. atomic upsert current hydrated snapshot.

Thin event является wake-up signal. Если event listing revision `r1`, а
hydration уже вернул live snapshot `r3`, workflow применяет `r3`; он не требует
равенства event и snapshot listing revisions. Последующие `r2/r3` events
становятся stale/no-op.
Сравнение и persistence всегда используют hydrated `listingRevision`.
`eventSequence` хранится как max observed transport ordering token для
diagnostics/idempotency, но не заменяет authoritative listing revision.

Authoritative `NOT_FOUND` означает неизвестный или cross-store ID и не создаёт
tombstone. Tombstone создаётся только из typed deleted snapshot либо delete
event с той же listing revision.

Delete algorithm:

1. взять тот же tenant-scoped transaction advisory lock и прочитать live state
   и tombstone;
2. игнорировать stale delete;
3. upsert отдельный tombstone с delete listing revision и max observed event
   sequence;
4. удалить live `collection_state` row;
5. удалить manual collection posting по collection ID;
6. удалить `sort_kind = manual` rows по `manual_scope_id`;
7. commit tombstone, live-state delete и cleanup одной transaction, чтобы late
   update не
   восстановил collection.

Retryable broker/database failures retry-ятся. Invalid version, store mismatch,
same-listing-revision conflict и invalid canonical rules — non-retryable.

## Listing persistence

### Live collection state

Создать domain `services/listing/migrations/domains/9200_collections/` и
таблицу только для live definitions `listing.collection_state`:

```text
store_id               uuid        NOT NULL
collection_id          uuid        NOT NULL
listing_revision       integer     NOT NULL
collection_type        varchar     NOT NULL
default_sort           varchar     NOT NULL
default_sort_direction varchar     NOT NULL
published_at           timestamptz NULL
effective_from         timestamptz NULL
effective_to           timestamptz NULL
rules_json             jsonb       NOT NULL
rules_hash             text        NOT NULL
payload_hash           text        NOT NULL
event_sequence         bigint      NOT NULL
source_updated_at      timestamptz NOT NULL
projected_at           timestamptz NOT NULL
PRIMARY KEY (store_id, collection_id)
```

Constraints:

- allowed collection type/default sort/direction;
- non-negative listing revision/event sequence;
- `rule → default_sort <> manual`;
- `manual → rules_json = []`;
- rules hash/payload hash non-empty.

Deleted state хранится отдельно в `listing.collection_tombstone`:

```text
store_id          uuid        NOT NULL
collection_id     uuid        NOT NULL
listing_revision  integer     NOT NULL
event_sequence    bigint      NOT NULL
deleted_at        timestamptz NOT NULL
projected_at      timestamptz NOT NULL
PRIMARY KEY (store_id, collection_id)
```

Tombstone содержит только поля authoritative deleted snapshot и не использует
sentinel type/sort/rules/hash values. Все live/delete apply scripts сначала
берут transaction-scoped PostgreSQL advisory lock по stable shared 64-bit hash
tuple `(storeId, collectionId)`. Hash collision допускает только лишнюю
сериализацию и не влияет на correctness. После lock repositories читают обе
таблицы:

- tombstone revision `>` incoming live revision → stale live snapshot;
- tombstone revision `=` incoming live revision → terminal live/delete
  conflict;
- live revision `>` tombstone revision допустима только если Catalog lifecycle
  когда-либо явно введёт restore operation; в первой версии restore отсутствует,
  поэтому это terminal integrity failure;
- delete upsert монотонно сохраняет max listing revision и event sequence.

Repository наследуется от `BaseRepository`; public methods не принимают
`storeId`.

### Posting field contract

Listing migration:

1. удалить `chk_listing_posting_bitmap_no_collection_field`;
2. заменить entity/field CHECK:

```text
product: category | vendor | facet | collection | rule_term
variant: term | variant_product | rule_term
```

Physical rule-term keys кодируются только shared helper'ом:

```text
product/rule_term ["v1","tag","<tag UUID>"]
product/rule_term ["v1","feature","<sourceHandle>","<valueHandle>"]
variant/rule_term ["v1","option","<sourceHandle>","<valueHandle>"]
```

Используется canonical JSON serialization без whitespace. Call sites не
собирают `value_key` конкатенацией.

Добавить:

- `CollectionRuleTerm` discriminated union;
- `encodeCollectionRuleTerm()`;
- `decodeCollectionRuleTerm()`;
- validation registry допустимых kind/entity combinations;
- deduplication/sort helpers.

### Writer changes

Обновить single и batch write paths:

- `ProductPostingField` получает `collection | rule_term`;
- `VariantPostingField` получает `rule_term`;
- write model содержит collection postings и raw rule term postings;
- stale product terms удаляются при каждом applied product rewrite;
- stale variant terms удаляются для удалённых/replaced variants;
- manual sort rows обновляются из collection scopes;
- rule collection никогда не создаёт manual scope rows;
- write-model hash включает новые rows;
- item state и all index writes остаются одной transaction.

Product delete cascade/delete plan удаляет:

- product collection membership;
- product rule terms;
- variant rule terms;
- collection manual sort rows.

Batch writer не выполняет per-item queries после merge. Payloads объединяются
только после stale/no-op classification под существующими locks.

## Rule compiler

### Internal normalized plan

Listing не компилирует raw JSON напрямую. `CollectionRuleCompiler` принимает
validated immutable input:

```typescript
interface CompileCollectionRulesInput {
  listingRevision: number;
  rulesHash: string;
  rules: readonly CanonicalCollectionRule[];
}
```

и возвращает:

```typescript
interface CollectionRulePlan {
  listingRevision: number;
  rulesHash: string;
  matchesNothing: boolean;
  productPostingGroups: ProductPostingGroup[];
  productRangePredicates: ProductRangePredicate[];
  variantPostingGroups: VariantPostingGroup[];
  variantPricePredicates: VariantPricePredicate[];
  hasVariantPredicates: boolean;
}
```

Compiler:

- pure и deterministic;
- не обращается к repositories;
- не знает о facets;
- выдаёт parameterized Drizzle `sql` fragments на следующем layer;
- не принимает client-provided SQL field/value;
- компилирует exact physical key; отсутствие posting row при выполнении даёт
  empty bitmap;
- для пустого rule set возвращает `matchesNothing = true` и пустые predicate
  arrays; repository short-circuit-ит page/count/facets в explicit empty
  product scope.

Projection row валидируется при ingestion, поэтому invalid persisted rule
или invalid physical key считаются integrity failure, а не storefront user
error.

### Bitmap algebra

Обозначения:

- `U_p` — published product universe текущего store;
- `R_p` — AND всех product-level collection rule predicates;
- `R_v` — AND всех variant-level collection rule predicates;
- `F_p` — AND storefront product-level filters;
- `F_v` — AND storefront variant-level filters;
- `π(V)` — projection variant bitmap в product bitmap через
  `variant_product`.

Universe является execution policy, а не частью rule plan:

- storefront и preview используют published `U_p`;
- admin connection использует `U_admin` с явно разрешёнными product statuses;
- rules, postings и same-variant algebra одинаковы для обоих universes.

Rule collection membership без пользовательских filters:

```text
rules = []  -> C = ∅
rules != [] -> C = U_p ∩ R_p ∩ π(R_v)
```

Если variant rules отсутствуют, `π(R_v)` не добавляется.

Финальный storefront result:

```text
rules = []  -> M = ∅
rules != [] -> M = U_p ∩ R_p ∩ F_p ∩ π(R_v ∩ F_v)
```

Для non-empty rule set без collection/user variant predicates variant
projection не добавляется. Empty RULE никогда не использует neutral `AND`
identity и не может быть расширен пользовательскими filters.

Manual collection:

```text
M = U_p ∩ Posting(product, collection, collectionId) ∩ F_p ∩ π(F_v)
```

Ключевой invariant: нельзя сначала вычислить `π(R_v)`, а затем отдельно
`π(F_v)` и пересечь product bitmaps. Это создаёт cross-variant false positive.

### Rule compilation

Set rules:

- `IN(values)` → OR postings;
- `ALL(values)` → AND postings;
- empty value set запрещён до compiler.

Sources:

- category → `product/category`;
- vendor → `product/vendor`;
- tag → `product/rule_term`;
- feature → `product/rule_term`;
- option → `variant/rule_term`;
- availability → registered canonical variant term;
- price → `variant_listing_price_index`, bitmap по `variant_doc_id`;
- created time → `product_listing_index`, bitmap по `product_doc_id`.

Range scans:

- используют bound parameters;
- используют существующие covering indexes;
- агрегируются через `rb_build_agg`;
- empty rowset превращается в explicit empty bitmap;
- price currency берётся из rule, не из storefront context.

Fixed rule currency делает collection membership стабильным между storefront
currency contexts. User price filter и price sort продолжают использовать
storefront currency. Когда присутствуют оба условия, одна variant должна иметь
подходящие price rows в обеих currencies.

### Repository request

Расширить `StorefrontListingScope`:

```typescript
type StorefrontListingScope =
  | { kind: "global" }
  | { kind: "category"; categoryId: string }
  | { kind: "collection"; collectionId: string };
```

После load collection projection resolved request содержит:

```typescript
interface ResolvedCollectionScope {
  collectionId: string;
  collectionType: "manual" | "rule";
  listingRevision: number;
  rulesHash: string;
  defaultSort: "manual" | "price" | "newest" | "name";
  defaultSortDirection: "asc" | "desc";
  rulePlan: CollectionRulePlan | null;
}
```

Collection projection:

- загружается один раз на GraphQL field;
- обязана иметь listing revision, равную Catalog representation listing
  revision;
- проверяется на visibility по database clock;
- используется одновременно page/count/facet queries;
- входит в request/cursor hash как
  `collectionId + listingRevision + rulesHash`.

Cursor от старой listing revision после rule change отклоняется с
`CURSOR_REQUEST_MISMATCH`; Listing не продолжает pagination по изменившемуся
rule set.

### Query compiler integration

Refactor scope compilation на четыре связанные immutable projections:

```text
scope_product_base
scope_variant_base
scope_membership_variants
scope_membership_products
```

Для rule collection:

- `scope_product_base = U_p ∩ R_p`;
- `scope_variant_base = R_v`;
- `scope_membership_variants =
  variants(scope_product_base) ∩ scope_variant_base`;
- при наличии variant rules:
  `scope_membership_products =
  scope_product_base ∩ π(scope_membership_variants)`;
- без variant rules:
  `scope_membership_products = scope_product_base`.

Для manual collection:

- `scope_product_base =
  U_p ∩ Posting(product, collection, collectionId)`;
- `scope_variant_base` отсутствует;
- `scope_membership_variants = variants(scope_product_base)`;
- `scope_membership_products = scope_product_base`.

`scope_membership_products` используется для:

- product-level facet metadata candidate discovery;
- empty scope short-circuit;
- unfiltered total count;
- collection visibility diagnostics.

`scope_membership_variants` используется для variant facet, price и
availability candidate discovery. Поэтому collection rule `color = red` не
показывает option values, которые существуют только на non-red variants того
же product.

Финальный product match строится из `scope_product_base` и пересечения
`scope_variant_base` с user variant predicates, чтобы сохранить one-variant
semantics.

Отсутствующий collection/user variant predicate является neutral identity.
Variant projection полностью опускается, если отсутствуют оба вида variant
predicates.

Search candidate bitmap пересекается с тем же final collection expression.
Collection search не создаёт отдельный query engine.

### Sorting

Без explicit sort:

- non-empty query → `RELEVANCE`;
- manual collection с `defaultSort = manual` → `MANUAL`;
- `newest/desc` → `NEWEST`;
- `name/asc|desc` → `TITLE_ASC|TITLE_DESC`;
- `price/asc|desc` → `PRICE_ASC|PRICE_DESC`.

Available sorts:

- `MANUAL` только manual collection;
- `RELEVANCE` только при query;
- `NEWEST`, `CREATED_AT`, title и price sorts для обеих collection types.

Price collector и matched variant selection ограничиваются combined
`R_v ∩ F_v`. Нельзя сортировать product по цене variant, которая не является
валидным witness rules и активных filters.

## Facet filtering в collection scope

### Facet scope

Добавить `COLLECTION`:

```graphql
enum FacetScopeType {
  SEARCH
  CATEGORY
  COLLECTION
}
```

Изменить:

- DB CHECK `facet_scope_type_check`;
- GraphQL enums/generated types;
- scripts/repository validation;
- default scopes нового Facet на
  `SEARCH + CATEGORY + COLLECTION`;
- storefront scope-to-facet-scope mapping;
- admin listing scope enum/input.

`COLLECTION` применяется ко всем collections. Per-collection allowlist не
добавляется.

### Eligibility и independence

Facet показывается/принимается как user filter в collection listing, только
если:

- Facet существует и валиден;
- у него есть `FacetScopeType.COLLECTION`;
- source/value references валидны;
- product candidate values существуют внутри `scope_membership_products`;
- variant candidate values существуют внутри `scope_membership_variants`.

При этом collection rule продолжает работать, если:

- соответствующего Facet нет;
- Facet не имеет COLLECTION scope;
- source value не добавлен в Facet;
- Facet disabled/deleted;
- source values сгруппированы иначе.

### Counts и target isolation

Collection rules — immutable scope predicates. Target-filter isolation удаляет
только пользовательский filter считаемого Facet.

Для target facet `k`:

```text
product candidate =
  scope_product_base
  ∩ all user product filters except k
  ∩ π(
      scope_variant_base
      ∩ all user variant filters except k
    )
```

Rule на тот же raw source не удаляется. Например, collection rule
`feature material = cotton` остаётся активным при подсчёте storefront Facet
`material`.

Price range и availability counts используют тот же combined variant base.
Все counts считаются по products, а не по количеству matching variants.

## GraphQL Federation

### Catalog storefront

Добавить Catalog-owned storefront schema:

```graphql
type Collection implements Node @key(fields: "id") {
  id: ID!
  listingRevision: Int! @inaccessible
  handle: String!
  type: CollectionType!
  name: String!
  description: RichText
  excerpt: RichText
  seo: SEO!
  media(
    first: Int
    after: Cursor
    last: Int
    before: Cursor
  ): CollectionMediaConnection!
  featuredMedia: Media
  publishedAt: DateTime!
  activeFrom: DateTime
  activeTo: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type CollectionMediaConnection implements Connection {
  edges: [CollectionMediaEdge!]!
  nodes: [Media!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type CollectionMediaEdge {
  cursor: Cursor!
  node: Media!
}

extend type Query {
  collection(handle: String!): Collection
}
```

Storefront Catalog resolver возвращает только visible collection по правилам
lifecycle. Rules storefront клиенту не раскрываются. Media shape повторяет
существующий Product/Category Relay contract; отдельный неопределённый
`CollectionMedia` type не вводится.

### Listing storefront

Listing subgraph:

```graphql
extend type Collection @key(fields: "id") {
  id: ID! @external
  listingRevision: Int! @external @inaccessible

  products(
    first: Int = 20
    after: Cursor
    query: String
    filters: [ListingFilterInput!]
    sort: ListingSort
  ): ProductConnection! @requires(fields: "listingRevision")
}
```

Добавить:

- `CollectionResolver`;
- `collectionProductsInput()`;
- `entryPoint = "collection"`;
- Federation imports для `@requires` / `@inaccessible` и representation props
  `{ id, listingRevision }`;
- collection-aware input normalization;
- logs с `collectionId`, но без rules payload;
- schema docs об independent rules и facets.

`ProductConnection` переиспользуется без второго connection contract.

Если Listing projection отсутствует или её listing revision не равна listing
revision из Catalog representation, resolver fail-closed с
`COLLECTION_INDEX_NOT_READY`.
Он не обслуживает старые rules, не подменяет collection global listing'ом и не
возвращает случайно расширенный result.

### Admin

Catalog сохраняет:

- collection metadata/rules CRUD;
- manual add/remove/move/rebalance;
- rule reference statuses.

Listing становится владельцем admin `Collection.products` и
`productsCount`, чтобы убрать текущие TODO и второй read engine. Поле
возвращает Listing-owned connection и поддерживает collection scope, filters,
search и sort.

Одновременно поля и старый `CollectionProductConnection` удаляются из Catalog
admin schema до добавления Listing extension, чтобы Federation composition не
получила двух owners одного field. Public admin `revision` используется
Listing extension через inaccessible `listingRevision @requires`. Public admin
`revision` остаётся Catalog aggregate revision и используется только для
optimistic concurrency.

Admin connection:

- не требует storefront publication/effective-window visibility;
- всё равно требует exact collection projection listing revision;
- по умолчанию показывает draft и published products;
- принимает explicit product status filter;
- использует тот же rule compiler и variant algebra;
- не меняет storefront preview semantics.

`collectionRulesPreviewCount` flow:

1. Catalog декодирует и validates transient rules;
2. canonical rules отправляются в protected Listing action;
3. Listing компилирует их тем же `CollectionRuleCompiler`;
4. repository считает published product count;
5. Catalog возвращает count и user errors.

Preview:

- не создаёт temporary collection rows;
- не пишет projection;
- не индексирует products;
- не зависит от facets;
- использует current Listing eventual-consistent state;
- имеет те же limits и semantics, что persisted rules;
- для пустого transient rule set возвращает `0` через
  `CollectionRulePlan.matchesNothing`.

## Consistency и lifecycle

### Rule update

```text
Admin mutation
  -> Catalog transaction: replace rules + aggregate/listing revisions
  -> collectionUpdated(rules)
  -> Listing hydrate definition
  -> atomic collection_state upsert
  -> next read compiles new rules
```

Product reindex отсутствует.

### Product source update

```text
Product/tag/feature/option/category/price/inventory mutation
  -> productUpdated
  -> existing Listing product workflow
  -> snapshot includes current raw facts
  -> atomic posting/index rewrite
  -> every affected rule collection changes naturally
```

Нельзя перечислять affected rule collections в Catalog.

### Manual item update

```text
Manual collection mutation
  -> aggregate revision increment; listing revision unchanged
  -> productUpdated(collection) for affected products
  -> product snapshot carries membership/rank
  -> Listing rewrites collection posting/manual sort
  -> optional collectionUpdated(items|rank) is irrelevant to Listing state
```

Manual membership является eventual-consistent derived index:

- add/remove/move/rebalance могут быть видны по products постепенно;
- remove может временно оставлять stale member, add — временно не показывать
  новый member;
- ranks во время rebalance могут быть смешанными;
- existing collection state остаётся доступным;
- membership без live state не storefront-visible;
- retries сходятся к текущему Catalog snapshot;
- per-product event sequence не позволяет stale product event откатить более
  новый snapshot.

Это не называется fail-closed и не обещает atomic bulk visibility. Если позже
потребуется atomic manual membership cutover, он проектируется отдельно через
generation-staged postings и activation watermark; unversioned posting нельзя
использовать как атомарный barrier.

### Unpublish/schedule/delete

- Unpublish и effective window update меняют только `collection_state`;
  product fan-out не нужен.
- Effective boundaries проверяются на read по database clock, поэтому событие в
  момент boundary не требуется.
- Delete state немедленно закрывает read и очищает collection-specific posting/
  sort rows.
- Late product snapshots могут временно заново создать manual posting, но без
  live `collection_state` он недоступен. Periodic audit удаляет orphan
  collection postings; stale collection event не восстанавливает state из-за
  tombstone listing revision.

## Security и multi-tenancy

- Все persisted IDs scoped by `store_id`.
- Tenant repositories наследуются от `BaseRepository`.
- GraphQL принимает Global IDs и проверяет entity type.
- Admin inputs не принимают `storeId`.
- Broker action проверяет caller service и trusted store context.
- Collection snapshot `storeId` обязан совпадать с requested store.
- Rule references проверяются только внутри текущего store.
- Handles и JSON никогда не вставляются в raw SQL identifiers.
- SQL values передаются bound parameters.
- Cursor hash не содержит rules JSON, только stable listing revision/rules
  hash.
- Storefront не раскрывает internal rules и stale references.
- Cross-tenant collection ID выглядит как not found, а не как forbidden entity
  с подтверждением существования.

## Failure model

Business errors:

```text
COLLECTION_NOT_FOUND
INVALID_COLLECTION_TYPE
REVISION_CONFLICT
RULES_NOT_ALLOWED
RULES_REQUIRED_FOR_PUBLICATION
MANUAL_PRODUCTS_NOT_ALLOWED
INVALID_RULE_FIELD
INVALID_RULE_OPERATOR
INVALID_RULE_VALUE
INVALID_RULE_REFERENCE
INVALID_RULE_CURRENCY
INVALID_RULE_RANGE
RULE_LIMIT_EXCEEDED
INVALID_DEFAULT_SORT
```

Listing deterministic failures:

```text
UNSUPPORTED_COLLECTION_SNAPSHOT_VERSION
COLLECTION_STORE_MISMATCH
COLLECTION_LISTING_REVISION_PAYLOAD_CONFLICT
INVALID_COLLECTION_RULE_PROJECTION
COLLECTION_INDEX_NOT_READY
CURSOR_REQUEST_MISMATCH
```

Broker/database timeout, connection и serialization failures retryable.
Unknown constraints и unknown exceptions остаются infrastructure failures.

Missing posting для валидного, но stale rule reference — empty predicate, а не
infrastructure failure.

## Observability

Structured logs:

- collection event accepted/noop/stale/conflict;
- projection hydration/apply/delete;
- rule compiler field/operator count;
- collection listing query summary;
- preview count;
- manual fan-out progress;
- stale rule reference;
- orphan collection posting cleanup.

Metrics без collection ID labels:

```text
listing_collection_projection_total{operation,status,type}
listing_collection_projection_lag_seconds{type}
listing_collection_projection_missing_total
listing_collection_rule_compile_seconds{result}
listing_collection_rule_count{type}
listing_collection_query_seconds{type,search,sort}
listing_collection_preview_seconds{result}
listing_collection_orphan_postings_total
```

Tracing связывает:

- Catalog mutation workflow;
- emitted collection/product events;
- Listing projection/product workflows;
- storefront listing query.

Не записывать в metrics labels:

- collection ID;
- rule values;
- handles;
- query text.

## Consistency audits

Расширить Listing audit:

- every product/collection posting doc ID существует в product index;
- every product/variant rule term decodes и соответствует entity type;
- variant rule term doc ID существует в variant index;
- `cardinality = rb_cardinality(bitmap)`;
- manual sort row имеет соответствующий collection posting;
- live manual collection state не имеет rule JSON;
- live rule collection state не имеет `default_sort = manual`;
- rules hash соответствует canonical rules JSON;
- orphan collection postings/sort rows без live state выявляются и удаляются
  bounded repair action;
- live state и tombstone не существуют одновременно;
- stale tombstone не может быть overwritten меньшей listing revision;
- tombstone содержит только delete contract fields и не требует live sentinels.

Audit scan paginated/bounded. Repair не загружает весь store в память и только
удаляет orphan derived rows; он не выполняет backfill/rebuild.

## Performance requirements и scale gate

- Rule count/value limits обеспечивают bounded SQL size.
- Posting equality rules не выполняют scans.
- Price/created range predicates используют indexes и один bitmap aggregate на
  predicate.
- Collection projection загружается одним point lookup.
- Page/count/facets используют один resolved rule plan.
- Rule compiler не делает N repository calls.
- Writer не перечисляет rule collections при product update.
- Rule update complexity зависит от числа rules, не от размера catalog.
- Manual item update complexity зависит только от changed products.

Обязательный profiling dataset для scale characterization:

- 1M products;
- 3–5 variants на product;
- 32 rules;
- mixed product/variant rules;
- high- and low-cardinality terms;
- broad/narrow price and created-at ranges;
- facet counts с 0, 1 и несколькими active filters;
- search внутри rule collection.

Dataset 1M не является заранее обещанным supported scale текущего global bitmap
contract. Перед phase 5 acceptance команда фиксирует численные budgets для p95
latency, statement timeout, scanned rows/buffers и memory/temp spill на
согласованном test hardware.

Перед завершением фазы read path проверить `EXPLAIN (ANALYZE, BUFFERS)` для
representative queries в test environment. Если broad rule/facet queries
выполняют unbounded `rb_iterate`, full-store mapping/price scan или не
укладываются в budgets, segmented bitmap architecture становится prerequisite
для объявления поддержки соответствующего масштаба. Результат остаётся в
test/CI logs; отдельный report-файл в repository не создаётся.

## Порядок реализации

### Фаза 0. Зафиксировать contracts

1. Добавить enums и canonical DTO rules в `@shopana/broker-types`.
2. Добавить shared canonical serialization и versioned SHA-256 hash helpers.
3. Добавить collection snapshot/action contracts.
4. Добавить collection events, reason `sort` и
   `ProductUpdatedReason.collection`.
5. Bump Catalog Product Snapshot и Listing Update contract versions.
6. Обновить generated GraphQL contracts после schema changes.

Acceptance:

- один canonical rule type используется Catalog projection и Listing compiler;
- Catalog и Listing дают одинаковые `rulesHash/payloadHash` на shared vectors;
- JSON `unknown` не пересекает service boundary;
- contracts не импортируют service-local models.

### Фаза 1. Укрепить Catalog collection domain

1. Добавить aggregate/listing revisions и DB constraints.
2. Добавить expected aggregate revision в mutations.
3. Реализовать field-specific Zod validation/canonicalization.
4. Удалить `contains`.
5. Добавить vendor rules.
6. Ввести publish/type/default-sort invariants.
7. Сделать rule replace полностью transactional.
8. Добавить reference validation/status.
9. Удалить generic internal-error swallowing.

Acceptance:

- invalid rule не записывает частичный state;
- concurrent update не теряется;
- display metadata update не закрывает Listing read и не инвалидирует cursor;
- published empty RULE невозможна;
- MANUAL/RULE operation boundaries enforced.

### Фаза 2. Collection events и projection

1. Добавить Catalog collection mutation workflow.
2. Эмитить thin durable events.
3. Реализовать protected snapshot action.
4. Создать Listing collection state/tombstone tables.
5. Реализовать Listing handler/workflow.
6. Добавить stale/noop/conflict semantics.
7. Добавить metrics/logging.

Acceptance:

- create/update/delete сходятся при duplicate/out-of-order delivery;
- event `r1`, hydrated как current snapshot `r3`, применяет `r3` и не создаёт
  false conflict;
- rule update не создаёт product events;
- projection failure observable и retryable.

### Фаза 3. Manual collections в Listing index

1. Добавить collections в Catalog Product Snapshot selection.
2. Расширить `mapScopes()`.
3. Разрешить product/collection posting.
4. Писать manual sort rows.
5. Обновить single/batch/delete writers.
6. Эмитить product events из manual collection workflows.
7. Покрыть clear/bulk-remove/rebalance paginated fan-out.

Acceptance:

- add/remove/move/rebalance отражаются в Listing;
- manual mutations eventual-consistently сходятся без обещания atomic bulk
  visibility;
- late product indexing восстанавливает membership из Catalog snapshot;
- unpublish не требует product reindex;
- RULE collection не создаёт manual postings.

### Фаза 4. Независимый raw rule index

1. Добавить `ruleFacts` в Listing snapshot.
2. Построить facts в Catalog-to-Listing mapper до facet resolution.
3. Добавить `rule_term` physical field/codec.
4. Расширить write model/writers/audit.
5. Включить facts в hash/idempotency.
6. Проверить product lifecycle cleanup.

Acceptance:

- unconfigured tag/feature/option всё равно имеет raw rule posting;
- facet create/delete не меняет rule postings;
- stale facts удаляются atomic product rewrite.

### Фаза 5. Rule compiler и repository algebra

1. Реализовать pure canonical compiler.
2. Добавить collection scope resolver.
3. Разделить product base, variant base и membership products.
4. Встроить collection rules в page/count/facet/price/availability paths.
5. Обеспечить shared variant witness.
6. Добавить collection listing revision/rules hash в cursor request hash.
7. Встроить collection search и sorts.
8. Реализовать transient preview count через тот же compiler.

Acceptance:

- storefront и preview parity;
- missing term даёт empty result;
- collection rule и user facet не создают cross-variant match;
- old cursor rejected после rule listing revision.

### Фаза 6. Facet COLLECTION scope

1. Добавить DB/GraphQL enum value.
2. Изменить default facet scopes.
3. Добавить scope validation.
4. Ограничить available facets collection scope'ом.
5. Обновить target-filter isolation.
6. Добавить admin scope support.

Acceptance:

- rule membership работает без Facet;
- configured COLLECTION Facet фильтрует обе collection types;
- удаление Facet не меняет membership;
- counts учитывают rules и остальные filters.

### Фаза 7. Federation API

1. Добавить Catalog storefront Collection/Query.
2. Добавить Listing storefront Collection extension.
3. Переиспользовать `ProductConnection`.
4. Реализовать collection default/available sorts.
5. Перенести admin collection product read path в Listing.
6. Реализовать `collectionRulesPreviewCount`.
7. Удалить obsolete Catalog TODO/read DTOs.

Acceptance:

- schema composition успешна;
- Catalog не выполняет Listing SQL;
- Listing не читает Catalog DB;
- Collection products поддерживает search, facets, counts, sort и pagination.

### Фаза 8. Tests, audits и cleanup

1. Включить и переписать skipped collection tests под canonical API.
2. Добавить unit/repository/integration/e2e matrix ниже.
3. Добавить audits и bounded repair.
4. Добавить performance profiling.
5. Удалить legacy string operators и незавершённый Catalog read path.
6. Обновить architecture/DB contract docs после реализации отдельной
   согласованной documentation task.

Acceptance:

- все invariants покрыты;
- нет skipped core collection tests;
- нет dual/legacy branch;
- implementation соответствует knowledge base patterns.

## Test matrix

### Catalog unit/script tests

- valid contract каждого field/operator;
- invalid operator per field;
- malformed/extra JSON keys;
- wrong Global ID type;
- cross-store/missing/deleted reference;
- duplicate values/rules;
- limits;
- range and currency validation;
- empty RULE draft;
- publication empty RULE rejected;
- rules on MANUAL rejected;
- manual items on RULE rejected;
- manual sort on RULE rejected;
- expected revision conflict;
- transaction rollback при invalid replacement.

### Mapper/write-model tests

- manual collection scope mapping;
- deterministic scope order;
- raw tag facts by UUID;
- raw feature/option facts by handles;
- raw facts survive absent Facet;
- raw facts survive facet grouping;
- raw facts unaffected by facet resolution;
- stale product/variant terms removed;
- write hash changes on rule facts/manual scopes;
- product delete removes all collection rows.

### Compiler tests

- IN = OR;
- ALL = AND;
- separate rules = AND;
- category/vendor/tag/feature product rules;
- option/price/availability variant rules;
- created-at bounds;
- fixed price currency;
- missing posting = empty;
- BETWEEN inclusive;
- canonical plan deterministic for reordered equivalent values;
- empty rule set compiles to `matchesNothing` и даёт count `0`;
- shared rule/payload hash vectors одинаковы в Catalog и Listing;
- unknown hash version rejected;
- invalid projection terminal;
- SQL values bound, not interpolated.

### Repository tests

- manual collection membership;
- manual rank;
- rule product-only scope;
- rule variant-only scope;
- mixed scope;
- collection rules + user product facet;
- collection rules + user variant facet;
- option + price + availability same variant;
- no cross-variant false positive;
- facet candidate discovery limited to collection membership;
- target isolation keeps collection rule;
- price range/counts use combined witness;
- search inside collection;
- default and explicit sorts;
- matched price sort uses valid witness;
- empty/missing projection fail-closed;
- inactive/unpublished collection rejected;
- cursor invalidated by listing revision;
- tenant isolation.

### Event/workflow tests

- duplicate collection event no-op;
- stale update ignored;
- same-listing-revision/different-payload conflict;
- older event с более новым hydrated snapshot coalesces to current state;
- transient hydration retry;
- tombstone без предшествующего live state сохраняется без sentinel fields;
- delete tombstone blocks late update;
- rules event updates projection without product reindex;
- manual add/remove/move emits affected product events;
- clear/bulk-remove/rebalance fan-out resumes by page;
- out-of-order collection/product events converge.

### Playwright e2e

1. Создать RULE collection по tag без Tag Facet — products совпадают.
2. Добавить Tag Facet с COLLECTION scope — filter и counts появляются.
3. Удалить Facet — membership не меняется.
4. Rule по feature работает без Feature Facet.
5. Rule по option работает без Option Facet.
6. Option rule + storefront option/price/availability требует одну variant.
7. Manual collection поддерживает те же facet filters/counts.
8. Rule update меняет result без product reindex.
9. Product source update меняет все релевантные rule collections через обычный
   product event.
10. Preview count равен storefront total count для published products.
11. Draft/unpublished/inactive products исключены.
12. Collection effective interval соблюдается.
13. Search ограничен collection membership.
14. Manual/default/price/title/newest sorts deterministic.
15. Cursor старой listing revision после rule update отклоняется.
16. Empty RULE не публикуется.
17. Empty RULE preview и admin connection возвращают `0`.
18. Cross-store IDs не раскрывают данные.
19. Collection delete закрывает read и очищает projection.
20. Collection media использует Relay connection и schema composition проходит.

## Definition of done

Реализация завершена, когда:

- Catalog является единственным owner collection definitions;
- Listing является единственным owner collection product read path;
- rule collection membership не зависит от Facet tables/configuration;
- manual и rule collections поддерживают одинаковый storefront facet API;
- variant rules и user filters используют shared variant witness;
- rule update не запускает product fan-out;
- product update не перечисляет collections;
- collection projection idempotent и защищена от stale events;
- manual membership явно eventual-consistent и сходится по current product
  snapshots;
- cursor привязан к collection listing revision/rules hash;
- preview и storefront используют один compiler;
- backfill, dual-read и dual-write code отсутствуют;
- core tests не skipped;
- schema composition, migrations, codegen, tests и e2e проходят через
  `shopana-cli`.

## Отклонённые варианты

### Использовать Facet postings для rules

Отклонено: unconfigured source values исчезают в
`ListingResolveFacetSelectionsScript`, поэтому membership менялся бы при
создании/удалении Facet.

### Материализовать каждый RULE как collection posting

Отклонено для первой версии: изменение product потребовало бы найти и
пересчитать все потенциально affected collections, а изменение rule — сделать
catalog-wide rebuild.

### Выполнять rules в Catalog SQL

Отклонено: это дублирует Listing search/filter/sort/count engine, нарушает
service ownership и не даёт canonical facet semantics.

### Проецировать rule variants в products до user filters

Отклонено: создаёт cross-variant false positives.

### Передавать full rules в domain event

Отклонено: payload становится вторым snapshot contract и усложняет stale event
handling. Events thin, current state hydrate-ится из Catalog.

### Считать missing rule term как ignored predicate

Отклонено: collection незаметно расширяется вплоть до всего catalog. Missing
term всегда empty predicate.
