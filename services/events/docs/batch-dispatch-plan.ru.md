# План перехода Events на отложенный batch dispatch

## Цель

Перевести сервис `events` на модель persistent outbox + batch dispatcher.

Новая модель должна:

- сохранять каждое доменное событие как durable запись с payload;
- не вызывать handlers сразу из `events.emit`;
- запускать отдельный dispatch workflow, который забирает pending events батчами;
- поддерживать batch aggregation для bulk операций;
- сохранять idempotency и replay-безопасность DBOS workflows;
- иметь repair scheduler для догонки зависших или неотправленных событий.

## Целевая архитектура

```text
producer workflow
  -> events.emit
      -> insert domain_events(status = pending, payload = jsonb)
      -> optionally trigger dispatch workflow

events.dispatchDueEvents
  -> claim due pending events
  -> group events by batch policy
  -> resolve handlers
  -> call batch handlers
  -> mark events dispatched / retry_scheduled / failed
  -> write DLQ when retry policy is exhausted

repair scheduler
  -> periodically starts dispatchDueEvents for due pending/retry events
```

Главное разделение ответственности:

- `events.emit` отвечает только за durable запись события.
- `events.dispatchDueEvents` отвечает за доставку.
- producer workflows не должны знать, сколько handlers будет вызвано и как они батчатся.

## Термины

`event`
: Одна доменная запись, например `productUpdated`.

`outbox`
: Набор событий в `domain_events` со статусами `pending`, `dispatching`, `retry_scheduled`.

`batch`
: Группа событий, доставляемая одному handler-у одним вызовом.

`batchKey`
: Ключ группировки, задаваемый producer-ом или вычисляемый events service. Для bulk update это может быть `bulkJobId`.

`aggregateKey`
: Ключ сущности внутри batch-а. Например `product:<productId>`. Нужен для coalescing, когда в батче надо выбрать последнее событие по сущности.

`dispatchAfter`
: Время, раньше которого событие не должно доставляться. Используется для batch window и retry delay.

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

  status text not null
    -- pending | dispatching | dispatched | retry_scheduled | failed

  dispatch_after timestamptz not null default now()
  batch_key text null
  aggregate_key text null

  attempts integer not null default 0
  locked_by text null
  locked_until timestamptz null

  dispatch_started_at timestamptz null
  dispatch_completed_at timestamptz null
  handler_results jsonb null

  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

Индексы:

```text
idx_domain_events_due
  (status, dispatch_after, created_at)

idx_domain_events_lock
  (locked_until)

idx_domain_events_batch
  (tenant_id, event_type, batch_key, dispatch_after)

idx_domain_events_subject_timeline
  (tenant_id, subject_type, subject_id, timestamp)

idx_domain_events_correlation
  (correlation_id)
```

Примечание по payload:

- В первой итерации хранить payload в `jsonb`.
- Если payload станет большим, добавить `payload_ref` и выносить тело в MinIO, но не усложнять первую итерацию.

### event_dispatch_attempts

Добавить отдельную таблицу для истории попыток доставки. Это лучше, чем перезаписывать только `handlerResults`.

```text
event_dispatch_attempts
  id text primary key
  event_id text not null references domain_events(event_id)
  batch_id text not null
  handler_service text not null
  handler_action text not null
  attempt integer not null
  status text not null
    -- success | failed
  error text null
  error_code text null
  duration_ms integer not null
  created_at timestamptz not null default now()
```

Записывать одну попытку на пару event-handler. Summary по batch можно дополнительно хранить в `domain_events.handler_results`.

### dead_letter_queue

Использовать DLQ как конечное хранилище недоставленных событий:

- запись создается dispatcher-ом после исчерпания retry;
- для batch handler failure можно писать DLQ на каждое eventId в batch-е;
- `attempts` должен отражать фактическое число попыток доставки.

## Event emit API

Текущий input `events.emit` расширить.

