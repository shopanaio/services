# productBulkEdit — Backend Plan

## Обзор

Асинхронная система массового редактирования продуктов. Строго backend: схемы БД, GraphQL API, workflow, сервисные функции. Без UI, без подписок, без фронта.

**Архитектура:**
- Клиент вызывает `productBulkEditStart` → получает `jobId`
- Система создаёт job + items + fences в одной транзакции
- Parent workflow читает items из БД, запускает child workflow по каждому продукту
- Child workflow проверяет fence/cancel перед каждым шагом
- Клиент поллит статус через `productBulkEditJob` / `productBulkEditJobItems`

**Ключевые принципы:**
- Workflow работает **по jobId**, а не по "большому input" (маленький payload в DBOS, восстановление/ретраи, единый источник истины = БД)
- Fence-токены для защиты от гонок: новый job на тот же productId автоматически supersede'ит старый
- Идемпотентность через `X-Idempotency-Key` + `content_hash` на уровне job
- Переиспользование существующих скриптов (ProductUpdateScript, VariantSetSkuScript и т.д.)

---

## 1) Схема БД

### 1.1 `inventory_bulk_edit_jobs`

Хранит один запуск bulk.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid, PK | |
| `tenant_id` | text, not null | store id |
| `status` | enum, not null | `QUEUED\|RUNNING\|COMPLETED\|FAILED\|CANCELLED` |
| `created_at` | timestamp, not null | |
| `started_at` | timestamp | |
| `finished_at` | timestamp | |
| `created_by` | text, not null | user/apiKey |
| `idempotency_key` | text, not null | клиентский ключ |
| `content_hash` | text, not null | SHA-256 от canonicalize(input) |
| `parent_workflow_id` | text | nullable — записывается после `broker.runWorkflow()` возвращает workflowId |
| `total_products` | int, not null | |

> **Counters (done/succeeded/failed/...)** не хранятся в jobs — вычисляются из items на лету через `COUNT(*) ... GROUP BY status`. Это единый источник правды, нет рассинхрона между job и items.

**Ограничения/индексы:**
- `UNIQUE (tenant_id, idempotency_key)`
- индекс `(tenant_id, created_at DESC)`
- индекс `(tenant_id, status)`

### 1.2 `inventory_bulk_edit_items`

Одна запись на продукт в рамках job.

| Поле | Тип | Описание |
|------|-----|----------|
| `job_id` | uuid, FK → jobs.id | |
| `tenant_id` | text, not null | |
| `product_id` | text, not null | |
| `item_index` | int, not null | порядковый номер в батче |
| `status` | enum, not null | `PENDING\|RUNNING\|SUCCEEDED\|PARTIAL_FAILED\|FAILED\|CANCELLED\|SUPERSEDED` |
| `cancel_requested` | boolean, default false | |
| `cancel_reason` | text | `USER` \| `SUPERSEDED` \| `SYSTEM` \| null. Причина отмены — для диагностики |
| `superseded_by_job_id` | uuid | FK → jobs.id. Какой job перебил этот item (null если не superseded) |
| `fence_token` | text, not null | ключ "право писать" для этого productId |
| `started_at` | timestamp | |
| `finished_at` | timestamp | |
| `total_ops` | int, not null | количество операций для item |
| `applied_ops` | int, default 0 | |
| `current_operation` | text | опционально, для прогресса |
| `errors` | jsonb | массив BulkEditUserError |
| `payload` | jsonb, not null | нормализованные params операций (Вариант A) |
| `child_workflow_id` | text | опционально |

**Ограничения/индексы:**
- `PRIMARY KEY (job_id, product_id)`
- индекс `(tenant_id, product_id, status)`
- индекс `(tenant_id, job_id, status)`

### 1.3 `inventory_product_bulk_fence`

Глобальное "последнее намерение" на продукт — для отмены пересечений и защиты от гонок.

| Поле | Тип | Описание |
|------|-----|----------|
| `tenant_id` | text, not null | |
| `product_id` | text, not null | |
| `fence_token` | text, not null | |
| `job_id` | uuid, not null | кто владеет текущим fence |
| `updated_at` | timestamp, not null | |

**Ограничения/индексы:**
- `PRIMARY KEY (tenant_id, product_id)`
- индекс `(tenant_id, job_id)` (опционально)

---

## 2) GraphQL API

### 2.1 Мутация запуска (async)

```graphql
"""
Запуск асинхронного массового редактирования продуктов.
Возвращает jobId для отслеживания прогресса.
Клиент ОБЯЗАН передать заголовок X-Idempotency-Key.
"""
productBulkEditStart(input: ProductBulkEditInput!): ProductBulkEditJobPayload!
```

```graphql
type ProductBulkEditJobPayload {
  """ID созданного job (null при ошибке валидации)."""
  jobId: ID
  """Ошибки валидации/идемпотентности запуска."""
  userErrors: [BulkEditUserError!]!
}
```

### 2.2 Input типы (переиспользование существующих)

**Файл:** `services/inventory/src/api/graphql-admin/schema/bulk.graphql` (новый файл)

```graphql
input ProductBulkEditInput {
  """Список правок продуктов (макс. 100)."""
  items: [ProductBulkEditItemInput!]!
}

input ProductBulkEditItemInput {
  productId: ID!

  # ─── Операции с продуктом ──────────────────────────────
  productUpdate: ProductUpdateInput
  productPublish: Boolean
  productUnpublish: Boolean

  # ─── Операции с вариантами ─────────────────────────────
  variantSetSku: [VariantSetSkuInput!]
  variantSetPricing: [VariantSetPricingInput!]
  variantSetCost: [VariantSetCostInput!]
  variantSetStock: [VariantSetStockInput!]
  variantSetDimensions: [VariantSetDimensionsInput!]
  variantSetWeight: [VariantSetWeightInput!]
}
```

