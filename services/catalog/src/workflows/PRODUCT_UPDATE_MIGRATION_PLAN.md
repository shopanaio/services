# Product Update Migration Plan

План миграции скриптов и GraphQL схемы на новую архитектуру ProductUpdateWorkflow.

## Обзор изменений

### Ключевые изменения API

| Аспект                    | Было                      | Станет                                                     |
| ------------------------- | ------------------------- | ---------------------------------------------------------- |
| Script return             | `{ entity, userErrors }`  | `{ result, changes, userErrors }`                          |
| Variant pricing           | `VariantSetPricingScript` | Только price (amount/compareAt), без cost                  |
| Variant dimensions        | `VariantSetDimensionsScript` | Только dimensions (width/height/length)                 |
| Variant stock/sku/weight/cost | Разные скрипты        | 1 unified `VariantSetInventoryScript` (stock+sku+weight+cost) |
| Variant options           | Нет (только при создании) | Новый `VariantSetOptionsScript`                            |
| Event emission            | Нет                       | Workflow эмитит `productUpdated` с partial snapshot        |
| Concurrency               | Нет                       | Optimistic locking через revision                          |

---

## Phase 1: Database Schema

### 1.1 Product Revision Column

```sql
-- Добавить revision для optimistic locking
ALTER TABLE product ADD COLUMN revision integer NOT NULL DEFAULT 0;

-- Index для быстрой проверки
CREATE INDEX idx_product_revision ON product(id, revision);
```

**Файл:** `services/inventory/src/repositories/models/products.ts`

```typescript
// Добавить поле
revision: integer("revision").notNull().default(0),
```

### 1.2 Variant Handle Unique Constraint

```sql
-- Уникальность комбинации опций
ALTER TABLE variant ADD CONSTRAINT variant_product_id_handle_key
  UNIQUE (product_id, handle);
```

**Файл:** `services/inventory/src/repositories/models/variants.ts`

```typescript
// Добавить unique constraint
.unique("variant_product_id_handle_key", [t.productId, t.handle])
```

### 1.3 Migration File

**Создать:** `services/inventory/drizzle/XXXX_add_revision_and_handle_unique.sql`

---

## Phase 2: Base Types

### 2.1 Script Result Type

**Создать:** `services/inventory/src/scripts/types/ScriptResult.ts`

```typescript
/**
 * Базовый тип результата скрипта с поддержкой changes для event sourcing.
 *
 * @template T - Тип основного результата (entity)
 * @template C - Тип изменений (partial snapshot для events)
 */
export interface ScriptResult<T, C = never> {
  /** Результат операции (entity или null при ошибке) */
  result: T | null;

  /** Изменения для event payload (null если ничего не изменилось) */
  changes: C | null;

  /** Ошибки валидации */
  userErrors: UserError[];
}

export interface UserError {
  message: string;
  code?: string;
  field?: string[];
}
```

### 2.2 Changes Types

**Создать:** `services/inventory/src/scripts/types/ProductChanges.ts`

```typescript
export interface ProductChanges {
  productId: string;

  /** Product-level changes (только изменённые поля) */
  product?: ProductFieldChanges;

  /** Variant-level changes (только изменённые варианты) */
  variants?: Record<string, VariantChanges>;
}

export interface ProductFieldChanges {
  handle?: string;
  title?: string;
  status?: "draft" | "published";
  content?: ContentChanges;
  seo?: SeoChanges;
  media?: MediaChanges;
}

export interface ContentChanges {
  description?: string | null;
  excerpt?: string | null;
}

export interface SeoChanges {
  title?: string | null;
  description?: string | null;
}

export interface MediaChanges {
  fileIds: string[];
}

export interface VariantChanges {
  pricing?: PricingChanges;
  inventory?: InventoryChanges;
  physical?: PhysicalChanges;
  media?: MediaChanges;
  options?: OptionLinkChanges[];
}

export interface PricingChanges {
  currency: string;
  amount: number;
  compareAt?: number | null;
}

export interface InventoryChanges {
  warehouseId: string;
  onHand: number;
  unavailable: number;
  sku?: string | null;
  weight?: number | null;
  unitCostMinor?: number | null;
  costCurrency?: string | null;
}

export interface PhysicalChanges {
  width?: number; // mm
  height?: number; // mm
  length?: number; // mm
  weight?: number; // grams
}

export interface DimensionsChanges {
  width: number;
  height: number;
  length: number;
}

export interface OptionLinkChanges {
  optionId: string;
  valueId: string;
}
```

