# План перехода Events на explicit batch dispatch

## Цель

Перевести сервис `events` на модель persistent outbox + dispatcher с двумя режимами доставки:

- обычные события dispatch-ятся сразу после durable записи;
- batch-события dispatch-ятся явно в конце producer workflow как durable step.

Новая модель должна:

- сохранять каждое доменное событие как durable запись с payload;
- не вызывать handlers напрямую из `events.emit`;
- сохранять replay-безопасность DBOS workflows;
- использовать DBOS retry settings как основной механизм retry handler-ов;
- поддерживать explicit batch boundary для bulk/import/job workflows;
- иметь repair scheduler для догонки событий, зависших после падения процесса.

## Целевая архитектура

```text
обычный producer workflow
  -> events.emit(dispatch.mode = immediate)
      -> insert domain_events(status = pending, payload = jsonb)
      -> start events.dispatchEvent(eventId)

bulk producer workflow
  -> events.emit(dispatch.mode = deferred, batchKey = bulkJobId)
      -> insert domain_events(status = pending, payload = jsonb)
  -> events.emit(dispatch.mode = deferred, batchKey = bulkJobId)
      -> insert domain_events(status = pending, payload = jsonb)
  -> finalize job
  -> durable step:
       events.dispatchBatch(batchKey = bulkJobId)

events.dispatchEvent / events.dispatchBatch
  -> claim pending events
  -> resolve handlers
  -> call batch handlers through DBOS steps with retry settings
  -> mark events dispatched / failed
  -> write DLQ when DBOS retry is exhausted

repair scheduler
  -> releases stale dispatching events back to pending after DBOS status check
  -> optionally dispatches old pending immediate events
```

Главное разделение ответственности:

- `events.emit` отвечает за durable запись события и выбор delivery mode.
- `events.dispatchEvent` отвечает за immediate delivery одного обычного события.
- `events.dispatchBatch` отвечает за explicit batch delivery по `batchKey`.
- Producer workflow сам задает batch boundary, когда бизнес-процесс знает момент завершения batch-а.
- Retry handler-ов принадлежит DBOS step settings, а не `dispatch_after`/polling retry.

## Термины

`event`
: Одна доменная запись, например `productUpdated`.

`outbox`
: Набор событий в `domain_events` со статусами `pending` или `dispatching`.

`immediate dispatch`
: Режим по умолчанию. Событие записывается в outbox и сразу запускается dispatch workflow для этого eventId.

`deferred batch`
: Режим для bulk/import/job workflows. События записываются с `batchKey`, но не dispatch-ятся до явного `events.dispatchBatch`.

`batch`
: Группа событий, доставляемая одному handler-у одним вызовом.

`batchKey`
: Ключ explicit batch-а, задаваемый producer workflow. Для bulk update это `bulk:${jobId}`.

`aggregateKey`
: Ключ сущности внутри batch-а, например `product:<productId>`. Нужен handler-ам для aggregation/coalescing. Dispatcher не должен выбрасывать события по этому ключу.

## Модель данных

### domain_events

Изменить таблицу `domain_events`.

```text
domain_events
  event_id text primary key
  event_type text not null
  source text not null
  timestamp timestamptz not null

  tenant_id text not null
  user_id text null
  correlation_id text not null
  causation_id text null

  emit_key text not null
  parent_workflow_id text null

  subject_type text not null
  subject_id text not null
  actor_type text not null
  actor_id text null

  payload jsonb not null
  payload_hash text not null

  dispatch_mode text not null
    -- immediate | deferred
  status text not null
    -- pending | dispatching | dispatched | failed

  batch_key text null
  aggregate_key text null

  dispatch_claims integer not null default 0
  locked_by text null

  dispatch_started_at timestamptz null
  dispatch_completed_at timestamptz null

  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

Индексы:

```text
idx_domain_events_pending
  (status, created_at)

idx_domain_events_batch
  (tenant_id, event_type, batch_key, created_at)