```ts
interface EmitParams<TType extends string = string, TPayload = unknown> {
  eventType: TType;
  payload: TPayload;
  source: string;
  context: Omit<EventContext, "correlationId"> & { correlationId?: string };
  subject: { type: string; id: string };
  actor?: { type: "user" | "service" | "system"; id?: string };
  emitKey: string;

  dispatch?: {
    dispatchAfter?: string;
    batchKey?: string;
    aggregateKey?: string;
    trigger?: "none" | "auto";
  };
}
```

Правила:

- default `trigger = "auto"`;
- `batchKey` задается producer-ом, если producer знает бизнес-группу;
- `aggregateKey` задается producer-ом или вычисляется как `${subject.type}:${subject.id}`;
- `dispatchAfter` вычисляется по event policy, если не передан явно.

Для bulk update:

```ts
dispatch: {
  batchKey: `bulk:${jobId}`,
  aggregateKey: `product:${productId}`,
  trigger: "none"
}
```

После завершения bulk workflow он сам запускает dispatch для `batchKey`.

## Batch policy registry

Добавить policy registry в `events`.

```ts
interface EventDispatchPolicy {
  eventType: string;
  batchWindowMs: number;
  maxBatchSize: number;
  groupBy: Array<"tenantId" | "eventType" | "batchKey" | "source">;
  coalesceBy?: "aggregateKey" | "subject" | "none";
  retry: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
  handlerTimeoutMs: number;
}
```

Политики первой итерации:

```ts
productUpdated:
  batchWindowMs: 5000
  maxBatchSize: 500
  groupBy: ["tenantId", "eventType", "batchKey"]
  coalesceBy: "aggregateKey"

fileHardDeleted:
  batchWindowMs: 0
  maxBatchSize: 100
  groupBy: ["tenantId", "eventType"]
  coalesceBy: "none"

default:
  batchWindowMs: 1000
  maxBatchSize: 100
  groupBy: ["tenantId", "eventType"]
  coalesceBy: "none"
```

Policy registry должен жить в коде, не в БД, пока нет runtime-конфигурации событий.

## Dispatcher workflows

### events.emit

Новый `events.emit`:

```text
events.emit
  -> build deterministic eventId
  -> resolve policy
  -> persist event with status pending
  -> if trigger=auto:
       start events.dispatchDueEvents for computed dispatch bucket
  -> return eventId/status
```

Важно:

- не вызывать handlers в `events.emit`;
- insert должен быть idempotent через deterministic `eventId`;
- при replay workflow повторный insert не должен менять уже dispatching/dispatched событие;
- при повторном emit для того же deterministic `eventId` return должен быть стабильным.

### events.dispatchDueEvents

Input:

```ts
interface DispatchDueEventsInput {
  tenantId?: string;
  eventType?: string;
  batchKey?: string;
  limit?: number;
  now?: string;
}
```

Flow:

```text
events.dispatchDueEvents
  -> claim due events
  -> group claimed events by policy
  -> for each group:
       dispatch group to batch handlers
  -> mark events with final status
```

Claim query должна использовать row locking:

```sql
SELECT event_id
FROM domain_events
WHERE status IN ('pending', 'retry_scheduled')
  AND dispatch_after <= now()
  AND (locked_until IS NULL OR locked_until < now())
  AND optional filters...
ORDER BY dispatch_after ASC, created_at ASC
LIMIT :limit
FOR UPDATE SKIP LOCKED
```

Затем:

```text
status = dispatching
locked_by = dispatcher workflow id
locked_until = now + lock ttl
attempts = attempts + 1
dispatch_started_at = now
```

Lock TTL нужен, чтобы repair scheduler мог подобрать события после падения процесса.

### events.dispatchBatch

Для явных batch boundaries, например bulk update.

Input:

```ts
interface DispatchBatchInput {
  tenantId: string;
  eventType?: string;
  batchKey: string;
  limit?: number;
}
```

Flow такой же, но фильтр по `batchKey`. Bulk workflow вызывает этот workflow после `stepFinalizeJob(jobId)`.

### Repair scheduler