**Ключевой момент**: `ProductUpdateInput`, `VariantSetSkuInput` и т.д. — **те же самые типы**, что уже определены в существующих `.graphql` файлах. Нулевое дублирование.

### 2.3 Query статуса (polling)

```graphql
"""Получить статус job."""
productBulkEditJob(jobId: ID!): ProductBulkEditJob

"""Получить items job с пагинацией и фильтрацией по статусу."""
productBulkEditJobItems(
  jobId: ID!
  after: String
  first: Int
  statusFilter: [BulkEditItemStatus!]
): ProductBulkEditJobItemsConnection!
```

```graphql
type ProductBulkEditJob {
  id: ID!
  status: BulkEditJobStatus!
  createdAt: DateTime!
  startedAt: DateTime
  finishedAt: DateTime

  """Все counters вычисляются из items (COUNT GROUP BY status). Не хранятся в jobs."""
  totalProducts: Int!
  doneProducts: Int!
  succeededProducts: Int!
  partialFailedProducts: Int!
  failedProducts: Int!
  cancelledProducts: Int!
  supersededProducts: Int!
}

enum BulkEditJobStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

type ProductBulkEditJobItem {
  productId: ID!
  status: BulkEditItemStatus!
  totalOps: Int!
  appliedOps: Int!
  currentOperation: String
  errors: [BulkEditUserError!]!
  startedAt: DateTime
  finishedAt: DateTime

  """Причина отмены: USER (ручная), SUPERSEDED (перебит другим job), SYSTEM."""
  cancelReason: BulkEditCancelReason
  """ID job, который перебил этот item (только при SUPERSEDED)."""
  supersededByJobId: ID
}

enum BulkEditCancelReason {
  USER
  SUPERSEDED
  SYSTEM
}

enum BulkEditItemStatus {
  PENDING
  RUNNING
  SUCCEEDED
  PARTIAL_FAILED
  FAILED
  CANCELLED
  SUPERSEDED
}

type ProductBulkEditJobItemsConnection {
  edges: [ProductBulkEditJobItemEdge!]!
  pageInfo: PageInfo!
}

type ProductBulkEditJobItemEdge {
  cursor: String!
  node: ProductBulkEditJobItem!
}
```

### 2.4 Cancel мутации

```graphql
"""Отменить job целиком."""
productBulkEditCancel(jobId: ID!): ProductBulkEditJobPayload!

"""Отменить выбранные продукты в job."""
productBulkEditCancelItems(jobId: ID!, productIds: [ID!]!): ProductBulkEditJobPayload!
```

### 2.5 BulkEditUserError (без изменений)

```graphql
type BulkEditUserError {
  message: String!
  field: [String!]
  code: String
  productId: ID
  variantId: ID
  operation: String
}
```

---

## 3) Resolver запуска — `productBulkEditStart`

### 3.1 Идемпотентность

1. Требовать `X-Idempotency-Key`
2. Вычислить `contentHash = sha256(canonicalize(input))`
3. Проверить `inventory_bulk_edit_jobs` по `(tenant_id, idempotency_key)`:
   - Найдено и `content_hash != incoming` → ошибка `IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_INPUT`
   - Найдено и совпадает → вернуть существующий `jobId` (at-most-once)

### 3.2 Создание job + fence + отмена пересечений (1 транзакция)

В одной транзакции БД (items отсортированы по `productId` для предотвращения дедлоков):

1. `INSERT inventory_bulk_edit_jobs(...)` — `status=QUEUED`, `total_products=N`
2. Для каждого item (в порядке `productId`):
   - Сгенерить `newFenceToken = uuid()`
   - **UPSERT** в `inventory_product_bulk_fence (tenant_id, product_id)`:
     - `fence_token = newFenceToken, job_id = newJobId, updated_at = now()`
   - Пометить "старые активные items" для этого `product_id`:
     - Найти строки в `inventory_bulk_edit_items` где `tenant_id = ... AND product_id = ... AND status IN (PENDING, RUNNING)`
     - Для них: `cancel_requested = true`, `status = SUPERSEDED`, `cancel_reason = 'SUPERSEDED'`, `superseded_by_job_id = newJobId`
3. `INSERT inventory_bulk_edit_items(job_id, product_id, fence_token, status=PENDING, total_ops=calcOps(item), item_index=idx, payload=itemPayload, ...)`

После транзакции:

4. `broker.runWorkflow("inventory.productBulkEdit", { jobId })` — **без передачи всего input**

### 3.3 Валидация батча (до транзакции)

| Правило | Ошибка |
|---------|--------|
| `items.length >= 1 && items.length <= 100` | `BATCH_LIMIT_EXCEEDED` |
| `productId` уникальны в `items` | `DUPLICATE_PRODUCT_ID` |
| Запрет `productPublish: true` и `productUnpublish: true` одновременно | `CONFLICTING_PUBLISH_STATE` |
| Item содержит хотя бы одну операцию | `EMPTY_ITEM` |

```typescript
// services/inventory/src/resolvers/admin/validation/productBulkEditSchema.ts
export const productBulkEditSchema = z.object({
  items: z.array(productBulkEditItemSchema).min(1).max(100)
    .refine(
      (items) => new Set(items.map(i => i.productId)).size === items.length,
      { message: "Duplicate productId in items", params: { code: "DUPLICATE_PRODUCT_ID" } }
    ),
});
```

### 3.4 Resolver

**Файл:** `services/inventory/src/resolvers/admin/MutationResolver.ts`

