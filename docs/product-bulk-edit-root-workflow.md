# ProductBulkEdit — Root Workflow

## Архитектура: 2 уровня

```
Resolver → Root: ProductBulkEditWorkflow({ projectId, operations })
              ├── stepCreateJob → job + items + fences (в БД)
              └── Child (×N): OperationWorkflow({ itemId })
```

Root получает плоские операции от resolver'а и сам создаёт job как первый step. Это гарантирует атомарность: при retry workflow DBOS воспроизводит тот же `stepCreateJob`, job не дублируется.

---

## Таблица `inventory_bulk_edit_jobs`

Хранит один запуск bulk.

| Поле          | Тип                 | Описание                                        |
| ------------- | ------------------- | ----------------------------------------------- |
| `id`          | uuid, PK            |                                                 |
| `project_id`  | text, not null      |                                                 |
| `status`      | enum, not null      | `QUEUED\|RUNNING\|COMPLETED\|CANCELLED` |
| `created_at`  | timestamp, not null |                                                 |
| `started_at`  | timestamp           |                                                 |
| `finished_at` | timestamp           |                                                 |

> **Counters (done/succeeded/failed/...)** не хранятся в jobs — вычисляются из items на лету через `COUNT(*) ... GROUP BY status`. Единый источник правды, нет рассинхрона между job и items.

**Индексы:**

- `(project_id, created_at DESC)`
- `(project_id, status)`

---

## Item = одна операция (плоская модель)

Каждая строка `inventory_bulk_edit_items` — **одна операция**:

| Поле                   | Тип                    | Описание                                                     |
| ---------------------- | ---------------------- | ------------------------------------------------------------ |
| `id`                   | uuid, PK               |                                                              |
| `job_id`               | uuid, FK → jobs.id     |                                                              |
| `project_id`           | text, not null         |                                                              |
| `product_id`           | text, not null         |                                                              |
| `variant_id`           | text                   | nullable, для variant-операций                               |
| `op_type`              | text, not null         | `productUpdate`, `productPublish`, `variantSetSku`, ...      |
| `op_index`             | int, not null          | порядок внутри product                                       |
| `chunk_index`          | int, not null          | номер chunk'а для параллельного выполнения                   |
| `params`               | jsonb, not null        | параметры операции                                           |
| `status`               | enum, not null         | `PENDING\|RUNNING\|SUCCEEDED\|FAILED\|CANCELLED\|SUPERSEDED` |
| `fence_token`          | text, not null         |                                                              |
| `cancel_requested`     | boolean, default false |                                                              |
| `cancel_reason`        | text                   | `USER\|SUPERSEDED\|SYSTEM`                                   |
| `superseded_by_job_id` | uuid                   |                                                              |
| `errors`               | jsonb                  |                                                              |
| `started_at`           | timestamp              |                                                              |
| `finished_at`          | timestamp              |                                                              |

**Ограничения/индексы:**

- `UNIQUE (job_id, op_type, COALESCE(variant_id, product_id))` — предотвращает дубликаты операций
- `(project_id, product_id, status)`
- `(job_id, chunk_index, op_index)`

**Пример:** 2 products, у первого 3 операции, у второго 2 → 5 items, 3 chunks.

Chunking определяется при создании job (resolver/service). Правила группировки и параллельности — ответственность сервиса, не workflow.

```
id  | product_id | variant_id | op_type          | op_index | chunk_index
────┼────────────┼────────────┼──────────────────┼──────────┼────────────
i1  | prod_1     | null       | productUpdate    | 0        | 0
i2  | prod_2     | null       | productUpdate    | 0        | 0
i3  | prod_1     | null       | productPublish   | 1        | 1
i4  | prod_2     | var_5      | variantSetStock  | 1        | 1
i5  | prod_1     | var_1      | variantSetSku    | 2        | 2
```

Chunk 0: `[i1, i2]` — параллельно
Chunk 1: `[i3, i4]` — параллельно
Chunk 2: `[i5]` — одна операция

---

## Root Workflow: `ProductBulkEditWorkflow({ operations })`

**Файл:** `services/inventory/src/workflows/ProductBulkEditWorkflow.ts`

### Входные данные

```typescript
interface ProductBulkEditInput {
  projectId: string;
  operations: FlatOperation[];
}

interface FlatOperation {
  productId: string;
  variantId: string | null;
  opType: string;
  opIndex: number;
  params: unknown;
}

// Результат workflow
interface ProductBulkEditResult {
  jobId: string;
}
```

Root получает готовые плоские операции от resolver'а. Создание job происходит внутри workflow как первый step — это гарантирует атомарность и правильную работу идемпотентности DBOS.

### Поток выполнения

```
1. stepCreateJob(projectId, operations)
   └── создаёт job + items + fences + supersede → возвращает { jobId, chunks }

2. stepTryMarkJobRunning(jobId)   ← guarded: QUEUED → RUNNING
   └── 0 rows (уже CANCELLED) → stepFinalizeJob → return

3. executeChunks(jobId, chunks)
   │
   ├── stepIsJobCancelled?
   ├── chunk 0: allSettled (параллельно)
   │   ├── executeItem(item_0): tryMarkRunning → runWorkflow → tryMarkSucceeded/Failed
   │   └── executeItem(item_1): tryMarkRunning → runWorkflow → tryMarkSucceeded/Failed
   │
   ├── stepIsJobCancelled?
   ├── chunk 1: allSettled (параллельно)
   │   ├── executeItem(item_2): tryMarkRunning → runWorkflow → tryMarkSucceeded/Failed
   │   └── executeItem(item_3): tryMarkRunning → runWorkflow → tryMarkSucceeded/Failed
   │
   ├── stepIsJobCancelled?
   └── chunk 2: allSettled
       └── executeItem(item_4): tryMarkRunning → runWorkflow → tryMarkSucceeded/Failed

4. stepFinalizeJob(jobId)
   └── PENDING items → CANCELLED + job → COMPLETED|CANCELLED
```

### Код

