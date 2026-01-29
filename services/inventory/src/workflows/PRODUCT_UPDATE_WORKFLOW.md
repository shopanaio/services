# ProductUpdateWorkflow Design

## Overview

Workflow для обновления продукта с поддержкой partial failure и event-driven архитектуры.

**Цели:**

1. Обновить данные продукта и вариантов - каждая операция как отдельный `@WorkflowStep`
2. Partial failure - ошибка одной операции не блокирует другие
3. Каждый скрипт возвращает delta (что изменилось)
4. Эмитить `productUpdated` с агрегированной delta для consumers

## Design Decisions

| Решение       | Выбор                        | Обоснование                              |
| ------------- | ---------------------------- | ---------------------------------------- |
| Event payload | **Partial Snapshot**         | Минимум данных для ECST                  |
| Concurrency   | **Optimistic locking**       | Revision + проверка при обновлении       |
| Event type    | **productUpdated**           | Семантически понятнее                    |
| Workflow type | **@Workflow**                | Durable steps, partial failure           |
| Operations    | **Отдельные @WorkflowStep**  | Независимость, observability             |
| Script return | **{ result, changes }**      | Скрипт возвращает новые значения полей   |

---

## Architecture

```
ProductUpdateWorkflow
│
├── @WorkflowStep stepAcquireRevision()
│   └── Atomic compare-and-swap: check expectedRevision + increment
│   └── Returns newRevision or REVISION_CONFLICT/NOT_FOUND
│
├── Operation Steps (for each op in input.operations):
│   │
│   ├── Product Operations:
│   │   └── @WorkflowStep stepProductUpdate(params)
│   │       └── Scripts return { result, delta } for each field
│   │
│   └── Variant Operations:
│       └── @WorkflowStep stepVariantUpdate(params)
│           └── Scripts return { result, delta } for each field
│
├── Aggregate deltas from all operations
│   └── Merge product deltas + variant deltas into single ProductDelta
│
├── @WorkflowStep stepEmitEvent()
│   └── broker.emit('productUpdated', { delta })
│
└── Return ProductUpdateWorkflowResult
```

---

## Optimistic Locking (Revision)

Для защиты от lost updates при конкурентном редактировании.

### Механизм

```typescript
// 1. Клиент получает продукт с revision
const product = await query.product({ id }); // { id, revision: 5, ... }

// 2. Клиент отправляет мутацию с expectedRevision
mutation.productUpdate({
  productId: id,
  expectedRevision: 5,  // ← тот что получил
  operations: [...]
});

// 3. Workflow ПЕРВЫМ ШАГОМ атомарно захватывает версию (compare-and-swap)
// stepAcquireRevision — до любых других операций
UPDATE product
SET revision = revision + 1
WHERE id = $1
  AND ($expectedRevision IS NULL OR revision = $expectedRevision)
RETURNING revision;

// 4. Если 0 rows affected → NOT_FOUND или REVISION_CONFLICT
// 5. Все последующие операции работают с "захваченной" версией
```

**Важно:** Инкремент revision происходит ДО операций, не после. Это гарантирует:
- Атомарность проверки версии
- Корректный порядок событий (revision в событии = версия после этого обновления)
- Защиту от race condition между проверкой и первым UPDATE

### Database

```sql
-- В таблице product
ALTER TABLE product ADD COLUMN revision integer NOT NULL DEFAULT 0;
```

### Input/Output

