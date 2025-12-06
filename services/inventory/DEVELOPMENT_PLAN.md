# Inventory Admin API - План Разработки

## Подход

**Top-Down:** Scripts + Mutations → Repositories → Queries + DataLoaders

---

## Сводка Mutations (из base.graphql)

```graphql
type InventoryMutation {
  # Product
  productCreate(input: ProductCreateInput!): ProductCreatePayload!
  productUpdate(input: ProductUpdateInput!): ProductUpdatePayload!
  productDelete(input: ProductDeleteInput!): ProductDeletePayload!
  productPublish(input: ProductPublishInput!): ProductPublishPayload!
  productUnpublish(input: ProductUnpublishInput!): ProductUnpublishPayload!

  # Variant
  variantCreate(input: VariantCreateInput!): VariantCreatePayload!
  variantDelete(input: VariantDeleteInput!): VariantDeletePayload!
  variantSetSku(input: VariantSetSkuInput!): VariantSetSkuPayload!
  variantSetDimensions(input: VariantSetDimensionsInput!): VariantSetDimensionsPayload!
  variantSetWeight(input: VariantSetWeightInput!): VariantSetWeightPayload!
  variantSetPricing(input: VariantSetPricingInput!): VariantSetPricingPayload!
  variantSetCost(input: VariantSetCostInput!): VariantSetCostPayload!
  variantSetStock(input: VariantSetStockInput!): VariantSetStockPayload!
  variantSetMedia(input: VariantSetMediaInput!): VariantSetMediaPayload!

  # Options
  productOptionCreate(input: ProductOptionCreateInput!): ProductOptionCreatePayload!
  productOptionUpdate(input: ProductOptionUpdateInput!): ProductOptionUpdatePayload!
  productOptionDelete(input: ProductOptionDeleteInput!): ProductOptionDeletePayload!

  # Features
  productFeatureCreate(input: ProductFeatureCreateInput!): ProductFeatureCreatePayload!
  productFeatureUpdate(input: ProductFeatureUpdateInput!): ProductFeatureUpdatePayload!
  productFeatureDelete(input: ProductFeatureDeleteInput!): ProductFeatureDeletePayload!

  # Warehouse
  warehouseCreate(input: WarehouseCreateInput!): WarehouseCreatePayload!
  warehouseUpdate(input: WarehouseUpdateInput!): WarehouseUpdatePayload!
  warehouseDelete(input: WarehouseDeleteInput!): WarehouseDeletePayload!
}
```

---

## Сводка моделей данных (Drizzle)

### product
```
projectId, id, publishedAt, createdAt, updatedAt, deletedAt
```

### variant
```
projectId, productId, id, sku, externalSystem, externalId, createdAt, updatedAt, deletedAt
unique: (projectId, sku), (projectId, externalSystem, externalId)
```

### warehouses
```
projectId, id, code, name, isDefault, createdAt, updatedAt
unique: (projectId, code)
partial unique: (projectId) WHERE is_default = true
```

### warehouse_stock
```
projectId, id, warehouseId, variantId, quantityOnHand, createdAt, updatedAt
unique: (projectId, warehouseId, variantId)
check: quantityOnHand >= 0
```

### item_pricing (temporal - history)
```
projectId, id, variantId, currency, amountMinor, compareAtMinor, effectiveFrom, effectiveTo, recordedAt
partial unique: (projectId, variantId, currency) WHERE effective_to IS NULL
View: variant_prices_current (effectiveTo IS NULL)
```

### product_variant_cost_history (temporal - history)
```
projectId, id, variantId, currency, unitCostMinor, effectiveFrom, effectiveTo, recordedAt
partial unique: (projectId, variantId, currency) WHERE effective_to IS NULL
View: variant_costs_current (effectiveTo IS NULL)
```

### item_dimensions
```
variantId (PK), projectId, wMm, lMm, hMm, displayUnit
check: wMm > 0 AND lMm > 0 AND hMm > 0
```

### item_weight
```
variantId (PK), projectId, weightGr, displayUnit
check: weightGr > 0
```

### product_option
```
id, projectId, productId, slug, displayType
unique: (productId, slug)
```