---

## Phase 3: Script Updates

### 3.1 ProductUpdateScript

**Файл:** `services/inventory/src/scripts/product/ProductUpdateScript.ts`

| Аспект      | Было                  | Станет                                            |
| ----------- | --------------------- | ------------------------------------------------- |
| Return type | `ProductUpdateResult` | `ScriptResult<Product, ProductIdentityChanges>`   |
| Changes     | Нет                   | `{ handle?, title? }`                             |

**Изменения:**

```typescript
// Было
interface ProductUpdateResult {
  product: Product | null;
  userErrors: UserError[];
}

// Станет
interface ProductIdentityChanges {
  handle?: string;
  title?: string;
}

type ProductUpdateResult = ScriptResult<Product, ProductIdentityChanges>;
```

**Логика:**

1. Загрузить текущий продукт
2. Сравнить handle/title с текущими
3. Обновить только изменённые
4. Вернуть `changes` только с реально изменёнными полями

---

### 3.2 ProductSetContentScript (NEW)

**Создать:** `services/inventory/src/scripts/product/ProductSetContentScript.ts`

| Аспект      | Было | Станет                                     |
| ----------- | ---- | ------------------------------------------ |
| Return type | N/A  | `ScriptResult<Product, ContentChanges>`    |
| Changes     | N/A  | `{ description?, excerpt? }`               |

**Новый интерфейс:**

```typescript
interface ProductSetContentParams {
  id: string;
  description?: DescriptionInput;
  excerpt?: string;
}

interface ContentChanges {
  description?: string | null;
  excerpt?: string | null;
}

type ProductSetContentResult = ScriptResult<Product, ContentChanges>;
```

**Логика:**

1. Загрузить текущий продукт
2. Сравнить description/excerpt с текущими
3. Обновить только изменённые
4. Вернуть `changes` только с реально изменёнными полями

---

### 3.4 ProductSetSeoScript (NEW)

**Создать:** `services/inventory/src/scripts/product/ProductSetSeoScript.ts`

| Аспект      | Было | Станет                                |
| ----------- | ---- | ------------------------------------- |
| Return type | N/A  | `ScriptResult<Product, SeoChanges>`   |
| Changes     | N/A  | `{ title?: string, description?: string }` |

**Новый интерфейс:**

```typescript
interface ProductSetSeoParams {
  id: string;
  title?: string;
  description?: string;
}

interface SeoChanges {
  title?: string | null;
  description?: string | null;
}

type ProductSetSeoResult = ScriptResult<Product, SeoChanges>;
```

**Логика:**

1. Загрузить текущий продукт
2. Сравнить SEO поля с текущими
3. Обновить только изменённые
4. Вернуть `changes` только с реально изменёнными полями

---

### 3.5 ProductSetStatusScript

**Файл:** `services/inventory/src/scripts/product/ProductSetStatusScript.ts`

| Аспект      | Было                               | Станет                                             |
| ----------- | ---------------------------------- | -------------------------------------------------- |
| Input       | `action: "PUBLISH" \| "UNPUBLISH"` | `action: "published" \| "draft"`                   |
| Return type | `ProductSetStatusResult`           | `ScriptResult<Product, { status: ProductStatus }>` |

**Изменения:**

```typescript
// Было
interface ProductSetStatusParams {
  productId: string;
  action: "PUBLISH" | "UNPUBLISH";
}

// Станет
interface ProductSetStatusParams {
  id: string;
  action: "published" | "draft";
}

type StatusChanges = { status: "published" | "draft" };
type ProductSetStatusResult = ScriptResult<Product, StatusChanges>;
```

---

### 3.6 ProductSetMediaScript

**Файл:** `services/inventory/src/scripts/product/ProductSetMediaScript.ts`

| Аспект      | Было                    | Станет                                    |
| ----------- | ----------------------- | ----------------------------------------- |
| Input       | `fileIds`               | `fileIds` (без изменений)                 |
| Return type | `ProductSetMediaResult` | `ScriptResult<Product, MediaChanges>`     |

**Изменения:**

```typescript
interface MediaChanges {
  fileIds: string[];
}

type ProductSetMediaResult = ScriptResult<Product, MediaChanges>;
```

---

### 3.7 VariantSetPricingScript

