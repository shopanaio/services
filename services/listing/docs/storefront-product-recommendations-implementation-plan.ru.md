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
   перечисления trusted active-store contexts operational scheduler'ом. Каждый
   context содержит как минимум `storeId` и `organizationId`.

До выполнения первого prerequisite можно реализовать manual curated
recommendations и storefront serving. Behavioral FBT и основанные на ACTIVE
sales run category/store popularity fallbacks остаются выключенными.

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
- Bigint values проходят broker/workflow boundary как decimal strings.
- Raw SQL использует `sql` fragments и typed row DTO.
- Admin inputs не принимают `storeId`.
- Product IDs принимаются как Relay Global IDs и проверяются в trusted store
  scope.
- Bulk fan-out всегда paginated и queue-based. Workflow не хранит массив всех
  anchors в durable result.
- Каждый workflow start использует deterministic idempotency context и
  обрабатывает duplicate start как successful no-op.

### Failure taxonomy

Ошибки классифицируются до пересечения workflow boundary:

- business validation и optimistic concurrency возвращаются как `UserError[]`
  и не retry-ятся;
- deterministic integrity failures (`EVENT_PAYLOAD_CONFLICT`,
  `STALE_INPUT`, `UNSUPPORTED_MODEL_VERSION`, `CANDIDATE_LIMIT_EXCEEDED`,
  `INVALID_SNAPSHOT_CONTENT`) являются non-retryable;
- временные broker, database connection, serialization и timeout failures
  являются retryable;
- неизвестная database constraint или неизвестная ошибка не преобразуется в
  business error и считается infrastructure failure.

Terminal failure codes run:

```text
CALCULATION_FAILED
INVALID_CALCULATION_RESULT
```

Terminal failure codes snapshot:

```text
STALE_INPUT
UNSUPPORTED_MODEL_VERSION
CANDIDATE_LIMIT_EXCEEDED
INVALID_SNAPSHOT_CONTENT
SNAPSHOT_BUILD_FAILED
```

Конкретная infrastructure cause сохраняется в structured log с workflow/run/
snapshot identifiers, но не записывается в публичный `failure_code` и не
возвращается GraphQL client.

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
  - active/building/ready run для текущего UTC day отсутствует; или
  - после watermark новейшего current-day run появились facts с
    `committed_at` внутри его закрытого `[windowStartedAt, windowEndedAt)` окна.
- `committedAt` является immutable timestamp исходной confirmed sale для всех
  revisions одного order. Correction меняет lines/state, но не переносит sale
  между calculation windows. Ingestion отклоняет revision с отличающимся
  `committedAt` как `EVENT_PAYLOAD_CONFLICT`.
- Advance watermark только из-за продаж текущего UTC day не запускает
  same-window calculation: они впервые войдут в run после следующей daily
  boundary.
- Поэтому time decay и rolling window пересчитываются минимум один раз в день
  даже при отсутствии новых events.

## Physical schema

Существующие десять domain tables сохраняются. Migration `9104` добавляет
operational progress columns в calculation run, две calculation accumulator
tables и две operational tables:

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
ALTER TABLE listing.recommendation_calculation_run
  ADD COLUMN materialization_phase varchar(16) NOT NULL DEFAULT 'ACCUMULATE',
  ADD COLUMN order_progress_after uuid,
  ADD COLUMN order_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN product_progress_after uuid,
  ADD COLUMN pair_progress_anchor_after uuid,
  ADD COLUMN pair_progress_target_after uuid;

CREATE TABLE listing.recommendation_product_accumulator (
  run_id uuid NOT NULL,
  product_id uuid NOT NULL,
  orders_count bigint NOT NULL,
  quantity bigint NOT NULL,
  last_purchased_at timestamptz NOT NULL,
  PRIMARY KEY (run_id, product_id),
  FOREIGN KEY (run_id)
    REFERENCES listing.recommendation_calculation_run(run_id)
    ON DELETE CASCADE
);

CREATE TABLE listing.recommendation_pair_accumulator (
  run_id uuid NOT NULL,
  anchor_product_id uuid NOT NULL,
  target_product_id uuid NOT NULL,
  orders_together bigint NOT NULL,
  last_purchased_together_at timestamptz NOT NULL,
  PRIMARY KEY (run_id, anchor_product_id, target_product_id),
  FOREIGN KEY (run_id)
    REFERENCES listing.recommendation_calculation_run(run_id)
    ON DELETE CASCADE
);

