# productBulkEdit Mutation — План реализации

## Обзор

Реализовать мутацию `productBulkEdit`, которая принимает несколько продуктов с их вариантами и применяет все изменения через **родительский workflow**, который разветвляется на **дочерние workflow по каждому продукту**. Каждый дочерний workflow последовательно вызывает **существующие скрипты отдельных мутаций** как workflow-шаги.

**Текущее состояние:**
- Фронтенд (bulk-editor-modal) использует заглушку `setTimeout` вместо реального API-вызова
- Бэкенд имеет ~14 отдельных гранулярных мутаций (productUpdate, variantSetSku, variantSetPricing и т.д.)
- Не существует bulk/batch мутации для продуктов+вариантов

**Цель:**
- Единая GraphQL мутация `productBulkEdit` → родительский workflow → N дочерних workflow
- Каждый продукт обновляется независимо (свой workflow, своя граница ошибок)
- Ошибка одного продукта не блокирует остальные
- **Переиспользование** существующих input типов и скриптов (нет дублирования логики)
- **Идемпотентность через клиентский ключ** (`X-Idempotency-Key` заголовок)

---

## Ключевые принципы

### 1. Клиентская идемпотентность

Клиент **обязан** передать заголовок `X-Idempotency-Key`. Resolver передаёт его в `broker.runWorkflow` с `source: "client"`:

```typescript
broker.runWorkflow("inventory.productBulkEdit", input, {
  source: "client",
  clientKey: ctx.idempotencyKey,   // из X-Idempotency-Key
  tenantId: ctx.store.id,
  apiKeyId: ctx.apiKeyId ?? ctx.user.id,
});
```

Дочерние workflow получают идемпотентность через `workflow` контекст (parentWorkflowId + callId=productId).

### 2. Переиспользование существующих input типов

GraphQL input каждого элемента **композирует** существующие input типы мутаций. Никаких новых кастомных полей — фронтенд формирует ровно те же инпуты, что и для одиночных мутаций.

### 3. Workflow-шаги = вызовы существующих скриптов

Дочерний workflow вызывает те же самые скрипты, которые используют одиночные мутации: `ProductUpdateScript`, `VariantSetSkuScript`, `VariantSetPricingScript` и т.д. Каждый вызов — отдельный `@WorkflowStep()`, каждый скрипт работает в своей транзакции.

---

## Архитектура: Родительский + дочерние Workflow

```
Фронтенд: handleSave() + X-Idempotency-Key: "bulk-edit-<uuid>"
         ↓
GraphQL: productBulkEdit(input)
         ↓
MutationResolver
         ↓
broker.runWorkflow("inventory.productBulkEdit", input, {
  source: "client", clientKey: "bulk-edit-<uuid>"
})
         ↓
┌──────────────────────────────────────────────────────────────┐
│  ProductBulkEditWorkflow  (@Workflow)                         │
│                                                              │
│  fanOut():                                                   │
│    ├─ runWorkflow("inventory.productEdit", item[0])          │
│    ├─ runWorkflow("inventory.productEdit", item[1])          │
│    └─ runWorkflow("inventory.productEdit", item[2])          │
│         (параллельно, callId=productId)                      │
│                                                              │
│  aggregate(): сбор результатов                               │
└──────────────────────────────────────────────────────────────┘
         ↓ (каждый дочерний)
┌──────────────────────────────────────────────────────────────┐
│  ProductEditWorkflow  (@Workflow)                             │
│                                                              │
│  Step 1: ProductUpdateScript(input.productUpdate)            │
│  Step 2: ProductPublishScript(input.productPublish)          │
│  Step 3: VariantSetSkuScript(input.variantSetSku[0])         │
│  Step 4: VariantSetSkuScript(input.variantSetSku[1])         │
│  Step 5: VariantSetPricingScript(input.variantSetPricing[0]) │
│  ...каждый скрипт — отдельный @WorkflowStep()                │
│                                                              │
│  Last:   broker.emit("productUpdated") (best-effort)         │
└──────────────────────────────────────────────────────────────┘
```

### Почему такой дизайн

