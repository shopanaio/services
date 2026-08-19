# Storefront Product Recommendations: implementation plan

## Статус документа

План описывает реализацию:

- `Product.relatedProducts`;
- `Product.frequentlyBoughtTogether`;
- manual recommendations и placement policies;
- проекцию подтверждённых продаж;
- FBT statistics;
- candidate generation, ranking и immutable snapshots;
- Admin API, scheduling, lifecycle и observability.

План готов к реализации по фазам, но имеет два внешних prerequisite:

1. Orders должен иметь authoritative transition, из которого можно надёжно
   публиковать `orderSaleCommitted` и `orderSaleReversed`.
2. Project должен предоставить защищённый paginated broker action для
   перечисления active stores operational scheduler'ом.

До выполнения первого prerequisite можно реализовать curated recommendations,
storefront serving и ranking fallbacks. Behavioral FBT остаётся выключенным.

Проект не имеет production/staging данных. Backfill, dual-read, dual-write и
обратная совместимость не предусматриваются.

## Источники

Обязательные источники решений:

- `AGENTS.md`;
- `knowledge/AGENTS.md`;
- `knowledge/vault/architecture/product-recommendations.ru.md`;
- `knowledge/vault/architecture/multi-tenancy.md`;
- `knowledge/vault/patterns/repository.md`;
- `knowledge/vault/patterns/script.md`;
- `knowledge/vault/packages/dbos/workflows.md`;
- `services/listing/docs/storefront-product-recommendations-api.ru.md`;
- `services/listing/migrations/domains/9100_recommendations/*.sql`;
- существующие Listing workflows, repositories, loaders и storefront cursor.

Canonical architecture остаётся source of truth. Этот документ фиксирует
конкретный порядок реализации и устраняет неоднозначности, необходимые для
написания кода.

## Scope

Входит:

- placements `PRODUCT_RELATED` и `FREQUENTLY_BOUGHT_TOGETHER`;
- strategies `CURATED_ONLY`, `CURATED_FIRST`, `BLENDED`,
  `AUTOMATED_ONLY`;
- manual actions `PIN`, `BOOST`, `EXCLUDE`;
- FBT, category popularity и store popularity sources;
- atomic run/snapshot activation;
- forward-only Relay pagination;
- persisted-policy и draft preview;
- schedule boundaries manual actions;
- product lifecycle reconciliation.

Не входит:

- ML ranker;
- content embeddings и `content_similarity` candidate source;
- impression/click/add-to-cart attribution;
- cart/checkout placements;
- pricing, promotions и cart mutations;
- retention удаления historical facts/statistics.

`CONTENT_SIMILARITY` остаётся GraphQL/DB enum value, но source code
`content_similarity` не регистрируется. Разрешённые fallback codes первой
версии:

```text
category_popularity
store_popularity
```

## Общие правила реализации

- Все tenant repositories наследуются от `BaseRepository`.
- Публичные методы tenant repositories не принимают `storeId`; используется
  только `this.storeId`.
- Все запросы выполняются через `this.connection`.
- Все async read methods помечаются `@ReadOnly()`.
- Persisted IDs генерируются через `generateUuidV7()` /
  `generateUuidV7s()`.
- Mutation business logic находится в `BaseScript` с `@Transactional()`.
- Business conflicts возвращаются как `UserError[]`; infrastructure failures
  выбрасываются.
- Durable orchestration использует `BrokerWorkflows`. Sagas не применяются:
  calculation и snapshot build не имеют внешних compensatable side effects,
  а lifecycle failure должен фиксироваться явно.
- Decimal values проходят TypeScript boundary как strings.
- Raw SQL использует `sql` fragments и typed row DTO.
- Admin inputs не принимают `storeId`.
- Product IDs принимаются как Relay Global IDs и проверяются в trusted store
  scope.
- Bulk fan-out всегда paginated и queue-based. Workflow не хранит массив всех
  anchors в durable result.
- Каждый workflow start использует deterministic idempotency context и
  обрабатывает duplicate start как successful no-op.

## Фиксированные domain decisions

### Policy absence и disabled policy

- Snapshot строится только при существующей enabled policy.
- Отсутствующая policy означает empty connection.
- `enabled = false` в той же транзакции supersede-ит все active snapshots
  placement'а. После commit storefront сразу возвращает empty connection.
- Повторное включение запускает rebuild всех eligible anchors placement'а.
- Snapshot первой версии всегда имеет non-null `policy_id`.

### Availability

Eligible target обязан:

- существовать в `product_listing_index` того же store;
- иметь `status = 'published'`;
- иметь current availability projection
  `listing_posting_product_sort.sort_kind = 'availability'` с
  `bool_value = true`.