CREATE TABLE listing.recommendation_maintenance_cursor (
  cursor_id uuid PRIMARY KEY,
  store_id uuid NOT NULL UNIQUE,
  status varchar(16) NOT NULL DEFAULT 'BOOTSTRAPPING',
  bootstrap_cutoff_at timestamptz NOT NULL,
  last_manual_boundary_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE listing.recommendation_build_request (
  request_id uuid PRIMARY KEY,
  store_id uuid NOT NULL,
  anchor_product_id uuid NOT NULL,
  placement varchar(48) NOT NULL,
  generation bigint NOT NULL,
  trigger_key varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, anchor_product_id, placement)
);
```

`materialization_phase` принимает `ACCUMULATE`, `PRODUCTS`, `PAIRS`,
`COMPLETE`. Migration добавляет checks:

- progress UUID являются UUIDv7;
- оба pair cursor columns либо null, либо non-null;
- значение phase входит в зарегистрированный enum.
- accumulator counts положительны, pair не содержит self-reference;
- maintenance status входит в `BOOTSTRAPPING|ACTIVE`;
- `last_manual_boundary_at IS NULL` только для `BOOTSTRAPPING`, а для `ACTIVE`
  он равен или больше `bootstrap_cutoff_at`.

Repository state machine переводит
`ACCUMULATE -> PRODUCTS -> PAIRS -> COMPLETE` только вперёд. Переход
выполняется в transaction после подтверждения пустой следующей page; после
`COMPLETE` repository отклоняет дальнейшие изменения progress.

Migration также добавляет UUIDv7 checks, проверку active
`last_manual_boundary_at <= updated_at` и store lookup index. Accumulators
являются внутренним resumable write model конкретного run и удаляются после
успешного перехода в `COMPLETE` в той же transaction, где фиксируются final
counts. Maintenance cursor нужен для resumable обработки `starts_at`/`ends_at`;
новые calculation columns нужны для crash-safe bounded accumulation и
materialization. Build request хранит latest desired generation каждого anchor
и placement; `generation > 0`, а `trigger_key` non-empty. Это schema evolution
на clean database, а не backfill существующих данных.

На первом запуске store workflow:

1. в короткой transaction создаёт `BOOTSTRAPPING` cursor с immutable
   `bootstrap_cutoff_at`, равным текущей завершённой minute boundary;
2. отдельный deterministic bootstrap workflow paginated reconcile-ит все
   anchors с manual rows по состоянию на этот cutoff;
3. только после успешного enqueue всех pages CAS-переходом устанавливает
   `status = ACTIVE` и `last_manual_boundary_at = bootstrap_cutoff_at`;
4. interval workflows не обрабатывают store, пока cursor не стал `ACTIVE`;
5. после activation читаются boundaries строго после сохранённого watermark.

Повтор bootstrap workflow использует тот же cutoff и page cursors. Crash не
может оставить store с продвинутым active watermark и незапущенной initial
reconciliation.

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
  RecommendationCalculationAccumulatorRepository.ts
  RecommendationSnapshotRepository.ts
  RecommendationMaintenanceRepository.ts
  RecommendationBuildRequestRepository.ts
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
  RecommendationPlacementPolicySetEnabledScript.ts
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
- сохранять исходный `committedAt` неизменным во всех revisions одного order;
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

interface ActiveStoreWorkflowContext {
  storeId: string;
  organizationId: string;
}

interface ListActiveStoresResult {
  stores: ActiveStoreWorkflowContext[];
  nextCursor: string | null;
}
```

Action:

- находится в Project service;
- поддерживает `first` от 1 до 500;
- сортирует по raw `store_id ASC`;
- возвращает trusted пару `storeId + organizationId`, проверенную по current
  Project state;
- доступен только internal workflow identity;
- не используется storefront/admin requests.

Listing scheduler не выполняет cross-tenant SQL самостоятельно.
Store-scoped workflow переносит оба identifiers в input и строит
`RunScriptContext` только из результата этого trusted action. Один `storeId`
без `organizationId` недостаточен для запуска Listing scripts.

Done when:

- event types экспортируются через `@shopana/events`;
- producer integration point определён и покрывает commit/correction/reversal;
- trusted `storeId + organizationId` contexts доступны scheduler'у paginated
  broker call.

## Phase 1. Runtime models и repository wiring

`recommendationRuntime.ts` описывает physical schema один в один, включая
calculation progress columns, maintenance cursor и build request. Decimal
columns используют `{ mode: "string" }`, bigint — `{ mode: "bigint" }`,
timestamps — `{ mode: "string" }`.

Экспортировать select/insert types. Models не импортируются GraphQL layer.

`Repository.ts` получает новые repositories. Constructor wiring сохраняет
единый `TransactionManager`.

Done when:

- все четырнадцать tables представлены runtime models;
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

1. валидирует UUIDs, positive revision, non-empty committed lines, quantities и
   не более 100 distinct products в одной committed revision;
2. агрегирует duplicate product lines;
3. сортирует агрегированные lines по raw product ID и вычисляет SHA-256 от
   canonical `{ eventType, payload }`;
4. блокирует cursor row;
5. проверяет существующий `event_id`;
6. проверяет `(order_id, order_revision)`;
7. при существовании любой revision order проверяет равенство `committedAt`
   исходной sale generation;
8. same hash возвращает `duplicate`;
9. different hash или изменившийся `committedAt` выбрасывает non-retryable
   integrity error;
10. выделяет `last_position + 1`;
11. вставляет fact и product facts;
12. обновляет cursor в той же транзакции.

Mapping timestamps:

- committed: `committed_at = payload.committedAt`,
  `occurred_at = event.timestamp`;
- reversed: `committed_at = payload.committedAt`,
  `occurred_at = payload.reversedAt`.