```typescript
@Injectable()
export class ProductBulkEditWorkflow extends BrokerWorkflows<
  ProductBulkEditInput,
  ProductBulkEditResult
> {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  // ═══════════════════════════════════════════════════════════
  //  Entry point
  // ═══════════════════════════════════════════════════════════

  @Workflow("productBulkEdit")
  async run(input: ProductBulkEditInput): Promise<ProductBulkEditResult> {
    const { projectId, operations } = input;

    // 1. Создание job внутри workflow — атомарно, идемпотентно
    const { jobId, chunks } = await this.stepCreateJob(projectId, operations);

    // 2. Попытаться перевести QUEUED → RUNNING (guarded)
    const started = await this.stepTryMarkJobRunning(jobId);
    if (!started) {
      // Job уже CANCELLED — сразу финализируем
      await this.stepFinalizeJob(jobId);
      return { jobId };
    }

    // 3. Выполнение
    await this.executeChunks(jobId, chunks);
    await this.stepFinalizeJob(jobId);

    return { jobId };
  }

  // ═══════════════════════════════════════════════════════════
  //  Выполнение chunks последовательно, items внутри chunk — параллельно
  // ═══════════════════════════════════════════════════════════

  private async executeChunks(
    jobId: string,
    chunks: BulkEditItemRow[][],
  ): Promise<void> {
    for (const chunk of chunks) {
      const cancelled = await this.stepIsJobCancelled(jobId);
      if (cancelled) break;

      await Promise.allSettled(chunk.map((item) => this.executeItem(item)));
    }
  }

  private async executeItem(item: BulkEditItemRow): Promise<void> {
    // 1. Попытаться перевести PENDING → RUNNING (guarded update)
    const started = await this.stepTryMarkItemRunning(item.id);
    if (!started) return; // item уже CANCELLED/SUPERSEDED/не PENDING

    // 2. Запустить child workflow + записать результат
    try {
      const result = await this.runOperationWorkflow(item);

      // 3. Записать результат (guarded update — не перезапишет SUPERSEDED)
      if (result.errors.length > 0) {
        await this.stepTryMarkItemFailed(item.id, result.errors);
      } else {
        await this.stepTryMarkItemSucceeded(item.id);
      }
    } catch (error) {
      // Child threw — записать как FAILED, иначе item зависнет в RUNNING
      await this.stepTryMarkItemFailed(item.id, [
        { message: error instanceof Error ? error.message : "Unknown error", code: "WORKFLOW_ERROR" },
      ]);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Запуск child operation workflow
  // ═══════════════════════════════════════════════════════════

  private async runOperationWorkflow(
    item: BulkEditItemRow,
  ): Promise<OperationResult> {
    const result = await this.broker.runWorkflow(
      "inventory.bulkEditOperation",
      { itemId: item.id },
      {
        source: "workflow",
        workflowId: DBOS.workflowID,
        stepId: item.opType,
        callId: item.id,
      },
    );

    return result as OperationResult;
  }

  // ═══════════════════════════════════════════════════════════
  //  Steps
  // ═══════════════════════════════════════════════════════════

  @WorkflowStep()
  private async stepCreateJob(
    projectId: string,
    operations: FlatOperation[],
  ): Promise<{ jobId: string; chunks: BulkEditItemRow[][] }> {
    // Создание job + items + fences + supersede в одной транзакции
    const result = await this.kernel
      .getService(BulkEditService)
      .createJobWithFences(projectId, operations);

    return {
      jobId: result.jobId,
      chunks: groupByChunkIndex(result.items),
    };
  }

  @WorkflowStep()
  private async stepTryMarkJobRunning(jobId: string): Promise<boolean> {
    // Guarded: QUEUED → RUNNING (не перезапишет CANCELLED)
    const rowsAffected = await this.kernel
      .getRepository(BulkEditJobRepository)
      .tryMarkRunning(jobId);

    return rowsAffected > 0;
  }

  @WorkflowStep()
  private async stepIsJobCancelled(jobId: string): Promise<boolean> {
    const job = await this.kernel
      .getRepository(BulkEditJobRepository)
      .findById(jobId);
    return job?.status === "CANCELLED";
  }

  @WorkflowStep()
  private async stepTryMarkItemRunning(itemId: string): Promise<boolean> {
    // Guarded update: PENDING → RUNNING только если не cancel_requested
    // Если fence mismatch — item уже SUPERSEDED (записано в createJobWithFences)
    // Если cancel_requested — item остаётся PENDING, будет CANCELLED в stepFinalizeJob
    const rowsAffected = await this.kernel
      .getRepository(BulkEditItemRepository)
      .tryMarkRunning(itemId);

    return rowsAffected > 0;
  }

  @WorkflowStep()
  private async stepTryMarkItemSucceeded(itemId: string): Promise<void> {
    // Guarded update: RUNNING → SUCCEEDED
    // Если item уже SUPERSEDED — 0 rows, результат не перезаписывается
    await this.kernel
      .getRepository(BulkEditItemRepository)
      .tryMarkSucceeded(itemId);
  }

  @WorkflowStep()
  private async stepTryMarkItemFailed(
    itemId: string,
    errors: BulkEditError[],
  ): Promise<void> {
    // Guarded update: RUNNING → FAILED
    // Если item уже SUPERSEDED — 0 rows, результат не перезаписывается
    await this.kernel
      .getRepository(BulkEditItemRepository)
      .tryMarkFailed(itemId, errors);
  }

  @WorkflowStep()
  private async stepFinalizeJob(jobId: string): Promise<void> {
    await this.kernel.getService(BulkEditService).finalizeJob(jobId);
  }
}

// ─── Утилита ──

function groupByChunkIndex(items: BulkEditItemRow[]): BulkEditItemRow[][] {
  const map = new Map<number, BulkEditItemRow[]>();
  for (const item of items) {
    const list = map.get(item.chunkIndex) ?? [];
    list.push(item);
    map.set(item.chunkIndex, list);
  }
  // Сортировка по chunk_index
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, items]) => items);
}
```

---

## Идемпотентность запуска

Идемпотентность обеспечивается **broker + DBOS**, а не ручной логикой в БД. Не нужны поля `idempotency_key` / `content_hash` в таблице jobs.

### Resolver → Root workflow (`client` context)

Resolver передаёт `X-Idempotency-Key` из HTTP-заголовка как `clientKey` и готовые операции:

```typescript
// Resolver валидирует input и разворачивает в плоские операции
const operations = flattenBulkInput(input, variantToProduct);

await broker.runWorkflow(
  "inventory.productBulkEdit",
  { projectId: ctx.projectId, operations },
  {
    source: "client",
    clientKey: ctx.idempotencyKey, // X-Idempotency-Key
    tenantId: ctx.store.id,
    apiKeyId: ctx.apiKeyId,
  },
);
```

`buildIdempotencyKey` строит детерминистичный `workflowID`:

```
v1:client:{tenantId}:{apiKeyId}:{workflowName}:{clientKey}
→ sha256 → "client:3c5a9f2d..."
```

DBOS гарантирует at-most-once: повторный вызов с тем же `clientKey` + `tenantId` + `apiKeyId` → тот же `workflowID` → DBOS возвращает результат первого запуска.

**Важно:** Создание job происходит внутри workflow как `stepCreateJob`. При retry того же workflow DBOS воспроизводит результат первого `stepCreateJob` — job не дублируется.

### Root → Child workflow (`workflow` context)

Уже описан в коде root workflow:

```typescript
{
  source: "workflow",
  workflowId: DBOS.workflowID,   // ID parent'а
  stepId: item.opType,
  callId: item.id,                // уникальный per-item
}
```

```
v1:workflow:{parentWorkflowId}:{opType}:{itemId}:{workflowName}
→ sha256 → "workflow:7b2e1a4c..."
```

### Что не нужно

- ~~`idempotency_key` в таблице jobs~~ — broker делает это через `clientKey`
- ~~`content_hash` в таблице jobs~~ — DBOS дедуплицирует по `workflowID`
- ~~Ручная проверка `findByIdempotencyKey` в resolver'е~~ — DBOS `startWorkflow` с тем же ID = replay
- ~~Создание job в resolver'е~~ — job создаётся внутри workflow как `stepCreateJob`, что гарантирует атомарность при retry

---

## Child Operation Workflow (интерфейс)

Root вызывает child по `itemId`. Child сам загружает всё из БД:

```typescript
// Input
interface OperationWorkflowInput {
  itemId: string;
}

// Output
interface OperationResult {
  applied: boolean;
  errors: BulkEditError[];
}
```

Child workflow — **чистый исполнитель**, не пишет в БД:

```
1. loadItem(itemId) → { opType, params, productId, ... }
2. runScript(opType, params)
3. return OperationResult { applied, errors }
```

**Root владеет state machine:**
- `tryMarkItemRunning` — до запуска child (guarded)
- `tryMarkItemSucceeded/Failed` — после возврата child (guarded)

Child не знает про fence/cancel/статусы — это полностью ответственность Root. Guarded updates гарантируют, что результат child не перезапишет SUPERSEDED (если supersede произошёл во время выполнения).

Детали child workflow — в отдельном документе.

---

## Guarded Updates (Root State Machine)

Root владеет state machine для jobs и items. Все переходы статусов — через guarded updates.

### Job: tryMarkJobRunning

```sql
UPDATE inventory_bulk_edit_jobs
SET status = 'RUNNING',
    started_at = now()
WHERE id = $jobId
  AND status = 'QUEUED'
RETURNING 1;
```

Если **0 rows** — job уже CANCELLED (пользователь отменил сразу после создания) → skip executeChunks, сразу `stepFinalizeJob`.

---

### Item: tryMarkRunning

```sql
UPDATE inventory_bulk_edit_items
SET status = 'RUNNING',
    started_at = COALESCE(started_at, now())
WHERE id = $itemId
  AND status = 'PENDING'
  AND cancel_requested = false
RETURNING 1;
```

Если **0 rows** — item уже:
- SUPERSEDED (fence mismatch, записано в `createJobWithFences`)
- cancel_requested=true → останется PENDING → CANCELLED в `stepFinalizeJob`
- Уже не PENDING (редкий edge case)

→ **Child не запускается.**

### Item: tryMarkSucceeded

```sql
UPDATE inventory_bulk_edit_items
SET status = 'SUCCEEDED',
    finished_at = now(),
    errors = NULL
WHERE id = $itemId
  AND status = 'RUNNING'
RETURNING 1;
```

Если **0 rows** — item уже SUPERSEDED (supersede пришёл пока child выполнялся) → **результат child игнорируется**, SUPERSEDED не перезаписывается.

### Item: tryMarkFailed

```sql
UPDATE inventory_bulk_edit_items
SET status = 'FAILED',
    finished_at = now(),
    errors = $errors
WHERE id = $itemId
  AND status = 'RUNNING'
RETURNING 1;
```

Аналогично — если 0 rows, результат игнорируется.

### Почему это безопасно

1. **Supersede во время выполнения:** supersede ставит `status='SUPERSEDED'` → `tryMarkSucceeded/Failed` с `WHERE status='RUNNING'` → 0 rows → ничего не перезаписывается
2. **Cancel во время выполнения:** cancel ставит `cancel_requested=true` на PENDING items → если item уже RUNNING, cancel не влияет, child доработает
3. **Нет post-check abort:** guarded финализация автоматически решает гонки

---

## Fence и Supersede

### Таблица `inventory_product_bulk_fence`

Глобальное «последнее намерение» на product — для защиты от гонок между job'ами.

| Поле          | Тип                 | Описание                  |
| ------------- | ------------------- | ------------------------- |
| `project_id`  | text, not null      |                           |
| `product_id`  | text, not null      |                           |
| `fence_token` | text, not null      |                           |
| `job_id`      | uuid, not null      | кто владеет текущим fence |
| `updated_at`  | timestamp, not null |                           |

**PK:** `(project_id, product_id)`

### Как работает

При создании job (`createJobWithFences`, одна транзакция):