`product_listing_index.total_stock` не используется как единственный источник
availability: canonical storefront projection уже материализует availability
с учётом indexable variants.

### Snapshot expiry

Первая версия пишет `expires_at = NULL`. Stale-serve window не вводится.
Expiry policy добавляется отдельной версией модели. Read path всё равно
отклоняет случайно появившийся expired snapshot.

### Calculation cadence

- Calculation bucket — UTC day.
- Scheduler запускается hourly для recovery и обработки новых ingestion
  watermark.
- Новый run нужен, когда:
  - cursor watermark больше watermark последнего active/building/ready run; или
  - active run относится к предыдущему UTC day.
- Поэтому time decay и rolling window пересчитываются минимум один раз в день
  даже при отсутствии новых events.

## Physical schema

Существующие десять domain tables используются без изменения:

```text
recommendation_placement_policy
manual_product_recommendation
recommendation_ingestion_cursor
recommendation_order_fact
recommendation_order_product_fact
recommendation_calculation_run
recommendation_product_stat
recommendation_product_pair_stat
recommendation_snapshot
recommendation_snapshot_item
```

Добавить migration
`9104_recommendations__maintenance.sql` с operational cursor:

```sql
CREATE TABLE listing.recommendation_maintenance_cursor (
  cursor_id uuid PRIMARY KEY,
  store_id uuid NOT NULL UNIQUE,
  last_manual_boundary_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Migration также добавляет UUIDv7 checks, проверку
`last_manual_boundary_at <= updated_at` и store lookup index. Cursor нужен для
resumable обработки `starts_at`/`ends_at`; это не backfill существующих данных.

На первом запуске store workflow:

1. выполняет full reconciliation всех anchors с scheduled manual rows;
2. устанавливает watermark на текущую завершённую minute boundary;
3. далее читает только новые boundaries.

## Целевая структура

```text
packages/events/src/types.ts
packages/broker-types/src/actions/project.ts

services/orders/src/...
  authoritative sale transition integration

services/project/src/actions/...
  listActiveStores action

services/listing/migrations/domains/9100_recommendations/
  9104_recommendations__maintenance.sql

services/listing/src/repositories/models/
  recommendationRuntime.ts

services/listing/src/repositories/recommendation/
  types.ts
  RecommendationPlacementPolicyRepository.ts
  ManualProductRecommendationRepository.ts
  RecommendationIngestionCursorRepository.ts
  RecommendationOrderFactRepository.ts
  RecommendationCalculationRunRepository.ts
  RecommendationSnapshotRepository.ts
  RecommendationMaintenanceRepository.ts
  RecommendationAnchorCollectorRepository.ts
  index.ts

services/listing/src/repositories/storefront/
  StorefrontRecommendationQueryRepository.ts
  recommendationCursor.ts

services/listing/src/recommendation/
  constants.ts
  candidateTypes.ts
  manualConfigurationHash.ts
  candidateSources.ts
  rankRulesV1.ts
  buildRecommendation.ts

services/listing/src/scripts/recommendation/
  dto/index.ts
  RecommendationOrderFactIngestScript.ts
  RecommendationCalculationRunCreateScript.ts
  RecommendationCalculationRunComputeScript.ts
  RecommendationCalculationRunTransitionScript.ts
  RecommendationSnapshotCreateScript.ts
  RecommendationSnapshotPopulateScript.ts
  RecommendationSnapshotTransitionScript.ts
  RecommendationPlacementPolicyUpsertScript.ts
  RecommendationPlacementPolicyDisableScript.ts
  ManualProductRecommendationCreateScript.ts
  ManualProductRecommendationUpdateScript.ts
  ManualProductRecommendationDeleteScript.ts
  RecommendationReferenceStateSyncScript.ts
  index.ts

services/listing/src/workflows/
  RecommendationOrderFactIngestWorkflow.ts
  RecommendationCalculationRunWorkflow.ts
  RecommendationCalculationTriggerWorkflow.ts
  RecommendationSnapshotBuildWorkflow.ts
  RecommendationSnapshotFanOutWorkflow.ts
  RecommendationMutationWorkflows.ts
  RecommendationManualScheduleWorkflow.ts
  RecommendationReferenceStateSyncWorkflow.ts

services/listing/src/scheduled/
  RecommendationScheduler.ts

services/listing/src/handlers/
  RecommendationOrderEventHandlers.ts

services/listing/src/loaders/
  RecommendationLoader.ts
  Loader.ts

services/listing/src/resolvers/storefront/
  ProductRecommendationConnectionResolver.ts
  recommendationReferences.ts