### product_option_value
```
id, projectId, optionId, swatchId, slug, sortIndex
unique: (optionId, slug)
```

### product_option_swatch
```
projectId, id, colorOne, colorTwo, imageId, swatchType, metadata
```

### product_option_variant_link
```
projectId, variantId, optionId, optionValueId
PK: (variantId, optionId)
```

### product_feature
```
id, projectId, productId, slug
unique: (productId, slug)
```

### product_feature_value
```
id, projectId, featureId, slug, sortIndex
unique: (featureId, slug)
```

### variant_media
```
projectId, variantId, fileId, sortIndex
PK: (variantId, fileId)
```

### Translations (7 таблиц)
```
product_translation: projectId, productId, locale, title, descriptionText, descriptionHtml, descriptionJson, excerpt, seoTitle, seoDescription
  PK: (productId, locale)

variant_translation: projectId, variantId, locale, title
  PK: (variantId, locale)

product_option_translation: projectId, optionId, locale, name
  PK: (optionId, locale)

product_option_value_translation: projectId, optionValueId, locale, name
  PK: (optionValueId, locale)

product_feature_translation: projectId, featureId, locale, name
  PK: (featureId, locale)

product_feature_value_translation: projectId, featureValueId, locale, name
  PK: (featureValueId, locale)

warehouse_translation: projectId, warehouseId, locale, name
  PK: (warehouseId, locale)
```

---

## Фаза 1: Warehouse

### GraphQL Input (stock.graphql)

```graphql
input WarehouseCreateInput {
  code: String!       # unique per project
  name: String!
  isDefault: Boolean
}

input WarehouseUpdateInput {
  id: ID!
  code: String
  name: String
  isDefault: Boolean
}

input WarehouseDeleteInput {
  id: ID!
}
```

### 1.1 warehouseCreate

```typescript
interface Input {
  code: string;
  name: string;
  isDefault?: boolean;
}

// Логика:
// 1. Валидация: code unique per project
// 2. Если isDefault=true → UPDATE warehouses SET is_default=false WHERE project_id=?
// 3. INSERT warehouses
```

**Repository методы:**
```typescript
warehouse.findByCode(projectId, code): Warehouse | null
warehouse.clearDefault(projectId): void
warehouse.create(projectId, { code, name, isDefault }): Warehouse
```

### 1.2 warehouseUpdate

```typescript
interface Input {
  id: string;
  code?: string;
  name?: string;
  isDefault?: boolean;
}

// Логика:
// 1. Проверить существование
// 2. Если code меняется → проверить уникальность
// 3. Если isDefault=true → clearDefault()
// 4. UPDATE warehouses
```

**Repository методы:**
```typescript
warehouse.findById(projectId, id): Warehouse | null
warehouse.update(projectId, id, data): Warehouse | null
```

### 1.3 warehouseDelete

```typescript
// CASCADE удалит warehouse_stock
```

**Repository методы:**
```typescript
warehouse.delete(projectId, id): boolean
```

---

## Фаза 2: Physical

### GraphQL Input (physical.graphql)

```graphql
# Всё в миллиметрах/граммах - конвертация на фронте
input DimensionsInput {
  width: Int!   # mm
  length: Int!  # mm
  height: Int!  # mm
}

input WeightInput {
  value: Int!   # grams
}

input VariantSetDimensionsInput {
  variantId: ID!
  dimensions: DimensionsInput!
}

input VariantSetWeightInput {
  variantId: ID!
  weight: WeightInput!
}
```

### 2.1 variantSetDimensions

```typescript
interface Input {
  variantId: string;
  dimensions: { width: number; length: number; height: number };
}

// Логика:
// 1. Проверить variant существует
// 2. UPSERT item_dimensions (variantId = PK)
//    wMm=width, lMm=length, hMm=height, displayUnit='mm'
```

**Repository методы:**
```typescript
variant.exists(projectId, id): boolean
physical.upsertDimensions(projectId, variantId, { wMm, lMm, hMm }): ItemDimensions
```

### 2.2 variantSetWeight