```typescript
interface ProductUpdateWorkflowInput {
  productId: string;
  expectedRevision?: number;  // optional для backwards compatibility
  operations: ProductUpdateOperation[];
  context: WorkflowContext;
}

interface ProductUpdateWorkflowResult {
  product: { id: string; revision: number } | null;  // ← возвращаем новый revision
  operationResults: OperationResult[];
  userErrors: UserError[];
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Продукт не найден |
| `REVISION_CONFLICT` | Продукт был изменён другим пользователем. Клиент должен перезагрузить данные. |

### stepAcquireRevision Implementation

```typescript
@WorkflowStep()
private async stepAcquireRevision(
  productId: string,
  expectedRevision?: number,
): Promise<{ revision: number } | { error: UserError }> {
  const [result] = await this.db
    .update(product)
    .set({ revision: sql`revision + 1` })
    .where(
      and(
        eq(product.id, productId),
        expectedRevision !== undefined
          ? eq(product.revision, expectedRevision)
          : undefined,
      ),
    )
    .returning({ revision: product.revision });

  if (!result) {
    // Проверяем: продукт не найден или revision mismatch?
    const exists = await this.db
      .select({ id: product.id })
      .from(product)
      .where(eq(product.id, productId))
      .then((rows) => rows.length > 0);

    return {
      error: exists
        ? { message: "Product was modified by another user", code: "REVISION_CONFLICT", field: ["expectedRevision"] }
        : { message: "Product not found", code: "NOT_FOUND" },
    };
  }

  return { revision: result.revision };
}
```

---

## Operation Types & Params

Две основные операции, сгруппированные по entity:

### Product Operation

| Operation       | Params                                                            |
| --------------- | ----------------------------------------------------------------- |
| `productUpdate` | `{ id, handle?, title?, content?, seo?, status?, media? }`        |

Вложенные типы:

```typescript
content?: { description?: DescriptionInput; excerpt?: string }
seo?: { title?: string; description?: string }
media?: { fileIds: string[] }
```

Внутренне вызывает:

- `ProductUpdateScript` - для identity полей (handle, title)
- `ProductSetContentScript` - если передан `content`
- `ProductSetSeoScript` - если передан `seo`
- `ProductSetStatusScript` - если передан `status`
- `ProductSetMediaScript` - если передан `media`

### Variant Operation

| Operation       | Params                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| `variantUpdate` | `{ variantId, pricing?, cost?, inventory?, dimensions?, weight?, media? }` |

Вложенные типы:

```typescript
pricing?: { currency: string; amountMinor: number; compareAtMinor?: number; costMinor?: number }
inventory?: { warehouseId: string; onHand: number; unavailable?: number; sku?: string }  // sku here
physical?: { width?: number; height?: number; length?: number; weight?: number }     // mm, grams
media?: { fileIds: string[] }
```

Внутренне вызывает соответствующие скрипты только для переданных полей.

### Variant Options Update (Collision-Safe)

| Operation       | Params                         |
| --------------- | ------------------------------ |
| `variantUpdate` | `{ variantId, ..., options? }` |

```typescript
options?: {
  set: { optionId: string; optionValueId: string }[];
}
```

**Collision Prevention:** Unique constraint на `(productId, handle)` в таблице `variant`.

**Handle = sorted slugs опций:**

```
Color=red + Size=m → handle: "red-m"
Color=blue + Size=l → handle: "blue-l"
```

**Порядок сортировки:** по `sortIndex` опции (или `optionId` если sortIndex одинаковый).

---

### Handle Rebuild Triggers

Handle варианта нужно пересчитывать в двух случаях:

#### 1. Изменение опций варианта (`VariantSetOptionsScript`)

```typescript
// Когда: variantUpdate({ options: { set: [...] } })
const newHandle = await this.buildVariantHandle(tx, links);
await tx
  .update(variant)
  .set({ handle: newHandle })
  .where(eq(variant.id, variantId));
```

#### 2. Изменение slug у option value (`OptionValueUpdateScript`)

```typescript
// Когда: optionValueUpdate({ id, slug: 'new-slug' })
// Нужно обновить handles ВСЕХ вариантов, использующих этот value

const affectedVariantIds = await tx
  .select({ variantId: productOptionVariantLink.variantId })
  .from(productOptionVariantLink)
  .where(eq(productOptionVariantLink.optionValueId, valueId));

for (const { variantId } of affectedVariantIds) {
  const newHandle = await this.buildVariantHandle(tx, variantId);
  await tx
    .update(variant)
    .set({ handle: newHandle })
    .where(eq(variant.id, variantId));
}
```

---

---

## Partial Snapshot (Event-Carried State Transfer)

Каждый скрипт возвращает `changes` — новые значения только тех полей, которые изменились. Workflow агрегирует в partial snapshot для события.

**Принцип:** Consumer получает минимальный снимок и делает точечный UPSERT своей проекции.

### Script Return Pattern

```typescript
// Базовый паттерн возврата скрипта
interface ScriptResult<T, C> {
  result: T | null;
  changes: C | null;  // null если ничего не изменилось
  userErrors: UserError[];
}
```

### Product Changes (Partial Snapshot)

```typescript
interface ProductChanges {
  productId: string;

  // Product-level (только изменённые поля, только новые значения)
  product?: ProductFieldChanges;

