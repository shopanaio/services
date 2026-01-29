# Product Update Migration Plan

План миграции скриптов и GraphQL схемы на новую архитектуру ProductUpdateWorkflow.

## Обзор изменений

### Ключевые изменения API

| Аспект                    | Было                      | Станет                                                     |
| ------------------------- | ------------------------- | ---------------------------------------------------------- |
| Script return             | `{ entity, userErrors }`  | `{ result, changes, userErrors }`                          |
| Variant pricing/cost      | 2 отдельных скрипта       | 1 unified `VariantSetPricingScript`                        |
| Variant dimensions/weight | 2 отдельных скрипта       | 1 unified `VariantSetPhysicalScript`                       |
| Variant stock             | `VariantSetStockScript`   | Переименовать в `VariantSetInventoryScript` + добавить sku |
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
  cost?: number | null;
}

export interface InventoryChanges {
  warehouseId: string;
  onHand: number;
  unavailable: number;
  sku?: string | null;
}

export interface PhysicalChanges {
  width?: number; // mm
  height?: number; // mm
  length?: number; // mm
  weight?: number; // grams
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

### 3.7 VariantSetPricingScript (UNIFIED)

**Файл:** `services/inventory/src/scripts/variant/VariantSetPricingScript.ts`

**Объединяет:** `VariantSetPricingScript` + `VariantSetCostScript`

| Аспект      | Было                      | Станет                                       |
| ----------- | ------------------------- | -------------------------------------------- |
| Input       | Отдельные скрипты         | Unified с `costMinor?`                       |
| Return type | `VariantSetPricingResult` | `ScriptResult<VariantPrice, PricingChanges>` |

**Новый интерфейс:**

```typescript
interface VariantSetPricingParams {
  variantId: string;
  currency: string;
  amountMinor: number;
  compareAtMinor?: number;
  costMinor?: number; // NEW: объединено из VariantSetCostScript
}

interface PricingChanges {
  currency: string;
  amount: number;
  compareAt?: number | null;
  cost?: number | null;
}

type VariantSetPricingResult = ScriptResult<VariantPrice, PricingChanges>;
```

**TODO:**

- [ ] Объединить логику из `VariantSetCostScript`
- [ ] Добавить `costMinor` в upsert
- [ ] Deprecate `VariantSetCostScript`

---

### 3.8 VariantSetInventoryScript (RENAMED + EXTENDED)

**Файл:** `services/inventory/src/scripts/variant/VariantSetInventoryScript.ts`

**Переименовать из:** `VariantSetStockScript`

| Аспект      | Было                    | Станет                                           |
| ----------- | ----------------------- | ------------------------------------------------ |
| Name        | `VariantSetStockScript` | `VariantSetInventoryScript`                      |
| Input       | `quantity`              | `onHand`, `unavailable?`, `sku?`                 |
| Return type | `VariantSetStockResult` | `ScriptResult<WarehouseStock, InventoryChanges>` |

**Новый интерфейс:**

```typescript
interface VariantSetInventoryParams {
  variantId: string;
  warehouseId: string;
  onHand: number;
  unavailable?: number; // NEW
  sku?: string; // NEW: перенесено из VariantSetSkuScript
}

interface InventoryChanges {
  warehouseId: string;
  onHand: number;
  unavailable: number;
  sku?: string | null;
}

type VariantSetInventoryResult = ScriptResult<WarehouseStock, InventoryChanges>;
```

**TODO:**

- [ ] Переименовать файл и класс
- [ ] Добавить `unavailable` поле
- [ ] Интегрировать SKU логику из `VariantSetSkuScript`
- [ ] Deprecate `VariantSetSkuScript`
- [ ] Deprecate `VariantSetStockScript`

---

### 3.9 VariantSetPhysicalScript (NEW UNIFIED)

**Файл:** `services/inventory/src/scripts/variant/VariantSetPhysicalScript.ts`

**Объединяет:** `VariantSetDimensionsScript` + `VariantSetWeightScript`

**Новый интерфейс:**

```typescript
interface VariantSetPhysicalParams {
  variantId: string;
  width?: number; // mm
  height?: number; // mm
  length?: number; // mm
  weight?: number; // grams
}

interface PhysicalChanges {
  width?: number;
  height?: number;
  length?: number;
  weight?: number;
}

type VariantSetPhysicalResult = ScriptResult<Variant, PhysicalChanges>;
```

**TODO:**

- [ ] Создать новый скрипт
- [ ] Объединить логику dimensions + weight
- [ ] Deprecate `VariantSetDimensionsScript`
- [ ] Deprecate `VariantSetWeightScript`

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
  physical: VariantPhysicalInput
  media: VariantMediaInput
  options: VariantOptionsInput
}