| Задача | Решение |
|--------|---------|
| **Переиспользование**: не дублировать бизнес-логику | Дочерний workflow вызывает те же скрипты, что и одиночные мутации |
| **Изоляция**: ошибка одного продукта ≠ падение всех | Каждый дочерний workflow независим |
| **Идемпотентность**: безопасные повторы | Клиент шлёт `X-Idempotency-Key`, DBOS гарантирует at-most-once |
| **Наблюдаемость**: видно какой именно шаг упал | Каждый скрипт — отдельный WorkflowStep с именем и логами |
| **Расширяемость**: добавить новую операцию = добавить шаг | Новый скрипт → новый WorkflowStep, не меняя существующее |

### Атомарность

Каждый **скрипт** атомарен (своя `@Transactional()`). Продукт в целом — не атомарен: если `VariantSetSku` прошёл, а `VariantSetPricing` упал, SKU уже обновлён. Это осознанный trade-off:

- Каждая операция атомарна сама по себе
- Workflow отслеживает какие шаги прошли, какие нет
- При retry DBOS не повторяет уже выполненные шаги
- Клиент получает детальный отчёт: какие операции успешны, какие нет

---

## Фаза 1: GraphQL Схема

### 1.1 Input типы (переиспользование существующих)

**Файл:** `services/inventory/src/api/graphql-admin/schema/bulk.graphql` (новый файл)

```graphql
"""
Массовое редактирование нескольких продуктов и их вариантов.
Каждый продукт обновляется независимо — ошибка одного не влияет на остальные.

Клиент ОБЯЗАН передать заголовок X-Idempotency-Key для обеспечения идемпотентности.
"""
input ProductBulkEditInput {
  """Список правок продуктов (макс. 100)."""
  items: [ProductBulkEditItemInput!]!
}

"""
Операции редактирования для одного продукта.
Каждое поле — опциональный массив/объект существующих input типов.
Отсутствующие поля = операция не выполняется.
"""
input ProductBulkEditItemInput {
  """ID продукта (для группировки и валидации)."""
  productId: ID!

  # ─── Операции с продуктом ──────────────────────────────
  """Обновление полей продукта (title, description, excerpt, seo)."""
  productUpdate: ProductUpdateInput

  """Публикация продукта."""
  productPublish: Boolean

  """Снятие с публикации."""
  productUnpublish: Boolean

  # ─── Операции с вариантами ─────────────────────────────
  """Установка SKU для вариантов."""
  variantSetSku: [VariantSetSkuInput!]

  """Установка цен для вариантов."""
  variantSetPricing: [VariantSetPricingInput!]

  """Установка себестоимости для вариантов."""
  variantSetCost: [VariantSetCostInput!]

  """Установка остатков для вариантов."""
  variantSetStock: [VariantSetStockInput!]

  """Установка габаритов для вариантов."""
  variantSetDimensions: [VariantSetDimensionsInput!]

  """Установка веса для вариантов."""
  variantSetWeight: [VariantSetWeightInput!]
}
```

**Ключевой момент**: `ProductUpdateInput`, `VariantSetSkuInput`, `VariantSetPricingInput` и т.д. — это **те же самые типы**, что уже определены в `product.graphql`, `variant.graphql`, `pricing.graphql`, `stock.graphql`, `physical.graphql`. Нулевое дублирование.

> `productPublish` / `productUnpublish` — булевы флаги вместо `ProductPublishInput` / `ProductUnpublishInput`, потому что эти input'ы содержат только `id: ID!`, а `productId` уже есть на уровне item.

### 1.2 Payload тип

```graphql
"""
Результат операции массового редактирования.
"""
type ProductBulkEditPayload {
  """Продукты, для которых хотя бы одна операция прошла успешно."""
  products: [Product!]!

  """
  Ошибки по каждой операции. Каждая ошибка содержит productId/variantId,
  чтобы фронтенд мог привязать ошибки к конкретным строкам.
  """
  userErrors: [BulkEditUserError!]!
}

type BulkEditUserError {
  """Человекочитаемое сообщение об ошибке."""
  message: String!

  """Путь к полю с ошибкой."""
  field: [String!]

  """Машиночитаемый код ошибки."""
  code: String

  """ID продукта, к которому относится ошибка."""
  productId: ID

  """ID варианта, если применимо."""
  variantId: ID

  """Название операции, которая упала (productUpdate, variantSetSku, ...)."""
  operation: String
}
```

### 1.3 Регистрация в InventoryMutation

**Файл:** `services/inventory/src/api/graphql-admin/schema/base.graphql`