**Файл:** `services/inventory/src/scripts/variant/VariantSetPricingScript.ts`

**Изменения:** Только price (amountMinor, compareAtMinor). Cost перенесён в VariantSetInventoryScript.

| Аспект      | Было                      | Станет                                       |
| ----------- | ------------------------- | -------------------------------------------- |
| Input       | price только              | price только (без cost)                      |
| Return type | `VariantSetPricingResult` | `ScriptResult<ItemPricing, PricingChanges>`  |

**Интерфейс:**

```typescript
interface VariantSetPricingParams {
  variantId: string;
  currency: string;
  amountMinor: number;
  compareAtMinor?: number | null;
}

interface PricingChanges {
  currency: string;
  amount: number;
  compareAt?: number | null;
}

type VariantSetPricingResult = ScriptResult<ItemPricing, PricingChanges>;
```

**Статус:** ✅ Готово

---

### 3.8 VariantSetInventoryScript (UNIFIED)

**Файл:** `services/inventory/src/scripts/variant/VariantSetInventoryScript.ts`

**Объединяет:** stock, sku, weight, и cost в один скрипт.

| Аспект      | Было                        | Станет                                           |
| ----------- | --------------------------- | ------------------------------------------------ |
| Name        | Разные скрипты              | `VariantSetInventoryScript`                      |
| Input       | Разные параметры            | `onHand`, `unavailable?`, `sku?`, `weight?`, `unitCostMinor?`, `costCurrency?` |
| Return type | Разные типы                 | `ScriptResult<WarehouseStock, InventoryChanges>` |

**Интерфейс:**

```typescript
interface VariantSetInventoryParams {
  variantId: string;
  warehouseId: string;
  onHand: number;
  unavailable?: number;
  sku?: string | null;
  weight?: number | null;        // в граммах
  unitCostMinor?: number | null; // себестоимость в minor units
  costCurrency?: string | null;  // валюта себестоимости
}

interface InventoryChanges {
  warehouseId: string;
  onHand: number;
  unavailable: number;
  sku?: string | null;
  weight?: number | null;
  unitCostMinor?: number | null;
  costCurrency?: string | null;
}

type VariantSetInventoryResult = ScriptResult<WarehouseStock, InventoryChanges>;
```

**Статус:** ✅ Готово

---

### 3.9 VariantSetDimensionsScript

**Файл:** `services/inventory/src/scripts/variant/VariantSetDimensionsScript.ts`

**Изменения:** Только dimensions (width, height, length). Weight перенесён в VariantSetInventoryScript.

**Интерфейс:**

```typescript
interface VariantSetDimensionsParams {
  variantId: string;
  width: number;  // mm
  height: number; // mm
  length: number; // mm
}

interface DimensionsChanges {
  width: number;
  height: number;
  length: number;
}

type VariantSetDimensionsResult = ScriptResult<VariantDimensions, DimensionsChanges>;
```

**Примечание:** Weight обрабатывается в `VariantSetInventoryScript`, а не здесь.

**Статус:** ✅ Готово

---

### 3.10 VariantSetMediaScript

**Файл:** `services/inventory/src/scripts/variant/VariantSetMediaScript.ts`

| Аспект      | Было                    | Станет                                  |
| ----------- | ----------------------- | --------------------------------------- |
| Return type | `VariantSetMediaResult` | `ScriptResult<Variant, MediaChanges>`   |

**Изменения:**

```typescript
interface MediaChanges {
  fileIds: string[];
}

type VariantSetMediaResult = ScriptResult<Variant, MediaChanges>;
```

---

### 3.11 VariantSetOptionsScript (NEW)

**Создать:** `services/inventory/src/scripts/variant/VariantSetOptionsScript.ts`

Полная реализация в дизайн документе. Ключевые моменты:

- Collision-safe через unique constraint на `(productId, handle)`
- Handle = sorted slugs опций
- Validates option/value ownership

```typescript
interface VariantSetOptionsParams {
  variantId: string;
  links: { optionId: string; optionValueId: string }[];
}

type OptionsChanges = { optionId: string; valueId: string }[];

type VariantSetOptionsResult = ScriptResult<Variant, OptionsChanges>;
```

---

### 3.12 buildVariantHandle Helper

**Создать:** `services/inventory/src/scripts/variant/helpers/buildVariantHandle.ts`

Shared helper для построения handle из option values. Используется в:

- `VariantSetOptionsScript`
- `OptionValueUpdateScript` (при изменении slug)

---

## Phase 4: Workflow

### 4.1 ProductUpdateWorkflow

**Создать:** `services/inventory/src/workflows/ProductUpdateWorkflow.ts`

См. полную реализацию в дизайн документе.

**Ключевые шаги:**

1. `stepAcquireRevision()` - atomic compare-and-swap
2. `stepProductUpdate()` / `stepVariantUpdate()` - run scripts, collect changes
3. `stepEmitEvent()` - emit `productUpdated` with partial snapshot

### 4.2 ProductUpdateWorkflowDto

**Создать:** `services/inventory/src/workflows/dto/ProductUpdateWorkflowDto.ts`

```typescript
interface ProductUpdateWorkflowInput {
  productId: string;
  expectedRevision?: number;
  operations: ProductUpdateOperation[];
  context: WorkflowContext;
}

type ProductUpdateOperation =
  | { type: "productUpdate"; params: ProductUpdateParams }
  | { type: "variantUpdate"; params: VariantUpdateParams };

interface ProductUpdateParams {
  id: string;
  handle?: string;
  title?: string;
  content?: { description?: DescriptionInput; excerpt?: string };
  seo?: { title?: string; description?: string };
  status?: "published" | "draft";
  media?: { fileIds: string[] };
}

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
    width?: number;
    height?: number;
    length?: number;
    weight?: number;
  };
  media?: { fileIds: string[] };
  options?: { set: { optionId: string; optionValueId: string }[] };
}

interface ProductUpdateWorkflowResult {
  product: { id: string; revision: number } | null;
  operationResults: OperationResult[];
  userErrors: UserError[];
}
```

---

## Phase 5: Events

### 5.1 ProductUpdatedEvent

**Файл:** `packages/events/src/types.ts`

```typescript
interface ProductUpdatedEvent extends DomainEvent<
  "productUpdated",
  ProductUpdatedPayload
> {}

interface ProductUpdatedPayload {
  productId: string;
  storeId: string;
  revision: number;
  product?: ProductFieldChanges;
  variants?: Record<string, VariantChanges>;
}
```

---

## Phase 6: GraphQL Schema

### 6.1 Product Revision

**Файл:** `services/inventory/src/api/graphql-admin/schema/product.graphql`

```graphql
type Product {
  # ... existing fields
  revision: Int! # NEW
}
```

### 6.2 ProductUpdate Mutation (Unified)

**Файл:** `services/inventory/src/api/graphql-admin/schema/product.graphql`

```graphql
# NEW: Unified product update with operations
input ProductUpdateOperationInput {
  productUpdate: ProductUpdateOpInput
  variantUpdate: VariantUpdateOpInput
}

input ProductUpdateOpInput {
  id: ID!
  handle: String
  title: String
  content: ProductContentInput
  seo: ProductSeoInput
  status: ProductStatus # "DRAFT" | "PUBLISHED"
  media: ProductMediaInput
}

input ProductContentInput {
  description: DescriptionInput
  excerpt: String
}

input ProductMediaInput {
  fileIds: [ID!]!
}

input VariantUpdateOpInput {
  variantId: ID!
  pricing: VariantPricingInput
  inventory: VariantInventoryInput
  dimensions: VariantDimensionsInput
  media: VariantMediaInput
  options: VariantOptionsInput
}

input VariantPricingInput {
  currency: CurrencyCode!
  amountMinor: BigInt!
  compareAtMinor: BigInt
}

input VariantInventoryInput {
  warehouseId: ID!
  onHand: Int!
  unavailable: Int
  sku: String
  weight: Int              # grams
  unitCostMinor: BigInt    # cost in minor units
  costCurrency: CurrencyCode # cost currency
}

input VariantDimensionsInput {
  width: Int!  # mm
  height: Int! # mm
  length: Int! # mm
}

input VariantMediaInput {
  fileIds: [ID!]!
}

input VariantOptionsInput {
  set: [VariantOptionLinkInput!]!
}

input VariantOptionLinkInput {
  optionId: ID!
  optionValueId: ID!
}

# NEW: Unified mutation
type Mutation {
  productUpdate(
    productId: ID!
    expectedRevision: Int
    operations: [ProductUpdateOperationInput!]!
  ): ProductUpdatePayload!
}

type ProductUpdatePayload {
  product: Product
  operationResults: [OperationResult!]!
  userErrors: [GenericUserError!]!
}

type OperationResult {
  type: OperationType!
  applied: Boolean!
  errors: [GenericUserError!]!
}

enum OperationType {
  PRODUCT_UPDATE
  VARIANT_UPDATE
}
```