```typescript
@ZodResolver(productBulkEditSchema)
async productBulkEditStart(args: { input: ProductBulkEditInput }) {
  const idempotencyKey = this.$ctx.idempotencyKey;
  if (!idempotencyKey) {
    return {
      jobId: null,
      userErrors: [{
        message: "X-Idempotency-Key header is required for bulk operations",
        code: "IDEMPOTENCY_KEY_REQUIRED",
      }],
    };
  }

  const contentHash = sha256(canonicalize(args.input));

  // Идемпотентность: проверка existing job
  const existingJob = await this.$ctx.kernel
    .getRepository(BulkEditJobRepository)
    .findByIdempotencyKey(this.$ctx.store.id, idempotencyKey);

  if (existingJob) {
    if (existingJob.contentHash !== contentHash) {
      return {
        jobId: null,
        userErrors: [{
          message: "Idempotency key already used with different input",
          code: "IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_INPUT",
        }],
      };
    }
    // Тот же ключ + тот же input → вернуть существующий jobId
    return { jobId: existingJob.id, userErrors: [] };
  }

  // Создание job + items + fences в 1 транзакции
  const jobId = await this.$ctx.kernel
    .getService(BulkEditService)
    .createJobWithFences({
      tenantId: this.$ctx.store.id,
      createdBy: this.$ctx.user?.id ?? "system",
      idempotencyKey,
      contentHash,
      items: args.input.items,
    });

  // Запуск workflow (только jobId, без payload)
  const { workflowId } = await this.$ctx.kernel
    .getServices()
    .broker.runWorkflow("inventory.productBulkEdit", { jobId });

  // Записать workflowId для трассировки (best-effort, job уже создан)
  await this.$ctx.kernel
    .getRepository(BulkEditJobRepository)
    .update(jobId, { parentWorkflowId: workflowId });

  return { jobId, userErrors: [] };
}
```

---

## 4) Workflow архитектура

### 4.1 Parent workflow: `ProductBulkEditWorkflow({ jobId })`

**Файл:** `services/inventory/src/workflows/ProductBulkEditWorkflow.ts`

Шаги:

1. `loadJobAndItems(jobId)` — берём список items из БД
2. Поставить job `status = RUNNING`, `started_at = now()`
3. `fanOut` по items с concurrency limit (10):
   - **Перед каждым chunk:** проверить `job.status` — если `CANCELLED`, прекратить запуск новых child и сразу перейти к finalize
   - `runWorkflow("inventory.productEdit", { jobId, productId })` (минимальный DTO)
   - `callId = productId` (DBOS идемпотентность)
   - `allSettled` — ошибка одного не блокирует остальные
4. `finalizeJob(jobId)` (в 1 транзакции):
   - Все оставшиеся PENDING items → `CANCELLED` (reason `USER` если job отменён, `SYSTEM` если parent упал)
   - Job status → `CANCELLED` (если отменён) или `COMPLETED` (даже если есть ошибки на item уровне)
   - Counters не пишем — вычисляются из items на query

```typescript
@Injectable()
export class ProductBulkEditWorkflow extends BrokerWorkflows<
  { jobId: string },
  void
> {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("productBulkEdit")
  async run(input: { jobId: string }): Promise<void> {
    const { jobId } = input;

    // 1. Загрузить items из БД
    const items = await this.stepLoadItems(jobId);

    // 2. Поставить job RUNNING
    await this.stepMarkJobRunning(jobId);

    // 3. Fan-out по items
    await this.stepFanOut(jobId, items);

    // 4. Финализировать job (пересчитать counters)
    await this.stepFinalizeJob(jobId);
  }

  private static readonly CONCURRENCY_LIMIT = 10;

  @WorkflowStep()
  private async stepLoadItems(jobId: string) {
    return this.kernel
      .getRepository(BulkEditItemRepository)
      .findByJobId(jobId);
  }

  @WorkflowStep()
  private async stepMarkJobRunning(jobId: string) {
    return this.kernel
      .getRepository(BulkEditJobRepository)
      .updateStatus(jobId, "RUNNING", { startedAt: new Date() });
  }

  @WorkflowStep()
  private async stepFanOut(
    jobId: string,
    items: { productId: string }[]
  ) {
    for (let i = 0; i < items.length; i += ProductBulkEditWorkflow.CONCURRENCY_LIMIT) {
      // Перед каждым chunk: проверить не отменён ли job
      const cancelled = await this.stepIsJobCancelled(jobId);
      if (cancelled) break;

      const chunk = items.slice(i, i + ProductBulkEditWorkflow.CONCURRENCY_LIMIT);

      const promises = chunk.map((item) =>
        this.broker.runWorkflow(
          "inventory.productEdit",
          { jobId, productId: item.productId },
          {
            source: "workflow",
            workflowId: DBOS.workflowID,
            stepId: "productEdit",
            callId: item.productId,
          }
        )
      );

      await Promise.allSettled(promises);
    }
  }

  @WorkflowStep()
  private async stepIsJobCancelled(jobId: string): Promise<boolean> {
    const job = await this.kernel
      .getRepository(BulkEditJobRepository)
      .findById(jobId);
    return job?.status === "CANCELLED";
  }

  @WorkflowStep()
  private async stepFinalizeJob(jobId: string) {
    return this.kernel
      .getService(BulkEditService)
      .finalizeJob(jobId);
  }
}
```

### 4.2 Child workflow: `ProductEditWorkflow({ jobId, productId })`

**Файл:** `services/inventory/src/workflows/ProductEditWorkflow.ts`

### Принцип: 1 операция = 1 атомарный workflow step

Каждая операция — **один `@WorkflowStep()`**, который внутри себя:
1. Проверяет abort (fence + cancel) — одним запросом
2. Если abort → записывает abort в БД, возвращает `{ aborted: true, ... }`
3. Вызывает скрипт
4. В той же транзакции обновляет `applied_ops` / `current_operation` / `errors` в `inventory_bulk_edit_items`
5. Возвращает `StepResult`

**Зачем:** шаг становится идемпотентным и консистентным для DBOS retry. Нет окна между "скрипт применил" и "прогресс записан" — это одна транзакция.

### Типы