```typescript
interface Input {
  variantId: string;
  weight: { value: number };
}

// Логика:
// 1. Проверить variant существует
// 2. UPSERT item_weight (variantId = PK)
//    weightGr=value, displayUnit='g'
```

**Repository методы:**
```typescript
physical.upsertWeight(projectId, variantId, { weightGr }): ItemWeight
```

---

## Фаза 3: Pricing & Cost

### GraphQL Input (pricing.graphql)

```graphql
enum CurrencyCode { UAH, USD, EUR }

input VariantSetPricingInput {
  variantId: ID!
  currency: CurrencyCode!
  amountMinor: BigInt!       # копейки/центы
  compareAtMinor: BigInt     # старая цена (зачеркнутая)
}

input VariantSetCostInput {
  variantId: ID!
  currency: CurrencyCode!
  unitCostMinor: BigInt!
}
```

### 3.1 variantSetPricing

```typescript
interface Input {
  variantId: string;
  currency: 'UAH' | 'USD' | 'EUR';
  amountMinor: number;
  compareAtMinor?: number;
}

// Логика (temporal pattern - история цен):
// 1. Проверить variant существует
// 2. Закрыть текущую цену: UPDATE item_pricing SET effective_to=NOW()
//    WHERE variant_id=? AND currency=? AND effective_to IS NULL
// 3. INSERT новую: effective_from=NOW(), effective_to=NULL
```

**Repository методы:**
```typescript
pricing.closeCurrent(projectId, variantId, currency): void
pricing.create(projectId, variantId, { currency, amountMinor, compareAtMinor }): ItemPricing
```

### 3.2 variantSetCost

```typescript
interface Input {
  variantId: string;
  currency: 'UAH' | 'USD' | 'EUR';
  unitCostMinor: number;
}

// Логика: аналогично pricing (temporal)
```

**Repository методы:**
```typescript
cost.closeCurrent(projectId, variantId, currency): void
cost.create(projectId, variantId, { currency, unitCostMinor }): ProductVariantCostHistory
```

---

## Фаза 4: Stock

### GraphQL Input (stock.graphql)

```graphql
input VariantSetStockInput {
  variantId: ID!
  warehouseId: ID!
  quantity: Int!
}
```

### 4.1 variantSetStock

```typescript
interface Input {
  variantId: string;
  warehouseId: string;
  quantity: number;
}

// Логика:
// 1. Проверить variant существует
// 2. Проверить warehouse существует
// 3. UPSERT warehouse_stock (unique: project+warehouse+variant)
//    quantityOnHand = quantity
```

**Repository методы:**
```typescript
warehouse.exists(projectId, id): boolean
stock.upsert(projectId, variantId, warehouseId, quantity): WarehouseStock
```

---

## Фаза 5: Media

### GraphQL Input (media.graphql)

```graphql
input VariantSetMediaInput {
  variantId: ID!
  fileIds: [ID!]!  # упорядочен, пустой = очистить
}
```

### 5.1 variantSetMedia

```typescript
interface Input {
  variantId: string;
  fileIds: string[];
}

// Логика:
// 1. Проверить variant существует
// 2. DELETE FROM variant_media WHERE variant_id=?
// 3. INSERT с sortIndex = array index
```

**Repository методы (MediaRepository уже есть):**
```typescript
media.clearVariant(projectId, variantId): void
media.addMany(projectId, variantId, fileIds): VariantMedia[]
```

---

## Фаза 6: Features

### GraphQL Input (features.graphql)

```graphql
input ProductFeatureValueCreateInput {
  slug: String!
  name: String!
}

input ProductFeatureCreateInput {
  productId: ID!
  slug: String!
  name: String!
  values: [ProductFeatureValueCreateInput!]!
}

input ProductFeatureValuesInput {
  create: [ProductFeatureValueCreateInput!]
  update: [ProductFeatureValueUpdateInput!]
  delete: [ID!]
}

input ProductFeatureUpdateInput {
  id: ID!
  slug: String
  name: String
  values: ProductFeatureValuesInput
}

input ProductFeatureDeleteInput {
  id: ID!
}
```

### 6.1 productFeatureCreate