Добавить scheduler для repair-задач:

```text
every minute:
  broker.runWorkflow("events.dispatchDueEvents", { limit: 1000 }, deterministic id)

every 5 minutes:
  release stale dispatching locks:
    status=dispatching and locked_until < now()
    -> status=retry_scheduled
```

Scheduler не должен быть основным механизмом latency. Он нужен как страховка.

## Handler contract

Все event handlers в новой системе должны принимать batch.

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

- добавить `BatchEventHandlers` base class;
- регистрировать action `${serviceName}.${eventType}.batch`;
- dispatcher вызывает только batch action.

## Coalescing

Для событий типа `productUpdated` при bulk update часто нужно не отправлять несколько изменений одного продукта.

Правило:

```text
group events by aggregateKey
keep latest event by timestamp/createdAt
merge payload only if merge strategy exists
```

Первая итерация:

- не пытаться deep-merge payload;
- для `productUpdated` выбирать последнее событие по `product:<id>`;
- если нужен полный итоговый snapshot, consumer должен перечитать product или отдельный aggregator должен собрать snapshot.

Расширение:

```ts
interface Coalescer {
  eventType: string;
  coalesce(events: DomainEvent[]): DomainEvent[];
}
```

## Bulk update integration

Новый flow:

```text
catalog.productBulkEdit
  -> create job
  -> for each product group:
       catalog.productUpdate
          -> events.emit(productUpdated, batchKey=bulkJobId, trigger=none)
  -> finalize job
  -> events.dispatchBatch(batchKey=bulkJobId)
```

Изменения в catalog:

- расширить `ProductUpdateWorkflowInput` event dispatch context;
- при bulk передавать `batchKey`;
- для product update вне bulk использовать default `trigger=auto`;
- после финализации bulk job вызвать `events.dispatchBatch`.

Пример:

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

Для auto trigger:

```text
events:dispatchDue:{tenantId}:{eventType}:{batchKeyOrNoBatch}:{windowBucket}
```

Для explicit bulk dispatch:

```text
events:dispatchBatch:{tenantId}:{eventType}:{batchKey}
```

Повторный start должен быть безопасным:

- при повторном start для того же workflow id DBOS вернет тот же handle;
- если события уже dispatched, claim query вернет пустой набор.

### handler idempotency

Dispatcher должен считать delivery at-least-once. Handlers обязаны быть idempotent.

Для batch handlers передавать:

```text
batchId
eventIds[]
correlationId
```

Consumer может хранить processed batch/event ids у себя, если side effect не является естественно идемпотентным.

## Retry и DLQ

Dispatcher вызывает handlers через DBOS steps.

Retry policy:

- retryable handler response -> retry DBOS step;
- timeout -> non-retryable для активной попытки, записать failure;
- non-retryable error -> не retry, сразу DLQ;
- retry attempts exhausted -> DLQ.

После failed retryable attempt:

```text
status = retry_scheduled
dispatch_after = now + backoff(attempts)
locked_by = null
locked_until = null
```

После final failure:

```text
status = failed
DLQ row per event-handler
```

После success всех handlers:

```text
status = dispatched
dispatch_completed_at = now
handler_results = [...]
lock fields cleared
```

Если часть handlers успешна, а часть failed:

- В первой итерации событие считается `failed`, успешные handler results сохраняются, failed handler уходит в DLQ.
- Следующая версия: хранить per-handler state, чтобы retry не вызывал уже успешные handlers повторно.

## Фазы внедрения

### Фаза 1. Подготовка схемы и repository API

- Добавить payload/status/dispatch fields в `domain_events`.
- Добавить repository методы:
  - `persistPendingEvent`;
  - `claimDueEvents`;
  - `markDispatched`;
  - `markRetryScheduled`;
  - `markFailed`;
  - `releaseExpiredLocks`.
- Реализовать запись в DLQ через обновленный repository API.
- Подготовить producer services к передаче `batchKey`, `aggregateKey`, `dispatch.trigger`.