services/listing/src/resolvers/admin/
  RecommendationPlacementPolicyResolver.ts
  ManualProductRecommendationResolver.ts
  RecommendationSnapshotPreviewResolver.ts

services/listing/src/api/graphql-admin/schema/
  recommendation.graphql
```

## Phase 0. Cross-service prerequisites

### 0.1 Sale event contracts

Добавить в `packages/events/src/types.ts`:

```typescript
export interface OrderSaleCommittedEvent
  extends DomainEvent<
    "orderSaleCommitted",
    {
      schemaVersion: 1;
      orderId: string;
      storeId: string;
      orderRevision: number;
      committedAt: string;
      lines: readonly {
        productId: string;
        quantity: number;
      }[];
    }
  > {}

export interface OrderSaleReversedEvent
  extends DomainEvent<
    "orderSaleReversed",
    {
      schemaVersion: 1;
      orderId: string;
      storeId: string;
      orderRevision: number;
      committedAt: string;
      reversedAt: string;
    }
  > {}
```

Оба интерфейса добавить в `ShopanaEvent` union.

`committedAt` присутствует и в reversal event: это timestamp исходной sale
generation, необходимый для non-null `recommendation_order_fact.committed_at`.
`reversedAt` становится `occurred_at`. Listing не восстанавливает этот timestamp
или состав заказа запросом в Orders.

Orders producer обязан:

- публиковать `COMMITTED` только после authoritative confirmed-sale transition;
- публиковать новую revision при correction с полным corrected line snapshot;
- публиковать `REVERSED` при полной отмене/полном возврате effective sale;
- монотонно увеличивать `orderRevision`;
- использовать durable `events.emit`;
- использовать deterministic emit key:
  `orders:sale:<orderId>:<orderRevision>:<state>`;
- не включать customer identity, address, payment data и prices.

Точный producer нельзя добавлять к несуществующему terminal transition.
Сначала Orders owner реализует или указывает authoritative transition workflow,
после чего emission становится его durable step. До этого Phase 2 можно
реализовать и протестировать contract fixtures, но нельзя считать production
pipeline завершённым.

### 0.2 Active-store enumeration

Добавить internal broker contract:

```typescript
interface ListActiveStoresParams {
  afterStoreId?: string;
  first: number;
}

interface ListActiveStoresResult {
  storeIds: string[];
  nextCursor: string | null;
}
```

Action:

- находится в Project service;
- поддерживает `first` от 1 до 500;
- сортирует по raw `store_id ASC`;
- доступен только internal workflow identity;
- не используется storefront/admin requests.

Listing scheduler не выполняет cross-tenant SQL самостоятельно.

Done when:

- event types экспортируются через `@shopana/events`;
- producer integration point определён и покрывает commit/correction/reversal;
- active stores доступны scheduler'у paginated broker call.

## Phase 1. Runtime models и repository wiring

`recommendationRuntime.ts` описывает physical schema один в один, включая
maintenance cursor. Decimal columns используют `{ mode: "string" }`, bigint —
`{ mode: "bigint" }`, timestamps — `{ mode: "string" }`.

Экспортировать select/insert types. Models не импортируются GraphQL layer.

`Repository.ts` получает новые repositories. Constructor wiring сохраняет
единый `TransactionManager`.

Done when:

- все одиннадцать tables представлены runtime models;
- tenant filters присутствуют во всех root queries;
- generated IDs проходят через BaseRepository UUIDv7 helpers.

## Phase 2. Revision-aware order fact projection

### Cursor locking

`RecommendationIngestionCursorRepository.lockOrCreate()` выполняет внутри
активной транзакции:

```sql
INSERT INTO listing.recommendation_ingestion_cursor (...)
VALUES (...)
ON CONFLICT (store_id) DO NOTHING;