Добавить в `type InventoryMutation`:

```graphql
  # Массовые операции
  productBulkEdit(input: ProductBulkEditInput!): ProductBulkEditPayload!
```

---

## Фаза 2: Дочерний Workflow — `ProductEditWorkflow`

Обрабатывает один продукт. Каждый шаг — вызов существующего скрипта.

### 2.1 DTO

**Файл:** `services/inventory/src/workflows/dto/ProductEditWorkflowDto.ts`

```typescript
import type { UserError } from "../../kernel/BaseScript.js";
import type { ProductUpdateParams } from "../../scripts/product/dto/index.js";
import type { VariantSetSkuParams } from "../../scripts/variant/VariantSetSkuScript.js";
import type { VariantSetPricingParams } from "../../scripts/variant/VariantSetPricingScript.js";
import type { VariantSetCostParams } from "../../scripts/variant/VariantSetCostScript.js";
import type { VariantSetStockParams } from "../../scripts/variant/VariantSetStockScript.js";
import type { VariantSetDimensionsParams } from "../../scripts/variant/VariantSetDimensionsScript.js";
import type { VariantSetWeightParams } from "../../scripts/variant/VariantSetWeightScript.js";

export interface ProductEditWorkflowParams {
  productId: string;

  // Операции с продуктом (переиспользуем существующие params)
  productUpdate?: ProductUpdateParams;
  productPublish?: boolean;
  productUnpublish?: boolean;

  // Операции с вариантами (массивы существующих params)
  variantSetSku?: VariantSetSkuParams[];
  variantSetPricing?: VariantSetPricingParams[];
  variantSetCost?: VariantSetCostParams[];
  variantSetStock?: VariantSetStockParams[];
  variantSetDimensions?: VariantSetDimensionsParams[];
  variantSetWeight?: VariantSetWeightParams[];
}

export interface BulkEditError extends UserError {
  productId?: string;
  variantId?: string;
  operation?: string;
}

export interface ProductEditWorkflowResult {
  productId: string;
  success: boolean;
  userErrors: BulkEditError[];
}
```

### 2.2 Дочерний Workflow

**Файл:** `services/inventory/src/workflows/ProductEditWorkflow.ts`