1. Для каждого уникального `product_id` в items (отсортированных по `product_id` для предотвращения дедлоков):
   - Сгенерить `newFenceToken = uuid()`
   - **UPSERT** `inventory_product_bulk_fence`:
     `fence_token = newFenceToken, job_id = newJobId, updated_at = now()`
   - **Supersede** все активные items старых job'ов для этого `product_id`:
     ```sql
     UPDATE inventory_bulk_edit_items
     SET status = 'SUPERSEDED',
         cancel_requested = true,
         cancel_reason = 'SUPERSEDED',
         superseded_by_job_id = $newJobId,
         finished_at = COALESCE(finished_at, now())
     WHERE project_id = $projectId
       AND product_id = $productId
       AND status IN ('PENDING', 'RUNNING')
       AND job_id != $newJobId
     ```

     > **Важно:** `finished_at` устанавливается при supersede для корректного подсчёта прогресса (done count) и отображения в UI.
2. INSERT новые items с `fence_token = newFenceToken`

Все items одного product в одном job получают **один и тот же** `fence_token`.

### Пример

```
Job A: items для prod_1 (fence_token = "aaa")
  i1: productUpdate   — RUNNING
  i2: productPublish   — PENDING
  i3: variantSetSku    — PENDING

Job B создаётся с prod_1 (fence_token = "bbb"):
  1. UPSERT fence: prod_1 → fence_token="bbb", job_id=B
  2. Supersede: i1 → SUPERSEDED, i2 → SUPERSEDED, i3 → SUPERSEDED
  3. INSERT новые items с fence_token="bbb"

Job A child для i1 (уже RUNNING):
  → checkAbort: fence_token "bbb" != "aaa" → abort, return { abortReason: SUPERSEDED }
```

---

## Abort / Cancel

### Job-level cancel

Root проверяет `stepIsJobCancelled(jobId)` **перед каждым chunk**. Если job отменён — break, оставшиеся items остаются PENDING → `stepFinalizeJob` → CANCELLED.

### Per-item abort (guarded updates)

Root использует **guarded updates** вместо отдельной проверки abort:

```
executeItem(item):
  1. tryMarkItemRunning(itemId)    ← guarded UPDATE ... WHERE status='PENDING' AND cancel_requested=false
     └── 0 rows → return (item не запускается)
  2. try:
       runOperationWorkflow(item) → child выполняет скрипт, возвращает результат
       tryMarkItemSucceeded/Failed ← guarded UPDATE ... WHERE status='RUNNING'
     catch:
       tryMarkItemFailed(WORKFLOW_ERROR) ← иначе item зависнет в RUNNING
```

**Как это работает:**

- **Fence mismatch:** item уже SUPERSEDED в БД (записано атомарно в `createJobWithFences`) → `tryMarkItemRunning` вернёт 0 rows
- **cancel_requested:** `WHERE cancel_requested=false` не пройдёт → item останется PENDING → `stepFinalizeJob` поставит CANCELLED
- **Supersede во время выполнения:** child доработает, но `tryMarkItemSucceeded/Failed` использует `WHERE status='RUNNING'` → 0 rows → результат не перезапишет SUPERSEDED

> **Нет post-check abort:** guarded финализация автоматически защищает от гонок. Если supersede произошёл пока child выполнялся — результат child просто игнорируется.

### Cancel мутации (реализация)

Мутации cancel — **только сигнал**. Не меняют статус items, только ставят флаги. Финальный статус записывает `stepFinalizeJob`.

**`productBulkUpdateCancel(jobId)`** — отмена всего job:

```sql
-- 1. Job → CANCELLED
UPDATE inventory_bulk_edit_jobs
SET status = 'CANCELLED'
WHERE id = $jobId AND status IN ('QUEUED', 'RUNNING');

-- 2. Сигнал всем PENDING items
UPDATE inventory_bulk_edit_items
SET cancel_requested = true, cancel_reason = 'USER'
WHERE job_id = $jobId AND status = 'PENDING';
```

**`productBulkUpdateCancelItems(jobId, productIds)`** — отмена конкретных продуктов:

```sql
UPDATE inventory_bulk_edit_items
SET cancel_requested = true, cancel_reason = 'USER'
WHERE job_id = $jobId
  AND product_id = ANY($productIds)
  AND status = 'PENDING';
```

> Мутации не трогают RUNNING items — child доработает и сам запишет результат. Нет гонки между cancel и child.

---

## Concurrency модель

```
chunk 0 ─── [item_0, item_1, item_2] ─── allSettled (параллельно)
               │
            [stepIsJobCancelled?]
               │
chunk 1 ─── [item_3, item_4] ─────────── allSettled (параллельно)
               │
            [stepIsJobCancelled?]
               │
chunk 2 ─── [item_5] ─────────────────── allSettled
```

- **Между chunks:** последовательно
- **Внутри chunk:** параллельно (`Promise.allSettled`)
- **Cancel check:** между chunks

---

## Error handling

| Сценарий                       | Поведение                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------- |
| tryMarkJobRunning → 0 rows     | Job уже CANCELLED → skip executeChunks, сразу stepFinalizeJob                    |
| tryMarkItemRunning → 0 rows    | Item пропускается (SUPERSEDED в БД или cancel_requested), child не запускается   |
| Child возвращает errors        | Root записывает `tryMarkItemFailed`, продолжает с другими items                   |
| Child throws                   | Root ловит в catch, записывает `tryMarkItemFailed` с WORKFLOW_ERROR, продолжает  |
| Supersede во время выполнения  | Child доработает, `tryMarkItemSucceeded/Failed` → 0 rows (не перезапишет SUPERSEDED) |
| Job cancelled между chunks     | Root break перед следующим chunk, PENDING → CANCELLED в stepFinalizeJob           |

---

## Финализация

### Per-job (единственная точка финализации)

```typescript
stepFinalizeJob(jobId):
  1. PENDING items с cancel_requested=true → CANCELLED, reason=USER
  2. Остальные PENDING items → CANCELLED, reason = USER (если job.status=CANCELLED) или SYSTEM
  3. Job status → CANCELLED (если был CANCELLED) или COMPLETED
  4. finishedAt = now()
```