SELECT cursor_id, last_position
FROM listing.recommendation_ingestion_cursor
WHERE store_id = :trustedStoreId
FOR UPDATE;
```

Так устраняется race двух первых events разных orders одного store.

### Ingestion script

`RecommendationOrderFactIngestScript`:

1. валидирует UUIDs, positive revision, non-empty committed lines и quantities;
2. агрегирует duplicate product lines;
3. вычисляет SHA-256 от canonical `{ eventType, payload }`;
4. блокирует cursor row;
5. проверяет существующий `event_id`;
6. проверяет `(order_id, order_revision)`;
7. same hash возвращает `duplicate`;
8. different hash выбрасывает non-retryable integrity error;
9. выделяет `last_position + 1`;
10. вставляет fact и product facts;
11. обновляет cursor в той же транзакции.

Mapping timestamps:

- committed: `committed_at = payload.committedAt`,
  `occurred_at = event.timestamp`;
- reversed: `committed_at = payload.committedAt`,
  `occurred_at = payload.reversedAt`.

Late revision сохраняется. Arrival order не обязан совпадать с
`orderRevision`; effective state определяется calculation query.

Unique violation после pre-check повторно классифицируется:

- совпавший persisted hash — duplicate;
- другой hash — integrity error;
- неизвестная constraint — infrastructure error.

### Handler и workflow

Handler возвращает `EventHandlerResponse`, а не raw workflow result. Queue:

```text
name: recommendation_order_fact_ingestion
partition: <storeId>:<orderId>
```

Workflow содержит один durable step, вызывающий ingestion script с полным
`RunScriptContext`. `organizationId` берётся из event context.

Done when:

- fact insert и cursor advance атомарны;
- repeated delivery является no-op;
- stale revision не меняет effective order state;
- customer PII отсутствует.

## Phase 3. Deterministic FBT calculation

### Run creation и watermark

`RecommendationCalculationRunCreateScript` в одной транзакции:

1. вызывает `lockOrCreate()` ingestion cursor;
2. фиксирует `source_ingestion_watermark = last_position`;
3. вычисляет UTC calculation window;
4. строит idempotency key;
5. возвращает existing run либо создаёт `BUILDING`.

```text
windowEndedAt   = start of current UTC day
windowStartedAt = windowEndedAt - 90 days
algorithmVersion = fbt-rules-v1
```

Для same-day recalculation с новым watermark `windowEndedAt` остаётся тем же,
а idempotency key меняется из-за watermark.

### Effective revisions

Окно применяется только после выбора effective revision:

```sql
WITH bounded_facts AS (
  SELECT *
  FROM listing.recommendation_order_fact
  WHERE store_id = :storeId
    AND ingestion_position <= :watermark
),
effective_orders AS (
  SELECT DISTINCT ON (order_id) *
  FROM bounded_facts
  ORDER BY order_id, order_revision DESC, ingestion_position DESC
),
committed_orders AS (
  SELECT *
  FROM effective_orders
  WHERE state = 'COMMITTED'
    AND committed_at >= :windowStartedAt
    AND committed_at < :windowEndedAt
)
```

Запрещено фильтровать `committed_at` внутри `bounded_facts`: иначе reversal
может быть отброшен до выбора maximum revision.

### Versioned constants

`fbt-rules-v1` фиксирует:

```typescript
export const FBT_RULES_V1 = {
  windowDays: 90,
  recencyHalfLifeDays: 30,
  minimumPairOrders: 3n,
  minimumConfidence: "0.0500000000",
  minimumLift: "1.0000000000",
  liftCap: "5.0000000000",
} as const;
```

Изменение любого значения требует новой `algorithmVersion`.

Формулы:

```text
support    = ordersTogether / storeOrders
confidence = ordersTogether / anchorOrders
lift       = confidence / (targetOrders / storeOrders)
recency    = exp(-ln(2) * ageDays / 30)
source     = confidence * ln(1 + ordersTogether) * min(lift, 5) * recency
```

`ageDays` считается от `windowEndedAt` до последней совместной покупки пары.
Все деления выполняются как PostgreSQL `numeric`; division by zero исключается
counts predicates.

### Set-based materialization

Workflow steps не возвращают statistics arrays. Compute script возвращает
только:

```typescript
interface RecommendationCalculationCounts {
  productCount: number;
  pairCount: bigint;
}
```

Product/pair rows материализуются bounded batches:

1. SQL выбирает следующую deterministic page по product ID или
   `(anchor_product_id, target_product_id)`;
2. repository генерирует UUIDv7 batch через `generateUuidV7s(pageSize)`;
3. `INSERT ... SELECT` связывает IDs и ordered rows через ordinality;
4. retry использует unique `(run_id, product_id)` /
   `(run_id, anchor_product_id, target_product_id)` и не создаёт duplicates;
5. durable output хранит cursor/count, но не все rows.

### Workflow lifecycle

Используется `BrokerWorkflows`, не `BrokerSaga`:

```text
create BUILDING
  -> compute statistics
  -> mark READY
  -> atomically activate