Ограничение в 100 distinct products является частью `schemaVersion: 1` sale
event contract. Producer не публикует неподдерживаемый payload. Это ограничивает
квадратичное pair expansion максимумом 9 900 directed pairs на order revision;
Listing не молча обрезает lines и не строит статистику из частичного заказа.

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
  pairCount: string;
}
```

Calculation не пересчитывает 90-дневный aggregate для каждой output page.
Сначала effective orders один раз проходят в raw `order_id ASC` и накапливают
bounded intermediate state:

1. по `(store_id, order_id, ingestion_position, order_revision DESC)` выбирается
   следующая page distinct order IDs после `order_progress_after`, ограниченная
   watermark;
2. для этих IDs выбирается maximum revision, и только после этого применяется
   calculation window/state filter;
3. из не более чем 25 следующих orders выбирается deterministic longest prefix
   с суммой не более 50 000 directed pair expansions; один order с максимумом
   100 distinct products всегда помещается целиком;
4. product и directed-pair page aggregates additive upsert-ятся в
   `recommendation_product_accumulator` и
   `recommendation_pair_accumulator`: counts/quantity суммируются, timestamps
   обновляются через `GREATEST`;
5. `order_count` увеличивается на число effective committed orders page, а
   `order_progress_after` переводится на последний рассмотренный order ID в той
   же transaction;
6. cursor продвигается и для reversed/out-of-window orders, чтобы scan
   гарантированно завершался;
7. migration добавляет supporting index
   `(store_id, order_id, order_revision DESC, ingestion_position DESC)`.

После исчерпания orders phase переходит в `PRODUCTS`. Final statistics
материализуются только из уже ограниченных accumulator tables:

1. следующая product page выбирается по `product_id`;
2. следующая pair page выбирается по
   `(anchor_product_id, target_product_id)`;
3. repository генерирует UUIDv7 batch через `generateUuidV7s(pageSize)`;
4. `INSERT ... SELECT` связывает IDs и ordered rows через ordinality;
5. pair features вычисляются из accumulator counts, `order_count`,
   `windowEndedAt` и `last_purchased_together_at`;
6. та же transaction обновляет progress cursor, count и phase;
7. retry сначала читает persisted phase/cursor; rows и cursor либо commit-ятся
   вместе, либо вместе откатываются;
8. unique `(run_id, product_id)` /
   `(run_id, anchor_product_id, target_product_id)` остаются defense in depth;
9. durable output хранит только phase, cursor и decimal-string counts.

Compute не является одним долгим durable step. Workflow детерминированно
повторяет отдельные page steps:

```text
accumulate next effective-order page -> persist order cursor/accumulators
  -> repeat until order scan complete
  -> materialize next product page -> persist cursor/count
  -> materialize next pair page    -> persist cursor/count
  -> finalize counts and delete accumulators
```

Каждый page insert и advance persisted progress атомарны. После неопределённого
результата retry повторно читает run: если cursor продвинут, workflow продолжает
со следующей page; иначе повторяет ту же keyset page. Workflow не удерживает
transaction между pages и не возвращает через durable boundary rows или
JavaScript `bigint`.

Так стоимость accumulation линейна по числу effective orders и pair expansions,
а output pagination читает уже сгруппированный persisted state вместо
повторного полного aggregation scan.

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
  sourceBreakdown: {
    manual?: {
      action: "PIN" | "BOOST";
      position: number | null;
      boost: string | null;
    };
    fbt?: { runId: string; sourceScore: string };
    categoryPopularity?: { score: string };
    storePopularity?: { score: string };
  };
}
```

Decimal arithmetic выполняется PostgreSQL numeric или decimal library, не
JavaScript `number`. `features` и `sourceBreakdown` имеют versioned closed Zod
schemas: arbitrary keys и arbitrary nested values запрещены. Перед insert
проверяются лимиты canonical JSON: не более 8 KiB на item и 512 KiB на весь
snapshot. Нарушение является `INVALID_SNAPSHOT_CONTENT`.

### Sources

Manual positive source читает enabled, VALID `PIN`/`BOOST`, активные в `asOf`:

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

Для одного build:

```text
sourceLimit = min(maximumResults * 4, 400)
globalCandidateLimit = 1700
```

- все active PIN читаются целиком; их количество не превышает
  `maximumResults` благодаря mutation validation и schedule exclusion;
- BOOST source читает не более `sourceLimit`, ordered by boost DESC и target ID;
- каждый automated/fallback source читает не более `sourceLimit`;
- v1 имеет не более четырёх non-PIN sources: BOOST, FBT,
  `category_popularity`, `store_popularity`; поэтому абсолютная верхняя граница
  равна `100 + 4 * 400 = 1700`;
- sources применяются в фиксированном порядке и deduplicate по target ID;
- EXCLUDE rows не загружаются unbounded array: candidate queries применяют
  schedule-aware anti-join, а после dedup выполняется один batch lookup только
  для IDs bounded union;
- каждый source repository проверяет собственный limit, а pipeline проверяет
  общий union; превышение означает нарушение versioned source budget и
  explicit build failure `CANDIDATE_LIMIT_EXCEEDED`, а не truncation;
- добавление нового source требует новой model version и пересмотра общего
  budget.

Так working set одного snapshot build имеет фиксированную count и byte
границу. Candidate array существует только внутри transactional build step и не
пересекает durable boundary. Admin persisted manual list остаётся paginated.

