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
| `parent_workflow_id` | text, not null | для трассировки |
| `total_products` | int, not null | |
| `done_products` | int, default 0 | |
| `succeeded_products` | int, default 0 | |
| `partial_failed_products` | int, default 0 | |
| `failed_products` | int, default 0 | |
| `cancelled_products` | int, default 0 | |
| `superseded_products` | int, default 0 | |

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

В одной транзакции БД:

1. `INSERT inventory_bulk_edit_jobs(...)` — `status=QUEUED`, `total_products=N`
2. Для каждого item в input:
   - Сгенерить `newFenceToken = uuid()`
   - **UPSERT** в `inventory_product_bulk_fence (tenant_id, product_id)`:
     - `fence_token = newFenceToken, job_id = newJobId, updated_at = now()`
   - Пометить "старые активные items" для этого `product_id`:
     - Найти строки в `inventory_bulk_edit_items` где `tenant_id = ... AND product_id = ... AND status IN (PENDING, RUNNING)`
     - Для них: `cancel_requested = true`, `status = SUPERSEDED`
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
  await this.$ctx.kernel
    .getServices()
    .broker.runWorkflow("inventory.productBulkEdit", { jobId });

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
   - `runWorkflow("inventory.productEdit", { jobId, productId })` (минимальный DTO)
   - `callId = productId` (DBOS идемпотентность)
   - `allSettled` — ошибка одного не блокирует остальные