  // Variant-level (только изменённые варианты)
  variants?: Record<string, VariantChanges>;
}

interface ProductFieldChanges {
  handle?: string;
  title?: string;
  status?: ProductStatus;
  content?: ContentChanges;
  seo?: SeoChanges;
  media?: MediaChanges;
}

interface ContentChanges {
  description?: string | null;
  excerpt?: string | null;
}

interface SeoChanges {
  title?: string | null;
  description?: string | null;
}

interface MediaChanges {
  fileIds: string[];
}

interface VariantChanges {
  pricing?: PricingChanges;
  inventory?: InventoryChanges;
  physical?: PhysicalChanges;
  media?: MediaChanges;
  options?: OptionLinkChanges[];
}

interface PricingChanges {
  currency: string;
  amount: number;
  compareAt?: number | null;
  cost?: number | null;
}

interface InventoryChanges {
  warehouseId: string;
  onHand: number;
  unavailable: number;
  sku?: string | null;
}

interface PhysicalChanges {
  width?: number;   // mm
  height?: number;  // mm
  length?: number;  // mm
  weight?: number;  // grams
}

interface OptionLinkChanges {
  optionId: string;
  valueId: string;
}
```

### Script Changes Examples

```typescript
// ProductUpdateScript returns (handle/title only)
interface ProductIdentityChanges {
  handle?: string;
  title?: string;
}

// ProductSetContentScript returns
interface ContentChanges {
  description?: string | null;
  excerpt?: string | null;
}

// ProductSetSeoScript returns
interface SeoChanges {
  title?: string | null;
  description?: string | null;
}

// VariantSetPricingScript returns (price + cost unified)
interface PricingChanges {
  currency: string;
  amount: number;
  compareAt?: number | null;
  cost?: number | null;
}

// VariantSetInventoryScript returns (includes sku)
interface InventoryChanges {
  warehouseId: string;
  onHand: number;
  unavailable: number;
  sku?: string | null;
}

// VariantSetPhysicalScript returns (dimensions + weight unified)
interface PhysicalChanges {
  width?: number;   // mm
  height?: number;  // mm
  length?: number;  // mm
  weight?: number;  // grams
}
```

### Consumer Usage

```typescript
// Consumer делает точечный UPSERT
async handleProductUpdated(event: ProductUpdatedEvent) {
  const { productId, product, variants } = event.payload;

  // Product fields - UPSERT только то что пришло
  if (product) {
    await this.db
      .update(productProjection)
      .set(product)  // partial update
      .where(eq(productProjection.id, productId));
  }

  // Variants - UPSERT каждый изменённый
  if (variants) {
    for (const [variantId, changes] of Object.entries(variants)) {
      await this.db
        .update(variantProjection)
        .set(changes)
        .where(eq(variantProjection.id, variantId));
    }
  }
}
```

---

### buildVariantHandle Helper

```typescript
// Shared helper для построения handle
async buildVariantHandle(
  tx: Transaction,
  variantIdOrLinks: string | VariantOptionLink[]
): Promise<string> {
  let links: { optionId: string; valueId: string; slug: string; sortIndex: number }[];

  if (typeof variantIdOrLinks === 'string') {
    // По variantId — загрузить текущие links
    links = await tx
      .select({
        optionId: productOptionVariantLink.optionId,
        valueId: productOptionVariantLink.optionValueId,
        slug: productOptionValue.slug,
        sortIndex: productOption.sortIndex,
      })
      .from(productOptionVariantLink)
      .innerJoin(productOptionValue, eq(productOptionValue.id, productOptionVariantLink.optionValueId))
      .innerJoin(productOption, eq(productOption.id, productOptionVariantLink.optionId))
      .where(eq(productOptionVariantLink.variantId, variantIdOrLinks));
  } else {
    // По новым links — загрузить slugs
    links = await tx
      .select({
        optionId: productOptionValue.optionId,
        valueId: productOptionValue.id,
        slug: productOptionValue.slug,
        sortIndex: productOption.sortIndex,
      })
      .from(productOptionValue)
      .innerJoin(productOption, eq(productOption.id, productOptionValue.optionId))
      .where(inArray(productOptionValue.id, variantIdOrLinks.map(l => l.optionValueId)));
  }

  // Сортировка: по sortIndex опции, затем по optionId
  return links
    .sort((a, b) => a.sortIndex - b.sortIndex || a.optionId.localeCompare(b.optionId))
    .map(l => l.slug)
    .join('-');
}
```

---

## Input/Output Types

```typescript
// src/workflows/dto/ProductUpdateWorkflowDto.ts