### Fallback execution

Candidate source и score feature различаются. Product popularity ACTIVE run
может обогащать уже найденный FBT candidate, не превращая
`store_popularity` в автоматически запущенный candidate source.

Fallback chain применяется так:

1. собираются base candidates согласно strategy:
   - `CURATED_ONLY`: PIN и BOOST;
   - `CURATED_FIRST`: PIN, BOOST и FBT;
   - `BLENDED`: PIN, BOOST и FBT;
   - `AUTOMATED_ONLY`: FBT; PIN/BOOST не читаются;
2. выполняются dedup, EXCLUDE и eligibility;
3. `CURATED_ONLY` завершает pipeline без fallback независимо от
   `minimumResults`;
4. для остальных strategies registered codes из `fallbackChain` вызываются
   строго по порядку, только пока eligible unique candidate count меньше
   `minimumResults`;
5. после каждого source снова выполняются dedup, EXCLUDE и eligibility;
6. после достижения `minimumResults` оставшиеся fallback codes не вызываются;
7. ranking применяется один раз к итоговому bounded union и ограничивает output
   значением `maximumResults`.

`minimumResults = 0` отключает запуск fallback chain. FBT, category popularity
и store popularity требуют ACTIVE calculation run. До появления sales
projection гарантирован только manual curated result; fallback codes без
доступного run возвращают zero candidates и не делают synchronous calculation.

FBT repository для snapshot возвращает не более `sourceLimit` прошедших
threshold candidates. Preview тем же bounded query mode может вернуть внутри
того же FBT budget ближайшие пары, не прошедшие support/confidence/lift
thresholds, с reason `INSUFFICIENT_SUPPORT`; они входят в bounded diagnostic
union, но не участвуют в ranking. Preview не выполняет отдельный unbounded scan.

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
- persisted `recommendation_snapshot_item.score` для PIN равен decimal
  `"0.0000000000"`; порядок PIN определяется только position;
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
`asOf` является обязательным явным аргументом hash function: repository не
читает текущее время внутри вычисления. Для snapshot build значение `asOf`
один раз фиксируется database clock в durable fixed-input step и затем
используется без изменений при чтении manual rows, candidate generation и
вычислении hash.

Done when:

- одинаковые inputs дают одинаковые candidates, scores и ranks;
- все source limits bounded;
- category source использует Listing projection, а не несуществующее поле
  `product_listing_index.category`;
- fallback chain вызывается строго до достижения `minimumResults`;
- candidate union не превышает `globalCandidateLimit`;
- strategy behavior покрыт unit tests.

## Phase 5. Snapshot build и fan-out

### Build key

Перед созданием snapshot фиксируются:

```typescript
interface RecommendationBuildInputs {
  asOf: string;
  policyId: string;
  policyVersion: number;
  calculationRunId: string | null;
  sourceIngestionWatermark: string | null;
  manualConfigurationHash: string;
  requestedGeneration: string;
  triggerKey: string;
  modelVersion: string;
}
```

`buildKey` — SHA-256 canonical representation этих inputs плюс anchor и
placement. `source_watermarks` содержит typed object с теми же значениями.
`asOf` берётся из database clock, а не из process clock. Результат fixed-input
step сохраняется DBOS, поэтому replay одного build не получает новое время.

### Build workflow

Используется `BrokerWorkflows`:

```text
read fixed inputs
  -> validate desired generation
  -> create BUILDING snapshot
  -> transactionally collect/rank candidates and insert items
  -> validate READY
  -> re-read policy/manual/calculation lineage
  -> atomically activate
```

Candidate collection, ranking и item insert являются одним transactional
durable step. Bounded candidate array не возвращается из step и не сохраняется
DBOS. Step возвращает только `{ itemCount, contentHash }`; snapshot items
вставляются одной transaction после closed-schema/byte-limit validation.

Перед activation проверяются:

- item count;
- continuous unique ranks;
- unique targets;
- target != anchor;
- `item_count <= maximum_results`;
- target store ownership и live eligibility;
- policy и run принадлежат store;
- policy всё ещё enabled и version не изменилась;
- внутри activation transaction один раз фиксируется database
  `activationAsOf`;
- manual configuration hash, повторно вычисленный для `activationAsOf`, равен
  зафиксированному build hash;
- calculation run всё ещё ACTIVE;
- build request generation и trigger key всё ещё current;
- runtime поддерживает model version.

Activation guard намеренно не вычисляет manual hash повторно для исходного
build `asOf`: это не обнаружило бы schedule boundary, пересечённую во время
build. Если active manual set изменился между `asOf` и `activationAsOf`,
snapshot не активируется. Наблюдаемый activation hash становится trigger key
нового build request, а новый workflow фиксирует собственный более поздний
`asOf`. Все проверки и переход `READY -> ACTIVE` выполняются в одной
transaction с единым `activationAsOf`.

Queued generation, устаревшая до `create BUILDING`, завершается successful stale
no-op без snapshot row. Stale input после создания snapshot:

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
  - manual/snapshot references на product как target;
  - при изменении publication/category membership — published anchors,
    принадлежащие union old/new categories, для policies с
    `category_popularity`;
  - при переходе publication/availability, способном добавить product в
    candidate pool, — все published anchors placements, policies которых
    используют `store_popularity`.