```sql
-- 1. PENDING + cancel_requested → CANCELLED, reason=USER
UPDATE inventory_bulk_edit_items
SET status = 'CANCELLED', cancel_reason = 'USER', finished_at = now()
WHERE job_id = $jobId AND status = 'PENDING' AND cancel_requested = true;

-- 2. Остальные PENDING (пропущены из-за job-level cancel или edge case)
UPDATE inventory_bulk_edit_items
SET status = 'CANCELLED',
    cancel_reason = CASE
      WHEN (SELECT status FROM inventory_bulk_edit_jobs WHERE id = $jobId) = 'CANCELLED'
      THEN 'USER' ELSE 'SYSTEM'
    END,
    finished_at = now()
WHERE job_id = $jobId AND status = 'PENDING';

-- 3. Job status
UPDATE inventory_bulk_edit_jobs
SET status = CASE
      WHEN status = 'CANCELLED' THEN 'CANCELLED'
      ELSE 'COMPLETED'
    END,
    finished_at = now()
WHERE id = $jobId;
```

SUPERSEDED items уже помечены в БД (атомарно в `createJobWithFences`). Успешные/неуспешные — child'ом. Оставшиеся PENDING → CANCELLED — `stepFinalizeJob`.

---

## Валидация батча (до создания job)

Каждый input item — одна операция: `{ productId, variantId?, opType, params }`.

| Правило                                                                                                                                                                                        | Ошибка                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Общее количество операций `>= 1` и `<= 500`                                                                                                                                                    | `BATCH_LIMIT_EXCEEDED` |
| `opType` — допустимое значение (`productUpdate`, `productStatusUpdate`, `variantSetSku`, `variantSetPricing`, `variantSetCost`, `variantSetStock`, `variantSetDimensions`, `variantSetWeight`) | `INVALID_OP_TYPE`      |
| `params` валидны для данного `opType` (Zod-схема per opType)                                                                                                                                   | `INVALID_PARAMS`       |

> **Дубликаты операций** `(product_id, op_type, variant_id)` предотвращаются UNIQUE-индексом в БД, а не валидацией на уровне resolver'а.

---

## GraphQL API

**Файл:** `services/inventory/src/api/graphql-admin/schema/bulk.graphql` (CREATE)

### Принцип: плоские массивы, прямое переиспользование типов

Каждый тип операции — **отдельный массив** на верхнем уровне input. Фронтенд не группирует по продукту — просто пушит операции в соответствующий массив. Каждый элемент сам несёт `productId` (или `variantId`, из которого resolver резолвит `productId`).

**8 из 9 типов операций — прямое переиспользование** существующих input-типов без изменений. Единственный новый input — `ProductStatusUpdateInput` (2 поля).

### Карта переиспользования типов

| Bulk-поле              | Переиспользуемый тип      | Как определяется `productId`             | Источник          |
| ---------------------- | ------------------------- | ---------------------------------------- | ----------------- |
| `productUpdate`        | **`ProductUpdateInput`**  | `input.id` = productId                   | `product.graphql` |
| `productStatusUpdate`  | `ProductStatusUpdateInput`| `input.productId` (новый тип, 2 поля)    | `bulk.graphql`    |
| `variantSetSku`        | **`VariantSetSkuInput`**  | resolver резолвит из `variantId`          | `variant.graphql` |
| `variantSetPricing`    | **`VariantSetPricingInput`** | resolver резолвит из `variantId`       | `pricing.graphql` |
| `variantSetCost`       | **`VariantSetCostInput`** | resolver резолвит из `variantId`          | `pricing.graphql` |
| `variantSetStock`      | **`VariantSetStockInput`**| resolver резолвит из `variantId`          | `stock.graphql`   |
| `variantSetDimensions` | **`VariantSetDimensionsInput`** | resolver резолвит из `variantId`   | `variant.graphql` |
| `variantSetWeight`     | **`VariantSetWeightInput`** | resolver резолвит из `variantId`        | `variant.graphql` |

> **`productId` для variant-операций:** resolver собирает все уникальные `variantId` из input, batch-загружает их `productId` одним запросом, и проставляет в flat items. Фронтенд не передаёт `productId` для variant-операций — он уже есть в `variantId`.

### Enums

```graphql
enum BulkUpdateJobStatus {
  QUEUED
  RUNNING
  COMPLETED
  CANCELLED
}

enum BulkUpdateItemStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  CANCELLED
  SUPERSEDED
}

enum BulkUpdateOpType {
  PRODUCT_UPDATE
  PRODUCT_STATUS_UPDATE
  VARIANT_SET_SKU
  VARIANT_SET_PRICING
  VARIANT_SET_COST
  VARIANT_SET_STOCK
  VARIANT_SET_DIMENSIONS
  VARIANT_SET_WEIGHT
}

"""
Действие над статусом публикации продукта.
"""
enum ProductStatusAction {
  """
  Опубликовать продукт.
  """
  PUBLISH
  """
  Снять с публикации.
  """
  UNPUBLISH
}

enum BulkUpdateCancelReason {
  USER
  SUPERSEDED
  SYSTEM
}
```

### Input типы

```graphql
"""
Запуск асинхронного массового обновления продуктов.
Макс. 500 операций суммарно по всем массивам.
Каждый массив — отдельный тип операции. Фронтенд не группирует по продукту.
"""
input ProductBulkUpdateInput {
  # ─── Операции с продуктом ─────────────────────────────────
  # Каждый элемент содержит productId (через id / productId)

  """Обновить поля продуктов. Прямое переиспользование ProductUpdateInput (id = productId)."""
  productUpdate: [ProductUpdateInput!]

  """Изменить статус публикации продуктов."""
  productStatusUpdate: [ProductStatusUpdateInput!]

  # ─── Операции с вариантами ────────────────────────────────
  # Каждый элемент содержит variantId, resolver резолвит productId

  """Установить SKU. Прямое переиспользование VariantSetSkuInput."""
  variantSetSku: [VariantSetSkuInput!]

  """Установить цену. Прямое переиспользование VariantSetPricingInput."""
  variantSetPricing: [VariantSetPricingInput!]

  """Установить себестоимость. Прямое переиспользование VariantSetCostInput."""
  variantSetCost: [VariantSetCostInput!]

  """Установить остатки. Прямое переиспользование VariantSetStockInput."""
  variantSetStock: [VariantSetStockInput!]

  """Установить габариты. Прямое переиспользование VariantSetDimensionsInput."""
  variantSetDimensions: [VariantSetDimensionsInput!]

  """Установить вес. Прямое переиспользование VariantSetWeightInput."""
  variantSetWeight: [VariantSetWeightInput!]
}

"""
Изменение статуса публикации продукта.
Единственный новый input-тип для bulk (2 поля).
"""
input ProductStatusUpdateInput {
  """ID продукта."""
  productId: ID!

  """Действие: PUBLISH или UNPUBLISH."""
  action: ProductStatusAction!
}
```