interface ProductUpdateWorkflowInput {
  productId: string;
  operations: ProductUpdateOperation[];
  context: WorkflowContext;
}

interface WorkflowContext {
  organizationId: string;
  projectId: string;
  storeId: string;
  userId?: string;
  locale: string;
}

// Только 2 типа операций вместо 9
type ProductUpdateOperation =
  | { type: "productUpdate"; params: ProductUpdateParams }
  | { type: "variantUpdate"; params: VariantUpdateParams };

// Product: все поля продукта в одном месте
interface ProductUpdateParams {
  id: string;
  handle?: string;
  title?: string;
  content?: { description?: DescriptionInput; excerpt?: string };
  seo?: { title?: string; description?: string };
  status?: "published" | "draft";
  media?: { fileIds: string[] };
}

// Variant: все поля варианта в одном месте
interface VariantUpdateParams {
  variantId: string;
  pricing?: {
    currency: string;
    amountMinor: number;
    compareAtMinor?: number;
    costMinor?: number;
  };
  inventory?: {
    warehouseId: string;
    onHand: number;
    unavailable?: number;
    sku?: string;
  };
  physical?: {
    width?: number;   // mm
    height?: number;  // mm
    length?: number;  // mm
    weight?: number;  // grams
  };
  media?: {
    fileIds: string[];
  };
  options?: {
    set: VariantOptionLink[];
  };
}

interface VariantOptionLink {
  optionId: string;
  optionValueId: string;
}

interface ProductUpdateWorkflowResult {
  product: { id: string } | null;
  operationResults: OperationResult[];
  userErrors: UserError[];
}

interface OperationResult {
  type: "productUpdate" | "variantUpdate";
  applied: boolean;
  errors: UserError[];
}

interface UserError {
  message: string;
  code?: string;
  field?: string[];
}
```

---

## Event Payload

```typescript
// packages/events/src/types.ts

interface ProductUpdatedEvent extends DomainEvent<
  "productUpdated",
  ProductUpdatedPayload
> {}

interface ProductUpdatedPayload {
  productId: string;
  storeId: string;
  revision: number;  // новый revision после обновления
  // Partial snapshot: только изменённые поля с новыми значениями
  product?: ProductFieldChanges;
  variants?: Record<string, VariantChanges>;
}
```

### Почему Partial Snapshot

| Аспект          | Full Snapshot        | Partial Snapshot                   |
| --------------- | -------------------- | ---------------------------------- |
| Размер payload  | Большой              | Минимальный                        |
| ECST            | ✅ полный            | ✅ достаточный для UPSERT          |
| Consumer логика | UPSERT всего         | Точечный UPSERT изменённых полей   |
| Callback нужен? | Нет                  | Нет                                |
| Лишние данные   | Да (неизменённые)    | Нет                                |

---

## Workflow Implementation

```typescript
// src/workflows/ProductUpdateWorkflow.ts

@Injectable()
export class ProductUpdateWorkflow extends BrokerWorkflows {
  @Workflow("productUpdate")
  async run(
    input: ProductUpdateWorkflowInput,
  ): Promise<ProductUpdateWorkflowResult> {
    const results: OperationResult[] = [];
    const changes: ProductChanges = { productId: input.productId };

    // 1. Acquire revision (atomic compare-and-swap)
    const acquired = await this.stepAcquireRevision(
      input.productId,
      input.expectedRevision,
    );
    if ("error" in acquired) {
      return {
        product: null,
        operationResults: [],
        userErrors: [acquired.error],
      };
    }
    const { revision } = acquired;

    // 2. Run operations, collect changes
    for (const op of input.operations) {
      const result =
        op.type === "productUpdate"
          ? await this.stepProductUpdate(op.params, changes)
          : await this.stepVariantUpdate(op.params, changes);
      results.push(result);
    }

    // 3. Emit event with partial snapshot + new revision
    const hasChanges = changes.product || changes.variants;
    if (hasChanges) {
      await this.stepEmitEvent(input, changes, revision);
    }

    return {
      product: { id: input.productId, revision },
      operationResults: results,
      userErrors: results.flatMap((r) => r.errors),
    };
  }