```typescript
import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";

// Существующие скрипты — без изменений
import { ProductUpdateScript } from "../scripts/product/ProductUpdateScript.js";
import { ProductPublishScript } from "../scripts/product/ProductPublishScript.js";
import { ProductUnpublishScript } from "../scripts/product/ProductUnpublishScript.js";
import { VariantSetSkuScript } from "../scripts/variant/VariantSetSkuScript.js";
import { VariantSetPricingScript } from "../scripts/variant/VariantSetPricingScript.js";
import { VariantSetCostScript } from "../scripts/variant/VariantSetCostScript.js";
import { VariantSetStockScript } from "../scripts/variant/VariantSetStockScript.js";
import { VariantSetDimensionsScript } from "../scripts/variant/VariantSetDimensionsScript.js";
import { VariantSetWeightScript } from "../scripts/variant/VariantSetWeightScript.js";

import type {
  ProductEditWorkflowParams,
  ProductEditWorkflowResult,
  BulkEditError,
} from "./dto/ProductEditWorkflowDto.js";

@Injectable()
export class ProductEditWorkflow extends BrokerWorkflows<
  ProductEditWorkflowParams,
  ProductEditWorkflowResult
> {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("productEdit")
  async run(input: ProductEditWorkflowParams): Promise<ProductEditWorkflowResult> {
    const errors: BulkEditError[] = [];
    const { productId } = input;

    // ─── Операции с продуктом ──────────────────────────

    if (input.productUpdate) {
      const result = await this.stepProductUpdate(input.productUpdate);
      if (result.userErrors.length > 0) {
        errors.push(...this.tagErrors(result.userErrors, productId, "productUpdate"));
      }
    }

    if (input.productPublish) {
      const result = await this.stepProductPublish({ id: productId });
      if (result.userErrors.length > 0) {
        errors.push(...this.tagErrors(result.userErrors, productId, "productPublish"));
      }
    }

    if (input.productUnpublish) {
      const result = await this.stepProductUnpublish({ id: productId });
      if (result.userErrors.length > 0) {
        errors.push(...this.tagErrors(result.userErrors, productId, "productUnpublish"));
      }
    }

    // ─── Операции с вариантами ─────────────────────────

    for (const params of input.variantSetSku ?? []) {
      const result = await this.stepVariantSetSku(params);
      if (result.userErrors.length > 0) {
        errors.push(...this.tagErrors(result.userErrors, productId, "variantSetSku", params.variantId));
      }
    }

    for (const params of input.variantSetPricing ?? []) {
      const result = await this.stepVariantSetPricing(params);
      if (result.userErrors.length > 0) {
        errors.push(...this.tagErrors(result.userErrors, productId, "variantSetPricing", params.variantId));
      }
    }

    for (const params of input.variantSetCost ?? []) {
      const result = await this.stepVariantSetCost(params);
      if (result.userErrors.length > 0) {
        errors.push(...this.tagErrors(result.userErrors, productId, "variantSetCost", params.variantId));
      }
    }

    for (const params of input.variantSetStock ?? []) {
      const result = await this.stepVariantSetStock(params);
      if (result.userErrors.length > 0) {
        errors.push(...this.tagErrors(result.userErrors, productId, "variantSetStock", params.variantId));
      }
    }

    for (const params of input.variantSetDimensions ?? []) {
      const result = await this.stepVariantSetDimensions(params);
      if (result.userErrors.length > 0) {
        errors.push(...this.tagErrors(result.userErrors, productId, "variantSetDimensions", params.variantId));
      }
    }

    for (const params of input.variantSetWeight ?? []) {
      const result = await this.stepVariantSetWeight(params);
      if (result.userErrors.length > 0) {
        errors.push(...this.tagErrors(result.userErrors, productId, "variantSetWeight", params.variantId));
      }
    }

    // ─── Событие (best-effort) ────────────────────────

    if (errors.length === 0) {
      await this.stepEmitProductUpdated(productId);
    }

    return {
      productId,
      success: errors.length === 0,
      userErrors: errors,
    };
  }

  // ─── Workflow Steps: каждый вызывает существующий скрипт ──────

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

  // ─── Утилита: добавляет productId/variantId/operation к ошибкам ──

  private tagErrors(
    errors: UserError[],
    productId: string,
    operation: string,
    variantId?: string
  ): BulkEditError[] {
    return errors.map((e) => ({ ...e, productId, variantId, operation }));
  }
}
```

---

## Фаза 3: Родительский Workflow — `ProductBulkEditWorkflow`

Оркестрирует fan-out в дочерние workflow и агрегирует результаты.

### 3.1 DTO

**Файл:** `services/inventory/src/workflows/dto/ProductBulkEditWorkflowDto.ts`

```typescript
import type {
  ProductEditWorkflowParams,
  ProductEditWorkflowResult,
  BulkEditError,
} from "./ProductEditWorkflowDto.js";

export interface ProductBulkEditWorkflowParams {
  items: ProductEditWorkflowParams[];
}

export interface ProductBulkEditWorkflowResult {
  productIds: string[];         // успешно обновлённые
  userErrors: BulkEditError[];  // ошибки по всем продуктам
}
```

### 3.2 Родительский Workflow

**Файл:** `services/inventory/src/workflows/ProductBulkEditWorkflow.ts`

```typescript
import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
  DBOS,
} from "@shopana/shared-kernel";
import type {
  ProductBulkEditWorkflowParams,
  ProductBulkEditWorkflowResult,
} from "./dto/ProductBulkEditWorkflowDto.js";
import type {
  ProductEditWorkflowParams,
  ProductEditWorkflowResult,
} from "./dto/ProductEditWorkflowDto.js";

@Injectable()
export class ProductBulkEditWorkflow extends BrokerWorkflows<
  ProductBulkEditWorkflowParams,
  ProductBulkEditWorkflowResult
> {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("productBulkEdit")
  async run(input: ProductBulkEditWorkflowParams): Promise<ProductBulkEditWorkflowResult> {
    const results = await this.fanOut(input.items);
    return this.aggregate(results);
  }

  @WorkflowStep({ timeoutMs: 120_000 }) // 2 мин на весь батч
  private async fanOut(
    items: ProductEditWorkflowParams[]
  ): Promise<ProductEditWorkflowResult[]> {
    const promises = items.map((item) =>
      this.broker.runWorkflow<ProductEditWorkflowResult, ProductEditWorkflowParams>(
        "inventory.productEdit",
        item,
        {
          source: "workflow",
          workflowId: DBOS.workflowID,
          stepId: "productEdit",
          callId: item.productId,
        }
      )
    );

    const settled = await Promise.allSettled(promises);

    return settled.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return {
        productId: items[index].productId,
        success: false,
        userErrors: [{
          message: result.reason?.message ?? "Unexpected error",
          code: "WORKFLOW_ERROR",
          productId: items[index].productId,
          operation: "workflow",
        }],
      };
    });
  }

  @WorkflowStep()
  private aggregate(
    results: ProductEditWorkflowResult[]
  ): ProductBulkEditWorkflowResult {
    const productIds: string[] = [];
    const userErrors: ProductBulkEditWorkflowResult["userErrors"] = [];

    for (const result of results) {
      if (result.success) {
        productIds.push(result.productId);
      }
      userErrors.push(...result.userErrors);
    }

    return { productIds, userErrors };
  }
}
```