`RecommendationSnapshotFanOutWorkflow` обрабатывает одну page raw product IDs,
enqueue-ит child builds и запускает следующую page. Page size — 100. Durable
result хранит counts и next cursor, но не все workflow IDs.

Fan-out и builds используют generation coalescing:

- trigger key является version/hash изменившего источник значения:
  manual configuration hash для manual mutation, product lifecycle sequence для
  lifecycle sync либо calculation run ID для run activation;
- fan-out page в одной transaction вызывает
  `RecommendationBuildRequestRepository.request()` для каждого anchor:
  блокирует/upsert-ит row, увеличивает generation и сохраняет trigger key;
- orchestration child workflow ID детерминирован по store + anchor + placement +
  requested generation; child читает полный `RecommendationBuildInputs` и
  запускает build по окончательному `buildKey`;
- перед expensive candidate collection child сравнивает requested generation,
  trigger key, policy/run lineage и manual hash с current values; устаревшая
  queued generation завершается как successful stale no-op без создания
  snapshot;
- queue `recommendation_snapshot_build` является partitioned queue с
  `workerConcurrency = 20`;
- для каждого anchor вычисляется deterministic lane
  `hash(anchorProductId + placement) mod 2`, а queue partition key равен
  `<storeId>:<lane>`;
- одна partition выполняет workflows последовательно, поэтому во всём cluster
  одновременно выполняется не более двух builds одного store, а
  `workerConcurrency` ограничивает replica двадцатью builds; изменение числа
  lanes является versioned operational configuration;
- fan-out step запускает не более одной page из 100 children и не ждёт
  завершения всех anchors;
- новая activation не пытается отменить уже committed snapshot, но делает
  оставшуюся очередь старой generation дешёвой no-op.

Calculation trigger запускает не более одного нового run одного store за
completed UTC hour. Watermark-only recalculation выполняется, только если после
watermark текущего run появились facts, способные изменить закрытое calculation
window (`committed_at < windowEndedAt`). Это корректно, потому что `committedAt`
immutable для всех revisions order; correction/reversal ранее включённой sale
сохраняет исходный timestamp. Продажи текущего UTC day сами по себе не создают
бесполезный same-window run; daily boundary всё равно гарантирует новую
generation.

Queue:

```text
name: recommendation_snapshot_build
partition: <storeId>:<lane-0-or-1>
```

Done when:

- policy update не оставляет anchors на старой policy бесконечно;
- popularity change rebuild-ит anchors без pair stats;
- failed/stale build не повреждает active serving;
- stale generations отбрасываются до candidate collection;
- fan-out соблюдает per-replica и cluster-wide per-store concurrency limits.

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

`eligibilityPolicyVersion` первой версии — зарегистрированная constant
`storefront-eligibility-v1`. Она версионирует exact publication/availability
predicates, используемые build и serving; изменение predicates требует нового
значения и делает старые cursors невалидными.

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
- current ACTIVE snapshot всегда выбирается из database; cross-request
  positive/missing lookup cache не используется;
- immutable raw item page может кэшироваться по snapshot ID;
- live eligibility result между requests не кэшируется;
- empty immutable snapshot кэшируется как raw empty page.

Это обязательное consistency решение: текущий Listing cache process-local, а
post-commit invalidation не может атомарно очистить все replicas. Поэтому
disable после commit немедленно даёт empty connection, а cursor старой
generation после activation получает explicit validation error. Добавление
shared active-generation cache допускается только отдельной версией с
generation validation, согласованной с database.

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
  strategy: RecommendationStrategy!
  minimumResults: Int!
  maximumResults: Int!
  fallbackChain: [String!]!
  expectedVersion: Int
}

input RecommendationPlacementPolicySetEnabledInput {
  placement: RecommendationPlacement!
  enabled: Boolean!
  expectedVersion: Int!
}

type RecommendationPlacementPolicyPayload {
  policy: RecommendationPlacementPolicy
  userErrors: [UserError!]!
}

extend type Mutation {
  recommendationPlacementPolicyUpsert(
    input: RecommendationPlacementPolicyUpsertInput!
  ): RecommendationPlacementPolicyPayload!
  recommendationPlacementPolicySetEnabled(
    input: RecommendationPlacementPolicySetEnabledInput!
  ): RecommendationPlacementPolicyPayload!
}
```

- `expectedVersion = null` разрешён только при create;
- update требует точного current version;
- mismatch → `VERSION_CONFLICT`;
- fallback chain содержит unique registered codes;
- create создаёт policy с `enabled = true`;
- enable/disable выполняются только отдельной set-enabled mutation;
- disable supersede-ит active snapshots в той же transaction;
- enable запускает paginated placement fan-out;
- successful configuration update enabled policy запускает paginated placement
  fan-out.

### Manual mutations

```graphql
input ManualProductRecommendationCreateInput {
  anchorProductId: ID!
  targetProductId: ID!
  placement: RecommendationPlacement!
  action: ManualRecommendationAction!
  position: Int
  boost: String
  enabled: Boolean!
  startsAt: DateTime
  endsAt: DateTime
}