  @WorkflowStep()
  private async stepProductUpdate(
    params: ProductUpdateParams,
    changes: ProductChanges,
  ): Promise<OperationResult> {
    const errors: UserError[] = [];
    const { id, handle, title, content, seo, status, media } = params;

    // Identity fields (handle, title)
    if (handle !== undefined || title !== undefined) {
      const r = await this.kernel.runScript(ProductUpdateScript, { id, handle, title });
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, ...r.changes };
      }
    }

    // Content fields (description, excerpt)
    if (content) {
      const r = await this.kernel.runScript(ProductSetContentScript, {
        id,
        ...content,
      });
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, content: r.changes };
      }
    }

    // SEO fields
    if (seo) {
      const r = await this.kernel.runScript(ProductSetSeoScript, {
        id,
        ...seo,
      });
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, seo: r.changes };
      }
    }

    // Status change
    if (status) {
      const r = await this.kernel.runScript(ProductSetStatusScript, {
        id,
        action: status,
      });
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, status: r.changes.status };
      }
    }

    // Media
    if (media) {
      const r = await this.kernel.runScript(ProductSetMediaScript, {
        id,
        ...media,
      });
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, media: r.changes };
      }
    }

    return {
      type: "productUpdate",
      applied: errors.length === 0,
      errors,
    };
  }

  @WorkflowStep()
  private async stepVariantUpdate(
    params: VariantUpdateParams,
    changes: ProductChanges,
  ): Promise<OperationResult> {
    const errors: UserError[] = [];
    const { variantId, pricing, inventory, physical, media, options } = params;

    // Helper to merge variant changes
    const mergeVariantChanges = (c: Partial<VariantChanges>) => {
      changes.variants = changes.variants || {};
      changes.variants[variantId] = { ...changes.variants[variantId], ...c };
    };

    if (pricing) {
      const r = await this.kernel.runScript(VariantSetPricingScript, { variantId, ...pricing });
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ pricing: r.changes });
    }

    if (inventory) {
      const r = await this.kernel.runScript(VariantSetInventoryScript, { variantId, ...inventory });
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ inventory: r.changes });
    }

    if (physical) {
      const r = await this.kernel.runScript(VariantSetPhysicalScript, { variantId, ...physical });
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ physical: r.changes });
    }

    if (media) {
      const r = await this.kernel.runScript(VariantSetMediaScript, { variantId, ...media });
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ media: r.changes });
    }

    if (options) {
      const r = await this.kernel.runScript(VariantSetOptionsScript, { variantId, links: options.set });
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ options: r.changes });
    }

    return {
      type: "variantUpdate",
      applied: errors.length === 0,
      errors,
    };
  }

  @WorkflowStep()
  private async stepEmitEvent(
    input: ProductUpdateWorkflowInput,
    changes: ProductChanges,
    revision: number,
  ): Promise<void> {
    await this.broker.emit("productUpdated", {
      productId: input.productId,
      storeId: input.context.storeId,
      revision,
      product: changes.product,
      variants: changes.variants,
    });
  }
}
```

---

## Files Status

### To Create

- `src/workflows/dto/ProductUpdateWorkflowDto.ts` - Input/Output + Delta types
- `src/workflows/ProductUpdateWorkflow.ts`
- `src/scripts/types/ScriptResult.ts` - Base result type
- `src/scripts/types/ProductChanges.ts` - Changes types
- `src/scripts/product/ProductSetContentScript.ts` - description/excerpt update
- `src/scripts/product/ProductSetSeoScript.ts` - SEO update
- `src/scripts/variant/VariantSetPhysicalScript.ts` - unified dimensions+weight
- `src/scripts/variant/VariantSetInventoryScript.ts` - stock+sku update
- `src/scripts/variant/VariantSetOptionsScript.ts` - collision-safe options update
- `src/scripts/variant/helpers/buildVariantHandle.ts` - shared helper for handle generation

### To Modify

- `packages/events/src/types.ts` - ProductUpdatedEvent with delta (не snapshot)
- `src/resolvers/admin/MutationResolver.ts` - use workflow
- `src/workflows/ProductBulkEditWorkflow.ts` - emit events after finalization
- `src/scripts/option/OptionUpdateScript.ts` - rebuild variant handles when value slug changes
- `src/repositories/models/products.ts` - ensure unique constraint on `(productId, handle)`, add `revision` column
- **Все существующие скрипты** - добавить возврат delta

### Scripts to Update (add changes return)

| Script                      | Changes (new values)                        |
| --------------------------- | ------------------------------------------- |
| `ProductUpdateScript`       | { handle?, title? }                         |
| `ProductSetContentScript`   | { description?, excerpt? }                  |
| `ProductSetSeoScript`       | { title?, description? }                    |
| `ProductSetStatusScript`    | { status }                                  |
| `ProductSetMediaScript`     | { fileIds }                                 |
| `VariantSetPricingScript`   | { currency, amount, compareAt?, cost? }     |
| `VariantSetInventoryScript` | { warehouseId, onHand, unavailable, sku? }  |
| `VariantSetPhysicalScript`  | { width?, height?, length?, weight? }       |
| `VariantSetMediaScript`     | { fileIds }                                 |
| `VariantSetOptionsScript`   | [{ optionId, valueId }]                     |

---

## Script Implementation Examples

### Pattern: Script with Changes Return

```typescript
// Общий паттерн для всех скриптов
interface ScriptResultWithChanges<T, C> {
  result: T | null;
  changes: C | null;  // null если ничего не изменилось
  userErrors: UserError[];
}