### 3.3 Resolver (клиентская идемпотентность)

**Файл:** `services/inventory/src/resolvers/admin/MutationResolver.ts`

```typescript
@ZodResolver(ProductBulkEditInputSchema)
async productBulkEdit(args: { input: ProductBulkEditInput }) {
  // Клиент ОБЯЗАН передать X-Idempotency-Key
  const idempotencyKey = this.$ctx.idempotencyKey;
  if (!idempotencyKey) {
    return {
      products: [],
      userErrors: [{
        message: "X-Idempotency-Key header is required for bulk operations",
        code: "IDEMPOTENCY_KEY_REQUIRED",
      }],
    };
  }

  const result = await this.$ctx.kernel
    .getServices()
    .broker.runWorkflow<ProductBulkEditWorkflowResult, ProductBulkEditWorkflowParams>(
      "inventory.productBulkEdit",
      { items: args.input.items },
      {
        source: "client",
        clientKey: idempotencyKey,
        tenantId: this.$ctx.store.id,
        apiKeyId: this.$ctx.user?.id ?? "system",
      }
    );

  return {
    products: result.productIds.map(
      (id) => new ProductResolver(id, this.$ctx)
    ),
    userErrors: result.userErrors,
  };
}
```

**Идемпотентность**: клиент передаёт `X-Idempotency-Key: "bulk-edit-<uuid>"`. DBOS гарантирует at-most-once: повторный запрос с тем же ключом возвращает кешированный результат. Фронтенд генерирует UUID при открытии Save-диалога.

---

## Фаза 4: Интеграция с фронтендом

### 4.1 GraphQL операция

**Файл:** `admin-next/src/domains/inventory/products/modals/bulk-editor-modal/graphql/product-bulk-edit.graphql`

```graphql
mutation ProductBulkEdit($input: ProductBulkEditInput!) {
  inventoryMutation {
    productBulkEdit(input: $input) {
      products {
        id
        title
      }
      userErrors {
        message
        field
        code
        productId
        variantId
        operation
      }
    }
  }
}
```

### 4.2 Трансформация правок из стора в input мутации

**Файл:** `admin-next/src/domains/inventory/products/modals/bulk-editor-modal/utils/build-mutation-input.ts`

Трансформация Zustand `edits: Record<string, IRowEdits>` в `ProductBulkEditInput`. Каждое изменённое поле маппится в соответствующий существующий input:

```typescript
export function buildBulkEditInput(
  rows: IBulkEditorRow[],
  edits: Record<string, IRowEdits>
): ProductBulkEditInput {
  // 1. Группируем отредактированные строки по productId
  // 2. Для каждого продукта:
  //    - productTitle/description/excerpt → ProductUpdateInput
  //    - productStatus → productPublish: true или productUnpublish: true
  //    - sku → VariantSetSkuInput
  //    - price/compareAtPrice → VariantSetPricingInput
  //    - costPrice → VariantSetCostInput
  //    - onHand/unavailable → VariantSetStockInput
  //    - weight → VariantSetWeightInput
  //    - length/width/height → VariantSetDimensionsInput
}
```

**Маппинг полей → существующие input типы:**

