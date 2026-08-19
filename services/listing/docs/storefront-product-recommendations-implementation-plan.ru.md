# План implementation-ready: Storefront Recommendations API и business logic

## Статус

Implementation-ready план. Реализует полностью: `Product.relatedProducts`,
`Product.frequentlyBoughtTogether` и весь backing pipeline (order fact
projection, FBT calculation, ranking, snapshot activation, admin curation).

Обратная совместимость не требуется и не предусматривается: домен ещё не имеет
кода, миграции `9100_recommendations` уже в main, staging/production данных не
существует (`AGENTS.md`: "Project is at 25% readiness... Backward
compatibility and backfilling are strictly forbidden"). План не вводит
optional/nullable флаги для миграции существующих читателей — их нет.

## Назначение

Документ переводит canonical architecture
(`knowledge/vault/architecture/product-recommendations.ru.md`) и GraphQL
contract (`services/listing/docs/storefront-product-recommendations-api.ru.md`)
в конкретный implementation plan поверх уже существующих миграций
`services/listing/migrations/domains/9100_recommendations/*.sql`.

Ни резолверов, ни репозиториев, ни workflow для recommendation domain на
момент написания плана не существует (см. аудит: `grep -rli "recommendation"
services/listing/src` не находит ни одного файла).

## Источники и ограничения

Учтены документы:

- `AGENTS.md` (root) — DBOS workflows, "no backward compatibility";
- `knowledge/AGENTS.md`;
- `knowledge/vault/architecture/product-recommendations.ru.md` — canonical
  architecture, single source of truth для доменных правил;
- `knowledge/vault/architecture/multi-tenancy.md`;
- `knowledge/vault/patterns/repository.md`;
- `knowledge/vault/packages/dbos/workflows.md`;
- `knowledge/vault/packages/dbos/sagas.md`;
- `services/listing/docs/storefront-product-recommendations-api.ru.md` —
  storefront Relay contract;
- `services/listing/migrations/domains/9100_recommendations/*.sql` — physical
  schema (уже смержено, не меняется этим планом);
- `services/listing/docs/listing-storefront-repository-layer-implementation-plan.ru.md`
  — эталон формата repository layer plan и raw SQL policy для этого сервиса;
- `services/listing/src/workflows/FacetMutationWorkflows.ts`,
  `FacetAffectedProductsResyncWorkflow.ts` — эталон mutation workflow +
  affected-entity resync pattern, переиспользуется для manual recommendation
  CRUD и snapshot rebuild fan-out;
- `services/customers/src/handlers/CustomerStatisticsEventHandlers.ts` —
  эталон order event handler pattern.

Проектные правила (обязательны для каждой фазы):

- все repositories наследуются от `BaseRepository`, используют
  `this.connection`, не принимают `storeId` в публичных методах — только
  `this.storeId`;
- каждый async read-метод помечен `@ReadOnly()` из `@shopana/shared-kernel`;
- все persisted id — UUIDv7 через `this.generateUuidV7()` /
  `generateUuidV7s(n)`;
- workflows — DBOS SDK (`@shopana/dbos` через `@shopana/shared-kernel`
  обёртки `BrokerWorkflows` / `BrokerSaga`), не Temporal;
- mutation-затрагивающие GraphQL операции проходят через
  `BaseScript<TParams, TResult>` (`@Transactional()`, `ValidationError`,
  `UserError[]`), вызываемый из workflow через `Kernel.getInstance().runScript(...)`;
- admin mutation не принимает `store_id` — он берётся из
  `this.$ctx.store.id` / `RunScriptContext.storeId`;
- Product/Category id — Relay Global ID, кодируется/декодируется через
  `@shopana/shared-graphql-guid` (`GlobalIdEntity.Product` уже существует в
  `packages/shared-graphql-guid/src/core.ts`);
- raw SQL — только через `sql` fragments с типизированным row DTO, без
  project-owned SQL helper functions (см. `Raw SQL policy` в repository-layer
  плане);
- tests/tsc для проверки этого плана в рамках его согласования не запускать;
  changeset не редактировать (правило унаследовано из storefront
  repository-layer плана и остаётся в силе для новых repository/schema
  файлов).

## Явные границы (что не входит в этот план)

Canonical doc фиксирует "Implementation order" из 10 шагов; этот план
покрывает шаги 1–8 полностью. Явно вне рамок (шаги 9–10 и нереализуемые без
отдельного ADR источники):

- ML ranker (`ranker_type = 'ML'`) — схема и `model_version` уже
  поддерживают этот путь, реализация ranker'а не входит;
- impression/click/add-to-cart attribution events — отдельный план;
- `ProductRecommendationSource.CONTENT_SIMILARITY` как **candidate source**
  (не просто enum-значение) — требует product embeddings/taxonomy scoring,
  которых в проекте нет; enum-значение остаётся в контракте на будущее, но
  `fallback_chain` в этом плане не регистрирует source code
  `content_similarity` (unregistered source code — write error по правилам
  policy, поэтому merchant не сможет включить недоступный источник);
- реализованные в этом плане fallback source codes: `category_popularity`,
  `store_popularity`.

Это осознанное сужение MVP cold-start chain относительно "рекомендованных"
цепочек из canonical doc (`manual -> content similarity -> category
popularity -> store popularity`); content similarity добавляется отдельным
планом без изменения storefront/admin contract (ranker version меняется, а
`ProductRecommendation.source` уже поддерживает это значение).

## Термины

См. полное определение в
`knowledge/vault/architecture/product-recommendations.ru.md#термины`.
Кратко: `anchor` — товар-контекст, `target` — товар-кандидат, `placement` —
продуктовый контекст (`PRODUCT_RELATED`, `FREQUENTLY_BOUGHT_TOGETHER`, ...),
`policy` — merchant/system конфигурация объединения источников,
`calculation run` — версионированный расчёт behavioral statistics,
`snapshot` — immutable опубликованный ranked list для anchor + placement.

## Целевая структура файлов

```text
packages/events/src/types.ts
  + OrderSaleCommittedEvent
  + OrderSaleReversedEvent
  + DomainEvent union: добавить оба типа

services/orders/src/...
  (cross-service, см. "Phase 0. Order sale event contract")

services/listing/src/repositories/models/
  recommendationRuntime.ts        # Drizzle read models для всех 10 таблиц

services/listing/src/repositories/recommendation/
  types.ts
  RecommendationPlacementPolicyRepository.ts
  ManualProductRecommendationRepository.ts
  RecommendationIngestionCursorRepository.ts
  RecommendationOrderFactRepository.ts
  RecommendationCalculationRunRepository.ts
  RecommendationSnapshotRepository.ts
  index.ts

services/listing/src/repositories/storefront/
  StorefrontRecommendationQueryRepository.ts   # read-only serving path

services/listing/src/scripts/recommendation/
  dto/index.ts
  RecommendationOrderFactIngestScript.ts
  RecommendationPlacementPolicyUpsertScript.ts
  ManualProductRecommendationCreateScript.ts
  ManualProductRecommendationUpdateScript.ts
  ManualProductRecommendationDeleteScript.ts
  RecommendationCalculationRunCreateScript.ts
  RecommendationCalculationRunComputeStatsScript.ts
  RecommendationCalculationRunActivateScript.ts
  RecommendationCalculationRunFailScript.ts
  RecommendationSnapshotBuildScript.ts
  RecommendationSnapshotActivateScript.ts
  RecommendationAffectedAnchorCollectorScript.ts
  index.ts

services/listing/src/workflows/
  RecommendationOrderFactIngestWorkflow.ts
  RecommendationCalculationRunWorkflow.ts        # Saga
  RecommendationSnapshotBuildWorkflow.ts         # Saga
  RecommendationMutationWorkflows.ts             # policy/manual CRUD
  RecommendationCalculationTriggerWorkflow.ts    # per-store fan-out

services/listing/src/scheduled/
  RecommendationCalculationScheduler.ts          # @Cron trigger

services/listing/src/handlers/
  RecommendationOrderEventHandlers.ts
  (расширение) ListingProductEventHandlers.ts    # stale/valid transitions

services/listing/src/resolvers/storefront/
  ProductRecommendationConnectionResolver.ts
  recommendationReferences.ts                    # source enum mapping helper

services/listing/src/resolvers/admin/
  RecommendationPlacementPolicyResolver.ts
  ManualProductRecommendationResolver.ts
  RecommendationSnapshotPreviewResolver.ts
  (расширение) MutationResolver.ts

services/listing/src/api/graphql-storefront/resolvers/types.ts
  (расширение) typeResolvers.Product: relatedProducts, frequentlyBoughtTogether

services/listing/src/resolvers/storefront/ResolverRegistry.ts
  (расширение) + productRecommendationConnection(input)

services/listing/src/api/graphql-admin/schema/
  recommendation.graphql                          # policy + manual CRUD + preview

services/listing/listing.module.ts
  (расширение) providers: новые workflows, handlers, scheduler
  imports: + ScheduleModule.forRoot() (сейчас отсутствует)
```

## Phase 0. Order sale event contract (cross-service, orders + events)

Recommendation domain не владеет заказом; `orders` обязан публиковать
самодостаточный факт продажи. На момент написания плана `orderCompleted`
(`packages/events/src/types.ts:688-692`) не содержит `lines`, а место его
эмиссии в `services/orders/src` не найдено (`grep -rn "\"orderCompleted\""
services/orders/src` — 0 результатов) — эмиссия ещё не реализована вообще.
Нужен отдельный контракт, не переиспользование `orderCompleted`.

Добавить в `packages/events/src/types.ts` (по образцу существующих
`OrderXxxEvent`, рядом со строками 680-718):

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
      lines: readonly { productId: string; quantity: number }[];
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
      reversedAt: string;
    }
  > {}