// Пример: VariantSetPricingScript
interface VariantSetPricingParams {
  variantId: string;
  currency: string;
  amountMinor: number;
  compareAtMinor?: number;
}

// Changes = новые значения (partial snapshot для ECST)
interface PricingChanges {
  currency: string;
  amount: number;
  compareAt?: number | null;
}

@Injectable()
export class VariantSetPricingScript extends Script<
  VariantSetPricingParams,
  ScriptResultWithChanges<VariantPrice, PricingChanges>
> {
  async run(params: VariantSetPricingParams) {
    const { variantId, currency, amountMinor, compareAtMinor } = params;

    return await this.db.transaction(async (tx) => {
      // 1. Load current price
      const [current] = await tx
        .select()
        .from(variantPrice)
        .where(and(
          eq(variantPrice.variantId, variantId),
          eq(variantPrice.currency, currency),
        ));

      // 2. Check if values actually changed
      const amountChanged = !current || current.amountMinor !== amountMinor;
      const compareAtChanged = compareAtMinor !== undefined &&
        (current?.compareAtMinor ?? null) !== compareAtMinor;

      if (!amountChanged && !compareAtChanged) {
        return { result: current, changes: null, userErrors: [] };
      }

      // 3. Upsert
      const [updated] = await tx
        .insert(variantPrice)
        .values({ variantId, currency, amountMinor, compareAtMinor })
        .onConflictDoUpdate({
          target: [variantPrice.variantId, variantPrice.currency],
          set: { amountMinor, compareAtMinor },
        })
        .returning();

      // 4. Return new values (partial snapshot)
      const changes: PricingChanges = {
        currency,
        amount: updated.amountMinor,
        compareAt: updated.compareAtMinor,
      };

      return { result: updated, changes, userErrors: [] };
    });
  }
}
```

---

## VariantSetOptionsScript Implementation

```typescript
// src/scripts/variant/VariantSetOptionsScript.ts

interface VariantSetOptionsParams {
  variantId: string;
  links: { optionId: string; optionValueId: string }[];
}

// Changes = новый список опций (partial snapshot)
type OptionsChanges = { optionId: string; valueId: string }[];

interface VariantSetOptionsResult {
  result: Variant | null;
  changes: OptionsChanges | null;
  userErrors: UserError[];
}

@Injectable()
export class VariantSetOptionsScript extends Script<
  VariantSetOptionsParams,
  VariantSetOptionsResult