input ManualProductRecommendationUpdateInput {
  id: ID!
  expectedVersion: Int!
  targetProductId: ID
  action: ManualRecommendationAction
  position: Int
  boost: String
  enabled: Boolean
  startsAt: DateTime
  endsAt: DateTime
}

input ManualProductRecommendationDeleteInput {
  id: ID!
  expectedVersion: Int!
}

type ManualProductRecommendationPayload {
  recommendation: ManualProductRecommendation
  userErrors: [UserError!]!
}

type ManualProductRecommendationDeletePayload {
  deletedId: ID
  userErrors: [UserError!]!
}

extend type Mutation {
  manualProductRecommendationCreate(
    input: ManualProductRecommendationCreateInput!
  ): ManualProductRecommendationPayload!
  manualProductRecommendationUpdate(
    input: ManualProductRecommendationUpdateInput!
  ): ManualProductRecommendationPayload!
  manualProductRecommendationDelete(
    input: ManualProductRecommendationDeleteInput!
  ): ManualProductRecommendationDeletePayload!
}
```

Anchor и placement после create immutable. Для nullable schedule fields update
resolver различает omitted field и explicit `null`; `null` очищает границу.
`boost` проходит GraphQL boundary decimal string и валидируется Zod schema.

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
policy create/configure: resource=store.data action=write
policy set-enabled:     resource=store.data action=admin
manual create/update:  resource=store.data action=write
manual delete:         resource=store.data action=admin
domain=store:<storeId>
```

Policy configure script не принимает `enabled`, поэтому permission
`store.data/write` не может обойти admin-only disable. Manual `enabled` является
частью редактирования editorial row и остаётся write action; физическое delete
требует admin.

### Queries

Persisted policy и manual list читаются через admin repositories/loaders.
Manual list использует forward pagination, а не unbounded array.

Preview принимает draft overlay:

```graphql
input RecommendationPlacementPolicyDraftInput {
  expectedVersion: Int
  enabled: Boolean!
  strategy: RecommendationStrategy!
  minimumResults: Int!
  maximumResults: Int!
  fallbackChain: [String!]!
}

input ManualRecommendationDraftCreateInput {
  targetProductId: ID!
  action: ManualRecommendationAction!
  position: Int
  boost: String
  enabled: Boolean!
  startsAt: DateTime
  endsAt: DateTime
}

input ManualRecommendationDraftUpdateInput {
  id: ID!
  expectedVersion: Int!
  targetProductId: ID
  action: ManualRecommendationAction
  position: Int
  boost: String
  enabled: Boolean
  startsAt: DateTime
  endsAt: DateTime
}

input ManualRecommendationDraftDeleteInput {
  id: ID!
  expectedVersion: Int!
}

input ManualRecommendationDraftChangeInput {
  create: ManualRecommendationDraftCreateInput
  update: ManualRecommendationDraftUpdateInput
  delete: ManualRecommendationDraftDeleteInput
}

input RecommendationSnapshotPreviewInput {
  anchorProductId: ID!
  placement: RecommendationPlacement!
  policy: RecommendationPlacementPolicyDraftInput
  manualChanges: [ManualRecommendationDraftChangeInput!]!
}

type RecommendationSnapshotPreviewPayload {
  active: RecommendationPreviewResult
  draft: RecommendationPreviewResult
  userErrors: [UserError!]!
}

type RecommendationPreviewResult {
  candidates: [RecommendationPreviewCandidate!]!
  excluded: [RecommendationPreviewExcludedCandidate!]!
  asOf: DateTime!
  modelVersion: String!
}

type RecommendationPreviewCandidate {
  product: Product!
  rank: Int!
  score: String!
  source: ProductRecommendationSource!
  sourceBreakdown: RecommendationPreviewSourceBreakdown!
}

type RecommendationPreviewSourceBreakdown {
  manualAction: ManualRecommendationAction
  manualPosition: Int
  manualBoost: String
  fbtRunId: ID
  fbtSourceScore: String
  categoryPopularityScore: String
  storePopularityScore: String
}

type RecommendationPreviewExcludedCandidate {
  product: Product!
  reason: RecommendationPreviewExcludedReason!
}

enum RecommendationPreviewExcludedReason {
  STALE
  UNPUBLISHED
  UNAVAILABLE
  EXCLUDED
  INSUFFICIENT_SUPPORT
  LIMIT_EXCEEDED
}

extend type Query {
  recommendationSnapshotPreview(
    input: RecommendationSnapshotPreviewInput!
  ): RecommendationSnapshotPreviewPayload!
}
```

Internal arbitrary JSON через GraphQL не возвращается.

Zod schema является strict, ограничивает `manualChanges` значением 400 и общий
canonical input размер значением 256 KiB. Draft с превышением count/byte limit
возвращает `PREVIEW_LIMIT_EXCEEDED` и не выполняет partial preview.

`policy`, если передан, является полной replacement-конфигурацией placement,
а не partial patch. `expectedVersion = null` разрешён только для preview ещё не
созданной policy; существующая policy требует точного current version.
`placement` берётся из outer input и не дублируется в draft.