| Поле на фронтенде | Существующий Input | Поле в input |
|-------------------|-------------------|--------------|
| `productTitle` | `ProductUpdateInput` | `title` |
| `productDescription` | `ProductUpdateInput` | `description` |
| `productExcerpt` | `ProductUpdateInput` | `excerpt` |
| `productStatus` = "published" | `productPublish: true` | — |
| `productStatus` = "draft" | `productUnpublish: true` | — |
| `sku` | `VariantSetSkuInput` | `sku` |
| `price`, `compareAtPrice` | `VariantSetPricingInput` | `amountMinor`, `compareAtMinor` |
| `costPrice` | `VariantSetCostInput` | `unitCostMinor` |
| `onHand`, `unavailable` | `VariantSetStockInput` | `quantity` |
| `weight` | `VariantSetWeightInput` | `weight.value` (граммы) |
| `length`, `width`, `height` | `VariantSetDimensionsInput` | `dimensions.*` (мм) |

### 4.3 Замена заглушки в handleSave

**Файл:** `admin-next/src/domains/inventory/products/modals/bulk-editor-modal/bulk-editor-modal.tsx`

Заменить:
```typescript
// Simulate API call
await new Promise((resolve) => setTimeout(resolve, 1000));
```

На:
```typescript
const idempotencyKey = `bulk-edit-${crypto.randomUUID()}`;
const input = buildBulkEditInput(rows, edits);
const result = await executeMutation(
  ProductBulkEditDocument,
  { input },
  { headers: { "X-Idempotency-Key": idempotencyKey } }
);

if (result.userErrors.length > 0) {
  // Маппим ошибки на строки по productId/variantId/operation
  onSaveError();
  return;
}
```

### 4.4 Отображение ошибок

- Парсим `userErrors[].productId` / `variantId` + `operation` для маппинга ошибок на строки грида
- Показываем inline-индикаторы ошибок на затронутых ячейках
- Тост с итогом: "3 продукта обновлено, 1 с ошибкой"

---

## Фаза 5: Регистрация и подключение

### 5.1 Регистрация Workflow в модуле

**Файл:** `services/inventory/src/workflows/index.ts`

```typescript
export { ProductEditWorkflow } from "./ProductEditWorkflow.js";
export { ProductBulkEditWorkflow } from "./ProductBulkEditWorkflow.js";
```

Добавить оба в providers NestJS модуля для авто-регистрации в DBOS.

### 5.2 Кодогенерация и сборка

1. `shopana codegen --service inventory` — генерация TS типов из новой GraphQL схемы
2. `shopana codegen` для admin-next — генерация типов мутации
3. `shopana build --service inventory` — проверка компиляции
4. `shopana schema build` — пересборка федеративного суперграфа

---

## Фаза 6: Тестирование

### 6.1 Тесты дочернего Workflow (ProductEditWorkflow)

- Один продукт: только `productUpdate` → вызван `ProductUpdateScript`
- Один продукт: SKU + pricing → вызваны `VariantSetSkuScript`, `VariantSetPricingScript`
- Ошибка в `productUpdate` → ошибка с `operation: "productUpdate"`
- Ошибка в одном варианте → ошибка с `variantId` и `operation`
- Все операции успешны → `emitProductUpdated` вызван
- Частичная ошибка → событие НЕ эмитится

### 6.2 Тесты родительского Workflow (ProductBulkEditWorkflow)

- 3 продукта, все успешны → 3 productId в результате, 0 ошибок
- 3 продукта, 1 падает → 2 productId, 1 ошибка (остальные не затронуты)
- Идемпотентность: одинаковый `X-Idempotency-Key` дважды → тот же результат
- Без `X-Idempotency-Key` → ошибка `IDEMPOTENCY_KEY_REQUIRED`

### 6.3 E2E тесты

**Файл:** `e2e/tests/inventory-api/product-bulk-edit.spec.ts`

- Создать 3 продукта → массовое редактирование → проверить через query
- Массовое редактирование с невалидным productId → 2 успешно, 1 ошибка
- Retry с тем же idempotency key → идентичный результат
- Различные комбинации операций (только SKU, только цены, всё вместе)

---

## Диаграмма потока выполнения