```

Добавить оба типа в `DomainEvent` union (рядом со строками 969-972).

`OrderSaleReversedEvent` не описан дословно в canonical doc (там дан только
snippet для commit), но текст явно требует "Reversal/correction должен
содержать те же stable identifiers, новую orderRevision и effective
timestamp" — этот интерфейс формализует то же требование. Он не содержит
`lines`, потому что revision-aware projection (Phase 2) не хранит product
lines для `REVERSED` revision — только сам факт state перехода.

Emission point в `services/orders/src` не входит в этот план буква в букву
(orders owns это решение — см. таблицу владения в canonical doc), но должен
удовлетворять инвариантам:

- публикуется один раз на каждую **новую** `orderRevision`, только когда
  order revision становится either terminal `COMMITTED` (например, оплата
  списана и заказ не подлежит немедленной отмене) либо `REVERSED`
  (полная отмена/полный возврат этой revision);
- `orderRevision` монотонно возрастает внутри `orderId`;
- payload не содержит customer identity, адреса, оплату, цену строки — по
  правилу "Privacy и retention" из canonical doc.

Согласование точки эмиссии с командой orders — обязательное условие перед
началом Phase 2; без него `recommendation_order_fact` не наполняется, и FBT
остаётся пустым (fallback chain продолжает работать через
`category_popularity` / `store_popularity`, которые эту зависимость не
имеют — см. Phase 4).

## Phase 1. Drizzle runtime models

Один файл `services/listing/src/repositories/models/recommendationRuntime.ts`
(по аналогии с уже существующим `repositories/models/listingIndex.ts`,
объединяющим несколько таблиц одного домена) с read/write моделями для всех
10 таблиц `9100_recommendations`. Модели описывают физическую схему один в
один с миграциями (типы `uuid`, `varchar(n)`, `smallint`, `numeric(20,10)`,
`jsonb`, `timestamptz`) — без дополнительных вычисляемых полей.

Done when: сервис собирается, модели экспортированы и используются только
repository-слоем (Phase 2), не GraphQL-слоем напрямую.

## Phase 2. Order fact projection (write path)

### RecommendationIngestionCursorRepository

```ts
async getOrCreateForUpdate(): Promise<{ cursorId: string; lastPosition: bigint }>;
async advance(input: { cursorId: string; nextPosition: bigint }): Promise<void>;
```

`getOrCreateForUpdate()` — `SELECT ... FOR UPDATE` внутри вызывающей
транзакции; если строки для `this.storeId` нет — создаёт с
`last_position = 0`. Метод не должен запускать collateral запись без
активной транзакции — вызывается только из
`RecommendationOrderFactIngestScript`.

### RecommendationOrderFactRepository

```ts
async findByEventId(input: { eventId: string }): Promise<OrderFactRow | null>;
async findByOrderRevision(input: {
  orderId: string;
  orderRevision: number;
}): Promise<OrderFactRow | null>;
async insertCommitted(input: {
  orderFactId: string;
  eventId: string;
  ingestionPosition: bigint;
  orderId: string;
  orderRevision: number;
  committedAt: Date;
  occurredAt: Date;
  payloadHash: string;
  lines: readonly { productId: string; quantity: number }[];
}): Promise<void>;
async insertReversed(input: {
  orderFactId: string;
  eventId: string;
  ingestionPosition: bigint;
  orderId: string;
  orderRevision: number;
  committedAt: Date;
  occurredAt: Date;
  payloadHash: string;
}): Promise<void>;
```

`insertCommitted` пишет строку `recommendation_order_fact` (`state =
'COMMITTED'`) и агрегированные по `product_id` строки
`recommendation_order_product_fact` в одной транзакции (агрегация повторов
`productId` в `lines` — на уровне script, не repository, чтобы repository
оставался тонким SQL-слоем). `insertReversed` пишет только
`recommendation_order_fact` со `state = 'REVERSED'`, без product facts.

### RecommendationOrderFactIngestScript

```ts
class RecommendationOrderFactIngestScript extends BaseScript<
  RecommendationOrderFactIngestParams,
  RecommendationOrderFactIngestResult