```

`run()` оборачивает post-create steps в `try/catch`. При ошибке вызывает
отдельный durable `markFailed` step. `markFailed` идемпотентен:

- `BUILDING|READY -> FAILED`;
- `FAILED -> no-op`;
- `ACTIVE|SUPERSEDED -> integrity error`.

Activation в одной transaction блокирует runs одного
`store + calculation_type`, supersede-ит старый ACTIVE и активирует READY run.

Done when:

- run воспроизводим по window + watermark + algorithm version;
- failed first compute не оставляет вечный `BUILDING`;
- workflow payload/result не содержит statistics arrays;
- старый ACTIVE обслуживается до commit новой activation.

## Phase 4. Candidate sources и rules ranker

### Candidate representation

```typescript
interface RecommendationCandidate {
  targetProductId: string;
  manualAction: "PIN" | "BOOST" | null;
  manualPosition: number | null;
  manualBoost: string | null;
  fbtSourceScore: string | null;
  popularityScore: string | null;
  primarySource: ProductRecommendationSource;
  sourceBreakdown: Record<string, unknown>;
}
```

Decimal arithmetic выполняется PostgreSQL numeric или decimal library, не
JavaScript `number`.

### Sources

Manual source читает все enabled, VALID rows, активные в `asOf`:

```text
starts_at IS NULL OR starts_at <= asOf
ends_at   IS NULL OR asOf < ends_at
```

FBT source читает pair stats текущего ACTIVE run.

`category_popularity`:

- категории anchor определяются через
  `listing_posting_bitmap(entity_type='product', field='category')`;
- используются все категории anchor;
- candidates — union published/available products этих categories;
- при нескольких общих categories берётся maximum popularity score;
- anchor исключается;
- tie-breaker — target product ID.

`store_popularity` использует product stats ACTIVE run без category restriction.

Каждый source читает не более:

```text
min(maximumResults * 4, 400)
```

rows на anchor. Это ограничивает memory одного snapshot build.

### Score normalization

```text
fbtNormalized = fbtSourceScore / (1 + fbtSourceScore)
popularity    = ln(1 + productOrders) / ln(1 + maxStoreProductOrders)
manualBoost  = min(boost / 1000, 1)
```

Versioned ranker:

```text
FREQUENTLY_BOUGHT_TOGETHER automated score
  = 0.90 * fbtNormalized + 0.10 * popularity

PRODUCT_RELATED automated score
  = 0.70 * fbtNormalized + 0.30 * popularity

BLENDED final score
  = automatedScore + 0.50 * manualBoost
```

Model versions:

```text
fbt-rules-v1
related-rules-v1
```

Любое изменение weights/normalization создаёт новую model version.

### Strategy semantics

- `CURATED_ONLY`: только active manual PIN/BOOST. Non-pinned order:
  manual boost DESC, target ID ASC.
- `CURATED_FIRST`: PIN positions резервируются первыми; manual BOOST candidates
  идут перед non-manual candidates; внутри групп score DESC, target ID ASC.
- `BLENDED`: PIN отдельно; остальные candidates сортируются по blended score.
- `AUTOMATED_ONLY`: PIN/BOOST игнорируются; EXCLUDE применяется.

EXCLUDE применяется до ranking при любой strategy.

PIN:

- не превращается в score;
- positions уникальны благодаря exclusion constraint;
- create/update отклоняет position выше current `maximumResults`;
- policy update с меньшим maximum отклоняется, если существующий active/future
  PIN выходит за предел;
- после filters оставшиеся PIN размещаются по position ASC;
- gaps заполняются ranked candidates;
- итоговый rank всегда `1..itemCount`.

Primary source:

1. active PIN/BOOST, участвующий в strategy → `MANUAL`;
2. FBT contribution → `FREQUENTLY_BOUGHT_TOGETHER`;
3. category/store popularity → `POPULARITY`;
4. generic future fallback → `FALLBACK`.

Все contributions сохраняются в `source_breakdown`, даже если primary source
выбран по precedence.

### Manual configuration hash

Для anchor + placement вычисляется canonical SHA-256 от sorted rows:

```text
recommendationId
version
targetProductId
action
position
boost
enabled
startsAt
endsAt
anchorReferenceStatus
targetReferenceStatus
activeAtAsOf
```

Hash меняется при mutation и при пересечении schedule boundary. Он используется
как manual watermark и stale-build guard без новой aggregate version table.

Done when:

- одинаковые inputs дают одинаковые candidates, scores и ranks;
- все source limits bounded;
- category source использует Listing projection, а не несуществующее поле
  `product_listing_index.category`;
- strategy behavior покрыт unit tests.

## Phase 5. Snapshot build и fan-out

### Build key

Перед созданием snapshot фиксируются:

```typescript
interface RecommendationBuildInputs {
  policyId: string;
  policyVersion: number;
  calculationRunId: string | null;
  sourceIngestionWatermark: bigint | null;
  manualConfigurationHash: string;
  modelVersion: string;
}
```

`buildKey` — SHA-256 canonical representation этих inputs плюс anchor и
placement. `source_watermarks` содержит typed object с теми же значениями.

### Build workflow

Используется `BrokerWorkflows`:

```text
read fixed inputs
  -> create BUILDING snapshot
  -> collect/rank bounded candidates
  -> insert items
  -> validate READY
  -> re-read policy/manual/calculation lineage
  -> atomically activate