```
Фронтенд: handleSave()
    │
    ├─ idempotencyKey = "bulk-edit-<uuid>"
    ├─ input = buildBulkEditInput(rows, edits)
    │          ┌─ item[0].productUpdate = ProductUpdateInput
    │          ├─ item[0].variantSetSku = [VariantSetSkuInput, ...]
    │          ├─ item[0].variantSetPricing = [VariantSetPricingInput, ...]
    │          └─ item[1].productPublish = true
    │
    ▼
GraphQL: productBulkEdit(input)  +  X-Idempotency-Key
    │
    ▼
MutationResolver
    │  idempotency: source="client", clientKey="bulk-edit-<uuid>"
    ▼
┌── ProductBulkEditWorkflow ────────────────────────────┐
│                                                        │
│  fanOut():                                             │
│    ├─ runWorkflow("productEdit", item[0])              │
│    └─ runWorkflow("productEdit", item[1])              │
│         callId = productId (DBOS идемпотентность)      │
│                                                        │
│  aggregate(): собрать productIds + userErrors           │
└────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─ ProductEditWorkflow ──┐  ┌─ ProductEditWorkflow ──┐
│                        │  │                        │
│ step: ProductUpdate    │  │ step: ProductPublish   │
│   → ProductUpdateScript│  │   → ProductPublishScript│
│                        │  │                        │
│ step: VariantSetSku[0] │  │ (нет других операций)  │
│   → VariantSetSkuScript│  │                        │
│                        │  │ step: emit event       │
│ step: VariantSetSku[1] │  └────────────────────────┘
│   → VariantSetSkuScript│
│                        │
│ step: SetPricing[0]    │
│   → SetPricingScript   │
│                        │
│ step: emit event       │
└────────────────────────┘
```

---

## Сводка файлов

| Файл | Действие | Описание |
|------|----------|----------|
| `services/inventory/src/api/graphql-admin/schema/bulk.graphql` | CREATE | GraphQL input/payload типы (композиция существующих) |
| `services/inventory/src/api/graphql-admin/schema/base.graphql` | EDIT | Добавить `productBulkEdit` в InventoryMutation |
| `services/inventory/src/workflows/dto/ProductEditWorkflowDto.ts` | CREATE | DTO дочернего workflow (композиция существующих params) |
| `services/inventory/src/workflows/dto/ProductBulkEditWorkflowDto.ts` | CREATE | DTO родительского workflow |
| `services/inventory/src/workflows/ProductEditWorkflow.ts` | CREATE | Дочерний workflow: шаги = вызовы существующих скриптов |
| `services/inventory/src/workflows/ProductBulkEditWorkflow.ts` | CREATE | Родительский workflow (fan-out) |
| `services/inventory/src/workflows/index.ts` | EDIT | Экспорт + регистрация workflow |
| `services/inventory/src/resolvers/admin/MutationResolver.ts` | EDIT | Добавить resolver с клиентской идемпотентностью |
| `admin-next/.../bulk-editor-modal/graphql/product-bulk-edit.graphql` | CREATE | GraphQL документ мутации |
| `admin-next/.../bulk-editor-modal/utils/build-mutation-input.ts` | CREATE | Трансформер правок → существующие input типы |
| `admin-next/.../bulk-editor-modal/bulk-editor-modal.tsx` | EDIT | Замена заглушки + генерация idempotency key |
| `e2e/tests/inventory-api/product-bulk-edit.spec.ts` | CREATE | E2E тесты |

**Не нужно создавать:** Никаких новых скриптов, DTO скриптов, Zod-схем для бизнес-логики — всё переиспользуется из существующих мутаций.

---

## Открытые вопросы

1. **Warehouse ID для stock**: `VariantSetStockInput` требует `warehouseId`. Bulk editor не показывает выбор склада. Использовать склад по умолчанию? Или не редактировать запасы в v1?

2. **Currency для pricing/cost**: `VariantSetPricingInput` и `VariantSetCostInput` требуют `currency: CurrencyCode!`. Фронтенд не показывает выбор валюты. Использовать валюту проекта по умолчанию?

3. **Barcode**: Существующие мутации не имеют `VariantSetBarcodeInput`. Нужно либо создать новую мутацию `variantSetBarcode`, либо добавить barcode в `VariantSetSkuInput`, либо отложить.

4. **Параллельность шагов в дочернем workflow**: Сейчас шаги последовательны. Можно ли группировать независимые операции (SKU + pricing) параллельно внутри одного продукта?

5. **Лимит**: Ограничение 100 продуктов за запрос. Достаточно ли для UI?