> {
  async run(params: VariantSetOptionsParams): Promise<VariantSetOptionsResult> {
    const { variantId, links } = params;

    return await this.db.transaction(async (tx) => {
      // 1. Load variant
      const existingVariant = await tx
        .select()
        .from(variantTable)
        .where(eq(variantTable.id, variantId))
        .then((rows) => rows[0]);

      if (!existingVariant) {
        return {
          result: null,
          changes: null,
          userErrors: [{ message: "Variant not found", code: "NOT_FOUND" }],
        };
      }

      // 2. Load current links
      const currentLinks = await tx
        .select({
          optionId: productOptionVariantLinkTable.optionId,
          valueId: productOptionVariantLinkTable.optionValueId,
        })
        .from(productOptionVariantLinkTable)
        .where(eq(productOptionVariantLinkTable.variantId, variantId));

      // 3. Check if links are the same (no change needed)
      const newLinksSet = new Set(links.map(l => `${l.optionId}:${l.optionValueId}`));
      const oldLinksSet = new Set(currentLinks.map(l => `${l.optionId}:${l.valueId}`));
      const isSame = newLinksSet.size === oldLinksSet.size &&
        [...newLinksSet].every(l => oldLinksSet.has(l));

      if (isSame) {
        return { result: existingVariant, changes: null, userErrors: [] };
      }

      // 4. Validate options/values belong to product
      const errors = await this.validateLinks(tx, existingVariant.productId, links);
      if (errors.length > 0) {
        return { result: null, changes: null, userErrors: errors };
      }

      // 5. Build new handle from value slugs
      const newHandle = await this.buildVariantHandle(tx, links);

      try {
        // 6. Update handle (unique constraint prevents duplicates)
        await tx
          .update(variantTable)
          .set({ handle: newHandle })
          .where(eq(variantTable.id, variantId));

        // 7. Replace links
        await tx
          .delete(productOptionVariantLinkTable)
          .where(eq(productOptionVariantLinkTable.variantId, variantId));

        if (links.length > 0) {
          await tx.insert(productOptionVariantLinkTable).values(
            links.map((link) => ({
              projectId: existingVariant.projectId,
              variantId,
              optionId: link.optionId,
              optionValueId: link.optionValueId,
            })),
          );
        }

        const [updatedVariant] = await tx
          .select()
          .from(variantTable)
          .where(eq(variantTable.id, variantId));

        // 8. Return new options (partial snapshot)
        const changes: OptionsChanges = links.map(l => ({
          optionId: l.optionId,
          valueId: l.optionValueId,
        }));

        return { result: updatedVariant, changes, userErrors: [] };
      } catch (e) {
        if (isUniqueViolation(e, "variant_product_id_handle_key")) {
          return {
            result: null,
            changes: null,
            userErrors: [
              {
                message: "Another variant already has this option combination",
                code: "DUPLICATE_COMBINATION",
                field: ["options", "set"],
              },
            ],
          };
        }
        throw e;
      }
    });
  }

  private async validateLinks(
    tx: Transaction,
    productId: string,
    links: VariantOptionLink[],
  ): Promise<UserError[]> {
    const errors: UserError[] = [];

    // Load product options
    const productOptions = await tx
      .select({ id: productOptionTable.id })
      .from(productOptionTable)
      .where(eq(productOptionTable.productId, productId));

    const validOptionIds = new Set(productOptions.map((o) => o.id));

    // Load option values
    const values = await tx
      .select({
        id: productOptionValueTable.id,
        optionId: productOptionValueTable.optionId,
      })
      .from(productOptionValueTable)
      .where(
        inArray(
          productOptionValueTable.id,
          links.map((l) => l.optionValueId),
        ),
      );

    const valueToOption = new Map(values.map((v) => [v.id, v.optionId]));

    for (const link of links) {
      if (!validOptionIds.has(link.optionId)) {
        errors.push({
          message: `Invalid option`,
          code: "INVALID_OPTION",
          field: ["options", "set"],
        });
        continue;
      }
      const actualOptionId = valueToOption.get(link.optionValueId);
      if (!actualOptionId) {
        errors.push({
          message: `Value not found`,
          code: "VALUE_NOT_FOUND",
          field: ["options", "set"],
        });
      } else if (actualOptionId !== link.optionId) {
        errors.push({
          message: `Value/option mismatch`,
          code: "VALUE_OPTION_MISMATCH",
          field: ["options", "set"],
        });
      }
    }

    return errors;
  }
}
```

### Error Codes

| Code                    | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `NOT_FOUND`             | Variant не найден                                       |
| `INVALID_OPTION`        | Option не принадлежит продукту                          |
| `VALUE_NOT_FOUND`       | Option value не существует                              |
| `VALUE_OPTION_MISMATCH` | Value не принадлежит указанному option                  |
| `DUPLICATE_COMBINATION` | Unique constraint violation — комбинация уже существует |

### Database Requirements

Убедиться что есть unique constraint:

```sql
ALTER TABLE variant ADD CONSTRAINT variant_product_id_handle_key UNIQUE (product_id, handle);
```