```typescript
interface Input {
  productId: string;
  slug: string;
  name: string;
  values: Array<{ slug: string; name: string }>;
}

// Логика:
// 1. Проверить product существует
// 2. Проверить slug уникален для product
// 3. INSERT product_feature
// 4. INSERT product_feature_translation (locale из context)
// 5. Для каждого value (index):
//    - INSERT product_feature_value (sortIndex=index)
//    - INSERT product_feature_value_translation
```

**Repository методы:**
```typescript
product.exists(projectId, id): boolean
feature.findBySlug(projectId, productId, slug): ProductFeature | null
feature.create(projectId, productId, { slug }): ProductFeature
feature.createValue(projectId, featureId, { slug, sortIndex }): ProductFeatureValue
translation.setFeature(projectId, featureId, locale, name): void
translation.setFeatureValue(projectId, valueId, locale, name): void
```

### 6.2 productFeatureUpdate

```typescript
interface Input {
  id: string;
  slug?: string;
  name?: string;
  values?: {
    create?: Array<{ slug: string; name: string }>;
    update?: Array<{ id: string; slug?: string; name?: string }>;
    delete?: string[];
  };
}

// Логика:
// 1. Проверить feature существует
// 2. Если slug меняется → проверить уникальность
// 3. UPDATE feature если нужно
// 4. Обновить translation
// 5. Обработать values: create → createValue, update → updateValue, delete → deleteValue
```

### 6.3 productFeatureDelete

```typescript
// CASCADE удалит values, translations
```

**Repository методы:**
```typescript
feature.delete(projectId, id): boolean
```

---

## Фаза 7: Options (со Swatches!)

### GraphQL Input (options.graphql)

```graphql
enum OptionDisplayType { DROPDOWN, SWATCH, BUTTONS }
enum SwatchType { COLOR, GRADIENT, IMAGE }

input ProductOptionSwatchInput {
  swatchType: SwatchType!
  colorOne: String
  colorTwo: String
  fileId: ID
  metadata: JSON
}

input ProductOptionValueCreateInput {
  slug: String!
  name: String!
  swatch: ProductOptionSwatchInput  # опционально
}

input ProductOptionCreateInput {
  productId: ID
  slug: String!
  name: String!
  displayType: OptionDisplayType!
  values: [ProductOptionValueCreateInput!]!
}

input ProductOptionValuesInput {
  create: [ProductOptionValueCreateInput!]
  update: [ProductOptionValueUpdateInput!]
  delete: [ID!]
}

input ProductOptionUpdateInput {
  id: ID!
  slug: String
  name: String
  displayType: OptionDisplayType
  values: ProductOptionValuesInput
}

input ProductOptionDeleteInput {
  id: ID!
}
```

### 7.1 productOptionCreate

```typescript
interface Input {
  productId: string;
  slug: string;
  name: string;
  displayType: 'DROPDOWN' | 'SWATCH' | 'BUTTONS';
  values: Array<{
    slug: string;
    name: string;
    swatch?: {
      swatchType: 'COLOR' | 'GRADIENT' | 'IMAGE';
      colorOne?: string;
      colorTwo?: string;
      fileId?: string;
      metadata?: unknown;
    };
  }>;
}

// Логика:
// 1. Проверить product существует
// 2. Проверить slug уникален для product
// 3. INSERT product_option
// 4. INSERT product_option_translation
// 5. Для каждого value (index):
//    - Если swatch → INSERT product_option_swatch → получить swatchId
//    - INSERT product_option_value (swatchId, sortIndex=index)
//    - INSERT product_option_value_translation
```

**Repository методы:**
```typescript
option.findBySlug(projectId, productId, slug): ProductOption | null
option.create(projectId, productId, { slug, displayType }): ProductOption
option.createSwatch(projectId, data): ProductOptionSwatch
option.createValue(projectId, optionId, { slug, swatchId, sortIndex }): ProductOptionValue
translation.setOption(projectId, optionId, locale, name): void
translation.setOptionValue(projectId, valueId, locale, name): void
```

### 7.2 productOptionUpdate