Каждый `ManualRecommendationDraftChangeInput` обязан содержать ровно одно
non-null поле из `create`, `update`, `delete`; zero или несколько operations
возвращают `INVALID_DRAFT_CHANGE`. Anchor и placement наследуются из outer
input. `create` задаёт полную новую row. `update` является patch существующей
row: omitted поле сохраняет persisted value, а explicit `null` очищает nullable
`position`, `boost`, `startsAt` или `endsAt`. `delete` удаляет row только из
draft overlay. Update/delete IDs должны принадлежать trusted store и exact
anchor + placement; иначе возвращается `NOT_FOUND`. Две changes одного
persisted ID запрещены и возвращают `DUPLICATE_DRAFT_CHANGE`; порядок массива
не меняет семантику overlay. `expectedVersion` mismatch возвращает
`VERSION_CONFLICT`.

Preview:

1. фиксирует единый `asOf` из database clock;
2. читает текущий ACTIVE snapshot отдельно от draft calculation;
3. строит `active` только из persisted snapshot/items, не пересчитывая его из
   текущей policy или manual rows;
4. читает persisted policy/manual rows и накладывает validated draft policy и
   manual changes in memory;
5. вызывает тот же `buildRecommendation()` с fixed `asOf` для `draft`;
6. ничего не записывает.

`active` равен `null`, если ACTIVE snapshot отсутствует. Его candidates,
scores, source breakdown, `modelVersion` и source `asOf` читаются из immutable
snapshot; текущая live eligibility повторно применяется, а отфильтрованные
snapshot items попадают в `active.excluded` с `UNPUBLISHED` или `UNAVAILABLE`.
Полный набор исторически исключённых во время snapshot build candidates для
`active` не реконструируется.

`draft` является результатом нового bounded calculation. Если overlay пуст,
он пересчитывает текущую persisted configuration и поэтому может отличаться от
`active`, пока rebuild ожидает выполнения. При отсутствии persisted policy и
draft policy `draft = null`; это нормальное состояние без `UserError`.
Переданный policy draft позволяет preview ещё не созданной policy.

Draft и excluded lists строятся только из того же bounded candidate union, что
и snapshot build. Превышение `globalCandidateLimit` возвращает user error, а не
truncated result.

Для FBT diagnostic mode rejected threshold candidates занимают тот же
`sourceLimit` budget, что и accepted FBT candidates. Поэтому
`INSUFFICIENT_SUPPORT` объясним без дополнительного unbounded query и без
увеличения `globalCandidateLimit`.

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
- active preview читает опубликованный snapshot, а draft preview использует
  persisted configuration с in-memory overlay;
- create/update/delete draft contracts однозначны и duplicate changes
  отклоняются;
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

Trigger paginated вызывает Project active-store action. Для каждого trusted
store context запускается store-scoped calculation trigger workflow. Store
workflow переносит `storeId + organizationId`, сравнивает cursor/run state и
запускает calculation только по правилам cadence.

### Manual schedule scheduler

Каждую минуту запускается deterministic global trigger:

```text
workflow ID: recommendation-manual-boundary:<utc-minute>
```

Store-scoped workflow:

1. при отсутствии cursor запускает deterministic
   `recommendation-manual-bootstrap:<storeId>` и не обрабатывает interval;
2. для `BOOTSTRAPPING` cursor возвращает successful no-op: только bootstrap
   workflow может перевести его в `ACTIVE`;
3. для `ACTIVE` cursor в короткой transaction блокирует store row через
   `SELECT ... FOR UPDATE`;
4. находит distinct anchor + placement boundaries в
   `(lastManualBoundaryAt, currentMinute]`;
5. enqueue-ит deterministic snapshot builds;
6. после успешного enqueue всех pages compare-and-set advance-ит cursor с
   ожидаемого старого watermark;
7. при retry duplicate child workflows являются no-op.

Cursor нельзя advance-ить до child enqueue: crash не должен терять boundary.
Store workflow ID:

```text
recommendation-manual-boundary:<storeId>:<utc-minute>
```

Следующая minute generation может начаться до завершения предыдущей, поэтому
lock/CAS обязателен даже при deterministic IDs. Если CAS не прошёл, workflow
повторно читает новый interval и не перезаписывает более свежий watermark.

Done when:

- future PIN/BOOST/EXCLUDE активируется без новой mutation;
- end boundary удаляет action из следующего snapshot;
- downtime восстанавливается чтением cursor interval;
- multi-replica cron не создаёт duplicate work.

## Phase 9. Product lifecycle

Recommendation reconciliation запускается после успешного update Listing
projection, а не параллельно с ним.

Существующий Listing write step под теми же product/item-state locks и внутри
той же transaction:

1. читает old publication state, availability и category IDs;
2. применяет новый Listing write model;
3. строит bounded lifecycle plan из locked old state и фактически записанного
   new state;
4. возвращает plan только после commit.

Следующий durable step передаёт committed plan recommendation sync. Plan не
строится до write transaction: это исключает race между pre-read и Listing
write. Workflow также не пытается восстановить старые categories из уже
обновлённой projection.

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
- category membership change:
  - paginated rebuild получает anchors из union old/new categories;
  - затрагиваются только placements с `category_popularity` в policy;