```

Candidate collection и ranking являются одним durable step либо возвращают
не более 400 candidates. Snapshot items вставляются одной transaction.

Перед activation проверяются:

- item count;
- continuous unique ranks;
- unique targets;
- target != anchor;
- `item_count <= maximum_results`;
- target store ownership и live eligibility;
- policy и run принадлежат store;
- policy всё ещё enabled и version не изменилась;
- manual configuration hash не изменился;
- calculation run всё ещё ACTIVE;
- runtime поддерживает model version.

Stale input:

1. snapshot получает `FAILED` с `STALE_INPUT`;
2. workflow enqueue-ит rebuild с новым deterministic key;
3. старый ACTIVE остаётся неизменным.

Другие failures используют идемпотентный explicit `markFailed`.

### Fan-out rules

Policy update является store-level change и затрагивает все anchors placement,
а не один anchor.

Fan-out sources:

- policy change: все published anchors + anchors с manual rows/active snapshots;
- manual mutation: один anchor + placement;
- FBT activation:
  - anchors нового pair-stat run;
  - все published anchors placements, где fallback chain использует category
    или store popularity;
- product lifecycle:
  - product как anchor;
  - manual/snapshot references на product как target.

`RecommendationSnapshotFanOutWorkflow` обрабатывает одну page raw product IDs,
enqueue-ит child builds и запускает следующую page. Page size — 100. Durable
result хранит counts и next cursor, но не все workflow IDs.

Queue:

```text
name: recommendation_snapshot_build
partition: <storeId>:<anchorProductId>:<placement>
```

Done when:

- policy update не оставляет anchors на старой policy бесконечно;
- popularity change rebuild-ит anchors без pair stats;
- failed/stale build не повреждает active serving.

## Phase 6. Storefront serving

### Cursor

```typescript
interface RecommendationCursorPayload {
  version: 1;
  hash: string;
  snapshotId: string;
  rank: number;
}
```

Hash строится из:

```text
storeId
anchorProductId
placement
snapshotId
eligibilityPolicyVersion
```

Без cursor repository выбирает current ACTIVE snapshot. С cursor сначала
выбирается current ACTIVE snapshot, затем проверяется exact snapshot ID/hash.
Если generation сменилась, возвращается
`StorefrontRepositoryValidationError`; выдачи двух generations не смешиваются.

`first` валидируется как integer `1..100`.

### Query behavior

Repository:

1. получает ACTIVE non-expired snapshot;
2. читает items после rank cursor;
3. join-ит current publication и availability projections;
4. читает дальше, пока не собрано `first + 1` eligible rows либо snapshot
   исчерпан;
5. вычисляет `hasNextPage` по лишней eligible row;
6. считает `totalCount` отдельным query с теми же eligibility predicates;
7. не запускает build synchronously.

No snapshot, disabled policy и empty snapshot возвращают empty connection.

### Batching

Добавить `RecommendationLoader` в request-scoped `Loader`.

DataLoader key:

```typescript
interface RecommendationPageLoaderKey {
  anchorProductId: string;
  placement: RecommendationPlacement;
  first: number;
  after: string | null;
}
```

Batch repository принимает массив keys и выполняет один `VALUES` input query с
LATERAL page/count branches. Это предотвращает N+1, когда recommendation field
запрошен для списка Product entities.

### Cache

- request cache обеспечивает DataLoader;
- active-snapshot lookup cache хранит positive/missing sentinel не более 30s;
- activation/disable/lifecycle supersede явно инвалидируют lookup key;
- immutable raw item page может кэшироваться по snapshot ID;
- live eligibility result между requests не кэшируется;
- empty immutable snapshot кэшируется как raw empty page.

### Resolver

`ProductRecommendationConnectionResolver` повторяет shape существующего
connection resolver, но возвращает recommendation node:

```typescript
{
  product: toProductReference(targetProductId),
  source: primarySource,
}
```

Storefront schema уже существует; меняются resolver wiring, generated types и
`Connection.__resolveType`.

Done when:

- Relay contract forward-only и deterministic;
- `totalCount` отражает current eligible targets;
- list-of-products query не создаёт one-query-per-product;
- activation между pages приводит к explicit cursor error.

## Phase 7. Admin API

### Global IDs

Добавить:

```typescript
GlobalIdEntity.RecommendationPlacementPolicy
GlobalIdEntity.ManualProductRecommendation
```

Оба GraphQL types реализуют `Node`; admin Node/nodes resolvers и loaders
поддерживают новые entities.

### Policy mutation

```graphql
input RecommendationPlacementPolicyUpsertInput {
  placement: RecommendationPlacement!
  enabled: Boolean!
  strategy: RecommendationStrategy!
  minimumResults: Int!
  maximumResults: Int!
  fallbackChain: [String!]!
  expectedVersion: Int
}
```

- `expectedVersion = null` разрешён только при create;
- update требует точного current version;
- mismatch → `VERSION_CONFLICT`;
- fallback chain содержит unique registered codes;
- disable supersede-ит active snapshots в transaction;
- successful enabled update запускает paginated placement fan-out.

### Manual mutations

Create input содержит anchor/target IDs, placement, action, position/boost,
enabled, startsAt/endsAt.

Update input содержит:

- recommendation Global ID;
- `expectedVersion`;
- изменяемые поля.

Delete input содержит recommendation Global ID и `expectedVersion`.

Validation:

- anchor/target существуют в trusted store;
- anchor != target;
- action-specific position/boost;
- half-open schedule;
- position согласована с policy maximum;
- PostgreSQL `23P01` обеих exclusion constraints → `SCHEDULE_CONFLICT`;
- optimistic mismatch → `VERSION_CONFLICT`;
- not found/cross-store → `NOT_FOUND`.

Workflows защищены `@Policy`:

```text
create/update: resource=store.data action=write
delete/disable: resource=store.data action=admin
domain=store:<storeId>
```

### Queries

Persisted policy и manual list читаются через admin repositories/loaders.
Manual list использует forward pagination, а не unbounded array.

Preview принимает draft overlay:

```graphql
input RecommendationSnapshotPreviewInput {
  anchorProductId: ID!
  placement: RecommendationPlacement!
  policy: RecommendationPlacementPolicyDraftInput
  manualChanges: [ManualRecommendationDraftChangeInput!]!
}
```

Preview:

1. читает persisted policy/manual rows;
2. накладывает draft policy и manual upsert/delete changes in memory;
3. вызывает тот же `buildRecommendation()` с fixed `asOf`;
4. ничего не записывает;
5. возвращает active, draft и excluded candidates.

Без draft overlay preview показывает результат текущей persisted configuration.

Excluded reasons:

```text
STALE
UNPUBLISHED
UNAVAILABLE
EXCLUDED
INSUFFICIENT_SUPPORT
LIMIT_EXCEEDED
```

Done when:

- unsaved preview действительно возможен через input;
- policy/manual concurrency защищена;
- cross-store Product ID не раскрывает существование объекта;
- mutation response не содержит raw PostgreSQL errors.

## Phase 8. Scheduling и schedule boundaries

### Calculation scheduler

`RecommendationScheduler` вычисляет completed UTC hour bucket и запускает один
deterministic trigger workflow:

```text
workflow ID: recommendation-calculation-trigger:<utc-hour>
```

Все replicas получают одинаковый ID; duplicate start игнорируется.

Trigger paginated вызывает Project active-store action. Для каждого store
запускается store-scoped calculation trigger workflow. Store workflow сравнивает
cursor/run state и запускает calculation только по правилам cadence.

### Manual schedule scheduler

Каждую минуту запускается deterministic global trigger:

```text
workflow ID: recommendation-manual-boundary:<utc-minute>
```

Store-scoped workflow:

1. читает maintenance cursor;
2. находит distinct anchor + placement boundaries в
   `(lastManualBoundaryAt, currentMinute]`;
3. enqueue-ит deterministic snapshot builds;
4. после успешного enqueue всех pages advance-ит cursor;
5. при retry duplicate child workflows являются no-op.

Cursor нельзя advance-ить до child enqueue: crash не должен терять boundary.

Done when:

- future PIN/BOOST/EXCLUDE активируется без новой mutation;
- end boundary удаляет action из следующего snapshot;
- downtime восстанавливается чтением cursor interval;
- multi-replica cron не создаёт duplicate work.

## Phase 9. Product lifecycle

Recommendation reconciliation запускается после успешного update Listing
projection, а не параллельно с ним.

Изменить listing index workflows:

- после sync product index durable step запускает
  `recommendationReferenceStateSync`;
- после delete index durable step запускает тот же workflow с deleted state;
- queue partition остаётся product-scoped, поэтому reconciliation видит уже
  committed listing state.

Reference sync:

- deleted/unpublished product:
  - anchor/target manual statuses → `STALE`;
  - active snapshots product-as-anchor → `SUPERSEDED`;
  - target reverse references enqueue rebuild;
- restored/republished product:
  - tenant ownership проверяется по `store_id`;
  - stale manual references → `VALID`;
  - affected anchors enqueue rebuild;
- unavailable target не переводит editorial reference в `STALE`, но live
  serving исключает его и async rebuild уплотняет ranks.

FBT statistics не изменяются product lifecycle workflow: historical IDs
остаются до retention.

Done when:

- recommendation workflow не читает stale pre-sync listing state;
- deletion не удаляет editorial intent;
- target disappearance немедленно скрывается live filter и затем rebuild'ом.

## Observability

Structured fields:

```text
storeId
anchorProductId
placement
runId
snapshotId
modelVersion
workflowId
```

Metrics:

- ingestion lag, current position, duplicates, integrity failures;
- late/stale revisions;
- calculation duration, rows/batches, run failures;
- support/confidence/lift distributions;
- snapshot build duration and stale-build retries;
- candidates per source before/after dedup/filter;
- fan-out pages and queued anchors;
- missing/empty snapshot rate;
- live-filtered target count;
- manual boundary lag;
- coverage of published anchors.

Logs не содержат customer identity или order lines.

## Test plan

Тесты добавляются вместе с каждой phase, но не запускаются при согласовании
этого документа.

### Unit

- canonical payload hash;
- schedule half-open intervals;
- manual configuration hash before/after boundary;
- FBT formulas and thresholds;
- all strategy/ranker cases;
- PIN gap filling and deterministic ties;
- cursor validation.

### Repository integration

- concurrent first cursor creation;
- duplicate event and conflicting payload;
- out-of-order revisions;
- commit in window + reversal outside window;
- fixed watermark excludes later ingestion;
- one ACTIVE run/snapshot under concurrent activation;
- tenant isolation;
- exclusion constraint mapping;
- stale policy/manual activation rejection;
- availability live filter and totalCount.

### Workflow

- failure of first calculation step marks run FAILED;
- duplicate workflow start;
- paginated fan-out resume;
- scheduler multi-replica idempotency;
- manual boundary retry before/after cursor advance;
- product sync ordering.

### GraphQL/e2e

- defaults `12` and `3`;
- `first` validation;
- nodes/edges/pageInfo/totalCount;
- cursor generation change;
- empty connection;
- Admin optimistic concurrency;
- draft preview;
- cross-store IDs.

Для implementation verification используются только `shopana-cli` MCP tools и
только после отдельного разрешения на запуск checks.

## Порядок реализации

```text
Phase 0.1 events contract ───────────────────────────────┐
Phase 0.2 active-store broker contract ─────────────┐    │
                                                   │    │