```typescript
type AbortReason = {
  reason: "SUPERSEDED" | "USER" | "SYSTEM";
  supersededByJobId?: string;
};

interface StepResult {
  applied: boolean;
  errors: BulkEditError[];
  abortReason?: AbortReason;
}

interface ItemContext {
  jobId: string;
  tenantId: string;
  productId: string;
  fenceToken: string;
}
```

### Поток выполнения

1. `stepLoadItem(jobId, productId)` → `ItemContext` + payload
2. Если terminal status → return
3. `stepMarkRunning(jobId, productId)`
4. Для каждой операции в payload → `stepApply*(ctx, params)` → `StepResult`
5. Если `StepResult.abortReason` → прекратить, перейти к finalize
6. `stepEmitProductUpdated` (если `appliedOps > 0`)
7. `stepFinalizeItem` — единая точка, всегда с текущим прогрессом

**Exception safety:**
- Весь блок операций обёрнут в `try/catch`
- **Transient** → rethrow для DBOS retry (item остаётся RUNNING)
- **Non-transient** → `stepFinalizeItem` с `FAILED` + `WORKFLOW_EXCEPTION` + текущий прогресс

**Финальный статус:**
- `abortReason == null` + ошибок нет → `SUCCEEDED`
- `abortReason == null` + ошибки + `applied_ops > 0` → `PARTIAL_FAILED`
- `abortReason == null` + ошибки + `applied_ops == 0` → `FAILED`
- `abortReason.reason == "SUPERSEDED"` → `SUPERSEDED` (с текущими `appliedOps`/`errors`)
- `abortReason.reason == "USER"` → `CANCELLED` (с текущими `appliedOps`/`errors`)