**Почему прямое переиспользование `ProductUpdateInput`:**

`ProductUpdateInput` содержит `id: ID!` — это и есть `productId`. В плоской модели каждый элемент массива — самостоятельная операция, `id` внутри типа однозначно идентифицирует продукт. Никаких обёрток не нужно — тип переиспользуется as-is.

### Мутации (добавить в `InventoryMutation` в `base.graphql`)

```graphql
type InventoryMutation {
  # ... existing mutations ...

  # ─── Bulk Update ──────────────────────────────────────────

  """
  Запустить асинхронное массовое обновление продуктов.
  Возвращает job для отслеживания прогресса.
  Требует заголовок X-Idempotency-Key.
  """
  productBulkUpdate(input: ProductBulkUpdateInput!): ProductBulkUpdatePayload!

  """
  Отменить весь bulk job.
  """
  productBulkUpdateCancel(jobId: ID!): ProductBulkUpdatePayload!

  """
  Отменить конкретные продукты в рамках job.
  """
  productBulkUpdateCancelItems(
    jobId: ID!
    productIds: [ID!]!
  ): ProductBulkUpdatePayload!
}
```

### Payload типы

```graphql
"""
Результат запуска/отмены bulk update.
"""
type ProductBulkUpdatePayload {
  """
  Созданный или обновлённый job (null при ошибке валидации).
  """
  job: ProductBulkUpdateJob

  """
  Ошибки валидации/запуска.
  """
  userErrors: [BulkUpdateUserError!]!
}
```

### Job и Progress типы

```graphql
"""
Bulk update job с прогрессом.
"""
type ProductBulkUpdateJob {
  """
  ID job.
  """
  id: ID!

  """
  Текущий статус.
  """
  status: BulkUpdateJobStatus!

  """
  Когда создан.
  """
  createdAt: DateTime!

  """
  Когда начал выполняться.
  """
  startedAt: DateTime

  """
  Когда завершён.
  """
  finishedAt: DateTime

  """
  Общее количество продуктов в батче.
  """
  totalProducts: Int!

  """
  Прогресс — вычисляется из items (COUNT GROUP BY status).
  Не хранится в jobs, единый источник правды.
  """
  progress: BulkUpdateJobProgress!

  """
  Items (плоские, по одной операции) с пагинацией и фильтрацией.
  """
  items(
    first: Int
    after: String
    """
    Фильтр по статусу (например, только FAILED).
    """
    statusFilter: [BulkUpdateItemStatus!]
  ): BulkUpdateItemConnection!
}

"""
Прогресс job. Все счётчики вычисляются из items, не хранятся.
"""
type BulkUpdateJobProgress {
  """
  Всего операций.
  """
  total: Int!

  """
  Завершённых (succeeded + failed + cancelled + superseded).
  """
  done: Int!

  """
  Успешно применённых.
  """
  succeeded: Int!

  """
  Провалившихся.
  """
  failed: Int!

  """
  Отменённых.
  """
  cancelled: Int!

  """
  Перебитых другим job (fence).
  """
  superseded: Int!

  """
  Выполняющихся прямо сейчас.
  """
  running: Int!

  """
  Ожидающих выполнения.
  """
  pending: Int!
}
```

### Item типы

```graphql
"""
Одна операция внутри bulk update job.
Соответствует строке в inventory_bulk_edit_items.
"""
type BulkUpdateItem {
  """
  ID item.
  """
  id: ID!

  """
  Продукт, к которому относится операция.
  """
  productId: ID!

  """
  Вариант (null для product-level операций: update, statusUpdate).
  """
  variantId: ID

  """
  Тип операции.
  """
  opType: BulkUpdateOpType!

  """
  Порядковый номер внутри product (для упорядоченного выполнения).
  """
  opIndex: Int!

  """
  Текущий статус.
  """
  status: BulkUpdateItemStatus!

  """
  Когда начал выполняться.
  """
  startedAt: DateTime

  """
  Когда завершён.
  """
  finishedAt: DateTime

  """
  Ошибки выполнения.
  """
  errors: [BulkUpdateUserError!]!

  """
  Причина отмены (только при CANCELLED/SUPERSEDED).
  """
  cancelReason: BulkUpdateCancelReason

  """
  Job, который перебил этот item (только при SUPERSEDED).
  """
  supersededByJobId: ID
}

type BulkUpdateItemConnection {
  edges: [BulkUpdateItemEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type BulkUpdateItemEdge {
  cursor: String!
  node: BulkUpdateItem!
}
```

### Error тип

```graphql
"""
Ошибка bulk update операции.
Расширяет стандартный UserError контекстом операции.
"""
type BulkUpdateUserError implements UserError {
  """
  Сообщение об ошибке.
  """
  message: String!

  """
  Путь к полю input, вызвавшему ошибку.
  """
  field: [String!]

  """
  Код ошибки для программной обработки.
  """
  code: String

  """
  Продукт, к которому относится ошибка.
  """
  productId: ID

  """
  Вариант, к которому относится ошибка.
  """
  variantId: ID

  """
  Операция, при которой возникла ошибка.
  """
  operation: String
}
```

### Пример использования

#### Запуск bulk update

```graphql
mutation ProductBulkUpdate($input: ProductBulkUpdateInput!) {
  inventoryMutation {
    productBulkUpdate(input: $input) {
      job {
        id
        status
        totalProducts
      }
      userErrors {
        message
        code
        field
        productId
      }
    }
  }
}
```

```json
{
  "input": {
    "productUpdate": [
      { "id": "product_1", "title": "Updated Title", "handle": "updated-title" }
    ],
    "productStatusUpdate": [
      { "productId": "product_1", "action": "PUBLISH" },
      { "productId": "product_2", "action": "UNPUBLISH" }
    ],
    "variantSetSku": [
      { "variantId": "variant_1", "sku": "SKU-001" },
      { "variantId": "variant_2", "sku": "SKU-002" }
    ],
    "variantSetPricing": [
      { "variantId": "variant_1", "currency": "USD", "amountMinor": "1999" }
    ],
    "variantSetStock": [
      { "variantId": "variant_5", "warehouseId": "warehouse_1", "quantity": 50 }
    ]
  }
}
```