```typescript
// Аналогично features + обработка swatches
// При update value с swatch:
//   - Если swatch null → удалить старый swatch
//   - Если swatch есть → update или create swatch
```

### 7.3 productOptionDelete

```typescript
// CASCADE удалит values, swatches, translations, variant_links
```

---

## Фаза 8: Variant

### GraphQL Input (variant.graphql)

```graphql
input VariantInput {
  title: String
  sku: String
  externalSystem: String
  externalId: String
  options: [SelectedOptionInput!]
  dimensions: DimensionsInput
  weight: WeightInput
}

input VariantCreateInput {
  productId: ID!
  variant: VariantInput!
}

input VariantSetSkuInput {
  variantId: ID!
  sku: String!
}

input VariantDeleteInput {
  id: ID!
  permanent: Boolean
}
```

### 8.1 variantCreate

```typescript
interface Input {
  productId: string;
  variant: {
    title?: string;
    sku?: string;
    externalSystem?: string;
    externalId?: string;
    options?: Array<{ optionId: string; optionValueId: string }>;
    dimensions?: { width: number; length: number; height: number };
    weight?: { value: number };
  };
}

// Логика:
// 1. Проверить product существует
// 2. Если sku → проверить уникальность (projectId, sku)
// 3. INSERT variant
// 4. Если title → INSERT variant_translation
// 5. Если options → INSERT product_option_variant_link для каждой
// 6. Если dimensions → INSERT item_dimensions
// 7. Если weight → INSERT item_weight
```

**Repository методы:**
```typescript
variant.findBySku(projectId, sku): Variant | null
variant.create(projectId, productId, data): Variant
translation.setVariant(projectId, variantId, locale, title): void
option.linkVariant(projectId, variantId, optionId, valueId): void
```

### 8.2 variantSetSku

```typescript
interface Input {
  variantId: string;
  sku: string;
}

// Логика:
// 1. Проверить variant существует
// 2. Проверить sku уникален (исключая текущий variant)
// 3. UPDATE variant SET sku=?
```

**Repository методы:**
```typescript
variant.findById(projectId, id): Variant | null
variant.update(projectId, id, { sku }): Variant | null
```

### 8.3 variantDelete

```typescript
interface Input {
  id: string;
  permanent?: boolean;
}

// Логика:
// permanent=true → DELETE (cascade)
// permanent=false → UPDATE SET deletedAt=NOW()
```

**Repository методы:**
```typescript
variant.softDelete(projectId, id): boolean
variant.hardDelete(projectId, id): boolean
```

---

## Фаза 9: Product

### GraphQL Input (product.graphql)

```graphql
input DescriptionInput {
  text: String!   # для поиска (Typesense)
  html: String!   # для отображения
  json: JSON!     # EditorJS state
}

input ProductCreateInput {
  title: String!
  description: DescriptionInput
  excerpt: String
  seoTitle: String
  seoDescription: String
  variants: [VariantInput!]
  options: [ProductOptionCreateInput!]
  publish: Boolean
}

input ProductUpdateInput {
  id: ID!
  title: String
  description: DescriptionInput
  excerpt: String
  seoTitle: String
  seoDescription: String
}

input ProductDeleteInput {
  id: ID!
  permanent: Boolean
}

input ProductPublishInput { id: ID! }
input ProductUnpublishInput { id: ID! }
```

### 9.1 productCreate

```typescript
interface Input {
  title: string;
  description?: { text: string; html: string; json: unknown };
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
  variants?: VariantInput[];
  options?: ProductOptionCreateInput[];
  publish?: boolean;
}

// Логика:
// 1. INSERT product (publishedAt = publish ? NOW() : NULL)
// 2. INSERT product_translation
// 3. Если options → productOptionCreate для каждой
// 4. Если variants → variantCreate для каждого
// 5. Если нет variants → создать default variant
```

**Repository методы:**
```typescript
product.create(projectId, { publishedAt }): Product
translation.setProduct(projectId, productId, locale, {
  title, descriptionText, descriptionHtml, descriptionJson,
  excerpt, seoTitle, seoDescription
}): void
```

### 9.2 productUpdate