### 6.3 Финальное API (без deprecations)

Старые мутации (`variantSetSku`, `variantSetCost`, `variantSetStock`, `variantSetWeight`) удалены.

Новое API:
```graphql
type Mutation {
  # Product mutations
  productUpdate(input: ProductUpdateInput!): ProductUpdatePayload!
  productSetStatus(input: ProductSetStatusInput!): ProductSetStatusPayload!
  productSetMedia(input: ProductSetMediaInput!): ProductSetMediaPayload!

  # Variant mutations
  variantSetPricing(input: VariantSetPricingInput!): VariantSetPricingPayload!
  variantSetDimensions(input: VariantSetDimensionsInput!): VariantSetDimensionsPayload!
  variantSetInventory(input: VariantSetInventoryInput!): VariantSetInventoryPayload!
  variantSetOptions(input: VariantSetOptionsInput!): VariantSetOptionsPayload!
  variantSetMedia(input: VariantSetMediaInput!): VariantSetMediaPayload!
}
```

---

## Phase 7: Resolver Updates

### 7.1 MutationResolver

**Файл:** `services/inventory/src/resolvers/admin/MutationResolver.ts`

```typescript
// NEW: Add productUpdate mutation
@Mutation(() => ProductUpdatePayload)
async productUpdate(
  @Args("productId") productId: string,
  @Args("expectedRevision", { nullable: true }) expectedRevision: number | undefined,
  @Args("operations", { type: () => [ProductUpdateOperationInput] }) operations: ProductUpdateOperationInput[],
  @Ctx() ctx: GraphQLContext,
): Promise<ProductUpdatePayload> {
  return this.kernel.runWorkflow(ProductUpdateWorkflow, {
    productId,
    expectedRevision,
    operations: this.mapOperations(operations),
    context: this.buildContext(ctx),
  });
}
```

---

## Phase 8: BulkEdit Integration

### 8.1 Update BulkEditOperationWorkflow

**Файл:** `services/inventory/src/workflows/BulkEditOperationWorkflow.ts`

Обновить для использования новых unified скриптов:

| Старый opType          | Новый скрипт                                         |
| ---------------------- | ---------------------------------------------------- |
| `variantSetSku`        | `VariantSetInventoryScript` (с sku)                  |
| `variantSetPricing`    | `VariantSetPricingScript` (price only)               |
| `variantSetCost`       | `VariantSetInventoryScript` (с unitCostMinor)        |
| `variantSetStock`      | `VariantSetInventoryScript` (с onHand/unavailable)   |
| `variantSetWeight`     | `VariantSetInventoryScript` (с weight)               |
| `variantSetDimensions` | `VariantSetDimensionsScript`                         |

### 8.2 Update BulkUpdateOpType Enum

```graphql
enum BulkUpdateOpType {
  PRODUCT_UPDATE
  PRODUCT_SET_STATUS # @deprecated
  VARIANT_UPDATE # NEW: unified
  # Deprecated individual types
  VARIANT_SET_SKU @deprecated
  VARIANT_SET_PRICING @deprecated
  VARIANT_SET_COST @deprecated
  VARIANT_SET_STOCK @deprecated
  VARIANT_SET_DIMENSIONS @deprecated
  VARIANT_SET_WEIGHT @deprecated
}
```

---

## Phase 9: Option Value Update

### 9.1 OptionValueUpdateScript

**Файл:** `services/inventory/src/scripts/option/OptionValueUpdateScript.ts`

Добавить rebuild variant handles при изменении slug:

```typescript
// После обновления slug
if (params.slug && params.slug !== current.slug) {
  // Найти все варианты с этим value
  const affectedVariantIds = await tx
    .select({ variantId: productOptionVariantLink.variantId })
    .from(productOptionVariantLink)
    .where(eq(productOptionVariantLink.optionValueId, params.id));

  // Пересчитать handle для каждого
  for (const { variantId } of affectedVariantIds) {
    const newHandle = await buildVariantHandle(tx, variantId);
    await tx
      .update(variant)
      .set({ handle: newHandle })
      .where(eq(variant.id, variantId));
  }
}
```