- unpublished/unavailable → published/available:
  - reverse references rebuild-ятся как обычно;
  - policies со `store_popularity` получают paginated store-level fan-out,
    поскольку новый target ещё может не иметь reverse references;
- unavailable target не переводит editorial reference в `STALE`, но live
  serving исключает его и async rebuild уплотняет ranks.

FBT statistics не изменяются product lifecycle workflow: historical IDs
остаются до retention.

Done when:

- recommendation workflow не читает stale pre-sync listing state;
- deletion не удаляет editorial intent;
- target disappearance немедленно скрывается live filter и затем rebuild'ом;
- новый eligible target достигает category/store-popularity snapshots даже без
  существующей reverse reference.

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
- maximum distinct products sale contract;
- immutable `committedAt` across order revisions;
- schedule half-open intervals;
- manual configuration hash before/after boundary;
- FBT formulas and thresholds;
- ordered fallback-chain stop at `minimumResults`;
- global candidate limit;
- all strategy/ranker cases;
- PIN gap filling and deterministic ties;
- cursor validation.

### Repository integration

- concurrent first cursor creation;
- duplicate event and conflicting payload;
- out-of-order revisions;
- correction с изменённым `committedAt` отклоняется;
- commit in window + reversal outside window;
- fixed watermark excludes later ingestion;
- accumulation page commit атомарен с accumulator upserts и order cursor;
- accumulation scan не повторно агрегирует уже пройденные order IDs;
- product/pair page commit атомарен с progress cursor;
- resume из `ACCUMULATE`, `PRODUCTS`, `PAIRS` и `COMPLETE`;
- accumulators удаляются только при successful `COMPLETE`;
- concurrent build requests монотонно увеличивают anchor generation;
- one ACTIVE run/snapshot under concurrent activation;
- tenant isolation;
- exclusion constraint mapping;
- stale policy/manual activation rejection;
- availability live filter and totalCount.

### Workflow

- failure of first calculation step marks run FAILED;
- duplicate workflow start;
- paginated fan-out resume;
- stale fan-out generation завершается до candidate collection;
- snapshot build durable result не содержит candidate array;
- snapshot content byte limit приводит к `INVALID_SNAPSHOT_CONTENT`;
- schedule boundary между fixed-input step и activation приводит к
  `STALE_INPUT` и rebuild с новым `asOf`;
- две deterministic store lanes не допускают более двух concurrent builds;
- повторные manual mutations при неизменных policy/run создают разные
  anchor-specific builds;
- scheduler multi-replica idempotency;
- overlapping manual minute workflows and maintenance cursor CAS;
- bootstrap cursor не становится `ACTIVE` до enqueue всех reconciliation pages;
- manual boundary retry before/after cursor advance;
- product sync lifecycle plan строится из locked old/new state внутри write
  transaction;
- category/store-popularity fan-out for a newly eligible target.

### GraphQL/e2e

- defaults `12` and `3`;
- `first` validation;
- nodes/edges/pageInfo/totalCount;
- cursor generation change;
- disable/activation visibility across separate Listing replicas;
- empty connection;
- Admin optimistic concurrency;
- write permission не может вызвать policy disable;
- draft preview;
- preview `INSUFFICIENT_SUPPORT` соблюдает FBT source budget;
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

1. models + repositories + curated scripts без GraphQL mutation wiring;
2. deterministic manual ranking + snapshots + Admin CRUD wiring;
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
- `committedAt` неизменен между revisions одного order.
- Ни один durable step не возвращает unbounded statistics/anchor arrays.
- Ни один snapshot build не превышает `globalCandidateLimit`.
- Candidate arrays не пересекают durable boundary, а snapshot content имеет
  count и byte limits.
- Calculation один раз проходит effective orders в keyset pages и не повторяет
  полный 90-дневный aggregate для каждой output page.
- Calculation materialization resume-ится по persisted phase/cursors.
- Run/snapshot failures явно переходят в `FAILED`.
- Policy disable немедленно прекращает serving.
- Policy update rebuild-ит все anchors placement'а.
- Popularity update rebuild-ит anchors без pair stats.
- Stale fan-out generations отбрасываются до expensive candidate collection.
- Snapshot queue обеспечивает не более двух concurrent builds одного store
  через deterministic partition lanes.
- Product lifecycle fan-out охватывает новые category/store-popularity
  candidates без существующих reverse references.
- Scheduled manual actions активируются и истекают без mutation.
- Snapshot build фиксирует единый `asOf`, а activation отклоняет результат,
  если до неё изменился active manual set.
- Initial manual reconciliation завершается до activation maintenance cursor.
- Maintenance cursor защищён lock/CAS от overlapping minute workflows.
- Ranking formula полностью определяется model version.
- Category popularity использует Listing category postings.
- Publication и availability проверяются при build и serving.
- Product lifecycle plan строится внутри Listing write transaction из locked
  old state и committed new state.
- Storefront list queries используют batch DataLoader path.
- Current ACTIVE snapshot lookup не использует process-local cross-request
  cache.
- Admin preview поддерживает unsaved draft overlay.
- Cross-store reads/writes не раскрывают чужие entities.
- Новый ACTIVE run/snapshot публикуется одной transaction.
- Пустой recommendation result является нормальным результатом.