```typescript
@Injectable()
export class ProductEditWorkflow extends BrokerWorkflows<
  { jobId: string; productId: string },
  void
> {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("productEdit")
  async run(input: { jobId: string; productId: string }): Promise<void> {
    const { jobId, productId } = input;

    // 1. Загрузить item
    const item = await this.stepLoadItem(jobId, productId);
    if (!item || isTerminalStatus(item.status)) return;

    const ctx: ItemContext = {
      jobId,
      tenantId: item.tenantId,
      productId,
      fenceToken: item.fenceToken,
    };
    const payload = item.payload as ProductEditPayload;
    const allErrors: BulkEditError[] = [];
    let appliedOps = 0;
    let productUpdateFailed = false;
    let abortReason: AbortReason | null = null;

    // 2. RUNNING
    await this.stepMarkRunning(ctx);

    try {
      // ─── Операции с продуктом ──────────────────────────

      if (payload.productUpdate) {
        const r = await this.stepApplyProductUpdate(ctx, payload.productUpdate);
        abortReason = r.abortReason ?? null;
        if (r.applied) appliedOps++;
        if (r.errors.length) { allErrors.push(...r.errors); productUpdateFailed = true; }
      }

      if (!abortReason && payload.productPublish && !productUpdateFailed) {
        const r = await this.stepApplyProductPublish(ctx);
        abortReason = r.abortReason ?? null;
        if (r.applied) appliedOps++;
        allErrors.push(...r.errors);
      }

      if (!abortReason && payload.productUnpublish && !productUpdateFailed) {
        const r = await this.stepApplyProductUnpublish(ctx);
        abortReason = r.abortReason ?? null;
        if (r.applied) appliedOps++;
        allErrors.push(...r.errors);
      }

      // ─── Операции с вариантами ──────────────────────────

      const variantOps: Array<{ key: string; params: any[]; stepFn: Function }> = [
        { key: "variantSetSku",        params: payload.variantSetSku ?? [],        stepFn: this.stepApplyVariantSetSku },
        { key: "variantSetPricing",    params: payload.variantSetPricing ?? [],    stepFn: this.stepApplyVariantSetPricing },
        { key: "variantSetCost",       params: payload.variantSetCost ?? [],       stepFn: this.stepApplyVariantSetCost },
        { key: "variantSetStock",      params: payload.variantSetStock ?? [],      stepFn: this.stepApplyVariantSetStock },
        { key: "variantSetDimensions", params: payload.variantSetDimensions ?? [], stepFn: this.stepApplyVariantSetDimensions },
        { key: "variantSetWeight",     params: payload.variantSetWeight ?? [],     stepFn: this.stepApplyVariantSetWeight },
      ];

      for (const { key, params, stepFn } of variantOps) {
        for (const [i, p] of params.entries()) {
          if (abortReason) break;
          const r: StepResult = await stepFn.call(this, ctx, p, key, i);
          abortReason = r.abortReason ?? null;
          if (r.applied) appliedOps++;
          allErrors.push(...r.errors);
        }
        if (abortReason) break;
      }

      // ─── Событие (best-effort) ──
      if (appliedOps > 0) {
        await this.stepEmitProductUpdated(productId);
      }

      // ─── Финализация ──
      const finalStatus = resolveFinalStatus(abortReason, appliedOps, allErrors);
      await this.stepFinalizeItem(ctx, finalStatus, appliedOps, allErrors,
        abortReason ? {
          cancelReason: abortReason.reason,
          supersededByJobId: abortReason.supersededByJobId,
        } : undefined);

    } catch (err) {
      if (isTransientError(err)) {
        throw err; // DBOS retry
      }
      allErrors.push({
        message: err instanceof Error ? err.message : "Unexpected error",
        code: "WORKFLOW_EXCEPTION",
        productId,
        operation: "workflow",
      });
      await this.stepFinalizeItem(ctx, "FAILED", appliedOps, allErrors,
        { cancelReason: "SYSTEM" });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Атомарные operation steps: abort check + script + progress
  //  Каждый — 1 @WorkflowStep, 1 транзакция, идемпотентен на retry
  // ═══════════════════════════════════════════════════════════════

  @WorkflowStep()
  private async stepApplyProductUpdate(
    ctx: ItemContext,
    params: ProductUpdateParams
  ): Promise<StepResult> {
    return this.applyOperation(ctx, "productUpdate", () =>
      this.kernel.runScript(ProductUpdateScript, params)
    );
  }

  @WorkflowStep()
  private async stepApplyProductPublish(ctx: ItemContext): Promise<StepResult> {
    return this.applyOperation(ctx, "productPublish", () =>
      this.kernel.runScript(ProductPublishScript, { id: ctx.productId })
    );
  }

  @WorkflowStep()
  private async stepApplyProductUnpublish(ctx: ItemContext): Promise<StepResult> {
    return this.applyOperation(ctx, "productUnpublish", () =>
      this.kernel.runScript(ProductUnpublishScript, { id: ctx.productId })
    );
  }

  @WorkflowStep()
  private async stepApplyVariantSetSku(
    ctx: ItemContext, params: VariantSetSkuParams, _key: string, _i: number
  ): Promise<StepResult> {
    return this.applyOperation(ctx, "variantSetSku", () =>
      this.kernel.runScript(VariantSetSkuScript, params),
      params.variantId
    );
  }

  @WorkflowStep()
  private async stepApplyVariantSetPricing(
    ctx: ItemContext, params: VariantSetPricingParams, _key: string, _i: number
  ): Promise<StepResult> {
    return this.applyOperation(ctx, "variantSetPricing", () =>
      this.kernel.runScript(VariantSetPricingScript, params),
      params.variantId
    );
  }

  @WorkflowStep()
  private async stepApplyVariantSetCost(
    ctx: ItemContext, params: VariantSetCostParams, _key: string, _i: number
  ): Promise<StepResult> {
    return this.applyOperation(ctx, "variantSetCost", () =>
      this.kernel.runScript(VariantSetCostScript, params),
      params.variantId
    );
  }

  @WorkflowStep()
  private async stepApplyVariantSetStock(
    ctx: ItemContext, params: VariantSetStockParams, _key: string, _i: number
  ): Promise<StepResult> {
    return this.applyOperation(ctx, "variantSetStock", () =>
      this.kernel.runScript(VariantSetStockScript, params),
      params.variantId
    );
  }

  @WorkflowStep()
  private async stepApplyVariantSetDimensions(
    ctx: ItemContext, params: VariantSetDimensionsParams, _key: string, _i: number
  ): Promise<StepResult> {
    return this.applyOperation(ctx, "variantSetDimensions", () =>
      this.kernel.runScript(VariantSetDimensionsScript, params),
      params.variantId
    );
  }

  @WorkflowStep()
  private async stepApplyVariantSetWeight(
    ctx: ItemContext, params: VariantSetWeightParams, _key: string, _i: number
  ): Promise<StepResult> {
    return this.applyOperation(ctx, "variantSetWeight", () =>
      this.kernel.runScript(VariantSetWeightScript, params),
      params.variantId
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  Общий шаблон: abort check → script → update progress (1 tx)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Единый шаблон для всех operation steps.
   * Внутри одной транзакции:
   *   1. Проверить fence + cancel (abort check)
   *   2. Если abort → записать abort в item, вернуть { aborted }
   *   3. Выполнить скрипт
   *   4. Обновить applied_ops / current_operation / errors в item
   */
  @Transactional()
  private async applyOperation(
    ctx: ItemContext,
    operation: string,
    runScript: () => Promise<{ userErrors: UserError[] }>,
    variantId?: string
  ): Promise<StepResult> {
    const { jobId, tenantId, productId, fenceToken } = ctx;

    // 1. Abort check (fence + cancel в одном запросе)
    const abortReason = await this.checkAbort(tenantId, productId, fenceToken, jobId);
    if (abortReason) {
      // Записать abort-прогресс в item (не финализируем — caller сделает)
      await this.kernel
        .getRepository(BulkEditItemRepository)
        .updateProgress(jobId, productId, undefined, operation);
      return { applied: false, errors: [], abortReason };
    }

    // 2. Выполнить скрипт
    const result = await runScript();

    // 3. Обновить прогресс в item (в той же транзакции)
    const applied = result.userErrors.length === 0;
    await this.kernel
      .getRepository(BulkEditItemRepository)
      .incrementAppliedOps(jobId, productId, applied, operation, result.userErrors);

    // 4. Вернуть результат
    const errors: BulkEditError[] = result.userErrors.length > 0
      ? tagErrors(result.userErrors, productId, operation, variantId)
      : [];

    return { applied, errors };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Abort check (не @WorkflowStep — вызывается внутри applyOperation)
  //  1 запрос с JOIN: items + fence → AbortReason | undefined
  // ═══════════════════════════════════════════════════════════════

  private async checkAbort(
    tenantId: string,
    productId: string,
    expectedFenceToken: string,
    jobId: string
  ): Promise<AbortReason | undefined> {
    const state = await this.kernel
      .getRepository(BulkEditItemRepository)
      .getAbortState(tenantId, jobId, productId);

    // state = { cancelRequested, cancelReason, fenceToken, fenceJobId }
    // 1 SELECT ... LEFT JOIN inventory_product_bulk_fence

    if (!state) return undefined;

    // Fence mismatch → SUPERSEDED
    if (state.fenceToken !== expectedFenceToken) {
      return { reason: "SUPERSEDED", supersededByJobId: state.fenceJobId };
    }

    // Cancel requested → USER/SYSTEM
    if (state.cancelRequested) {
      return { reason: (state.cancelReason as AbortReason["reason"]) ?? "USER" };
    }

    return undefined;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Load / Mark / Finalize / Emit
  // ═══════════════════════════════════════════════════════════════

  @WorkflowStep()
  private stepLoadItem(jobId: string, productId: string) {
    return this.kernel
      .getRepository(BulkEditItemRepository)
      .findByJobAndProduct(jobId, productId);
  }

  @WorkflowStep()
  private async stepMarkRunning(ctx: ItemContext) {
    return this.kernel
      .getRepository(BulkEditItemRepository)
      .updateStatus(ctx.jobId, ctx.productId, "RUNNING", { startedAt: new Date() });
  }

  @WorkflowStep()
  private async stepFinalizeItem(
    ctx: ItemContext,
    status: string,
    appliedOps: number,
    errors: BulkEditError[],
    cancelMeta?: { cancelReason?: string; supersededByJobId?: string }
  ) {
    return this.kernel
      .getRepository(BulkEditItemRepository)
      .finalize(ctx.jobId, ctx.productId, status, appliedOps, errors, cancelMeta);
  }

  @WorkflowStep()
  private async stepEmitProductUpdated(productId: string): Promise<void> {
    try {
      await this.broker.emit("productUpdated", {
        payload: { productId },
        subject: { type: "product", id: productId },
        emitKey: `product:${productId}:updated`,
      });
    } catch {
      this.logger.warn({ productId }, "Failed to emit productUpdated event");
    }
  }
}

// ─── Утилита ──

function resolveFinalStatus(
  abortReason: AbortReason | null,
  appliedOps: number,
  errors: BulkEditError[]
): string {
  if (abortReason) {
    return abortReason.reason === "SUPERSEDED" ? "SUPERSEDED" : "CANCELLED";
  }
  if (errors.length === 0) return "SUCCEEDED";
  return appliedOps > 0 ? "PARTIAL_FAILED" : "FAILED";
}
```