input VariantPricingInput {
  currency: CurrencyCode!
  amountMinor: BigInt!
  compareAtMinor: BigInt
  costMinor: BigInt # NEW: unified
}

input VariantInventoryInput {
  warehouseId: ID!
  onHand: Int!
  unavailable: Int
  sku: String # NEW: moved here
}

input VariantPhysicalInput {
  width: Int # mm
  height: Int # mm
  length: Int # mm
  weight: Int # grams
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

### 6.3 Deprecations

Добавить `@deprecated` на старые мутации:

```graphql
type Mutation {
  # Deprecated - use productUpdate instead
  variantSetSku(input: VariantSetSkuInput!): VariantSetSkuPayload!
    @deprecated(reason: "Use productUpdate with inventory.sku instead")

  variantSetCost(input: VariantSetCostInput!): VariantSetCostPayload!
    @deprecated(reason: "Use productUpdate with pricing.costMinor instead")

  variantSetDimensions(
    input: VariantSetDimensionsInput!
  ): VariantSetDimensionsPayload!
    @deprecated(reason: "Use productUpdate with physical instead")

  variantSetWeight(input: VariantSetWeightInput!): VariantSetWeightPayload!
    @deprecated(reason: "Use productUpdate with physical.weight instead")

  variantSetStock(input: VariantSetStockInput!): VariantSetStockPayload!
    @deprecated(reason: "Use productUpdate with inventory instead")

  productSetStatus(input: ProductSetStatusInput!): ProductSetStatusPayload!
    @deprecated(reason: "Use productUpdate with status instead")
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

| Старый opType          | Новый скрипт                            |
| ---------------------- | --------------------------------------- |
| `variantSetSku`        | `VariantSetInventoryScript` (с sku)     |
| `variantSetPricing`    | `VariantSetPricingScript` (unified)     |
| `variantSetCost`       | `VariantSetPricingScript` (с costMinor) |
| `variantSetStock`      | `VariantSetInventoryScript`             |
| `variantSetDimensions` | `VariantSetPhysicalScript`              |
| `variantSetWeight`     | `VariantSetPhysicalScript`              |

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
9. [ ] Create `VariantSetPhysicalScript` (new unified)
10. [ ] Update `VariantSetPricingScript` (add cost, changes)
11. [ ] Create `VariantSetInventoryScript` (renamed + sku)
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

### Stage 6: Cleanup (Breaking)

24. [ ] Remove deprecated scripts
25. [ ] Remove deprecated mutations
26. [ ] Update clients

---

## Files Summary

### To Create

| File                                                | Description               |
| --------------------------------------------------- | ------------------------- |
| `src/scripts/types/ScriptResult.ts`                 | Base result type          |
| `src/scripts/types/ProductChanges.ts`               | Changes types             |
| `src/scripts/product/ProductSetContentScript.ts`    | Content update (new)      |
| `src/scripts/product/ProductSetSeoScript.ts`        | SEO update (new)          |
| `src/scripts/variant/VariantSetPhysicalScript.ts`   | Unified dimensions+weight |
| `src/scripts/variant/VariantSetInventoryScript.ts`  | Renamed stock+sku         |
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
| `src/scripts/variant/VariantSetPricingScript.ts` | Add cost, changes return        |
| `src/scripts/variant/VariantSetMediaScript.ts`   | Add changes return              |
| `src/scripts/option/OptionValueUpdateScript.ts`  | Rebuild variant handles         |
| `src/repositories/models/products.ts`            | Add revision column             |
| `src/repositories/models/variants.ts`            | Add handle unique constraint    |
| `src/resolvers/admin/MutationResolver.ts`        | Add productUpdate mutation      |
| `src/workflows/BulkEditOperationWorkflow.ts`     | Use new scripts                 |
| `src/api/graphql-admin/schema/product.graphql`   | New types, deprecations         |
| `src/api/graphql-admin/schema/variant.graphql`   | Deprecations                    |
| `packages/events/src/types.ts`                   | ProductUpdatedEvent             |

### To Deprecate (Later Remove)

| File                                                | Reason                                |
| --------------------------------------------------- | ------------------------------------- |
| `src/scripts/variant/VariantSetCostScript.ts`       | Merged into VariantSetPricingScript   |
| `src/scripts/variant/VariantSetSkuScript.ts`        | Merged into VariantSetInventoryScript |
| `src/scripts/variant/VariantSetStockScript.ts`      | Renamed to VariantSetInventoryScript  |
| `src/scripts/variant/VariantSetDimensionsScript.ts` | Merged into VariantSetPhysicalScript  |
| `src/scripts/variant/VariantSetWeightScript.ts`     | Merged into VariantSetPhysicalScript  |

---

## Task Tracker

### Stage 1: Foundation

- [ ] 1.1 Create DB migration for `revision` column
- [ ] 1.2 Create DB migration for `variant(product_id, handle)` unique constraint
- [ ] 1.3 Update `products.ts` model (add revision)
- [ ] 1.4 Update `variants.ts` model (add unique constraint)
- [ ] 1.5 Create `src/scripts/types/ScriptResult.ts`
- [ ] 1.6 Create `src/scripts/types/ProductChanges.ts`
- [ ] 1.7 Create `buildVariantHandle` helper

### Stage 2: Product Scripts

- [ ] 2.1 Update `ProductUpdateScript` (handle/title only + changes)
- [ ] 2.2 Create `ProductSetContentScript` (description/excerpt)
- [ ] 2.3 Create `ProductSetSeoScript`
- [ ] 2.4 Update `ProductSetStatusScript` (add changes)
- [ ] 2.5 Update `ProductSetMediaScript` (add changes)

### Stage 3: Variant Scripts

- [ ] 3.1 Create `VariantSetPhysicalScript` (unified dimensions+weight)
- [ ] 3.2 Update `VariantSetPricingScript` (add cost + changes)
- [ ] 3.3 Create `VariantSetInventoryScript` (stock + sku)
- [ ] 3.4 Update `VariantSetMediaScript` (add changes)
- [ ] 3.5 Create `VariantSetOptionsScript`

### Stage 4: Workflow & Events

- [ ] 4.1 Create `ProductUpdateWorkflowDto.ts`
- [ ] 4.2 Create `ProductUpdateWorkflow.ts`
- [ ] 4.3 Add `ProductUpdatedEvent` to events package

### Stage 5: GraphQL Schema

- [ ] 5.1 Add `revision` field to Product type
- [ ] 5.2 Add `ProductContentInput` type
- [ ] 5.3 Add `ProductUpdateOpInput` type
- [ ] 5.4 Add `VariantUpdateOpInput` type
- [ ] 5.5 Add `VariantPricingInput` (with costMinor)
- [ ] 5.6 Add `VariantInventoryInput` (with sku)
- [ ] 5.7 Add `VariantPhysicalInput`
- [ ] 5.8 Add `VariantOptionsInput`
- [ ] 5.9 Add `productUpdate` mutation
- [ ] 5.10 Add deprecation notices to old mutations

### Stage 6: Integration

- [ ] 6.1 Update `MutationResolver` (add productUpdate)
- [ ] 6.2 Update `BulkEditOperationWorkflow` (use new scripts)
- [ ] 6.3 Update `OptionValueUpdateScript` (rebuild handles on slug change)

### Stage 7: Testing

- [ ] 7.1 Unit tests for new scripts
- [ ] 7.2 Unit tests for ProductUpdateWorkflow
- [ ] 7.3 E2E tests for productUpdate mutation
- [ ] 7.4 E2E tests for revision conflict handling

### Stage 8: Cleanup (Breaking)

- [ ] 8.1 Remove `VariantSetCostScript`
- [ ] 8.2 Remove `VariantSetSkuScript`
- [ ] 8.3 Remove `VariantSetStockScript`
- [ ] 8.4 Remove `VariantSetDimensionsScript`
- [ ] 8.5 Remove `VariantSetWeightScript`
- [ ] 8.6 Remove deprecated GraphQL mutations
- [ ] 8.7 Update frontend clients

---

## Progress

| Stage      | Status      | Progress |
| ---------- | ----------- | -------- |
| Foundation | Not Started | 0/7      |
| Product    | Not Started | 0/5      |
| Variant    | Not Started | 0/5      |
| Workflow   | Not Started | 0/3      |
| GraphQL    | Not Started | 0/10     |
| Integration| Not Started | 0/3      |
| Testing    | Not Started | 0/4      |
| Cleanup    | Not Started | 0/7      |
| **Total**  | **0%**      | **0/44** |