Phase 1 runtime models/repositories                 │    │
   ├── Phase 7 Admin policy/manual                  │    │
   │      └── Phase 4 manual/popularity ranking     │    │
   │             └── Phase 5 snapshots              │    │
   │                    └── Phase 6 storefront      │    │
   │                                               │    │
   ├── Phase 8 manual schedule boundaries ←────────┘    │
   └── Phase 9 product lifecycle                         │
                                                        │
Orders producer integration ←───────────────────────────┘
   └── Phase 2 order fact projection
          └── Phase 3 FBT calculation
                 └── Phase 4 FBT source
                        └── Phase 5 calculation fan-out
```

Рекомендуемые delivery slices:

1. models + repositories + curated Admin CRUD;
2. deterministic manual ranking + snapshots;
3. storefront API + batch loader;
4. schedule boundaries + lifecycle;
5. sale event producer + projection;
6. FBT calculation + popularity/FBT fan-out;
7. observability and full e2e coverage.

## Final acceptance criteria

- Orders producer и Listing projection используют self-contained revision-aware
  events.
- Calculation сначала выбирает effective revision, затем применяет window.
- Watermark фиксируется под cursor lock.
- Ни один durable step не возвращает unbounded statistics/anchor arrays.
- Run/snapshot failures явно переходят в `FAILED`.
- Policy disable немедленно прекращает serving.
- Policy update rebuild-ит все anchors placement'а.
- Popularity update rebuild-ит anchors без pair stats.
- Scheduled manual actions активируются и истекают без mutation.
- Ranking formula полностью определяется model version.
- Category popularity использует Listing category postings.
- Publication и availability проверяются при build и serving.
- Storefront list queries используют batch DataLoader path.
- Admin preview поддерживает unsaved draft overlay.
- Cross-store reads/writes не раскрывают чужие entities.
- Новый ACTIVE run/snapshot публикуется одной transaction.
- Пустой recommendation result является нормальным результатом.