---

## 5) Хранение payload операций

**Вариант A (выбран):** `payload jsonb` в `inventory_bulk_edit_items`.

Поле `payload` содержит нормализованные params операций (аналог `ProductEditWorkflowParams` без технических полей):

```typescript
interface ProductEditPayload {
  productUpdate?: ProductUpdateParams;
  productPublish?: boolean;
  productUnpublish?: boolean;
  variantSetSku?: VariantSetSkuParams[];
  variantSetPricing?: VariantSetPricingParams[];
  variantSetCost?: VariantSetCostParams[];
  variantSetStock?: VariantSetStockParams[];
  variantSetDimensions?: VariantSetDimensionsParams[];
  variantSetWeight?: VariantSetWeightParams[];
}
```

Child workflow загружает payload из item и исполняет шаги.

---

## 6) Cancel операции

### 6.1 Cancel job целиком

`productBulkEditCancel(jobId)`:

1. Обновить job status → `CANCELLED`
2. Для всех items со статусом `PENDING`: `status = CANCELLED`, `cancel_requested = true`, `cancel_reason = 'USER'`
3. Для items со статусом `RUNNING`: `cancel_requested = true`, `cancel_reason = 'USER'` (child сам дойдёт и завершится)

### 6.2 Cancel выбранных продуктов

`productBulkEditCancelItems(jobId, productIds)`:

1. Для выбранных items: `cancel_requested = true`, `cancel_reason = 'USER'`
2. Если item ещё `PENDING` → можно сразу `CANCELLED`
3. Если `RUNNING` → child проверит `cancel_requested` перед следующим шагом

**Замечание:** fence при cancel **не меняем**. Fence меняется только новым bulk для этого productId.

---

## 7) Сервисный слой

### 7.1 `BulkEditService`

**Файл:** `services/inventory/src/services/BulkEditService.ts`

```typescript
@Injectable()
export class BulkEditService {
  /**
   * Создаёт job + items + fences + supersede пересечений в 1 транзакции.
   *
   * ВАЖНО: items обрабатываются в детерминированном порядке (sort by productId)
   * для предотвращения дедлоков при одновременных bulk-запросах.
   * Два concurrent createJobWithFences с пересекающимися productIds будут
   * захватывать row-level locks в одинаковом порядке → нет circular wait.
   */
  @Transactional()
  async createJobWithFences(params: {
    tenantId: string;
    createdBy: string;
    idempotencyKey: string;
    contentHash: string;
    items: ProductBulkEditItemInput[];
  }): Promise<string> {
    const jobId = uuid();

    // 1. INSERT job
    await this.jobRepo.create({
      id: jobId,
      tenantId: params.tenantId,
      status: "QUEUED",
      createdBy: params.createdBy,
      idempotencyKey: params.idempotencyKey,
      contentHash: params.contentHash,
      totalProducts: params.items.length,
    });

    // 2. Сортируем items по productId — детерминированный порядок блокировок
    //    (itemIndex сохраняет оригинальный порядок из input)
    const sorted = params.items
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => a.item.productId.localeCompare(b.item.productId));

    // 3. Для каждого item (в порядке productId): fence + supersede + insert
    for (const { item, idx } of sorted) {
      const fenceToken = uuid();

      // UPSERT fence (row-level lock на inventory_product_bulk_fence)
      await this.fenceRepo.upsert({
        tenantId: params.tenantId,
        productId: item.productId,
        fenceToken,
        jobId,
      });

      // Supersede old active items for this productId
      await this.itemRepo.supersedeActiveItems(
        params.tenantId,
        item.productId,
        { cancelReason: "SUPERSEDED", supersededByJobId: jobId }
      );

      // INSERT item (itemIndex = оригинальный порядок из input)
      const { productId, ...operations } = item;
      await this.itemRepo.create({
        jobId,
        tenantId: params.tenantId,
        productId: item.productId,
        itemIndex: idx,
        status: "PENDING",
        fenceToken,
        totalOps: countOperations(operations),
        payload: operations,
      });
    }

    return jobId;
  }

  /**
   * Финализация job:
   * 1. Все оставшиеся PENDING items → CANCELLED (с причиной)
   * 2. Job status → CANCELLED или COMPLETED
   * Counters не пишем — вычисляются из items на query.
   */
  @Transactional()
  async finalizeJob(jobId: string): Promise<void> {
    // 1. Определить причину: job был отменён или завершился штатно?
    const job = await this.jobRepo.findById(jobId);

    // 2. Все оставшиеся PENDING → CANCELLED
    //    (если job отменили — USER, если parent упал — SYSTEM)
    const cancelReason = job?.status === "CANCELLED" ? "USER" : "SYSTEM";

    await this.itemRepo.cancelAllPending(jobId, {
      cancelReason,
      cancelRequested: true,
    });

    // 3. Job terminal status
    const finalStatus = job?.status === "CANCELLED" ? "CANCELLED" : "COMPLETED";

    await this.jobRepo.update(jobId, {
      status: finalStatus,
      finishedAt: new Date(),
    });
  }
}
```