> **Фронтенд** просто пушит операции в соответствующий массив — без группировки по продукту. Каждый элемент — самостоятельная операция с `id`/`productId`/`variantId` внутри.

Resolver развернёт в **7 плоских items** (variant_1, variant_2 → product_1; variant_5 → product_2 — резолвится из БД):

| #   | product_id | variant_id | op_type             | params                    | op_index | chunk_index |
| --- | ---------- | ---------- | ------------------- | ------------------------- | -------- | ----------- |
| 1   | product_1  | null       | productUpdate       | `{title, handle}`         | 0        | 0           |
| 2   | product_2  | null       | productStatusUpdate | `{action: UNPUBLISH}`     | 0        | 0           |
| 3   | product_1  | null       | productStatusUpdate | `{action: PUBLISH}`       | 1        | 1           |
| 4   | product_2  | variant_5  | variantSetStock     | `{warehouseId, quantity}` | 1        | 1           |
| 5   | product_1  | variant_1  | variantSetSku       | `{sku: "SKU-001"}`        | 2        | 2           |
| 6   | product_1  | variant_2  | variantSetSku       | `{sku: "SKU-002"}`        | 2        | 2           |
| 7   | product_1  | variant_1  | variantSetPricing   | `{currency, amountMinor}` | 3        | 3           |

> **Chunking:** операции одного `op_index` разных продуктов попадают в один chunk (параллельно). Операции разных `op_index` одного продукта — в разные chunks (последовательно, порядок гарантирован). `op_index` определяется типом операции: `productUpdate=0`, `productStatusUpdate=1`, `variantSetSku=2`, `variantSetPricing=3`, и т.д.

#### Отмена job

```graphql
mutation CancelBulkUpdate($jobId: ID!) {
  inventoryMutation {
    productBulkUpdateCancel(jobId: $jobId) {
      job {
        id
        status
        progress {
          done
          cancelled
        }
      }
      userErrors {
        message
        code
      }
    }
  }
}
```

### Resolver: input → workflow

Resolver при вызове `productBulkUpdate`:

1. **Валидация** — Zod-схема (см. «Валидация батча»)
2. **Resolve `productId`** для variant-операций — batch-загрузка из БД:

```typescript
// Собрать все уникальные variantId из всех variant-массивов
const variantIds = collectUniqueVariantIds(input);

// Один запрос: SELECT variant_id, product_id FROM variants WHERE variant_id IN (...)
const variantToProduct = await batchResolveProductIds(variantIds);
```

3. **Развёртка** — плоские массивы → плоские operations (op_index фиксирован по типу операции):

```typescript
// op_index определяет порядок выполнения внутри одного product
// и, следовательно, chunk_index для параллелизации
const OP_INDEX: Record<string, number> = {
  productUpdate:       0,
  productStatusUpdate: 1,
  variantSetSku:       2,
  variantSetPricing:   3,
  variantSetCost:      4,
  variantSetStock:     5,
  variantSetDimensions: 6,
  variantSetWeight:    7,
};

function flattenBulkInput(
  input: ProductBulkUpdateInput,
  variantToProduct: Map<string, string>,
): FlatOperation[] {
  const ops: FlatOperation[] = [];

  // Product-level operations
  for (const pu of input.productUpdate ?? []) {
    ops.push({
      productId: pu.id,       // ProductUpdateInput.id = productId
      variantId: null,
      opType: "productUpdate",
      opIndex: OP_INDEX.productUpdate,
      params: pu,
    });
  }

  for (const ps of input.productStatusUpdate ?? []) {
    ops.push({
      productId: ps.productId,
      variantId: null,
      opType: "productStatusUpdate",
      opIndex: OP_INDEX.productStatusUpdate,
      params: { action: ps.action },
    });
  }

  // Variant-level operations (productId резолвится из variantToProduct)
  const variantArrays = [
    { key: "variantSetSku",        items: input.variantSetSku },
    { key: "variantSetPricing",    items: input.variantSetPricing },
    { key: "variantSetCost",       items: input.variantSetCost },
    { key: "variantSetStock",      items: input.variantSetStock },
    { key: "variantSetDimensions", items: input.variantSetDimensions },
    { key: "variantSetWeight",     items: input.variantSetWeight },
  ];

  for (const { key, items } of variantArrays) {
    for (const vi of items ?? []) {
      ops.push({
        productId: variantToProduct.get(vi.variantId)!,
        variantId: vi.variantId,
        opType: key,
        opIndex: OP_INDEX[key],
        params: vi,
      });
    }
  }

  return ops;
}
```

4. **broker.runWorkflow** — передаём operations, workflow сам создаёт job:

```typescript
const result = await broker.runWorkflow(
  "inventory.productBulkEdit",
  { projectId: ctx.projectId, operations },
  {
    source: "client",
    clientKey: ctx.idempotencyKey,
    tenantId: ctx.store.id,
    apiKeyId: ctx.apiKeyId,
  },
);

return { jobId: result.jobId };
```

> **Chunking** происходит внутри workflow в `stepCreateJob` — группировка по `op_index`: операции с одинаковым `opIndex` разных продуктов параллельны, разные `opIndex` — последовательны.

### Валидация (расширение секции «Валидация батча»)