---

## Implementation Order

### Stage 1: Foundation (Non-breaking)

1. [ ] Database migration (revision, handle unique)
2. [ ] Base types (`ScriptResult`, changes types)
3. [ ] `buildVariantHandle` helper

### Stage 2: Script Updates (Non-breaking)

4. [ ] Update `ProductUpdateScript` (handle/title only, add changes return)
5. [ ] Create `ProductSetContentScript` (new, description/excerpt)
6. [ ] Create `ProductSetSeoScript` (new)
7. [ ] Update `ProductSetStatusScript` (add changes return)
8. [ ] Update `ProductSetMediaScript` (add changes return)
9. [ ] Update `VariantSetDimensionsScript` (dimensions only, add changes)
10. [ ] Update `VariantSetPricingScript` (price only, add changes)
11. [ ] Create `VariantSetInventoryScript` (unified: stock + sku + weight + cost)
12. [ ] Update `VariantSetMediaScript` (add changes return)
13. [ ] Create `VariantSetOptionsScript` (new)

### Stage 3: Workflow & Events

14. [ ] Create `ProductUpdateWorkflowDto`
15. [ ] Create `ProductUpdateWorkflow`
16. [ ] Add `ProductUpdatedEvent` type

### Stage 4: GraphQL Updates

17. [ ] Add `revision` to Product type
18. [ ] Add new unified input types
19. [ ] Add `productUpdate` mutation
20. [ ] Add deprecation notices

### Stage 5: Integration

21. [ ] Update `MutationResolver`
22. [ ] Update `BulkEditOperationWorkflow`
23. [ ] Update `OptionValueUpdateScript`

### Stage 6: Cleanup (Complete ✅)

24. [x] Remove deprecated scripts (VariantSetCost/Sku/Stock/Weight)
25. [x] Remove deprecated mutations (variantSetCost/Sku/Stock/Weight)
26. [ ] Update frontend clients

---

## Files Summary

### To Create

| File                                                | Description               |
| --------------------------------------------------- | ------------------------- |
| `src/scripts/types/ScriptResult.ts`                 | Base result type          |
| `src/scripts/types/ProductChanges.ts`               | Changes types             |
| `src/scripts/product/ProductSetContentScript.ts`    | Content update (new)      |
| `src/scripts/product/ProductSetSeoScript.ts`        | SEO update (new)          |
| `src/scripts/variant/VariantSetDimensionsScript.ts` | Dimensions only           |
| `src/scripts/variant/VariantSetInventoryScript.ts`  | Unified stock+sku+weight+cost |
| `src/scripts/variant/VariantSetOptionsScript.ts`    | Options update            |
| `src/scripts/variant/helpers/buildVariantHandle.ts` | Handle builder            |
| `src/workflows/ProductUpdateWorkflow.ts`            | Main workflow             |
| `src/workflows/dto/ProductUpdateWorkflowDto.ts`     | Workflow types            |
| `drizzle/XXXX_add_revision_and_handle_unique.sql`   | DB migration              |

### To Modify

| File                                             | Changes                              |
| ------------------------------------------------ | ------------------------------------ |
| `src/scripts/product/ProductUpdateScript.ts`     | Handle/title only, add changes return |
| `src/scripts/product/ProductSetStatusScript.ts`  | Add changes, change action enum      |
| `src/scripts/product/ProductSetMediaScript.ts`   | Add changes return                   |
| `src/scripts/variant/VariantSetPricingScript.ts` | Add changes return (price only) |
| `src/scripts/variant/VariantSetMediaScript.ts`   | Add changes return              |
| `src/scripts/option/OptionValueUpdateScript.ts`  | Rebuild variant handles         |
| `src/repositories/models/products.ts`            | Add revision column             |
| `src/repositories/models/variants.ts`            | Add handle unique constraint    |
| `src/resolvers/admin/MutationResolver.ts`        | Add productUpdate mutation      |
| `src/workflows/BulkEditOperationWorkflow.ts`     | Use new scripts                 |
| `src/api/graphql-admin/schema/product.graphql`   | New types, deprecations         |
| `src/api/graphql-admin/schema/variant.graphql`   | Deprecations                    |
| `packages/events/src/types.ts`                   | ProductUpdatedEvent             |

### Removed (Cleanup Complete ✅)