> {
  @Transactional()
  async execute(params): Promise<RecommendationOrderFactIngestResult> {
    // 1. cursor = ingestionCursor.getOrCreateForUpdate()   -- SELECT ... FOR UPDATE
    // 2. existing = orderFact.findByEventId({eventId})
    //    - existing && existing.payloadHash === payloadHash -> return {status: "duplicate"} (no-op)
    //    - existing && existing.payloadHash !== payloadHash -> throw IntegrityError
    // 3. existingRevision = orderFact.findByOrderRevision({orderId, orderRevision})
    //    - same integrity check by payloadHash
    // 4. nextPosition = cursor.lastPosition + 1n
    // 5. insertCommitted(...) | insertReversed(...) с ingestionPosition = nextPosition
    // 6. ingestionCursor.advance({cursorId, nextPosition})
    // 7. return {status: "ingested", ingestionPosition: nextPosition}
  }
}
```

`payloadHash` — sha256 канонической сериализации event payload (совпадает по
формату с constraint `chk_recommendation_order_fact_payload_hash` —
`^[0-9a-f]{64}$`); использовать `hashContent` из `@shopana/shared-kernel`,
приводя результат к hex sha256, либо явный `crypto.createHash("sha256")`,
если `hashContent` не даёт совместимый формат — проверить сигнатуру перед
реализацией шага.

Идемпотентность: `event_id` unique constraint и `(order_id, order_revision)`
unique constraint защищают от дублей на уровне БД; script проверяет их
заранее только для того, чтобы вернуть чистый "duplicate" статус вместо
падения на unique violation.

### RecommendationOrderFactIngestWorkflow

Простой `BrokerWorkflows` (не Saga — ингест атомарен одной транзакцией, без
компенсации):

```ts
@Injectable()
export class RecommendationOrderFactIngestWorkflow extends BrokerWorkflows<
  RecommendationOrderFactIngestWorkflowInput,
  RecommendationOrderFactIngestResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationOrderFactIngest")
  async run(input): Promise<RecommendationOrderFactIngestResult> {
    return this.stepIngest(input);
  }

  @WorkflowStep({ name: "ingestOrderFact", timeoutMs: 30_000 })
  private async stepIngest(input) {
    return Kernel.getInstance().runScript(
      RecommendationOrderFactIngestScript,
      input.params,
      buildRunScriptContext(input.context)
    );
  }
}
```

### RecommendationOrderEventHandlers

```ts
@Injectable()
export class RecommendationOrderEventHandlers extends EventHandlers {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @EventHandler("orderSaleCommitted", { retry: { maxAttempts: 10 } })
  handleOrderSaleCommitted(params: {
    event: OrderSaleCommittedEvent;
    delivery: EventHandlerDelivery;
  }) {
    return this.ingest(params.event, "COMMITTED");
  }

  @EventHandler("orderSaleReversed", { retry: { maxAttempts: 10 } })
  handleOrderSaleReversed(params: {
    event: OrderSaleReversedEvent;
    delivery: EventHandlerDelivery;
  }) {
    return this.ingest(params.event, "REVERSED");
  }

  private async ingest(event, state) {
    return this.broker.startWorkflow(
      "listing.recommendationOrderFactIngest",
      { params: { event, state }, context: { storeId: event.payload.storeId, ... } },
      {
        source: "content",
        resourceId: `${event.payload.storeId}:${event.payload.orderId}:${event.payload.orderRevision}`,
        operation: "recommendationOrderFactIngest",
        contentHash: hashContent(event),
      },
      {
        queueName: "recommendation_order_fact_ingestion",
        enqueueOptions: {
          queuePartitionKey: `${event.payload.storeId}:${event.payload.orderId}`,
        },
      }
    );
  }
}
```

`queuePartitionKey` по `storeId:orderId` гарантирует, что revisions одного
заказа обрабатываются последовательно (важно, потому что cursor advance
внутри одной транзакции сериализует запись, но порядок доставки broker не
гарантирован сам по себе — partition key даёт FIFO по заказу).

Done when: любой `orderSaleCommitted`/`orderSaleReversed` event детерминированно
и идемпотентно превращается в append-only `recommendation_order_fact` +
`recommendation_order_product_fact`, cursor монотонно растёт per store.

## Phase 3. FBT calculation run (Saga)

### RecommendationCalculationRunRepository

```ts
async findActive(input: { calculationType: "FREQUENTLY_BOUGHT_TOGETHER" }): Promise<RunRow | null>;
async findByIdempotencyKey(input: { calculationType: string; idempotencyKey: string }): Promise<RunRow | null>;
async createBuilding(input: {
  runId: string;
  calculationType: "FREQUENTLY_BOUGHT_TOGETHER";
  algorithmVersion: string;
  windowStartedAt: Date;
  windowEndedAt: Date;
  sourceIngestionWatermark: bigint;
  sourceEventTimeWatermark?: Date | null;
  idempotencyKey: string;
}): Promise<void>;
async insertProductStats(input: { runId: string; stats: readonly ProductStatRow[] }): Promise<void>;
async insertPairStats(input: { runId: string; pairs: readonly PairStatRow[] }): Promise<void>;
async markReady(input: { runId: string; productCount: number; pairCount: bigint }): Promise<void>;
async activate(input: { runId: string; calculationType: string }): Promise<void>; // superseded old + activate new, одна транзакция
async markFailed(input: { runId: string; failureCode: string }): Promise<void>;
```

`activate` выполняет ровно то, что требует `recommendation_calculation_run_one_active_idx`
(unique partial index `WHERE status = 'ACTIVE'`): в одной транзакции
переводит текущий `ACTIVE` run того же `store_id + calculation_type` в
`SUPERSEDED`, затем текущий run — в `ACTIVE`, устанавливая `activated_at`.
Если старого `ACTIVE` run нет — просто активирует новый.

### Расчёт статистики (без repository, чисто SQL агрегация)

Источник данных — `recommendation_order_fact` (`ingestion_position <=
sourceIngestionWatermark`, максимальная `order_revision` на `order_id`,
итоговый `state = 'COMMITTED'`) join `recommendation_order_product_fact`.
Реализуется как одна или несколько `sql` агрегирующих queries внутри
repository (не в JavaScript, чтобы не гонять миллионы строк в память):

```sql
-- product stats
WITH effective_orders AS (
  SELECT DISTINCT ON (order_id) order_fact_id, order_id, committed_at, state
  FROM listing.recommendation_order_fact
  WHERE store_id = :storeId
    AND ingestion_position <= :watermark
    AND committed_at >= :windowStartedAt AND committed_at < :windowEndedAt
  ORDER BY order_id, order_revision DESC
)
SELECT opf.product_id, count(DISTINCT eo.order_id) AS orders_count, sum(opf.quantity) AS quantity,
       max(eo.committed_at) AS last_purchased_at