```typescript
interface Input {
  id: string;
  title?: string;
  description?: { text: string; html: string; json: unknown };
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
}

// Логика:
// 1. Проверить product существует
// 2. UPSERT product_translation
// 3. UPDATE product SET updatedAt=NOW()
```

**Repository методы:**
```typescript
product.findById(projectId, id): Product | null
product.touch(projectId, id): void
```

### 9.3 productDelete

```typescript
// permanent=true → DELETE (cascade всё)
// permanent=false → SET deletedAt=NOW()
```

### 9.4 productPublish / productUnpublish

```typescript
// SET publishedAt = NOW() или NULL
```

**Repository методы:**
```typescript
product.publish(projectId, id): Product | null
product.unpublish(projectId, id): Product | null
```

---

## Фаза 10: Repositories (сводка)

### WarehouseRepository
```typescript
findById(projectId, id): Warehouse | null
findByIds(projectId, ids): Warehouse[]
findByCode(projectId, code): Warehouse | null
findAll(projectId): Warehouse[]
findDefault(projectId): Warehouse | null
exists(projectId, id): boolean
create(projectId, data): Warehouse
update(projectId, id, data): Warehouse | null
delete(projectId, id): boolean
clearDefault(projectId): void
```

### PhysicalRepository
```typescript
upsertDimensions(projectId, variantId, data): ItemDimensions
upsertWeight(projectId, variantId, data): ItemWeight
// Batch:
getDimensionsBatch(projectId, variantIds): Map<string, ItemDimensions>
getWeightBatch(projectId, variantIds): Map<string, ItemWeight>
```

### PricingRepository
```typescript
closeCurrent(projectId, variantId, currency): void
create(projectId, variantId, data): ItemPricing
// Batch (returns current prices per currency):
getCurrentBatch(projectId, variantIds): Map<string, ItemPricing[]>
```

### CostRepository
```typescript
closeCurrent(projectId, variantId, currency): void
create(projectId, variantId, data): ProductVariantCostHistory
// Batch:
getCurrentBatch(projectId, variantIds): Map<string, ProductVariantCostHistory[]>
```

### StockRepository
```typescript
upsert(projectId, variantId, warehouseId, quantity): WarehouseStock
// Batch:
getByVariantsBatch(projectId, variantIds): Map<string, WarehouseStock[]>
```

### FeatureRepository
```typescript
findById(projectId, id): ProductFeature | null
findBySlug(projectId, productId, slug): ProductFeature | null
create(projectId, productId, data): ProductFeature
update(projectId, id, data): ProductFeature | null
delete(projectId, id): boolean
createValue(projectId, featureId, data): ProductFeatureValue
updateValue(projectId, valueId, data): ProductFeatureValue | null
deleteValue(projectId, valueId): boolean
// Batch:
findByProductIds(projectId, productIds): Map<string, ProductFeature[]>
findValuesByFeatureIds(projectId, featureIds): Map<string, ProductFeatureValue[]>
```

### OptionRepository
```typescript
findById(projectId, id): ProductOption | null
findBySlug(projectId, productId, slug): ProductOption | null
create(projectId, productId, data): ProductOption
update(projectId, id, data): ProductOption | null
delete(projectId, id): boolean
createSwatch(projectId, data): ProductOptionSwatch
updateSwatch(projectId, id, data): ProductOptionSwatch | null
deleteSwatch(projectId, id): boolean
createValue(projectId, optionId, data): ProductOptionValue
updateValue(projectId, valueId, data): ProductOptionValue | null
deleteValue(projectId, valueId): boolean
linkVariant(projectId, variantId, optionId, valueId): void
unlinkVariant(projectId, variantId, optionId): void
clearVariantLinks(projectId, variantId): void
// Batch:
findByProductIds(projectId, productIds): Map<string, ProductOption[]>
findValuesByOptionIds(projectId, optionIds): Map<string, ProductOptionValue[]>
findVariantLinks(projectId, variantIds): Map<string, ProductOptionVariantLink[]>
```