### 7.2 Repositories

**Новые файлы:**

- `services/inventory/src/repositories/BulkEditJobRepository.ts`
- `services/inventory/src/repositories/BulkEditItemRepository.ts`
- `services/inventory/src/repositories/BulkFenceRepository.ts`

#### `BulkEditItemRepository.getAbortState` — ключевой метод для abort check

1 запрос вместо 2. JOIN items + fence, атомарный snapshot:

```sql
SELECT
  i.cancel_requested,
  i.cancel_reason,
  f.fence_token,
  f.job_id AS fence_job_id
FROM inventory_bulk_edit_items i
LEFT JOIN inventory_product_bulk_fence f
  ON f.tenant_id = i.tenant_id AND f.product_id = i.product_id
WHERE i.tenant_id = $1
  AND i.job_id = $2
  AND i.product_id = $3
```

```typescript
interface AbortState {
  cancelRequested: boolean;
  cancelReason: string | null;
  fenceToken: string;
  fenceJobId: string;
}

async getAbortState(
  tenantId: string,
  jobId: string,
  productId: string
): Promise<AbortState | null>;
```

---

## 8) Важные backend-детали

1. **Canonicalize input** для contentHash — стабильная сортировка ключей (json-canonicalize или аналог).
2. **Job counters** вычисляются из items (`COUNT(*) ... GROUP BY status`) на каждый query. Не хранятся в jobs — нет рассинхрона, нет race conditions при обновлении счётчиков.
3. **Terminal statuses** item: `SUCCEEDED | PARTIAL_FAILED | FAILED | CANCELLED | SUPERSEDED`.
4. В child workflow обязательно проверять fence **перед каждым script step**, иначе возможны "полушаги" старого job после старта нового.
5. Concurrency limit = 10. Parent timeout убрать жёсткий 2 мин — пусть зависит от количества items.
6. **Deadlock prevention:** `createJobWithFences` обрабатывает items отсортированными по `productId` (детерминированный порядок блокировок). Два concurrent bulk-запроса с пересекающимися productIds захватывают row-level locks на `inventory_product_bulk_fence` в одинаковом порядке → нет circular wait → нет дедлоков.

---

## 9) Диаграмма потока

```
Client: productBulkEditStart(input)  +  X-Idempotency-Key
    │
    ▼
Resolver
    │  1. Валидация + идемпотентность
    │  2. Транзакция: job + items + fences + supersede
    │  3. broker.runWorkflow({ jobId })
    │
    ▼  возвращает jobId
    │
Client: polling productBulkEditJob(jobId) / productBulkEditJobItems(jobId)
    │
    ▼
┌── ProductBulkEditWorkflow({ jobId }) ─────────────────────┐
│                                                            │
│  1. loadItems(jobId) — из БД                              │
│  2. job.status = RUNNING                                  │
│  3. fanOut (concurrency=10):                              │
│     ├─ runWorkflow("productEdit", { jobId, productId_0 }) │
│     ├─ runWorkflow("productEdit", { jobId, productId_1 }) │
│     └─ runWorkflow("productEdit", { jobId, productId_2 }) │
│         callId = productId (DBOS idempotency)             │
│  4. finalizeJob(jobId):                                    │
│     PENDING items → CANCELLED + job terminal status        │
└────────────────────────────────────────────────────────────┘
         │                    │                   │
         ▼                    ▼                   ▼
┌─ ProductEditWorkflow ──┐  ┌─── ... ───┐  ┌─── ... ───┐
│ { jobId, productId }   │  │            │  │            │
│                        │  │            │  │            │
│ 1. loadItem → payload  │  │            │  │            │
│    + fenceToken        │  │            │  │            │
│                        │  │            │  │            │
│ 2. item.status=RUNNING │  │            │  │            │
│                        │  │            │  │            │
│ ── before each step: ──│  │            │  │            │
│ │ cancel_requested?    │  │            │  │            │
│ │ fence_token match?   │  │            │  │            │
│ ── if abort → SUPERSED │  │            │  │            │
│                        │  │            │  │            │
│ step: ProductUpdate    │  │            │  │            │
│ step: VariantSetSku[0] │  │            │  │            │
│ step: SetPricing[0]    │  │            │  │            │
│ ...                    │  │            │  │            │
│                        │  │            │  │            │
│ finalize item:         │  │            │  │            │
│  SUCCEEDED / PARTIAL / │  │            │  │            │
│  FAILED / CANCELLED    │  │            │  │            │
└────────────────────────┘  └────────────┘  └────────────┘
```

---

## 10) Сводка файлов