FROM effective_orders eo
JOIN listing.recommendation_order_product_fact opf ON opf.order_fact_id = eo.order_fact_id
WHERE eo.state = 'COMMITTED'
GROUP BY opf.product_id;
```

Pair stats — self-join `recommendation_order_product_fact` внутри одного
`order_fact_id` (эффективный заказ), направленно (`A -> B` и `B -> A`
отдельными строками), с последующим вычислением
`support/confidence/lift/recency_score/source_score` по формулам из
canonical doc:

```text
support(A, B) = orders(A and B) / storeOrders
confidence(A -> B) = orders(A and B) / orders(A)
lift(A -> B) = confidence(A -> B) / (orders(B) / storeOrders)
source_score = confidence * log(1 + ordersTogether) * min(lift, liftCap) * recencyScore
```

Все decimal-вычисления — в SQL (`numeric`), не в JS floating point (по
правилу canonical doc "Decimal features передаются строками на boundary").
`recency_score` — экспоненциальный time decay от `last_purchased_at`
(например `exp(-lambda * extract(epoch from (:windowEndedAt - last_purchased_at)) / 86400)`),
`lambda` и `liftCap` — константы `algorithm_version = "fbt-rules-v1"`.
Минимальные пороги перед сохранением строки: `orders_together >=
MIN_PAIR_ORDERS` (например 3), `confidence >= MIN_CONFIDENCE`, `lift >
MIN_LIFT` — кандидат ниже порога не попадает в `recommendation_product_pair_stat`
вообще (это делает `source_score` вычисление детерминированным и не требует
отдельного soft-delete).

### RecommendationCalculationRunWorkflow (Saga)

```ts
@Injectable()
export class RecommendationCalculationRunWorkflow extends BrokerSaga<
  RecommendationCalculationRunInput,
  RecommendationCalculationRunResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Saga("recommendationCalculationRun")
  async run(input): Promise<RecommendationCalculationRunResult> {
    const run = await this.createRun(input);
    if (run.status === "duplicate") return run; // idempotency key hit, no-op
    const productStats = await this.computeProductStats(input, run);
    const pairStats = await this.computePairStats(input, run);
    await this.markReady(input, run, productStats, pairStats);
    await this.activateRun(input, run);
    return { runId: run.runId, status: "ACTIVE" };
  }

  @SagaStep()
  private async createRun(input) { /* RecommendationCalculationRunCreateScript */ }
  // no compensateCreateRun: если саму строку run создать не удалось, компенсировать нечего

  @SagaStep({ timeoutMs: 120_000 })
  private async computeProductStats(input, run) { /* RecommendationCalculationRunComputeStatsScript, product part */ }

  private async compensateComputeProductStats(input, run) {
    await this.markFailed(input, run, "PRODUCT_STATS_FAILED");
  }

  @SagaStep({ timeoutMs: 300_000 })
  private async computePairStats(input, run) { /* pair part */ }

  private async compensateComputePairStats(input, run) {
    await this.markFailed(input, run, "PAIR_STATS_FAILED");
  }

  @SagaStep()
  private async markReady(input, run, productStats, pairStats) { /* RecommendationCalculationRunRepository.markReady */ }

  private async compensateMarkReady(input, run) {
    await this.markFailed(input, run, "READY_TRANSITION_FAILED");
  }

  @SagaStep()
  private async activateRun(input, run) { /* RecommendationCalculationRunRepository.activate */ }

  private async compensateActivateRun(input, run) {
    // старый ACTIVE не тронут (activate — одна транзакция, либо всё, либо ничего);
    // если сам activate упал до commit — run остаётся READY, помечаем FAILED вручную
    await this.markFailed(input, run, "ACTIVATION_FAILED");
  }

  private async markFailed(input, run, failureCode: string) {
    return Kernel.getInstance().runScript(RecommendationCalculationRunFailScript, { runId: run.runId, failureCode }, ...);
  }
}
```

Компенсация здесь не "откатывает" бизнес-данные (product/pair stats — это
history одного run, не нужно физически удалять), а переводит run lifecycle в
`FAILED` — что и требует constraint `chk_recommendation_calculation_run_lifecycle`
и canonical doc: "Calculation упал -> Run становится FAILED; предыдущий
ACTIVE продолжает обслуживаться". `activate()` сам по себе атомарен на
уровне SQL-транзакции — Saga-компенсация здесь защищает только от crash
между шагами workflow, не от частичной записи внутри одной SQL-транзакции.

Idempotency key = `hash({storeId, calculationType, algorithmVersion,
windowStartedAt, windowEndedAt, sourceIngestionWatermark})`; повторный run с
тем же ключом должен вернуть уже существующий run без пересчёта (`createRun`
проверяет `findByIdempotencyKey` до вставки — соответствует constraint
`recommendation_calculation_run_idempotency_unique`).

Done when: на store + `FREQUENTLY_BOUGHT_TOGETHER` в любой момент времени
существует не более одного `ACTIVE` run, `FAILED` run не влияет на serving,
повторный запуск с тем же watermark не создаёт вторую generation.

## Phase 4. Candidate merge, ranking и snapshot activation (Saga)

### Кандидаты и ranking (rules-based, `ranker_type = 'RULES'`, `model_version = "fbt-rules-v1"` / `"related-rules-v1"`)

Единый application service, вызываемый с разными placement (как в canonical
doc):

```ts
interface RecommendPipelineInput {
  storeId: string;
  anchorProductId: string;
  placement: RecommendationPlacement;
}
```

Pipeline строго по шагам из canonical doc:

```text
active placement policy
  -> active scheduled manual actions (PIN/BOOST/EXCLUDE, [starts_at, ends_at))
  -> active FBT run pair stats (только для FREQUENTLY_BOUGHT_TOGETHER; для
     PRODUCT_RELATED — тот же FBT run как один из candidate sources, не
     единственный)
  -> registered fallback sources (category_popularity, store_popularity —
     см. "Явные границы")
  -> dedup by target product (первое найденное provenance сохраняется в
     source_breakdown, остальные добавляются туда же)
  -> apply EXCLUDE (hard filter, независимо от strategy)
  -> apply publication/availability eligibility (join к
     product_listing_index: status = 'published')
  -> apply strategy (CURATED_ONLY | CURATED_FIRST | BLENDED | AUTOMATED_ONLY)
  -> rank: score DESC, target_product_id ASC (deterministic tie-breaker);
     PIN не эмулируется score — PIN-кандидаты занимают заявленные positions
     до ranking остальных, остальные ranks сдвигаются после них
  -> truncate to policy.maximum_results
  -> build immutable snapshot rows (BUILDING)
  -> atomically activate