Результат: schema и repository API готовы для новой модели dispatch.

### Фаза 2. Разделить emit и dispatch

- Удалить прямой вызов handlers из `events.emit`.
- Изменить `events.emit`: только persist pending event.
- Добавить `events.dispatchDueEvents`.
- Добавить auto trigger после persist.
- Dispatcher должен вызывать только batch handlers.

Результат: события доставляются только через dispatcher.

### Фаза 3. Batch handlers

- Добавить `@BatchEventHandler`.
- Добавить batch action registration.
- Реализовать event consumers через batch handler contract.
- Добавить event policies.

Результат: все event consumers работают через batch contract.

### Фаза 4. Bulk update boundary

- Расширить `ProductUpdateWorkflowInput` dispatch context.
- В bulk передавать `batchKey=bulk:${jobId}` и `trigger=none`.
- После finalize запускать `events.dispatchBatch`.
- Для product updates вне bulk использовать auto trigger.

Результат: bulk update обновляет все продукты, затем одним dispatch workflow отправляет batch.

### Фаза 5. Repair scheduler

- Добавить scheduler раз в минуту для due pending/retry events.
- Добавить stale lock recovery.
- Добавить метрики/logging.

Результат: dispatch устойчив к падениям между persist и trigger.

### Фаза 6. Cleanup и observability

- Обновить cleanup old domain events с учетом статусов.
- Не удалять `pending`, `dispatching`, `retry_scheduled`.
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

### Риск: coalescing потеряет важную delta-информацию

Не делать deep merge по умолчанию. Для `productUpdated` лучше либо отправлять последнее событие, либо отправлять summary и заставить consumers читать актуальный snapshot.

### Риск: producer workflow ждет dispatch

Bulk explicit dispatch может запускаться как отдельный workflow и не блокировать result bulk mutation. Если нужен fire-and-observe, добавить broker API для `startWorkflow` без ожидания `getResult`. В первой итерации можно дождаться dispatch, если latency приемлемая.

### Риск: scheduler запустит dispatch одновременно с explicit bulk dispatch

Claim query с `FOR UPDATE SKIP LOCKED` и lock fields должна сделать это безопасным. Повторный dispatch workflow должен просто не найти due events.

## Решения первой итерации

- Payload хранить в `domain_events.payload jsonb`.
- Поведение dispatch по умолчанию: durable-запись в outbox и auto trigger.
- Batch window для default events: 1 секунда.
- Для `productUpdated`: 5 секунд и coalesce по `aggregateKey`.
- Для bulk update: explicit `events.dispatchBatch` после finalize.
- Per-handler state не делать в первой итерации.
- Repair scheduler добавить сразу, иначе будет риск потерять dispatch trigger.

## Проверка готовности

Минимальные acceptance criteria:

- `events.emit` создает `domain_events` со статусом `pending` и payload.
- `events.dispatchDueEvents` доставляет due events batch handler-у одним вызовом.
- Если batch handler не зарегистрирован, dispatch для этого event type завершается ошибкой конфигурации.
- Повторный запуск dispatch workflow не дублирует уже `dispatched` events.
- Retryable failure переводит event в `retry_scheduled`.
- Exhausted retry пишет DLQ.
- Bulk update может создать несколько `productUpdated` с одним `batchKey`.
- После bulk finalize запускается `events.dispatchBatch` и доставляет batch.
- Scheduler подбирает pending events, если auto trigger не сработал.

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

## Открытые вопросы

- Должен ли `events.emit` возвращать только `eventId` или еще `dispatchWorkflowId` при auto trigger?
- Нужен ли публичный GraphQL/admin API для просмотра pending/failed events?
- Нужно ли хранить full payload forever или достаточно retention 90 дней?
- Какие события должны быть coalesced, а какие обязаны доставляться каждое отдельно?
- Нужна ли строгая ordering guarantee внутри одного `aggregateKey`?
- Должен ли bulk mutation ждать `dispatchBatch` или только запускать его в фоне?