### VariantRepository
```typescript
findById(projectId, id): Variant | null
findByIds(projectId, ids): Variant[]
findBySku(projectId, sku): Variant | null
exists(projectId, id): boolean
create(projectId, productId, data): Variant
update(projectId, id, data): Variant | null
softDelete(projectId, id): boolean
hardDelete(projectId, id): boolean
// Batch:
findByProductIds(projectId, productIds): Map<string, Variant[]>
```

### ProductRepository
```typescript
findById(projectId, id): Product | null
findByIds(projectId, ids): Product[]
exists(projectId, id): boolean
create(projectId, data): Product
update(projectId, id, data): Product | null
touch(projectId, id): void
softDelete(projectId, id): boolean
hardDelete(projectId, id): boolean
publish(projectId, id): Product | null
unpublish(projectId, id): Product | null
// Query:
findAll(projectId, pagination): { items: Product[], cursor: string }
count(projectId): number
```

### TranslationRepository (расширить)
```typescript
setProduct(projectId, productId, locale, data): void
setVariant(projectId, variantId, locale, title): void
setOption(projectId, optionId, locale, name): void
setOptionValue(projectId, valueId, locale, name): void
setFeature(projectId, featureId, locale, name): void
setFeatureValue(projectId, valueId, locale, name): void
setWarehouse(projectId, warehouseId, locale, name): void
// Batch:
getProductBatch(projectId, productIds, locale): Map<string, ProductTranslation>
getVariantBatch(projectId, variantIds, locale): Map<string, VariantTranslation>
getOptionBatch(projectId, optionIds, locale): Map<string, ProductOptionTranslation>
getOptionValueBatch(projectId, valueIds, locale): Map<string, ProductOptionValueTranslation>
getFeatureBatch(projectId, featureIds, locale): Map<string, ProductFeatureTranslation>
getFeatureValueBatch(projectId, valueIds, locale): Map<string, ProductFeatureValueTranslation>
```

---

## Фаза 11: DataLoaders + Type Resolvers

### DataLoaders

```typescript
interface InventoryDataLoaders {
  // Entities
  productLoader: DataLoader<string, Product | null>
  variantLoader: DataLoader<string, Variant | null>
  warehouseLoader: DataLoader<string, Warehouse | null>

  // Relations
  variantsByProductLoader: DataLoader<string, Variant[]>
  optionsByProductLoader: DataLoader<string, ProductOption[]>
  featuresByProductLoader: DataLoader<string, ProductFeature[]>
  valuesByOptionLoader: DataLoader<string, ProductOptionValue[]>
  valuesByFeatureLoader: DataLoader<string, ProductFeatureValue[]>
  stockByVariantLoader: DataLoader<string, WarehouseStock[]>
  variantLinksByVariantLoader: DataLoader<string, ProductOptionVariantLink[]>
  mediaByVariantLoader: DataLoader<string, VariantMedia[]>

  // Physical
  dimensionsByVariantLoader: DataLoader<string, ItemDimensions | null>
  weightByVariantLoader: DataLoader<string, ItemWeight | null>

  // Pricing/Cost (array - multiple currencies)
  pricingByVariantLoader: DataLoader<string, ItemPricing[]>
  costByVariantLoader: DataLoader<string, ProductVariantCostHistory[]>

  // Translations (key = {id, locale})
  productTranslationLoader: DataLoader<TranslationKey, ProductTranslation | null>
  variantTranslationLoader: DataLoader<TranslationKey, VariantTranslation | null>
  optionTranslationLoader: DataLoader<TranslationKey, ProductOptionTranslation | null>
  optionValueTranslationLoader: DataLoader<TranslationKey, ProductOptionValueTranslation | null>
  featureTranslationLoader: DataLoader<TranslationKey, ProductFeatureTranslation | null>
  featureValueTranslationLoader: DataLoader<TranslationKey, ProductFeatureValueTranslation | null>
}
```

### Type Resolvers