```

`RecommendationFeatures` — интерфейс из canonical doc, собирается in-memory
на шаге ranking (не персистится отдельно, кроме как в `features` jsonb
snapshot item).

Strategy application:

- `CURATED_ONLY`: только active manual `PIN`/`BOOST` candidates; если после
  EXCLUDE/eligibility меньше `minimum_results` — snapshot публикуется как
  есть, fallback не вызывается (буквально по canonical doc);
- `CURATED_FIRST`: PIN → BOOST → остальные ranks заполняются
  automated/fallback candidates до `maximum_results`;
- `BLENDED`: manual `BOOST` becomes a ranking feature вместе с
  FBT/popularity features в одном score; `PIN` всё равно резервирует
  position отдельной фазой (canonical doc: "PIN обрабатывается отдельной
  policy phase и не эмулируется искусственно огромным score" — это
  инвариант, а не особенность одной strategy);
- `AUTOMATED_ONLY`: manual `PIN`/`BOOST` игнорируются, `EXCLUDE` остаётся
  active (safety rule, не отключаемая ни одной strategy).

Fallback вызывается последовательно по `fallback_chain` до достижения
`minimum_results`; каждый источник добавляет только новые (ещё не
включённые) targets; source, вернувший 0 кандидатов, пропускается без
ошибки.

`category_popularity` источник: top-N по `recommendation_product_stat`
(текущего ACTIVE run) products, ограниченных той же category, что и anchor
(категория читается через существующий `productListingIndex` read model, не
через canonical Catalog). `store_popularity`: тот же top-N без ограничения
по category. Если ACTIVE FBT run отсутствует (ещё ни разу не считался) —
оба fallback возвращают пустой список; это валидный результат (canonical
doc: "Пустой snapshot является корректным результатом").

### RecommendationSnapshotRepository

```ts
async findActive(input: { anchorProductId: string; placement: string }): Promise<SnapshotRow | null>;
async findByBuildKey(input: { anchorProductId: string; placement: string; buildKey: string }): Promise<SnapshotRow | null>;
async createBuilding(input: {
  snapshotId: string;
  anchorProductId: string;
  placement: string;
  strategy: string;
  policyId: string | null;
  policyVersion: number;
  calculationRunId: string | null;
  rankerType: "RULES" | "ML";
  modelVersion: string;
  buildKey: string;
  sourceWatermarks: Record<string, unknown>;
  itemCount: number;
}): Promise<void>;
async insertItems(input: { snapshotId: string; items: readonly SnapshotItemRow[] }): Promise<void>;
async markReady(input: { snapshotId: string }): Promise<void>;
async activate(input: { snapshotId: string; anchorProductId: string; placement: string }): Promise<void>;
async markFailed(input: { snapshotId: string; failureCode: string }): Promise<void>;
```

`activate` — атомарная транзакция: текущий `ACTIVE` snapshot того же
`(store_id, anchor_product_id, placement)` → `SUPERSEDED`, новый → `ACTIVE`,
`activated_at = now()`. Перед активацией repository (или вызывающий script)
обязан проверить инварианты из canonical doc ("Активация выполняется... после
проверки"):

- число items == `item_count`;
- ranks уникальны и образуют диапазон `1..item_count`;
- targets уникальны, не содержат anchor;
- `item_count <= policy.maximum_results`;
- каждый target принадлежит тому же `store_id` (application-level check —
  `store_id` не входит в FK/PK, БД сама это не проверит).

### RecommendationSnapshotBuildWorkflow (Saga)

Аналогичная FBT calculation run структура: `buildSnapshot` (BUILDING) →
`collectCandidates` → `rankAndTruncate` → `insertSnapshotItems` →
`markReady` → `activateSnapshot`, с компенсацией каждого шага в `markFailed`
(старый ACTIVE snapshot не трогается — тот же принцип, что и в calculation
run).

`build_key` — hash от `{policyVersion, calculationRunId, manual
configuration version snapshot, algorithmVersion}` — используется для
идемпотентности (`recommendation_snapshot_build_key_unique`) и как часть
"Policy version изменилась во время build -> Build отклоняется как stale и
запускается заново" (canonical doc, таблица Failure semantics): если на шаге
`activateSnapshot` замечено, что `policy.version` изменилась с момента
`collectCandidates`, workflow должен завершиться без активации и
инициировать новый build (не активировать заведомо устаревший результат).

### RecommendationSnapshotBuildTriggerWorkflow (fan-out, по образцу `FacetAffectedProductsResyncWorkflow`)

Запускается (а) после активации calculation run — для всех anchors, у
которых есть pair stats в новом run; (б) после manual recommendation
CRUD/policy update — для затронутого anchor+placement; (в) после product
lifecycle событий (см. Phase 7) — для anchors, ссылающихся на изменившийся
product как target.

```ts
await this.broker.startWorkflow(
  "listing.recommendationSnapshotBuild",
  { storeId, anchorProductId, placement, reason },
  idempotencyCtx,
  {
    queueName: "recommendation_snapshot_build",
    enqueueOptions: { queuePartitionKey: `${storeId}:${anchorProductId}:${placement}` },
  }
);
```

Массовая активация run может затронуть тысячи anchors — запуск через queue
(не await в цикле) обязателен, аналогично тому, как `FacetAffectedProductsResyncWorkflow`
обрабатывает bulk resync через `LISTING_INDEX_ACTIONS_QUEUE`.

Done when: любое изменение policy/manual recommendation/calculation run
детерминированно приводит к rebuild только затронутых snapshot, старый
ACTIVE snapshot не разрушается при неудачном build.

## Phase 5. Storefront serving

### StorefrontRecommendationQueryRepository

```ts
export class StorefrontRecommendationQueryRepository extends BaseRepository {
  @ReadOnly()
  async getActiveSnapshotPage(input: {
    anchorProductId: string;
    placement: "PRODUCT_RELATED" | "FREQUENTLY_BOUGHT_TOGETHER";
    first: number;
    after?: DecodedRecommendationCursor | null;
  }): Promise<RecommendationPageResult>;
}
```

Read path (буквально по canonical doc "Storefront serving"):

1. читает `recommendation_snapshot` где `status = 'ACTIVE'` для
   `(store_id, anchor_product_id, placement)`; нет active snapshot -> пустой
   connection (`totalCount = 0`, не ошибка);
2. читает `recommendation_snapshot_item` по `rank ASC`, keyset пагинация
   после `after` (rank > decoded cursor rank);
3. live-фильтрует targets по `product_listing_index` (`status =
   'published'`) — join, не отдельный N+1 запрос;
4. если после live-фильтра и `first` строк недостаточно — читает следующую
   already-computed страницу items того же snapshot (`rank` дальше), но
   **не** триггерит синхронный calculation/build;
5. `totalCount` — количество currently storefront-eligible items во всём
   snapshot (отдельный count-запрос с тем же live-фильтром, не только по
   текущей странице — так же, как storefront listing repository считает
   `totalCount` отдельной веткой, а не по page rows).

Cursor — отдельный формат от `ListingCursorPayload` (другой domain), но тот
же подход, что в `src/repositories/storefront/cursor.ts`: version + hash +
строгая валидация:

```ts
interface RecommendationCursorPayload {
  version: 1;
  hash: string;      // от {storeId, anchorProductId, placement, snapshotId}
  snapshotId: string;
  rank: number;
}
```

`hash` пин-ит snapshot generation: cursor, выданный для snapshot A,
не должен читать snapshot B, если между страницами был опубликован новый
ranking (`recommendation-storefront-api.ru.md`: "Cursor привязан к immutable
snapshot generation"). Несовпадение hash — `StorefrontRepositoryValidationError`
(тот же класс, что уже используется для listing cursor), не тихий сброс на
первую страницу.

### ProductRecommendationConnectionResolver

Копирует структуру `ProductConnectionResolver.ts`
(`src/resolvers/storefront/ProductConnectionResolver.ts:19-60`): наследует
`ListingType<TInput, TOutput>`, `$preload()` вызывает
`services.repository.storefrontRecommendationQuery.getActiveSnapshotPage(...)`,
`edges()/nodes()/pageInfo()/totalCount()` читают закэшированный результат.
`node.product` строится через `toProductReference(targetProductId)` (уже
существующий helper в `listingReferences.ts`), `node.source` — маппинг
`primary_source` (`MANUAL|FREQUENTLY_BOUGHT_TOGETHER|CONTENT_SIMILARITY|POPULARITY|FALLBACK`)
1-в-1 в GraphQL enum `ProductRecommendationSource` (значения уже совпадают
буквально).

### Wiring

`ResolverRegistry.ts` — добавить:

```ts
async productRecommendationConnection(input: ProductRecommendationConnectionInput) {
  const { ProductRecommendationConnectionResolver } = await import(
    "./ProductRecommendationConnectionResolver.js"
  );
  return new ProductRecommendationConnectionResolver(input, this.ctx);
}
```

`src/api/graphql-storefront/resolvers/types.ts` — добавить в `typeResolvers.Product`
(рядом с существующим `__resolveReference`) field-резолверы:

```ts
Product: {
  __resolveReference: (reference) => reference as unknown as ResolversTypes["Product"],
  relatedProducts: (parent: { id: string }, args, ctx: ServiceContext) =>
    getResolverRegistry(ctx).productRecommendationConnection({
      anchorProductId: decodeGlobalIdByType(parent.id, GlobalIdEntity.Product),
      placement: "PRODUCT_RELATED",
      first: args.first,
      after: args.after,
    }),
  frequentlyBoughtTogether: (parent: { id: string }, args, ctx: ServiceContext) =>
    getResolverRegistry(ctx).productRecommendationConnection({
      anchorProductId: decodeGlobalIdByType(parent.id, GlobalIdEntity.Product),
      placement: "FREQUENTLY_BOUGHT_TOGETHER",
      first: args.first,
      after: args.after,
    }),
},
```

`Connection.__resolveType` (строки 27-29) — добавить
`ProductRecommendationConnectionResolver` в проверку, аналогично
`ProductConnectionResolver`.

### Repository aggregator wiring

`Repository.ts` — добавить публичное поле
`storefrontRecommendationQuery: StorefrontRecommendationQueryRepository` и
`recommendationPlacementPolicy`, `manualProductRecommendation`,
`recommendationIngestionCursor`, `recommendationOrderFact`,
`recommendationCalculationRun`, `recommendationSnapshot` — по тому же
паттерну конструктора-цепочки, что и текущий блок строк 170-183
(`storefrontFacetResolution`, `storefrontListingQuery`, ...): создать в
`static async create(...)` в порядке зависимостей, передать позиционно в
`new Repository(...)`.

### Кэш

Cache key обязан включать `storeId, anchorProductId, placement, snapshotId,
eligibility context` (canonical doc). Реализация кэша — на уровне
DataLoader/HTTP cache существующего storefront слоя (если он есть для
других connection-полей); этот план фиксирует только состав ключа, не
инфраструктуру кэша, т.к. остальной storefront API её не описывает отдельно
в repository-layer плане.

Done when: `relatedProducts`/`frequentlyBoughtTogether` возвращают
детерминированный forward-only Relay connection, пустой snapshot не
считается ошибкой, cursor не смешивает две generation.

## Phase 6. Admin API (placement policy + manual recommendation CRUD + preview)

`services/listing/src/api/graphql-admin/schema/recommendation.graphql`:

```graphql
enum RecommendationPlacement {
  PRODUCT_RELATED
  FREQUENTLY_BOUGHT_TOGETHER
  CART_CROSS_SELL
  CHECKOUT_UPSELL
  HOME_PERSONALIZED
  SEARCH_RERANK
}