idx_domain_events_subject_timeline
  (tenant_id, subject_type, subject_id, timestamp)

idx_domain_events_correlation
  (correlation_id)
```

Примечание по payload:

- Хранить payload в `jsonb`.
- `payload_ref` и вынос тела в MinIO не входят в этот план.
- Текущий status constraint `dispatching | completed` должен быть заменен на новые статусы.

### handler execution trace

Successful handler calls не сохранять в events schema. Для успешной доставки достаточно финального `domain_events.status = dispatched` и `dispatch_completed_at`.

Failed handler calls писать в DLQ.

Фактические retry/attempt данные и successful step results не дублировать в events schema: они остаются в DBOS runtime tables и логах. Для failed delivery в DLQ хранить `dbos_workflow_id` и `dbos_step_name`, чтобы открыть DBOS trace.

### dead_letter_queue

Использовать DLQ как конечное хранилище недоставленных событий:

- запись создается dispatcher-ом после исчерпания DBOS retry;
- для batch handler failure писать DLQ на каждое eventId в batch-е;
- не дублировать DBOS retry attempts в DLQ; для диагностики хранить `dbos_workflow_id` и `dbos_step_name`;
- `domain_events.dispatch_claims` отражает только число claim-ов dispatcher-ом и не является handler retry counter.

## Event emit API

Текущий input `events.emit` расширить явным dispatch mode.

```ts
type EmitDispatchOptions =
  | { mode?: "immediate" }
  | {
      mode: "deferred";
      batchKey: string;
      aggregateKey?: string;
    };

interface EmitParams<TType extends string = string, TPayload = unknown> {
  eventType: TType;
  payload: TPayload;
  source: string;
  context: Omit<EventContext, "correlationId"> & { correlationId?: string };
  subject: { type: string; id: string };
  actor?: { type: "user" | "service" | "system"; id?: string };
  emitKey: string;
  dispatch?: EmitDispatchOptions;
}
```

Правила:

- default `dispatch.mode = "immediate"`;
- `immediate` persist-ит event и запускает `events.dispatchEvent(eventId)`;
- `deferred` persist-ит event с `batchKey` и не запускает dispatch;
- `batchKey` обязателен для `deferred`;
- `aggregateKey` задается producer-ом или вычисляется как `${subject.type}:${subject.id}`;
- `dispatchAfter` и `batchWindowMs` не используются.

Для bulk update:

```ts
dispatch: {
  mode: "deferred",
  batchKey: `bulk:${jobId}`,
  aggregateKey: `product:${productId}`,
}
```

После завершения bulk workflow он запускает `events.dispatchBatch` для `batchKey` как durable step.

## Dispatch policy registry

Добавить policy registry в `events`.

```ts
interface EventDispatchPolicy {
  eventType: string;
  maxBatchSize: number;
  groupBy: Array<"tenantId" | "eventType" | "batchKey" | "source">;
  handlerTimeoutMs: number;
  handlerStepConfig: "default" | "longRunning" | "destructive";
}
```

Политики:

```ts
productUpdated:
  maxBatchSize: 500
  groupBy: ["tenantId", "eventType", "batchKey"]
  handlerTimeoutMs: 30000
  handlerStepConfig: default

fileHardDeleted:
  maxBatchSize: 100
  groupBy: ["tenantId", "eventType"]
  handlerTimeoutMs: 30000
  handlerStepConfig: destructive

default:
  maxBatchSize: 100
  groupBy: ["tenantId", "eventType"]
  handlerTimeoutMs: 30000
  handlerStepConfig: default