4. `finalizeJob(jobId)` — пересчитать counters из items, поставить `COMPLETED` / `FAILED` / `CANCELLED`:
   - `COMPLETED` — даже если есть ошибки на item уровне
   - `FAILED` — только если parent упал инфраструктурно

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
  private async stepFinalizeJob(jobId: string) {
    return this.kernel
      .getService(BulkEditService)
      .finalizeJob(jobId);
  }
}
```

### 4.2 Child workflow: `ProductEditWorkflow({ jobId, productId })`

**Файл:** `services/inventory/src/workflows/ProductEditWorkflow.ts`

В начале:

1. `loadItem(jobId, productId)` → payload операций, `fence_token`, `cancel_requested`
2. Если `status` уже terminal → вернуть (идемпотентность на уровне БД)
3. Поставить item `RUNNING`, `started_at`

**Перед каждым step:**

- **Cancel check:** если `cancel_requested` → завершить item `CANCELLED` / `SUPERSEDED` и выйти
- **Fence check (обязателен):**
  - Прочитать `inventory_product_bulk_fence` по `(tenant_id, product_id)`
  - Если `fence_token != item.fence_token` → завершить item `SUPERSEDED` и выйти
  - Это главный механизм "новые отменяют старые только для пересечений"

После каждого step:

- `applied_ops += 1`, `current_operation = next`
- При userErrors: сохраняем в `errors` и продолжаем

В конце:

- `SUCCEEDED` если ошибок нет
- `PARTIAL_FAILED` если ошибки есть и `applied_ops > 0`
- `FAILED` если ошибки есть и `applied_ops == 0`
- `finished_at = now()`

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

    // 1. Загрузить item из БД
    const item = await this.stepLoadItem(jobId, productId);
    if (!item || isTerminalStatus(item.status)) return;

    const payload = item.payload as ProductEditPayload;
    const errors: BulkEditError[] = [];
    let appliedOps = 0;
    let productUpdateFailed = false;

    // 2. Поставить item RUNNING
    await this.stepUpdateItemStatus(jobId, productId, "RUNNING");

    // ─── Операции с продуктом ──────────────────────────

    if (payload.productUpdate) {
      if (await this.shouldAbort(jobId, productId, item.fenceToken)) return;

      const result = await this.stepProductUpdate(payload.productUpdate);
      if (result.userErrors.length > 0) {
        errors.push(...tagErrors(result.userErrors, productId, "productUpdate"));
        productUpdateFailed = true;
      } else {
        appliedOps++;
      }
      await this.stepUpdateProgress(jobId, productId, appliedOps, "productUpdate");
    }

    if (payload.productPublish && !productUpdateFailed) {
      if (await this.shouldAbort(jobId, productId, item.fenceToken)) return;

      const result = await this.stepProductPublish({ id: productId });
      if (result.userErrors.length > 0) {
        errors.push(...tagErrors(result.userErrors, productId, "productPublish"));
      } else {
        appliedOps++;
      }
      await this.stepUpdateProgress(jobId, productId, appliedOps, "productPublish");
    }

    if (payload.productUnpublish && !productUpdateFailed) {
      if (await this.shouldAbort(jobId, productId, item.fenceToken)) return;

      const result = await this.stepProductUnpublish({ id: productId });
      if (result.userErrors.length > 0) {
        errors.push(...tagErrors(result.userErrors, productId, "productUnpublish"));
      } else {
        appliedOps++;
      }
      await this.stepUpdateProgress(jobId, productId, appliedOps, "productUnpublish");
    }

    // ─── Операции с вариантами (независимы, продолжаем после ошибок) ──

    for (const [i, params] of (payload.variantSetSku ?? []).entries()) {
      if (await this.shouldAbort(jobId, productId, item.fenceToken)) return;
      const result = await this.stepVariantSetSku(params);
      if (result.userErrors.length > 0) {
        errors.push(...tagErrors(result.userErrors, productId, "variantSetSku", params.variantId, i));
      } else {
        appliedOps++;
      }
    }

    for (const [i, params] of (payload.variantSetPricing ?? []).entries()) {
      if (await this.shouldAbort(jobId, productId, item.fenceToken)) return;
      const result = await this.stepVariantSetPricing(params);
      if (result.userErrors.length > 0) {
        errors.push(...tagErrors(result.userErrors, productId, "variantSetPricing", params.variantId, i));
      } else {
        appliedOps++;
      }
    }

    for (const [i, params] of (payload.variantSetCost ?? []).entries()) {
      if (await this.shouldAbort(jobId, productId, item.fenceToken)) return;
      const result = await this.stepVariantSetCost(params);
      if (result.userErrors.length > 0) {
        errors.push(...tagErrors(result.userErrors, productId, "variantSetCost", params.variantId, i));
      } else {
        appliedOps++;
      }
    }

    for (const [i, params] of (payload.variantSetStock ?? []).entries()) {
      if (await this.shouldAbort(jobId, productId, item.fenceToken)) return;
      const result = await this.stepVariantSetStock(params);
      if (result.userErrors.length > 0) {
        errors.push(...tagErrors(result.userErrors, productId, "variantSetStock", params.variantId, i));
      } else {
        appliedOps++;
      }
    }

    for (const [i, params] of (payload.variantSetDimensions ?? []).entries()) {
      if (await this.shouldAbort(jobId, productId, item.fenceToken)) return;
      const result = await this.stepVariantSetDimensions(params);
      if (result.userErrors.length > 0) {
        errors.push(...tagErrors(result.userErrors, productId, "variantSetDimensions", params.variantId, i));
      } else {
        appliedOps++;
      }
    }

    for (const [i, params] of (payload.variantSetWeight ?? []).entries()) {
      if (await this.shouldAbort(jobId, productId, item.fenceToken)) return;
      const result = await this.stepVariantSetWeight(params);
      if (result.userErrors.length > 0) {
        errors.push(...tagErrors(result.userErrors, productId, "variantSetWeight", params.variantId, i));
      } else {
        appliedOps++;
      }
    }

    // ─── Событие (best-effort) ──
    if (appliedOps > 0) {
      await this.stepEmitProductUpdated(productId);
    }

    // ─── Финальный статус item ──
    const finalStatus = errors.length === 0
      ? "SUCCEEDED"
      : appliedOps > 0
        ? "PARTIAL_FAILED"
        : "FAILED";

    await this.stepFinalizeItem(jobId, productId, finalStatus, appliedOps, errors);
  }

  // ─── Fence/Cancel check ──────────────────────────────

  @WorkflowStep()
  private async shouldAbort(
    jobId: string,
    productId: string,
    expectedFenceToken: string
  ): Promise<boolean> {
    const item = await this.kernel
      .getRepository(BulkEditItemRepository)
      .findByJobAndProduct(jobId, productId);

    if (item?.cancelRequested) {
      await this.stepFinalizeItem(jobId, productId, "CANCELLED", 0, []);
      return true;
    }

    const fence = await this.kernel
      .getRepository(BulkFenceRepository)
      .findByProduct(item!.tenantId, productId);

    if (fence?.fenceToken !== expectedFenceToken) {
      await this.stepFinalizeItem(jobId, productId, "SUPERSEDED", 0, []);
      return true;
    }

    return false;
  }

  // ─── Progress/Status updates ──────────────────────────

  @WorkflowStep()
  private async stepUpdateItemStatus(jobId: string, productId: string, status: string) {
    return this.kernel
      .getRepository(BulkEditItemRepository)
      .updateStatus(jobId, productId, status, { startedAt: new Date() });
  }

  @WorkflowStep()
  private async stepUpdateProgress(
    jobId: string,
    productId: string,
    appliedOps: number,
    currentOperation: string
  ) {
    return this.kernel
      .getRepository(BulkEditItemRepository)
      .updateProgress(jobId, productId, appliedOps, currentOperation);
  }

  @WorkflowStep()
  private async stepFinalizeItem(
    jobId: string,
    productId: string,
    status: string,
    appliedOps: number,
    errors: BulkEditError[]
  ) {
    return this.kernel
      .getRepository(BulkEditItemRepository)
      .finalize(jobId, productId, status, appliedOps, errors);
  }

  // ─── Workflow Steps: каждый вызывает существующий скрипт ──────

  @WorkflowStep()
  private stepLoadItem(jobId: string, productId: string) {
    return this.kernel
      .getRepository(BulkEditItemRepository)
      .findByJobAndProduct(jobId, productId);
  }

  @WorkflowStep()
  private stepProductUpdate(params: ProductUpdateParams) {
    return this.kernel.runScript(ProductUpdateScript, params);
  }

  @WorkflowStep()
  private stepProductPublish(params: { id: string }) {
    return this.kernel.runScript(ProductPublishScript, params);
  }

  @WorkflowStep()
  private stepProductUnpublish(params: { id: string }) {
    return this.kernel.runScript(ProductUnpublishScript, params);
  }

  @WorkflowStep()
  private stepVariantSetSku(params: VariantSetSkuParams) {
    return this.kernel.runScript(VariantSetSkuScript, params);
  }

  @WorkflowStep()
  private stepVariantSetPricing(params: VariantSetPricingParams) {
    return this.kernel.runScript(VariantSetPricingScript, params);
  }

  @WorkflowStep()
  private stepVariantSetCost(params: VariantSetCostParams) {
    return this.kernel.runScript(VariantSetCostScript, params);
  }

  @WorkflowStep()
  private stepVariantSetStock(params: VariantSetStockParams) {
    return this.kernel.runScript(VariantSetStockScript, params);
  }

  @WorkflowStep()
  private stepVariantSetDimensions(params: VariantSetDimensionsParams) {
    return this.kernel.runScript(VariantSetDimensionsScript, params);
  }

  @WorkflowStep()
  private stepVariantSetWeight(params: VariantSetWeightParams) {
    return this.kernel.runScript(VariantSetWeightScript, params);
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
2. Для всех items со статусом `PENDING`: `status = CANCELLED`, `cancel_requested = true`
3. Для items со статусом `RUNNING`: `cancel_requested = true` (child сам дойдёт и завершится)

### 6.2 Cancel выбранных продуктов

`productBulkEditCancelItems(jobId, productIds)`:

1. Для выбранных items: `cancel_requested = true`
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

    // 2. Для каждого item: fence + supersede + insert item
    for (const [idx, item] of params.items.entries()) {
      const fenceToken = uuid();

      // UPSERT fence
      await this.fenceRepo.upsert({
        tenantId: params.tenantId,
        productId: item.productId,
        fenceToken,
        jobId,
      });

      // Supersede old active items for this productId
      await this.itemRepo.supersedeActiveItems(
        params.tenantId,
        item.productId
      );

      // INSERT item
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
   * Финализация job: пересчитать counters из items.
   */
  async finalizeJob(jobId: string): Promise<void> {
    const counters = await this.itemRepo.countByStatus(jobId);

    await this.jobRepo.update(jobId, {
      status: "COMPLETED",
      finishedAt: new Date(),
      doneProducts: counters.total,
      succeededProducts: counters.succeeded,
      partialFailedProducts: counters.partialFailed,
      failedProducts: counters.failed,
      cancelledProducts: counters.cancelled,
      supersededProducts: counters.superseded,
    });
  }
}
```