```typescript
const productBulkUpdateSchema = z
  .object({
    // Product-level — переиспользуют существующие Zod-схемы
    productUpdate: z.array(productUpdateSchema).optional(),
    productStatusUpdate: z.array(productStatusUpdateSchema).optional(),

    // Variant-level — переиспользуют существующие Zod-схемы
    variantSetSku: z.array(variantSetSkuSchema).optional(),
    variantSetPricing: z.array(variantSetPricingSchema).optional(),
    variantSetCost: z.array(variantSetCostSchema).optional(),
    variantSetStock: z.array(variantSetStockSchema).optional(),
    variantSetDimensions: z.array(variantSetDimensionsSchema).optional(),
    variantSetWeight: z.array(variantSetWeightSchema).optional(),
  })
  .refine((input) => countTotalOps(input) >= 1, {
    message: "At least one operation required",
    params: { code: "EMPTY_INPUT" },
  })
  .refine((input) => countTotalOps(input) <= 500, {
    message: "Total operations exceed limit of 500",
    params: { code: "BATCH_LIMIT_EXCEEDED" },
  });

// Единственный новый Zod-тип
const productStatusUpdateSchema = z.object({
  productId: z.string().min(1),
  action: z.enum(["PUBLISH", "UNPUBLISH"]),
});
```

> `productUpdateSchema`, `variantSetSkuSchema`, `variantSetPricingSchema` и т.д. — **переиспользуют** существующие Zod-схемы из отдельных мутаций без изменений.

---

## Дерево операций (полное)

```
ProductBulkEditWorkflow({ projectId, operations })
├── stepCreateJob(projectId, operations) → { jobId, chunks: BulkEditItemRow[][] }
│   └── createJobWithFences: job + items + fences + supersede (одна транзакция)
├── stepTryMarkJobRunning(jobId) ← guarded: QUEUED → RUNNING
│   └── 0 rows (CANCELLED) → stepFinalizeJob → return { jobId }
├── executeChunks ────────────────────────────────────────────────
│   │
│   ├── stepIsJobCancelled(jobId)
│   ├── chunk 0: allSettled ──────────────────────────────────
│   │   ├── executeItem(item_0)
│   │   │   ├── stepTryMarkItemRunning → 0 rows? return
│   │   │   ├── runWorkflow({ itemId }) → OperationResult
│   │   │   └── stepTryMarkItemSucceeded/Failed (guarded)
│   │   └── executeItem(item_1)
│   │       ├── stepTryMarkItemRunning → ok
│   │       ├── runWorkflow({ itemId }) → OperationResult
│   │       └── stepTryMarkItemSucceeded/Failed (guarded)
│   │
│   ├── stepIsJobCancelled(jobId)
│   ├── chunk 1: allSettled ──────────────────────────────────
│   │   ├── executeItem(item_2) ...
│   │   └── executeItem(item_3) ...
│   │
│   ├── stepIsJobCancelled(jobId)
│   └── chunk 2: allSettled ──────────────────────────────────
│       └── executeItem(item_4) ...
│
└── stepFinalizeJob(jobId)
    └── PENDING items → CANCELLED + job status → COMPLETED|CANCELLED
```

---

## Сводка файлов

| Файл                                                                         | Действие | Описание                                                                                |
| ---------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| **Миграции**                                                                 |          |                                                                                         |
| `services/inventory/drizzle/XXXX_bulk_edit_jobs.sql`                         | CREATE   | Таблица `inventory_bulk_edit_jobs`                                                      |
| `services/inventory/drizzle/XXXX_bulk_edit_items.sql`                        | CREATE   | Таблица `inventory_bulk_edit_items`                                                     |
| `services/inventory/drizzle/XXXX_product_bulk_fence.sql`                     | CREATE   | Таблица `inventory_product_bulk_fence`                                                  |
| **Drizzle Schema**                                                           |          |                                                                                         |
| `services/inventory/src/db/schema/bulkEditJobs.ts`                           | CREATE   | Drizzle schema для jobs                                                                 |
| `services/inventory/src/db/schema/bulkEditItems.ts`                          | CREATE   | Drizzle schema для items                                                                |
| `services/inventory/src/db/schema/productBulkFence.ts`                       | CREATE   | Drizzle schema для fence                                                                |
| **Repositories**                                                             |          |                                                                                         |
| `services/inventory/src/repositories/BulkEditJobRepository.ts`               | CREATE   | CRUD + findById + tryMarkRunning                                                        |
| `services/inventory/src/repositories/BulkEditItemRepository.ts`              | CREATE   | CRUD + supersedeActiveItems + tryMarkRunning + tryMarkSucceeded + tryMarkFailed + countByStatus |
| `services/inventory/src/repositories/BulkFenceRepository.ts`                 | CREATE   | upsert + findByProduct                                                                  |
| **Service**                                                                  |          |                                                                                         |
| `services/inventory/src/services/BulkEditService.ts`                         | CREATE   | createJobWithFences (вызывается из stepCreateJob) + finalizeJob                         |
| **GraphQL Schema**                                                           |          |                                                                                         |
| `services/inventory/src/api/graphql-admin/schema/bulk.graphql`               | CREATE   | Input/payload/job/item типы + enums                                                     |
| `services/inventory/src/api/graphql-admin/schema/base.graphql`               | EDIT     | Добавить мутации + query в InventoryMutation/InventoryQuery                             |
| **Workflows**                                                                |          |                                                                                         |
| `services/inventory/src/workflows/ProductBulkEditWorkflow.ts`                | CREATE   | Root workflow (fan-out по chunks)                                                       |
| `services/inventory/src/workflows/BulkEditOperationWorkflow.ts`              | CREATE   | Child workflow (скрипт + результат)                                                     |
| `services/inventory/src/workflows/index.ts`                                  | EDIT     | Экспорт + регистрация workflows                                                         |
| **DTOs**                                                                     |          |                                                                                         |
| `services/inventory/src/workflows/dto/BulkEditWorkflowDto.ts`                | CREATE   | `ProductBulkEditInput`, `FlatOperation`, `ProductBulkEditResult`, `{ itemId }`, `OperationResult`, `BulkEditItemRow` |
| **Resolver**                                                                 |          |                                                                                         |
| `services/inventory/src/resolvers/admin/MutationResolver.ts`                 | EDIT     | productBulkUpdate (валидация + runWorkflow), productBulkUpdateCancel, productBulkUpdateCancelItems |
| **Validation**                                                               |          |                                                                                         |
| `services/inventory/src/resolvers/admin/validation/productBulkEditSchema.ts` | CREATE   | Zod-валидация батча                                                                     |
| **E2E Tests**                                                                |          |                                                                                         |
| `e2e/tests/inventory-api/product-bulk-edit.spec.ts`                          | CREATE   | E2E тесты                                                                               |