| File                                            | Status                                |
| ----------------------------------------------- | ------------------------------------- |
| `src/scripts/variant/VariantSetCostScript.ts`   | ✅ Removed, merged into VariantSetInventoryScript |
| `src/scripts/variant/VariantSetSkuScript.ts`    | ✅ Removed, merged into VariantSetInventoryScript |
| `src/scripts/variant/VariantSetStockScript.ts`  | ✅ Removed, merged into VariantSetInventoryScript |
| `src/scripts/variant/VariantSetWeightScript.ts` | ✅ Removed, merged into VariantSetInventoryScript |

---

## Task Tracker

### Stage 1: Foundation

- [x] 1.1 Create DB migration for `revision` column
- [x] 1.2 Create DB migration for `variant(product_id, handle)` unique constraint
- [x] 1.3 Update `products.ts` model (add revision)
- [x] 1.4 Update `variants.ts` model (add unique constraint)
- [x] 1.5 Create `src/scripts/types/ScriptResult.ts`
- [x] 1.6 Create `src/scripts/types/ProductChanges.ts`
- [x] 1.7 Create `buildVariantHandle` helper

### Stage 2: Product Scripts

- [x] 2.1 Update `ProductUpdateScript` (handle/title only + changes)
- [x] 2.2 Create `ProductSetContentScript` (description/excerpt)
- [x] 2.3 Create `ProductSetSeoScript`
- [x] 2.4 Update `ProductSetStatusScript` (add changes)
- [x] 2.5 Update `ProductSetMediaScript` (add changes)

### Stage 3: Variant Scripts

- [x] 3.1 Update `VariantSetDimensionsScript` (dimensions only, add changes)
- [x] 3.2 Update `VariantSetPricingScript` (price only, add changes)
- [x] 3.3 Create `VariantSetInventoryScript` (unified: stock + sku + weight + cost)
- [x] 3.4 Update `VariantSetMediaScript` (add changes)
- [x] 3.5 Create `VariantSetOptionsScript`

### Stage 4: Workflow & Events

- [x] 4.1 Create `ProductUpdateWorkflowDto.ts`
- [x] 4.2 Create `ProductUpdateWorkflow.ts`
- [x] 4.3 Add `ProductUpdatedEvent` to events package

### Stage 5: GraphQL Schema

- [x] 5.1 Add `revision` field to Product type
- [x] 5.2 Add `ProductContentInput` type
- [x] 5.3 Add `ProductUpdateOpInput` type
- [x] 5.4 Add `VariantUpdateOpInput` type
- [x] 5.5 Add `VariantPricingInput` (with costMinor)
- [x] 5.6 Add `VariantInventoryInput` (with sku)
- [x] 5.7 Add `VariantDimensionsInput`
- [x] 5.8 Add `VariantOptionsInput`
- [x] 5.9 Add `productWorkflowUpdate` mutation
- [x] 5.10 ~~Add deprecation notices~~ Old mutations removed, new API finalized

### Stage 6: Integration

- [x] 6.1 Update `MutationResolver` (add new variant mutations)
- [x] 6.2 Update `BulkEditOperationWorkflow` (use new scripts)
- [x] 6.3 Update `OptionUpdateScript` (rebuild handles on slug change)

### Stage 7: Testing

- [ ] 7.1 Unit tests for new scripts
- [ ] 7.2 Unit tests for ProductUpdateWorkflow
- [x] 7.3 E2E tests for productWorkflowUpdate mutation
- [x] 7.4 E2E tests for revision conflict handling

### Stage 8: Cleanup (Breaking)

- [x] 8.1 Remove `VariantSetCostScript`
- [x] 8.2 Remove `VariantSetSkuScript`
- [x] 8.3 Remove `VariantSetStockScript`
- [x] 8.4 Remove `VariantSetWeightScript`
- [x] 8.5 ~~Remove deprecated GraphQL mutations~~ Done (old mutations already removed)
- [ ] 8.6 Update frontend clients

---

## Progress

| Stage      | Status      | Progress |
| ---------- | ----------- | -------- |
| Foundation | Completed   | 7/7      |
| Product    | Completed   | 5/5      |
| Variant    | Completed   | 5/5      |
| Workflow   | Completed   | 3/3      |
| GraphQL    | Completed   | 10/10    |
| Integration| Completed   | 3/3      |
| Testing    | In Progress | 2/4      |
| Cleanup    | In Progress | 5/6      |
| **Total**  | **93%**     | **38/41** |