```

Policy registry должен жить в коде, не в БД, пока нет runtime-конфигурации событий. Он не хранит retry policy как данные events service.

Retry задается через DBOS step settings на handler call. `handlerStepConfig` выбирает один из code-defined наборов DBOS options, которые dispatcher передает в `DBOS.runStep`:

```ts
const handlerStepConfigs = {
  default: {
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  },
  longRunning: {
    retry: { maxAttempts: 5, intervalSeconds: 5, backoffRate: 2 },
  },
  destructive: {
    retry: { maxAttempts: 10, intervalSeconds: 1, backoffRate: 2 },
  },
};
```

## Dispatcher workflows

### events.emit

Новый `events.emit`:

```text
events.emit
  -> build deterministic eventId
  -> resolve dispatch mode
  -> persist event with status pending
  -> if mode=immediate:
       start events.dispatchEvent(eventId)
  -> if mode=deferred:
       do not dispatch now
  -> return eventId/status/dispatchMode
```

Важно:

- не вызывать handlers напрямую в `events.emit`;
- insert должен быть idempotent через deterministic `eventId`;
- при replay workflow повторный insert не должен менять уже `dispatching`/`dispatched` event;
- при повторном emit для того же deterministic `eventId` return должен быть стабильным.

### events.dispatchEvent

Для обычных событий.

Input:

```ts
interface DispatchEventInput {
  tenantId: string;
  eventId: string;
}
```

Flow:

```text
events.dispatchEvent
  -> claim one pending event by eventId
  -> dispatch as a batch with one event
  -> mark event with final status
```

### events.dispatchBatch

Для explicit batch boundaries, например bulk update.

Input:

```ts
interface DispatchBatchInput {
  tenantId: string;
  eventType?: string;
  batchKey: string;
  limit?: number;
}
```

Flow:

```text
events.dispatchBatch
  -> claim pending deferred events by tenantId/batchKey/eventType
  -> group claimed events by policy
  -> for each group:
       dispatch group to batch handlers through DBOS steps
  -> mark events with final status
```

Bulk workflow вызывает этот workflow после `stepFinalizeJob(jobId)`.

### Claim query

Claim должен быть атомарным: выбрать и перевести в `dispatching` в одной транзакции.

```sql
WITH claimed AS (
  SELECT event_id
  FROM domain_events
  WHERE status = 'pending'
    AND tenant_id = :tenantId
    AND optional filters...
  ORDER BY created_at ASC
  LIMIT :limit
  FOR UPDATE SKIP LOCKED
)
UPDATE domain_events
SET
  status = 'dispatching',
  locked_by = :dispatcherWorkflowId,
  dispatch_claims = dispatch_claims + 1,
  dispatch_started_at = coalesce(dispatch_started_at, now()),
  updated_at = now()
WHERE event_id IN (SELECT event_id FROM claimed)
RETURNING *;
```

Для `dispatchEvent` optional filters включают `event_id = :eventId`.
Для `dispatchBatch` optional filters включают `batch_key = :batchKey`, `dispatch_mode = 'deferred'`, optional `event_type`.

`dispatch_claims` нужен только для observability outbox-а и диагностики repair сценариев. Он не должен использоваться как счетчик retry handler-ов, потому что retry происходит внутри DBOS step после claim-а.

### Repair scheduler

Добавить scheduler для repair-задач:

```text
every 5 minutes:
  release stale dispatching events:
    status=dispatching
    and dispatch_started_at older than repair threshold
    and locked_by DBOS workflow is no longer running
    -> status=pending
       locked_by=null

every minute:
  find old pending immediate events
  -> start events.dispatchEvent(eventId) with deterministic repair id