```typescript
const Product = {
  id: (p) => encodeGlobalId('Product', p.id),
  isPublished: (p) => p.publishedAt !== null,
  variants: (p, _, ctx) => ctx.loaders.variantsByProductLoader.load(p.id),
  options: (p, _, ctx) => ctx.loaders.optionsByProductLoader.load(p.id),
  features: (p, _, ctx) => ctx.loaders.featuresByProductLoader.load(p.id),
  variantsCount: async (p, _, ctx) => (await ctx.loaders.variantsByProductLoader.load(p.id)).length,

  title: async (p, _, ctx) => {
    const t = await ctx.loaders.productTranslationLoader.load({ id: p.id, locale: ctx.locale });
    return t?.title ?? '';
  },

  description: async (p, _, ctx) => {
    const t = await ctx.loaders.productTranslationLoader.load({ id: p.id, locale: ctx.locale });
    if (!t?.descriptionText) return null;
    return { text: t.descriptionText, html: t.descriptionHtml ?? '', json: t.descriptionJson ?? {} };
  },
  // excerpt, seoTitle, seoDescription аналогично
};

const Variant = {
  id: (v) => encodeGlobalId('Variant', v.id),
  product: (v, _, ctx) => ctx.loaders.productLoader.load(v.productId),

  price: async (v, _, ctx) => {
    const prices = await ctx.loaders.pricingByVariantLoader.load(v.id);
    return prices[0] ?? null;  // первая или по валюте проекта
  },

  cost: async (v, _, ctx) => {
    const costs = await ctx.loaders.costByVariantLoader.load(v.id);
    return costs[0] ?? null;
  },

  stock: (v, _, ctx) => ctx.loaders.stockByVariantLoader.load(v.id),

  inStock: async (v, _, ctx) => {
    const stocks = await ctx.loaders.stockByVariantLoader.load(v.id);
    return stocks.some(s => s.quantityOnHand > 0);
  },

  dimensions: async (v, _, ctx) => {
    const d = await ctx.loaders.dimensionsByVariantLoader.load(v.id);
    return d ? { width: d.wMm, length: d.lMm, height: d.hMm } : null;
  },

  weight: async (v, _, ctx) => {
    const w = await ctx.loaders.weightByVariantLoader.load(v.id);
    return w ? { value: w.weightGr } : null;
  },

  selectedOptions: (v, _, ctx) => ctx.loaders.variantLinksByVariantLoader.load(v.id),
  media: (v, _, ctx) => ctx.loaders.mediaByVariantLoader.load(v.id),

  title: async (v, _, ctx) => {
    const t = await ctx.loaders.variantTranslationLoader.load({ id: v.id, locale: ctx.locale });
    return t?.title ?? null;
  },
};

const ProductOption = {
  id: (o) => encodeGlobalId('ProductOption', o.id),
  values: (o, _, ctx) => ctx.loaders.valuesByOptionLoader.load(o.id),
  name: async (o, _, ctx) => {
    const t = await ctx.loaders.optionTranslationLoader.load({ id: o.id, locale: ctx.locale });
    return t?.name ?? o.slug;
  },
};

const ProductOptionValue = {
  id: (v) => encodeGlobalId('ProductOptionValue', v.id),
  name: async (v, _, ctx) => {
    const t = await ctx.loaders.optionValueTranslationLoader.load({ id: v.id, locale: ctx.locale });
    return t?.name ?? v.slug;
  },
  // swatch resolver если нужен
};

// Аналогично: ProductFeature, ProductFeatureValue, Warehouse, WarehouseStock
```

---

## Сводка: Порядок реализации

| Фаза | Компонент | Mutations |
|------|-----------|-----------|
| 1 | Warehouse | warehouseCreate, warehouseUpdate, warehouseDelete |
| 2 | Physical | variantSetDimensions, variantSetWeight |
| 3 | Pricing/Cost | variantSetPricing, variantSetCost |
| 4 | Stock | variantSetStock |
| 5 | Media | variantSetMedia |
| 6 | Features | productFeatureCreate/Update/Delete |
| 7 | Options | productOptionCreate/Update/Delete |
| 8 | Variant | variantCreate, variantSetSku, variantDelete |
| 9 | Product | productCreate/Update/Delete/Publish/Unpublish |
| 10 | Repositories | Все методы |
| 11 | Queries | DataLoaders + Type Resolvers |

---

## Следующий шаг

Начать с **Фазы 1: Warehouse** - самая простая сущность без зависимостей.