| Файл | Действие | Описание |
|------|----------|----------|
| **Миграции** | | |
| `services/inventory/drizzle/XXXX_bulk_edit_jobs.sql` | CREATE | Таблица `inventory_bulk_edit_jobs` |
| `services/inventory/drizzle/XXXX_bulk_edit_items.sql` | CREATE | Таблица `inventory_bulk_edit_items` |
| `services/inventory/drizzle/XXXX_product_bulk_fence.sql` | CREATE | Таблица `inventory_product_bulk_fence` |
| **Drizzle Schema** | | |
| `services/inventory/src/db/schema/bulkEditJobs.ts` | CREATE | Drizzle schema для jobs |
| `services/inventory/src/db/schema/bulkEditItems.ts` | CREATE | Drizzle schema для items (вкл. cancel_reason, superseded_by_job_id) |
| `services/inventory/src/db/schema/productBulkFence.ts` | CREATE | Drizzle schema для fence |
| **Repositories** | | |
| `services/inventory/src/repositories/BulkEditJobRepository.ts` | CREATE | CRUD + findByIdempotencyKey |
| `services/inventory/src/repositories/BulkEditItemRepository.ts` | CREATE | CRUD + supersedeActiveItems + getAbortState (1 JOIN) + incrementAppliedOps + cancelAllPending + countByStatus |
| `services/inventory/src/repositories/BulkFenceRepository.ts` | CREATE | upsert + findByProduct |
| **Service** | | |
| `services/inventory/src/services/BulkEditService.ts` | CREATE | createJobWithFences + finalizeJob (PENDING→CANCELLED + job status) |
| **GraphQL Schema** | | |
| `services/inventory/src/api/graphql-admin/schema/bulk.graphql` | CREATE | Input/payload/job/item типы + enums |
| `services/inventory/src/api/graphql-admin/schema/base.graphql` | EDIT | Добавить мутации + query в InventoryMutation/InventoryQuery |
| **Workflows** | | |
| `services/inventory/src/workflows/ProductBulkEditWorkflow.ts` | CREATE | Parent workflow (fan-out по jobId) |
| `services/inventory/src/workflows/ProductEditWorkflow.ts` | CREATE | Child workflow (fence/cancel + script steps) |
| `services/inventory/src/workflows/index.ts` | EDIT | Экспорт + регистрация workflows |
| **DTOs** | | |
| `services/inventory/src/workflows/dto/ProductEditWorkflowDto.ts` | CREATE | `{ jobId, productId }` + `ProductEditPayload` + `BulkEditError` |
| `services/inventory/src/workflows/dto/ProductBulkEditWorkflowDto.ts` | CREATE | `{ jobId }` |
| **Resolver** | | |
| `services/inventory/src/resolvers/admin/MutationResolver.ts` | EDIT | productBulkEditStart, productBulkEditCancel, productBulkEditCancelItems |
| `services/inventory/src/resolvers/admin/QueryResolver.ts` | EDIT | productBulkEditJob, productBulkEditJobItems |
| **Validation** | | |
| `services/inventory/src/resolvers/admin/validation/productBulkEditSchema.ts` | CREATE | Zod-валидация батча |
| **Utils** | | |
| `services/inventory/src/utils/canonicalize.ts` | CREATE | Стабильная сериализация для contentHash |
| **E2E Tests** | | |
| `e2e/tests/inventory-api/product-bulk-edit.spec.ts` | CREATE | E2E тесты |

**Не нужно создавать:** Никаких новых скриптов, DTO скриптов, Zod-схем для бизнес-логики — всё переиспользуется из существующих мутаций. Единственная новая Zod-схема — обвязочная валидация батча.

---

## 11) Тестирование

### 11.1 Unit: BulkEditService

- `createJobWithFences` — создаёт job + items + fences в 1 транзакции
- При пересечении productId — supersede старых active items
- При повторном вызове с тем же idempotencyKey + contentHash → вернуть существующий jobId
- При повторном вызове с тем же idempotencyKey + другой contentHash → ошибка

### 11.2 Unit: ProductEditWorkflow

- Один продукт: только `productUpdate` → вызван `ProductUpdateScript`
- Cancel requested → item завершён как `CANCELLED`
- Fence mismatch → item завершён как `SUPERSEDED`
- Fence check перед каждым step (не только в начале)
- Ошибка в `productUpdate` → publish пропущен
- Частичная ошибка → `PARTIAL_FAILED`
- Все успешно → `SUCCEEDED` + emit event
- Все провалены → `FAILED`, event не эмитится
- Abort после 3 применённых шагов → `SUPERSEDED`/`CANCELLED` с `appliedOps=3` и накопленными errors
- Non-transient exception → `FAILED` с `WORKFLOW_EXCEPTION`, текущий прогресс сохранён
- Transient exception → rethrow (DBOS retry), item остаётся RUNNING

### 11.3 Unit: ProductBulkEditWorkflow

- 3 продукта, все успешны → job `COMPLETED`
- 15 продуктов → concurrency limit = 10
- Job cancelled между chunks → новые child не запускаются, finalizeJob переводит оставшиеся PENDING → CANCELLED (reason USER)
- finalizeJob: PENDING items → CANCELLED, job → COMPLETED/CANCELLED
- finalizeJob при штатном завершении (не cancel) + оставшиеся PENDING (parent crash) → PENDING → CANCELLED (reason SYSTEM)
- Query resolver: counters вычисляются из items (COUNT GROUP BY status)

### 11.4 Validation

- Дубликат `productId` → `DUPLICATE_PRODUCT_ID`
- `productPublish + productUnpublish` → `CONFLICTING_PUBLISH_STATE`
- Пустой item → `EMPTY_ITEM`
- 101 item → `BATCH_LIMIT_EXCEEDED`
- Без `X-Idempotency-Key` → `IDEMPOTENCY_KEY_REQUIRED`

### 11.5 E2E

**Файл:** `e2e/tests/inventory-api/product-bulk-edit.spec.ts`

- Start job → poll до COMPLETED → проверить products через query
- Start с невалидным productId → проверить items с FAILED
- Retry с тем же idempotency key → тот же jobId
- Тот же idempotency key + другой input → ошибка
- Cancel job → проверить items CANCELLED
- Два job на пересекающиеся productIds → старые items SUPERSEDED
- Fence check: запустить job, затем другой job на тот же product → первый item SUPERSEDED