```

Scheduler не должен быть основным механизмом latency. Он нужен как страховка после падения между persist и dispatch или после зависшего `dispatching` состояния.

## Handler contract

Все event handlers в новой системе должны принимать batch. Immediate event тоже доставляется как batch из одного event.

```ts
@BatchEventHandler("productUpdated")
async handleProductUpdatedBatch(params: {
  events: DomainEvent[];
  batch: {
    batchId: string;
    eventType: string;
    tenantId: string;
    batchKey?: string;
  };
}): Promise<EventHandlerResponse>
```

Регистрация:

- batch handler action: `${serviceName}.${eventType}.batch` или metadata flag на event type.

Предпочтительный вариант: metadata flag, чтобы не плодить строковые suffix conventions.

Базовая реализация может сделать проще:

- добавить `BatchEventHandler` decorator;
- добавить `BatchEventHandlers` base class;
- регистрировать action `${serviceName}.${eventType}.batch`;
- dispatcher вызывает только batch action.

Порядок миграции важен: сначала добавить batch handlers и перевести consumers, потом отключать legacy single-event dispatch.

## Aggregation внутри handlers

Dispatcher не должен выбрасывать события при coalescing. Для `productUpdated` payload сейчас partial delta, поэтому выбор "последнего события по productId" может потерять изменения.

Правило:

```text
dispatcher groups events into batches
handler receives all events in batch
handler aggregates productIds / variantIds / categoryIds itself
handler rereads current snapshot where needed
```

Для `productUpdated`:

- handler собирает unique `productId`;
- handler собирает affected `variantIds`, если они есть в payload;
- handler собирает affected `categoryIds` для refresh counts;
- search index sync должен опираться на актуальное состояние продукта, а не только на последнюю delta.

## Bulk update integration

Новый flow:

```text
catalog.productBulkEdit
  -> create job
  -> for each product group:
       catalog.productUpdate
          -> events.emit(productUpdated, mode=deferred, batchKey=bulkJobId)
  -> finalize job
  -> durable step:
       events.dispatchBatch(batchKey=bulkJobId)