enum RecommendationStrategy {
  CURATED_ONLY
  CURATED_FIRST
  BLENDED
  AUTOMATED_ONLY
}

enum ManualRecommendationAction {
  PIN
  BOOST
  EXCLUDE
}

type RecommendationPlacementPolicy implements Node {
  id: ID!
  placement: RecommendationPlacement!
  enabled: Boolean!
  strategy: RecommendationStrategy!
  minimumResults: Int!
  maximumResults: Int!
  fallbackChain: [String!]!
  version: Int!
}

type ManualProductRecommendation implements Node {
  id: ID!
  anchorProduct: Product!
  targetProduct: Product!
  placement: RecommendationPlacement!
  action: ManualRecommendationAction!
  position: Int
  boost: Float
  enabled: Boolean!
  startsAt: DateTime
  endsAt: DateTime
  version: Int!
}
```

Mutations (по образцу `facetCreate`/`facetValueUpdate` — input с
`clientMutationId`-подобным `operationId` не нужен, идемпотентность строится
как в `runFacetMutationWorkflow`; каждая мутация возвращает `userErrors:
[UserError!]!`):

```graphql
extend type ListingMutation {
  recommendationPlacementPolicyUpsert(
    input: RecommendationPlacementPolicyUpsertInput!
  ): RecommendationPlacementPolicyPayload!

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

`ManualProductRecommendationUpdateInput` обязан включать `version` для
optimistic concurrency (canonical doc: "mutation проверяет optimistic
version"); script возвращает `userErrors` с кодом `VERSION_CONFLICT`, если
переданная `version` не совпадает с текущей строкой — не `throw`, т.к. это
ожидаемый конфликт конкурентного редактирования, а не системная ошибка
(правило `script.md`: бизнес-ошибки — `userErrors`, не exception).

`ManualProductRecommendationCreateScript`/`UpdateScript` обязаны превращать
нарушение exclusion constraints
(`manual_product_recommendation_target_schedule_excl`,
`manual_product_recommendation_pin_schedule_excl`) в понятный `userError`
(`code: "SCHEDULE_CONFLICT"`), а не пропускать raw postgres exclusion
violation наружу — по аналогии с существующим `isUniqueViolation` helper в
`kernel/types.ts`, но для exclusion constraint (`error.code === "23P01"`).

Workflow-обёртки — `RecommendationMutationWorkflows.ts`, структурно идентичны
`FacetMutationWorkflows.ts`: `runManualProductRecommendationCreate` вызывает
script, при успехе — `stepStartSnapshotRebuild({ anchorProductId,
placement })` (аналог `stepStartResync`), не блокируя ответ мутации.

Query/preview:

```graphql
extend type ListingQuery {
  recommendationPlacementPolicy(placement: RecommendationPlacement!): RecommendationPlacementPolicy
  manualProductRecommendations(anchorProductId: ID!, placement: RecommendationPlacement): [ManualProductRecommendation!]!
  recommendationSnapshotPreview(anchorProductId: ID!, placement: RecommendationPlacement!): RecommendationSnapshotPreview!
}

type RecommendationSnapshotPreview {
  active: ProductRecommendationConnection
  draft: ProductRecommendationConnection
  excludedCandidates: [ExcludedRecommendationCandidate!]!
}

type ExcludedRecommendationCandidate {
  product: Product!
  reason: RecommendationExclusionReason!
}

enum RecommendationExclusionReason {
  STALE
  UNPUBLISHED
  UNAVAILABLE
  EXCLUDED
  INSUFFICIENT_SUPPORT
  LIMIT_EXCEEDED
}
```

`draft` пересчитывает candidate pipeline (Phase 4) synchronously
read-only — без записи snapshot — против ещё не сохранённой policy (если
preview вызван до сохранения) или против текущей сохранённой policy (если
после). Это единственное место, где candidate pipeline вызывается вне
Saga-контекста; вызывающий код должен переиспользовать тот же чистый
candidate-generation модуль, что и `RecommendationSnapshotBuildWorkflow`, а
не дублировать логику.

Admin mutation не принимает `store_id`, product id — Relay Global ID,
декодируется через `GlobalIdEntity.Product` (существующий `safeDecodeGlobalId`
helper в `MutationResolver.ts:35-43`).

Done when: merchant может создать/изменить/удалить policy и manual
recommendation через admin API, preview различает active/draft/excluded, все
записи проходят через тот же lifecycle, что и automated pipeline.

## Phase 7. Scheduling и product lifecycle

### RecommendationCalculationScheduler

```ts
@Injectable()
export class RecommendationCalculationScheduler {
  constructor(@InjectBroker("listing") private readonly broker: ServiceBroker) {}

  @Cron(CronExpression.EVERY_HOUR)
  async trigger(): Promise<void> {
    if (!Kernel.isInitialized()) return;
    await this.broker.runWorkflow("listing.recommendationCalculationTrigger", undefined, {
      source: "workflow",
      workflowId: `recommendation-calc-trigger:${Date.now()}`,
      stepId: "run",
    });
  }
}
```

`listing.recommendationCalculationTrigger` (обычный `BrokerWorkflows`, не
Saga) находит stores, где `recommendation_ingestion_cursor.last_position` >
`source_ingestion_watermark` последнего `ACTIVE`/`READY`/`BUILDING` run
(т.е. появились новые order facts с прошлого расчёта), и запускает
`listing.recommendationCalculationRun` для каждого через queue с
`queuePartitionKey = storeId` (не await в цикле — тот же fan-out принцип,
что в Phase 4). Store без ни одного нового order fact с прошлого запуска
пропускается — нет смысла пересчитывать идентичный run (тот же результат
даст другой idempotency key из-за нового `windowEndedAt`, но без новых
данных FBT numbers не изменятся — это допустимая оптимизация, не
обязательная для корректности, но обязательная для стоимости).

`ScheduleModule.forRoot()` — добавить в `imports` `listing.module.ts` (сейчас
отсутствует, есть только в `media.module.ts`), `RecommendationCalculationScheduler`
— в `providers`.

### Product lifecycle

Расширить существующий `ListingProductEventHandlers.ts` (обработчик product
delete/unpublish уже существует для facet references — добавить симметричную
обработку для recommendation references):

- product deleted/unpublished → `ManualProductRecommendationRepository`
  помечает все строки, где этот product — `anchor_product_id` **или**
  `target_product_id`, соответствующим `anchor_reference_status =
  'STALE'`/`target_reference_status = 'STALE'` (через reverse index
  `manual_product_recommendation_target_reverse_idx`), затем запускает
  snapshot rebuild для затронутых anchors;
- product restored/republished → обратный переход `STALE -> VALID`, но
  **только** после проверки tenant ownership (`store_id` совпадает) — по
  явному требованию canonical doc;
- anchor product deleted → существующий `ACTIVE` snapshot этого anchor
  переводится в `SUPERSEDED` (не удаляется), `recommendation_calculation_run`
  не трогается (canonical doc: "anchor deletion supersede-ит active
  snapshots, но не удаляет calculation run").

### Retention (отдельный batch job, не блокирует Phase 1-7 serving)

Реализуется как отдельный store-scoped resumable batch workflow (не входит в
критический путь этого плана, но структура уже зафиксирована миграциями:
`ON DELETE RESTRICT` на обоих FK `recommendation_snapshot -> {policy,
calculation_run}` гарантирует, что run/policy header нельзя удалить, пока на
него ссылается сохраняемый snapshot). Планируется отдельным
implementation-plan документом при появлении объёма данных, оправдывающего
retention job — миграции уже готовы к этому (`statistics_purged_at`,
`chk_recommendation_calculation_run_statistics_retention`).

Done when: FBT recalculation происходит по расписанию без ручного триггера,
product lifecycle события не оставляют stale/deleted references активными в
serving path.

## Observability

Минимальный набор (см. canonical doc "Observability" — этот план фиксирует,
какие метрики/логи добавляются вместе с каждой фазой, не отдельно):

- Phase 2: event projection lag (`now() - occurred_at` на момент ingest),
  committed/reversed counts, integrity error rate;
- Phase 3: calculation duration, products/pairs processed, run failures по
  `failure_code`;
- Phase 4: snapshot build duration, activation failures, candidates per
  source до/после dedup;
- Phase 5: empty/expired snapshot rate, `totalCount` distribution;
- все структурированные логи — через `this.$ctx.kernel.getServices().logger.error(...)`
  (паттерн уже используется в `ProductConnectionResolver.logError`), поля:
  `storeId, anchorProductId, placement, runId, snapshotId, modelVersion` —
  без customer PII (в проекции их и так нет, см. Phase 2).

## Acceptance checklist

- Ни один repository-метод не принимает `storeId` явным параметром —
  используется только `this.storeId`.
- Все новые async read-методы помечены `@ReadOnly()`.
- `recommendation_order_fact` наполняется только через
  `RecommendationOrderFactIngestScript` внутри `@Transactional()`, cursor
  advance и fact insert — одна транзакция.
- Повтор события с тем же `event_id` и тем же payload hash — no-op; тот же
  id/revision с другим hash — integrity error, не молчаливая перезапись.
- На store + calculation type в любой момент не более одного `ACTIVE` run;
  `FAILED` run не влияет на текущий serving.
- На anchor + placement в любой момент не более одного `ACTIVE` snapshot;
  активация — одна транзакция (supersede старого + activate нового).
- `PIN` не эмулируется score; ranking детерминирован (`target_product_id
  ASC` tie-breaker).
- `EXCLUDE` — hard filter независимо от strategy.
- Read path storefront повторно проверяет publication/availability и не
  меняет сохранённый snapshot при их изменении.
- Пустой snapshot — валидный результат, не ошибка.
- Cursor привязан к конкретному `snapshotId`; несовпадение — explicit
  validation error, не молчаливый сброс на первую страницу.
- Manual recommendation exclusion constraint violations превращены в
  `userErrors` с понятным кодом, не в raw SQL error наружу GraphQL.
- Admin mutation не принимает `store_id`; `version` проверяется как
  optimistic concurrency guard на update/delete.
- Product lifecycle (delete/unpublish/restore) синхронизирует
  `anchor_reference_status`/`target_reference_status`, не удаляет editorial
  intent.
- Snapshot rebuild после bulk-изменений (calculation run activation)
  запускается через queue, не в цикле `await` внутри одного workflow.
- Ни один fallback source code, кроме `category_popularity` и
  `store_popularity`, не зарегистрирован в `fallback_chain` validation —
  неизвестный код (включая `content_similarity` на этом этапе) — write
  error.
- `packages/events` содержит `OrderSaleCommittedEvent`/`OrderSaleReversedEvent`
  в `DomainEvent` union; listing не читает таблицы orders напрямую.
- Customer identity (customerId, email, address, payment) отсутствует во
  всех таблицах recommendation domain.

## Порядок фаз (зависимости)

```text
Phase 0 (orders event contract, cross-service)
   ↓
Phase 1 (Drizzle models) ──────────────┐
   ↓                                    │
Phase 2 (order fact projection)         │
   ↓                                    │
Phase 3 (FBT calculation run)           │
   ↓                                    │
Phase 4 (candidate merge + snapshot) ←──┘ (policy/manual repos из Phase 6 нужны раньше UI, но не раньше pipeline)
   ↓                    ↑
Phase 5 (storefront)    │
                         │
Phase 6 (admin CRUD) ────┘ (может стартовать параллельно с Phase 3-4,
                             т.к. пишет только в policy/manual таблицы;
                             requires Phase 1)
   ↓
Phase 7 (scheduling + lifecycle) — requires Phase 3, 4, 6
```

Phase 5 (storefront serving) технически может быть развёрнута сразу после
Phase 1, если `fallback_chain` пуст и policy отсутствует — тогда `relatedProducts`/
`frequentlyBoughtTogether` детерминированно возвращают пустой connection
(валидный результат). Полноценное наполнение требует Phase 2-4 (behavioral)
и/или Phase 6 (curated).
