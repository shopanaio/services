# План рефакторинга Bulk Edit API и Workflow

## Цель

1. **Переделать GraphQL API** — изменить существующий `productBulkUpdate` чтобы фронтенд отправлял input в формате `productWorkflowUpdate`, но для нескольких продуктов
2. **Переписать ProductBulkEditWorkflow** — использовать `ProductUpdateWorkflow` вместо отдельных операций

**ВАЖНО:** Это breaking change для фронтенда. Фронтенд должен быть обновлён одновременно с бэкендом.

## Текущее vs Целевое API

### Текущий формат (ProductBulkUpdateInput)

```graphql
input ProductBulkUpdateInput {
  productUpdate: [ProductUpdateInput!]
  productUpdateStatus: [ProductUpdateStatusInput!]
  variantUpdatePricing: [VariantUpdatePricingInput!]
  variantUpdateDimensions: [VariantUpdateDimensionsInput!]
  variantUpdateInventory: [VariantUpdateInventoryInput!]
}
```

**Проблемы:**
- Плоские массивы по типу операции
- Нет группировки по продукту
- Разные типы инпутов для bulk и single update

### Новый формат (ProductBulkUpdateInput) — ЗАМЕНА существующего

```graphql
input ProductBulkUpdateInput {
  """Список продуктов для обновления."""
  products: [ProductBulkUpdateItem!]!
}

input ProductBulkUpdateItem {
  """ID продукта."""
  productId: ID!

  """Ожидаемая ревизия для optimistic locking (опционально)."""
  expectedRevision: Int

  """Операции для этого продукта."""
  operations: [ProductUpdateOperationInput!]!
}
```

**Преимущества:**
- Тот же формат операций что и в `productWorkflowUpdate`
- Группировка по продукту на стороне фронта
- Поддержка optimistic locking per product
- Переиспользование `ProductUpdateOperationInput`

---

## Шаги реализации

### Часть 1: GraphQL Schema

#### 1.1 Изменить типы в bulk.graphql

**Файл:** `services/inventory/src/api/graphql-admin/schema/bulk.graphql`

**Удалить:**
```graphql
input ProductBulkUpdateInput {
  productUpdate: [ProductUpdateInput!]
  productUpdateStatus: [ProductUpdateStatusInput!]
  variantUpdatePricing: [VariantUpdatePricingInput!]
  variantUpdateDimensions: [VariantUpdateDimensionsInput!]
  variantUpdateInventory: [VariantUpdateInventoryInput!]
}

input ProductUpdateStatusInput {
  productId: ID!
  action: ProductStatusAction!
}
```

**Добавить:**
```graphql
"""Input for bulk update - same structure as productWorkflowUpdate but for multiple products."""
input ProductBulkUpdateInput {
  """List of products to update with their operations."""
  products: [ProductBulkUpdateItem!]!
}

"""A single product's update operations within a bulk request."""
input ProductBulkUpdateItem {
  """The product ID to update."""
  productId: ID!

  """Expected revision for optimistic locking. If provided, fails if product was modified."""
  expectedRevision: Int

  """Operations to perform on this product (same format as productWorkflowUpdate)."""
  operations: [ProductUpdateOperationInput!]!
}
```

#### 1.2 Мутация остаётся той же

**Файл:** `services/inventory/src/api/graphql-admin/schema/base.graphql`

```graphql
# Без изменений - только input type меняется
productBulkUpdate(input: ProductBulkUpdateInput!): BulkEditJob!
```

---

### Часть 2: DTO Types

#### 2.1 Обновить BulkEditWorkflowDto.ts

**Файл:** `services/inventory/src/workflows/dto/BulkEditWorkflowDto.ts`

**Удалить:** `FlatOperation`, `ProductBulkEditInput` (старые типы)

**Заменить на:**
```typescript
import type { ProductUpdateOperation, WorkflowContext } from "./ProductUpdateWorkflowDto.js";

// Input for the refactored workflow
export interface ProductBulkEditInput {
  products: ProductBulkUpdateItem[];
  context: WorkflowContext;
}

export interface ProductBulkUpdateItem {
  productId: string;
  expectedRevision?: number;
  operations: ProductUpdateOperation[];
}
```

---

### Часть 3: Resolver

#### 3.1 Переписать существующий метод productBulkUpdate

**Файл:** `services/inventory/src/resolvers/admin/MutationResolver.ts`

**Удалить:**
- `flattenBulkInput()` функцию
- `collectVariantIds()` функцию
- Старую логику в `productBulkUpdate`

**Заменить на:**
```typescript
@Mutation()
async productBulkUpdate(
  args: { input: ProductBulkUpdateInput }
): Promise<BulkEditJob> {
  const { input } = args;

  // Validate
  const validated = ProductBulkUpdateInputSchema().parse(input);

  // Build context
  const context: WorkflowContext = {
    organizationId: this.$ctx.store.organizationId,
    projectId: this.$ctx.store.id,
    storeId: this.$ctx.store.id,
    userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
    locale: this.$ctx.locale ?? "uk",
  };

  // Decode Global IDs and map operations
  const products = validated.products.map(item => ({
    productId: decodeGlobalId(item.productId).id,
    expectedRevision: item.expectedRevision,
    operations: this.mapOperationsForBulk(item.operations),
  }));

  const idempotencyKey = this.$ctx.requestId;

  const result = await this.$ctx.kernel
    .getServices()
    .broker.runWorkflow(
      "inventory.productBulkEdit",
      { products, context },
      {
        source: "workflow",
        workflowId: `productBulkEdit:${idempotencyKey}`,
        stepId: "start",
      }
    ) as { jobId: string };

  return this.$ctx.kernel.repository.bulkEditJob.findById(result.jobId);
}

// Переиспользовать логику маппинга из productWorkflowUpdate
private mapOperationsForBulk(ops: ProductUpdateOperationInput[]): ProductUpdateOperation[] {
  // Та же логика что в productWorkflowUpdate - decode IDs, map types
}
```