```

Изменения в catalog:

- расширить `ProductUpdateWorkflowInput` event dispatch context;
- при bulk передавать `batchKey`, `aggregateKey`, `dispatch.mode = "deferred"`;
- для product update вне bulk использовать default `dispatch.mode = "immediate"`;
- после финализации bulk job вызвать `events.dispatchBatch`.

Пример emit из bulk:

```ts
await this.broker.runWorkflow(
  "events.emit",
  {
    eventType: "productUpdated",
    payload,
    source: "catalog",
    context,
    subject: { type: "product", id: productId },
    emitKey: `bulk:${jobId}:product:${productId}`,
    dispatch: {
      mode: "deferred",
      batchKey: `bulk:${jobId}`,
      aggregateKey: `product:${productId}`,
    },
  },
  {
    source: "workflow",
    workflowId: DBOS.workflowID!,
    stepId: "emitBulkProductUpdated",
    callId: productId,
  },
);
```

Пример dispatch after finalize:

```ts
await this.broker.runWorkflow(
  "events.dispatchBatch",
  {
    tenantId: context.organizationId,
    eventType: "productUpdated",
    batchKey: `bulk:${jobId}`,
  },
  {
    source: "workflow",
    workflowId: DBOS.workflowID!,
    stepId: "dispatchBulkProductUpdated",
    callId: jobId,
  },
);
```

## Idempotency

### eventId

Использовать deterministic event id:

```text
eventId = hash(tenantId + dispatchWorkflowId)
dispatchWorkflowId = parentWorkflowId + eventType + emitKeyHash
```

Для deferred mode это по-прежнему работает.

### dispatch workflow id

Для immediate dispatch:

```text
events:dispatchEvent:{tenantId}:{eventId}
```

Для explicit bulk dispatch:

```text
events:dispatchBatch:{tenantId}:{eventType}:{batchKey}
```

Повторный start должен быть безопасным:

- при повторном start для того же workflow id DBOS вернет тот же handle;
- если события уже `dispatched`, claim query вернет пустой набор.

### DBOS step names

Handler call должен иметь стабильное имя step-а.

```text
handler:{batchId}:{handlerAction}
```

`batchId`:

- для immediate: `event:{eventId}`;
- для deferred: `batch:{tenantId}:{eventType}:{batchKey}:{claimedEventHash}`.

`claimedEventHash` нужен, чтобы разные chunks одного большого batch-а имели разные durable step names.

### Handler idempotency

Dispatcher должен считать delivery at-least-once. Handlers обязаны быть idempotent.

Для batch handlers передавать:

```text
batchId
eventIds[]
correlationId
```

Consumer может хранить processed batch/event ids у себя, если side effect не является естественно идемпотентным.

## Retry и DLQ

Dispatcher вызывает handlers через DBOS steps. Retry принадлежит DBOS settings.

Retry policy:

- retryable handler response -> dispatcher бросает retryable error внутри DBOS step;
- DBOS повторяет step по `maxAttempts`, `intervalSeconds`, `backoffRate`;
- timeout -> non-retryable для активного step-а, записать failure;
- non-retryable handler response -> не retry, сразу DLQ;
- DBOS retry exhausted -> DLQ.

Обычный retryable failure не переводит event в `retry_scheduled`: DBOS остается внутри того же durable step и повторяет его детерминированно.

После final failure:

```text
status = failed
DLQ row per event-handler
lock fields cleared
```

После success всех handlers:

```text
status = dispatched
dispatch_completed_at = now
lock fields cleared
```

Если часть handlers успешна, а часть failed:

- Событие считается `failed`, failed handler уходит в DLQ.
- Per-handler state не хранится в events schema.

## Фазы внедрения

### Фаза 1. Подготовка схемы и repository API

- Добавить payload/dispatch/status/lock fields в `domain_events`.
- Добавить repository методы:
  - `persistPendingEvent`;
  - `claimEvent`;
  - `claimBatch`;
  - `markDispatched`;
  - `markFailed`;
  - `releaseStaleDispatchingEvents`;
  - `findStalePendingImmediateEvents`.
- Реализовать запись в DLQ через обновленный repository API.
- Подготовить producer services к передаче `dispatch.mode`, `batchKey`, `aggregateKey`.

Результат: schema и repository API готовы для новой модели dispatch.

### Фаза 2. Batch handler contract

- Добавить `@BatchEventHandler`.
- Добавить batch action registration.
- Перевести event consumers на batch handler contract.
- Immediate events доставлять как batch из одного event.
- Добавить event policies с DBOS retry settings.

Результат: consumers готовы принимать batch до отключения legacy single-event dispatch.

### Фаза 3. Разделить emit и dispatch

- Удалить прямой вызов handlers из `events.emit`.
- Изменить `events.emit`: persist pending event + запуск dispatch workflow только для `immediate`.
- Добавить `events.dispatchEvent`.
- Добавить `events.dispatchBatch`.
- Dispatcher вызывает только batch handlers.

Результат: обычные события доставляются сразу через dispatcher, batch-события ждут explicit `dispatchBatch`.

### Фаза 4. Bulk update boundary

- Расширить `ProductUpdateWorkflowInput` dispatch context.
- В bulk передавать `dispatch.mode = "deferred"`, `batchKey = bulk:${jobId}`.
- После finalize запускать `events.dispatchBatch` как durable step.
- Для product updates вне bulk использовать default `immediate`.

Результат: bulk update обновляет все продукты, затем одним dispatch workflow отправляет batch.

### Фаза 5. Repair scheduler

- Добавить recovery для зависших `dispatching` events.
- Добавить scheduler для старых pending immediate events.
- Добавить метрики/logging.

Результат: dispatch устойчив к падениям между persist и dispatch, а также к зависшим `dispatching` events.

### Фаза 6. Cleanup и observability

- Обновить cleanup old domain events с учетом статусов.
- Не удалять `pending` и `dispatching`.
- Добавить admin/debug queries позже, если понадобятся:
  - pending count by eventType;
  - failed count;
  - oldest pending age;
  - DLQ by handler.

## Риски и решения

### Риск: payload в jsonb раздует таблицу

Первая итерация принимает этот риск. Добавить retention и индексы только на metadata. Если payload станет большим, вынести тело в object storage.

### Риск: повторная доставка successful handler-ам

Первая итерация допускает at-least-once delivery. Handlers должны быть idempotent. Позже можно добавить per-handler state.

### Риск: aggregation потеряет важную delta-информацию

Dispatcher не должен выбрасывать события. Для `productUpdated` batch handler должен агрегировать все events и перечитывать актуальный snapshot там, где это нужно.

### Риск: bulk producer workflow ждет dispatch

Bulk explicit dispatch запускается как durable step после finalize. Bulk workflow ждет результат dispatch.

### Риск: scheduler запустит dispatch одновременно с explicit bulk dispatch

Scheduler не должен автоматически dispatch-ить deferred batch events. Он чинит зависшие `dispatching` events и old pending immediate events. Explicit batch остается ответственностью producer workflow.

## Решения плана

- Payload хранить в `domain_events.payload jsonb`.
- Поведение dispatch по умолчанию: `immediate`.
- Для bulk update: `deferred` + explicit `events.dispatchBatch` после finalize.
- `dispatchAfter` и `batchWindowMs` не делать.
- Retry handler-ов делать через DBOS step settings.
- Dispatcher не coalesce-ит `productUpdated`; aggregation делает batch handler.
- Per-handler state не хранить в events schema.
- Repair scheduler добавить сразу, иначе будет риск потерять dispatch после persist.

## Проверка готовности

Минимальные acceptance criteria:

- `events.emit` создает `domain_events` со статусом `pending` и payload.
- `events.emit` с default/immediate запускает `events.dispatchEvent`.
- `events.emit` с `dispatch.mode = "deferred"` не запускает dispatch.
- `events.dispatchEvent` доставляет один event batch handler-у как batch из одного event.
- `events.dispatchBatch` доставляет pending deferred events по `batchKey` одним или несколькими batch handler calls.
- Если batch handler не зарегистрирован, dispatch для этого event type завершается ошибкой конфигурации.
- Повторный запуск dispatch workflow не дублирует уже `dispatched` events.
- Retryable failure повторяется через DBOS retry settings.
- Exhausted DBOS retry пишет DLQ.
- Bulk update может создать несколько `productUpdated` с одним `batchKey`.
- После bulk finalize запускается `events.dispatchBatch` как durable step.
- Scheduler возвращает зависшие `dispatching` events в `pending` только после проверки DBOS workflow status.
- Scheduler подбирает старые pending immediate events, если immediate dispatch не стартовал.

## Файлы, которые likely придется менять

Events service:

- `services/events/src/repositories/models/domainEvents.ts`
- `services/events/src/repositories/models/deadLetterQueue.ts`
- `services/events/src/repositories/Repository.ts`
- `services/events/src/workflows/EventDispatchWorkflow.ts`
- `services/events/src/CleanupScheduler.ts`
- `services/events/src/events.module.ts`
- `services/events/migrations/*`

Shared packages:

- `packages/events/src/types.ts`
- `packages/shared-kernel/src/decorators/BatchEventHandler.ts`
- `packages/shared-kernel/src/broker/BatchEventHandlers.ts`

Catalog bulk integration:

- `services/catalog/src/workflows/ProductUpdateWorkflow.ts`
- `services/catalog/src/workflows/ProductBulkEditWorkflow.ts`
- `services/catalog/src/workflows/dto/ProductUpdateWorkflowDto.ts`
- `services/catalog/src/handlers/index.ts`

## Открытые вопросы

- Должен ли `events.emit` возвращать только `eventId` или еще `dispatchWorkflowId` при immediate dispatch?
- Нужен ли публичный GraphQL/admin API для просмотра pending/failed events?
- Нужно ли хранить full payload forever или достаточно retention 90 дней?
- Нужна ли строгая ordering guarantee внутри одного `aggregateKey`?
- Должен ли bulk mutation ждать `dispatchBatch` или только запускать его в фоне?
- Нужен ли compatibility adapter для legacy `@EventHandler` на время миграции?