### 7.2 Repositories

**Новые файлы:**

- `services/inventory/src/repositories/BulkEditJobRepository.ts`
- `services/inventory/src/repositories/BulkEditItemRepository.ts`
- `services/inventory/src/repositories/BulkFenceRepository.ts`

---

## 8) Важные backend-детали

1. **Canonicalize input** для contentHash — стабильная сортировка ключей (json-canonicalize или аналог).
2. **Job status** лучше вычислять из items при финализации, чтобы не ловить рассинхрон.
3. **Terminal statuses** item: `SUCCEEDED | PARTIAL_FAILED | FAILED | CANCELLED | SUPERSEDED`.
4. В child workflow обязательно проверять fence **перед каждым script step**, иначе возможны "полушаги" старого job после старта нового.
5. Concurrency limit = 10. Parent timeout убрать жёсткий 2 мин — пусть зависит от количества items.

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
│  4. finalizeJob(jobId) — пересчёт counters                │
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
| `services/inventory/src/db/schema/bulkEditItems.ts` | CREATE | Drizzle schema для items |
| `services/inventory/src/db/schema/productBulkFence.ts` | CREATE | Drizzle schema для fence |
| **Repositories** | | |
| `services/inventory/src/repositories/BulkEditJobRepository.ts` | CREATE | CRUD + findByIdempotencyKey |
| `services/inventory/src/repositories/BulkEditItemRepository.ts` | CREATE | CRUD + supersedeActiveItems + countByStatus |
| `services/inventory/src/repositories/BulkFenceRepository.ts` | CREATE | upsert + findByProduct |
| **Service** | | |
| `services/inventory/src/services/BulkEditService.ts` | CREATE | createJobWithFences + finalizeJob |
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

### 11.3 Unit: ProductBulkEditWorkflow

- 3 продукта, все успешны → job `COMPLETED`
- 15 продуктов → concurrency limit = 10
- finalizeJob корректно пересчитывает counters

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