#### 3.2 Обновить Validation Schema

**Файл:** `services/inventory/src/resolvers/admin/validation/productBulkEditSchema.ts`

**Заменить существующую схему:**
```typescript
export const ProductBulkUpdateInputSchema = () =>
  z.object({
    products: z.array(
      z.object({
        productId: z.string(),
        expectedRevision: z.number().int().optional(),
        operations: z.array(ProductUpdateOperationInputSchema()),
      })
    )
    .min(1, "At least one product required")
    .max(100, "Maximum 100 products per request"),
  })
  .refine(
    (input) => {
      const totalOps = input.products.reduce((sum, p) => sum + p.operations.length, 0);
      return totalOps <= 500;
    },
    { message: "Total operations exceed limit of 500" }
  );
```

---

### Часть 4: Workflow Refactoring

#### 4.1 Переписать ProductBulkEditWorkflow

**Файл:** `services/inventory/src/workflows/ProductBulkEditWorkflow.ts`

```typescript
@Workflow("productBulkEdit")
async run(input: ProductBulkEditInput): Promise<ProductBulkEditResult> {
  const { products, context } = input;

  // 1. Create job with items grouped by product
  const { jobId, productGroups } = await this.stepCreateJob(products);

  // 2. Try QUEUED -> RUNNING
  const started = await this.stepTryMarkJobRunning(jobId);
  if (!started) {
    await this.stepFinalizeJob(jobId);
    return { jobId };
  }

  // 3. Execute each product group
  for (const group of productGroups) {
    const cancelled = await this.stepIsJobCancelled(jobId);
    if (cancelled) break;

    await this.executeProductGroup(group, context);
  }

  await this.stepFinalizeJob(jobId);
  return { jobId };
}

private async executeProductGroup(
  group: { productId: string; expectedRevision?: number; items: BulkEditItem[] },
  context: WorkflowContext
): Promise<void> {
  // 1. Mark items as RUNNING
  // 2. Build ProductUpdateWorkflowInput from items
  // 3. Call inventory.productUpdate workflow
  // 4. Map operationResults back to individual items
}
```

#### 4.2 Обновить BulkEditCreateJobScript

**Файл:** `services/inventory/src/scripts/bulk-edit/BulkEditCreateJobScript.ts`

Изменить input чтобы принимать `ProductBulkUpdateItem[]` вместо `FlatOperation[]`:

```typescript
interface CreateJobInput {
  products: Array<{
    productId: string;
    expectedRevision?: number;
    operations: ProductUpdateOperation[];
  }>;
}

// Создать items с правильной структурой:
// - chunkIndex = индекс продукта (группировка по продукту)
// - opIndex = индекс операции внутри продукта
// - opType = "productUpdate" | "variantUpdate"
// - params = сериализованные параметры операции
```

---

### Часть 5: Удаление старого кода

#### 5.1 Удалить BulkEditOperationWorkflow.ts

**Файл:** `services/inventory/src/workflows/BulkEditOperationWorkflow.ts` — удалить

#### 5.2 Обновить exports

**Файл:** `services/inventory/src/workflows/index.ts` — убрать экспорт `BulkEditOperationWorkflow`

---

## Маппинг операций

| GraphQL Input | Workflow Operation |
|--------------|-------------------|
| `{ productUpdate: { id, handle, title, content, seo, status, media } }` | `{ type: "productUpdate", params: {...} }` |
| `{ variantUpdate: { variantId, pricing, inventory, dimensions, media, options } }` | `{ type: "variantUpdate", params: {...} }` |

**Примечание:** Используется тот же `ProductUpdateOperationInput` что и в `productWorkflowUpdate`.

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `services/inventory/src/api/graphql-admin/schema/bulk.graphql` | Заменить `ProductBulkUpdateInput` на новый формат |
| `services/inventory/src/workflows/dto/BulkEditWorkflowDto.ts` | Заменить DTO types |
| `services/inventory/src/resolvers/admin/MutationResolver.ts` | Переписать `productBulkUpdate` метод |
| `services/inventory/src/resolvers/admin/validation/productBulkEditSchema.ts` | Заменить validation schema |
| `services/inventory/src/workflows/ProductBulkEditWorkflow.ts` | Основной рефакторинг |
| `services/inventory/src/scripts/bulk-edit/BulkEditCreateJobScript.ts` | Новый input format |
| `services/inventory/src/workflows/BulkEditOperationWorkflow.ts` | **Удалить** |
| `services/inventory/src/workflows/index.ts` | Убрать экспорт `BulkEditOperationWorkflow` |

---

## Пример использования обновлённого API

```graphql
mutation BulkUpdate {
  productBulkUpdate(input: {
    products: [
      {
        productId: "gid://shopana/Product/123"
        expectedRevision: 5
        operations: [
          { productUpdate: { id: "gid://shopana/Product/123", title: "New Title" } }
          { variantUpdate: { variantId: "gid://shopana/Variant/456", pricing: { currency: UAH, amountMinor: 10000 } } }
        ]
      }
      {
        productId: "gid://shopana/Product/789"
        operations: [
          { productUpdate: { id: "gid://shopana/Product/789", status: PUBLISHED } }
        ]
      }
    ]
  }) {
    id
    status
  }
}
```

---

## Верификация

1. **Codegen:** `pnpm codegen` в services/inventory
2. **Build:** `pnpm build` в services/inventory
3. **Тесты:** Запустить существующие тесты + добавить тест для нового API
4. **Manual test:** Выполнить GraphQL запрос через playground
