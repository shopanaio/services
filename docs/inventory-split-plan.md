# План разделения Inventory сервиса на Catalog и Inventory

## Обзор

Текущий монолитный `inventory` сервис разделяется на два независимых микросервиса:

| Сервис | Домен | Ответственность |
|--------|-------|-----------------|
| **Catalog** | Каталог товаров | Продукты, варианты, категории, теги, опции, фичи, переводы, SEO |
| **Inventory** | Управление запасами | Склады, стоки, резервирования, движения товара, входящие поставки |

### Ключевая связь

```
Catalog.Variant ←──1:1──→ Inventory.InventoryItem
```

Каждый `Variant` в каталоге имеет соответствующий `InventoryItem` в инвентаре. Это позволяет:
- Независимое масштабирование сервисов
- Разделение ответственности (каталог vs логистика)
- Возможность работы каталога без инвентаря (digital goods)

---

## Фаза 1: Подготовка и анализ

### 1.1 Аудит текущих зависимостей

- [ ] Составить полную карту импортов между модулями
- [ ] Идентифицировать shared code который нужно вынести в packages
- [ ] Проанализировать транзакции охватывающие оба домена
- [ ] Документировать все cross-domain queries в GraphQL

### 1.2 Дизайн границ сервисов

#### Catalog Service (новый)

**Сущности:**
- `Product` - основная карточка товара
- `Variant` - варианты товара (размер, цвет), включая `externalSystem` и `externalId`
- `ProductOption` / `ProductOptionValue` - опции и их значения
- `ProductOptionSwatch` - визуальные свотчи для опций
- `ProductOptionVariantLink` - связь вариантов с опциями
- `ProductFeature` / `ProductFeatureValue` - характеристики товара
- `Category` (новая) - категории товаров
- `Tag` (новая) - теги для фильтрации

**Переводы:**
- `ProductTranslation`
- `VariantTranslation`
- `ProductOptionTranslation`
- `ProductOptionValueTranslation`
- `ProductFeatureTranslation`
- `ProductFeatureValueTranslation`
- `CategoryTranslation` (новая)
- `TagTranslation` (новая)

**SEO:**
- `ProductSeo`

**Медиа:**
- `VariantMedia` (ссылки на Media сервис)

**Ценообразование:**
- `ItemPricing` / `VariantPrice` - продажная цена
- `ItemPricingHistory` - история изменения цен

#### Inventory Service (обновленный)

**Сущности:**
- `InventoryItem` (новая) - единица учета запасов, 1:1 с Variant
- `Warehouse` - склады
- `WarehouseStock` - остатки по складам
- `StockChanges` - история движений
- `ProductInventorySettings` - настройки инвентаря по товару

**Переводы:**
- `WarehouseTranslation`

**Физические характеристики (переносятся из Catalog):**
- `ItemDimensions` - габариты
- `ItemWeight` - вес

**Стоимость (остается в Inventory):**
- `ProductVariantCostHistory` - история себестоимости

---

## Фаза 2: Создание новых сущностей

### 2.1 InventoryItem (Inventory Service)

```sql
CREATE TABLE inventory_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,

  -- Ссылка на Catalog
  variant_id UUID NOT NULL UNIQUE, -- Federated reference, без FK

  -- SKU (переносится из Variant)
  sku VARCHAR(255),

  -- Tracking
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  continue_selling_when_out_of_stock BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT inventory_item_sku_unique
    UNIQUE (project_id, sku) WHERE sku IS NOT NULL
);

CREATE INDEX idx_inventory_item_variant ON inventory_item(variant_id);
CREATE INDEX idx_inventory_item_project ON inventory_item(project_id);
```

> **Примечание:** `external_system` и `external_id` остаются в `Variant` (Catalog), так как это идентификаторы товара во внешних системах (не связаны с инвентарем).

### 2.2 Category (Catalog Service)

```sql
CREATE TABLE category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,

  -- Иерархия
  parent_id UUID REFERENCES category(id) ON DELETE CASCADE,
  path LTREE NOT NULL, -- Materialized path для быстрых queries
  depth INTEGER NOT NULL DEFAULT 0,

  -- Идентификатор
  handle VARCHAR(255) NOT NULL,

  -- Публикация (как в Product)
  published_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT category_handle_unique
    UNIQUE (project_id, handle) WHERE deleted_at IS NULL,
  -- handle обязателен для публикации
  CONSTRAINT category_published_requires_handle
    CHECK (published_at IS NULL OR handle IS NOT NULL)
);

CREATE INDEX idx_category_path ON category USING GIST (path);
CREATE INDEX idx_category_parent ON category(parent_id);
CREATE INDEX idx_category_published ON category(project_id, published_at) WHERE deleted_at IS NULL;

-- Медиа категории (как variant_media)
CREATE TABLE category_media (
  category_id UUID NOT NULL REFERENCES category(id) ON DELETE CASCADE,
  file_id UUID NOT NULL, -- FK на Media сервис (без constraint)
  sort_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, file_id)
);
```

### 2.3 Tag (Catalog Service)

```sql
CREATE TABLE tag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,

  -- Идентификатор
  handle VARCHAR(255) NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tag_handle_unique UNIQUE (project_id, handle)
);

-- Many-to-many с Product
CREATE TABLE product_tag (
  product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- Many-to-many с Category (опционально)
CREATE TABLE category_tag (
  category_id UUID NOT NULL REFERENCES category(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, tag_id)
);
```

### 2.4 Product-Category связь

```sql
-- Many-to-many: Product может быть в нескольких категориях
CREATE TABLE product_category (
  product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES category(id) ON DELETE CASCADE,

  -- Является ли эта категория основной
  is_primary BOOLEAN NOT NULL DEFAULT false,

  -- Порядок в категории
  sort_index INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (product_id, category_id)
);

-- Только одна primary категория на продукт
CREATE UNIQUE INDEX idx_product_category_primary
  ON product_category(product_id)
  WHERE is_primary = true;
```

---

## Фаза 3: GraphQL Federation

### 3.1 Catalog Service Schema

```graphql
# Федерированные типы (переносятся из inventory без изменений)
type Product implements Node @key(fields: "id") {
  id: ID!
  handle: String
  publishedAt: DateTime
  isPublished: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  deletedAt: DateTime
  revision: Int!

  # Связи
  variants(first: Int, after: String, last: Int, before: String): VariantConnection!
  options: [ProductOption!]!
  features: [ProductFeature!]!
  variantsCount: Int!

  # Новые связи
  categories: [Category!]!
  tags: [Tag!]!

  # Контент
  title: String!
  description: Description
  excerpt: String
  seo: ProductSeo
}

type Variant implements Node @key(fields: "id") {
  id: ID!
  product: Product!
  isDefault: Boolean!
  handle: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  deletedAt: DateTime

  # Внешние интеграции (остаются в Catalog - это идентификаторы товара)
  externalSystem: String
  externalId: String

  # Контент
  title: String
  media: [VariantMediaItem!]!
  selectedOptions: [SelectedOption!]!

  # Цена (остается в Catalog)
  price: VariantPrice
  priceHistory(first: Int, after: String, last: Int, before: String): VariantPriceConnection!
}

type Category implements Node @key(fields: "id") {
  id: ID!
  handle: String!
  parent: Category
  children: [Category!]!
  ancestors: [Category!]!
  publishedAt: DateTime
  isPublished: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  deletedAt: DateTime

  # Контент
  name: String!
  description: Description
  media: [File!]!

  # Товары
  products(first: Int, after: String, last: Int, before: String): ProductConnection!
  productsCount: Int!
}

type Tag implements Node @key(fields: "id") {
  id: ID!
  handle: String!
  name: String!
  createdAt: DateTime!

  products(first: Int, after: String, last: Int, before: String): ProductConnection!
  productsCount: Int!
}
```

### 3.2 Inventory Service Schema

```graphql
# Расширение Variant из Catalog
extend type Variant @key(fields: "id") {
  id: ID! @external

  # Поля переносимые из текущего Variant в InventoryItem
  # (доступны через federation resolver)
  sku: String
  dimensions: VariantDimensions
  weight: VariantWeight
  cost: VariantCost
  costHistory(first: Int, after: String, last: Int, before: String): VariantCostConnection!
  stock: [WarehouseStock!]!
  inStock: Boolean!

  # Новая связь
  inventoryItem: InventoryItem
}

"""
InventoryItem - единица учета запасов, 1:1 связь с Variant.
Содержит все данные связанные с инвентарем.
"""
type InventoryItem implements Node @key(fields: "id") {
  id: ID!
  variant: Variant!

  # SKU (переносится из Variant в Inventory)
  sku: String

  # Настройки инвентаря
  trackInventory: Boolean!
  continueSellingWhenOutOfStock: Boolean!

  # Физические характеристики (переносятся из Variant)
  dimensions: VariantDimensions
  weight: VariantWeight

  # Стоимость (переносится из Variant)
  cost: VariantCost
  costHistory(first: Int, after: String, last: Int, before: String): VariantCostConnection!

  # Инвентарь
  stock: [WarehouseStock!]!
  inStock: Boolean!

  createdAt: DateTime!
  updatedAt: DateTime!
}

type Warehouse implements Node @key(fields: "id") {
  id: ID!
  code: String!
  name: String!
  isDefault: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!

  stock(
    first: Int
    after: String
    last: Int
    before: String
    where: WarehouseStockWhereInput
    orderBy: [WarehouseStockOrderByInput!]
  ): WarehouseStockConnection!
  variantsCount: Int!
}

type WarehouseStock implements Node {
  id: ID!
  warehouse: Warehouse!
  variant: Variant!
  quantityOnHand: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### 3.3 Queries

#### Catalog Service

```graphql
type CatalogQuery {
  # Node interface
  node(id: ID!): Node
  nodes(ids: [ID!]!): [Node]!

  # Product queries
  product(id: ID!): Product
  products(
    first: Int
    after: String
    last: Int
    before: String
    where: ProductWhereInput
    orderBy: [ProductOrderByInput!]
  ): ProductConnection!

  # Variant queries
  variant(id: ID!): Variant
  variants(
    first: Int
    after: String
    last: Int
    before: String
  ): VariantConnection!

  # Category queries (новые)
  category(id: ID!): Category
  categories(
    first: Int
    after: String
    last: Int
    before: String
    where: CategoryWhereInput
  ): CategoryConnection!

  # Tag queries (новые)
  tag(id: ID!): Tag
  tags(
    first: Int
    after: String
    where: TagWhereInput
  ): TagConnection!

  # Bulk job query
  productBulkUpdateJob(jobId: ID!): ProductBulkUpdateJob
}

type CatalogWidgetQuery {
  # Pricing widget (цены в Catalog)
  pricing(input: PricingWidgetInput!): PricingWidgetPayload!
}
```

#### Inventory Service

```graphql
type InventoryQuery {
  # Node interface
  node(id: ID!): Node
  nodes(ids: [ID!]!): [Node]!

  # Warehouse queries
  warehouse(id: ID!): Warehouse
  warehouses(
    first: Int
    after: String
    last: Int
    before: String
    where: WarehouseWhereInput
    orderBy: [WarehouseOrderByInput!]
  ): WarehouseConnection!

  # InventoryItem queries (новые)
  inventoryItem(id: ID!): InventoryItem
  inventoryItemByVariant(variantId: ID!): InventoryItem
  inventoryItems(
    first: Int
    after: String
    where: InventoryItemWhereInput
  ): InventoryItemConnection!
}

type InventoryWidgetQuery {
  # Inventory widget (остается в Inventory)
  inventory(productId: ID!): ProductInventoryWidget
}
```

### 3.4 Mutations

#### Catalog Service

```graphql
type CatalogMutation {
  # ═══════════════════════════════════════════════════════════
  # Product CRUD
  # ═══════════════════════════════════════════════════════════
  productCreate(input: ProductCreateInput!): ProductCreatePayload!
  productDelete(input: ProductDeleteInput!): ProductDeletePayload!
  productUpdateStatus(input: ProductUpdateStatusInput!): ProductUpdateStatusPayload!

  """
  Unified product update with optimistic locking.
  Supports product and variant updates in a single request.
  """
  productUpdate(
    productId: ID!
    expectedRevision: Int
    operations: ProductUpdateInput
  ): ProductUpdatePayload!

  # ═══════════════════════════════════════════════════════════
  # Variant CRUD
  # ═══════════════════════════════════════════════════════════
  variantCreate(input: VariantCreateInput!): VariantCreatePayload!
  variantDelete(input: VariantDeleteInput!): VariantDeletePayload!

  # Variant-specific updates (pricing, options, media)
  variantUpdatePricing(input: VariantUpdatePricingInput!): VariantUpdatePricingPayload!
  variantUpdateOptions(input: VariantUpdateOptionsInput!): VariantUpdateOptionsPayload!
  variantUpdateMedia(input: VariantUpdateMediaInput!): VariantUpdateMediaPayload!

  # ═══════════════════════════════════════════════════════════
  # Options CRUD
  # ═══════════════════════════════════════════════════════════
  productOptionCreate(input: ProductOptionCreateInput!): ProductOptionCreatePayload!
  productOptionUpdate(input: ProductOptionUpdateInput!): ProductOptionUpdatePayload!
  productOptionDelete(input: ProductOptionDeleteInput!): ProductOptionDeletePayload!
  productOptionsSync(input: ProductOptionsSyncInput!): ProductOptionsSyncPayload!

  # ═══════════════════════════════════════════════════════════
  # Features CRUD
  # ═══════════════════════════════════════════════════════════
  productFeatureCreate(input: ProductFeatureCreateInput!): ProductFeatureCreatePayload!
  productFeatureUpdate(input: ProductFeatureUpdateInput!): ProductFeatureUpdatePayload!
  productFeatureDelete(input: ProductFeatureDeleteInput!): ProductFeatureDeletePayload!
  productFeaturesSync(input: ProductFeaturesSyncInput!): ProductFeaturesSyncPayload!

  # ═══════════════════════════════════════════════════════════
  # Category CRUD (новые)
  # ═══════════════════════════════════════════════════════════
  categoryCreate(input: CategoryCreateInput!): CategoryCreatePayload!
  categoryUpdate(input: CategoryUpdateInput!): CategoryUpdatePayload!
  categoryDelete(input: CategoryDeleteInput!): CategoryDeletePayload!
  categoryMove(input: CategoryMoveInput!): CategoryMovePayload!

  # ═══════════════════════════════════════════════════════════
  # Tag CRUD (новые)
  # ═══════════════════════════════════════════════════════════
  tagCreate(input: TagCreateInput!): TagCreatePayload!
  tagUpdate(input: TagUpdateInput!): TagUpdatePayload!
  tagDelete(input: TagDeleteInput!): TagDeletePayload!

  # ═══════════════════════════════════════════════════════════
  # Bulk operations
  # ═══════════════════════════════════════════════════════════
  productBulkUpdate(input: ProductBulkUpdateInput!): ProductBulkUpdatePayload!
}
```

#### Inventory Service

```graphql
type InventoryMutation {
  # ═══════════════════════════════════════════════════════════
  # InventoryItem updates (замена variant* mutations)
  # ═══════════════════════════════════════════════════════════
  """
  Update inventory: stock, SKU, weight, cost, dimensions.
  Замена variantUpdateInventory и variantUpdateDimensions.
  """
  inventoryItemUpdate(input: InventoryItemUpdateInput!): InventoryItemUpdatePayload!

  # ═══════════════════════════════════════════════════════════
  # Warehouse CRUD
  # ═══════════════════════════════════════════════════════════
  warehouseCreate(input: WarehouseCreateInput!): WarehouseCreatePayload!
  warehouseUpdate(input: WarehouseUpdateInput!): WarehouseUpdatePayload!
  warehouseDelete(input: WarehouseDeleteInput!): WarehouseDeletePayload!

}
```

> **Примечание:** При миграции текущие mutations `variantUpdateInventory` и `variantUpdateDimensions` будут заменены на единую `inventoryItemUpdate` mutation. Frontend потребует обновления.

---

## Фаза 4: Событийная архитектура

### 4.1 События Catalog → Inventory

```typescript
// Catalog публикует при создании/удалении варианта
interface VariantCreatedEvent {
  type: 'variant.created';
  payload: {
    variantId: string;
    productId: string;
    projectId: string;
    sku?: string; // SKU переносится в InventoryItem
  };
}

interface VariantDeletedEvent {
  type: 'variant.deleted';
  payload: {
    variantId: string;
    productId: string;
    projectId: string;
  };
}

// Inventory слушает и создает/удаляет InventoryItem
class InventoryEventHandler {
  @EventHandler('variant.created')
  async onVariantCreated(event: VariantCreatedEvent) {
    const newItem = await this.inventoryItemService.create({
      variantId: event.payload.variantId,
      projectId: event.payload.projectId,
      sku: event.payload.sku,
    });

    // Создать начальный stock для всех warehouse
    const warehouses = await this.warehouseRepo.findByProject(event.payload.projectId);
    for (const warehouse of warehouses) {
      await this.warehouseStockService.initializeStock({
        inventoryItemId: newItem.id,
        warehouseId: warehouse.id,
        quantityOnHand: 0,
      });
    }
  }

  @EventHandler('variant.deleted')
  async onVariantDeleted(event: VariantDeletedEvent) {
    // Soft delete InventoryItem (сохраняем историю)
    await this.inventoryItemService.softDelete(event.payload.variantId);
  }
}
```

### 4.2 События Inventory → другие сервисы

```typescript
// Inventory публикует при изменении стока
interface StockChangedEvent {
  type: 'stock.changed';
  payload: {
    inventoryItemId: string;
    variantId: string;
    warehouseId: string;
    projectId: string;
    quantityOnHand: number;
    previousQuantity: number;
    movementType: StockMovementType;
    availableQty: number;
  };
}

interface OutOfStockEvent {
  type: 'stock.out_of_stock';
  payload: {
    inventoryItemId: string;
    variantId: string;
    productId: string;
    projectId: string;
    warehouseId?: string; // null = все склады
  };
}

interface LowStockAlertEvent {
  type: 'stock.low_stock_alert';
  payload: {
    inventoryItemId: string;
    variantId: string;
    productId: string;
    projectId: string;
    currentStock: number;
    threshold: number;
  };
}
```

---

## Фаза 5: Pricing (куда относить?)

### Рекомендация: Оставить в отдельном Pricing сервисе или в Catalog

**Вариант A: Pricing в Catalog** (рекомендуется для MVP)
- Цена - атрибут товара для покупателя
- Проще для frontend (один сервис для отображения)
- История цен остается в каталоге

**Вариант B: Pricing в Inventory**
- Цена связана с себестоимостью
- Проще считать маржу
- Ценообразование может зависеть от стока

**Вариант C: Отдельный Pricing сервис** (для будущего)
- Сложное ценообразование (скидки, акции, регионы)
- A/B тестирование цен
- Динамическое ценообразование

### Решение для текущего плана

```
Catalog Service:
  - ItemPricing (продажная цена)
  - Price history

Inventory Service:
  - ProductVariantCostHistory (себестоимость)
  - Cost tracking
```

---

## Фаза 6: Структура файлов

### 6.1 Catalog Service

```
services/catalog/
├── src/
│   ├── domain/
│   │   ├── product/
│   │   │   ├── product.entity.ts
│   │   │   ├── product.repository.ts
│   │   │   ├── product.service.ts
│   │   │   └── product.resolver.ts
│   │   ├── variant/
│   │   │   ├── variant.entity.ts
│   │   │   ├── variant.repository.ts
│   │   │   ├── variant.service.ts
│   │   │   └── variant.resolver.ts
│   │   ├── category/
│   │   │   ├── category.entity.ts
│   │   │   ├── category.repository.ts
│   │   │   ├── category.service.ts
│   │   │   └── category.resolver.ts
│   │   ├── tag/
│   │   │   ├── tag.entity.ts
│   │   │   ├── tag.repository.ts
│   │   │   ├── tag.service.ts
│   │   │   └── tag.resolver.ts
│   │   ├── option/
│   │   │   └── ...
│   │   └── feature/
│   │       └── ...
│   ├── infrastructure/
│   │   ├── db/
│   │   │   ├── schema/
│   │   │   │   ├── products.ts
│   │   │   │   ├── variants.ts
│   │   │   │   ├── categories.ts
│   │   │   │   ├── tags.ts
│   │   │   │   ├── options.ts
│   │   │   │   ├── features.ts
│   │   │   │   └── translations.ts
│   │   │   └── migrations/
│   │   └── events/
│   │       ├── publishers/
│   │       │   └── catalog-events.publisher.ts
│   │       └── handlers/
│   │           └── file-deleted.handler.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── product-create.command.ts
│   │   │   ├── product-update.command.ts
│   │   │   └── ...
│   │   └── queries/
│   │       ├── product.query.ts
│   │       └── ...
│   └── graphql/
│       ├── schema.graphql
│       └── resolvers/
├── drizzle.config.ts
├── codegen.ts
└── package.json
```

### 6.2 Inventory Service (обновленный)

```
services/inventory/
├── src/
│   ├── domain/
│   │   ├── inventory-item/
│   │   │   ├── inventory-item.entity.ts
│   │   │   ├── inventory-item.repository.ts
│   │   │   ├── inventory-item.service.ts
│   │   │   └── inventory-item.resolver.ts
│   │   ├── warehouse/
│   │   │   ├── warehouse.entity.ts
│   │   │   ├── warehouse.repository.ts
│   │   │   ├── warehouse.service.ts
│   │   │   └── warehouse.resolver.ts
│   │   ├── stock/
│   │   │   ├── warehouse-stock.entity.ts
│   │   │   ├── stock-change.entity.ts
│   │   │   ├── stock.repository.ts
│   │   │   ├── stock.service.ts
│   │   │   └── stock.resolver.ts
│   │   └── physical/
│   │       ├── dimensions.entity.ts
│   │       └── weight.entity.ts
│   ├── infrastructure/
│   │   ├── db/
│   │   │   ├── schema/
│   │   │   │   ├── inventory-item.ts
│   │   │   │   ├── warehouse.ts
│   │   │   │   ├── warehouse-stock.ts
│   │   │   │   ├── stock-changes.ts
│   │   │   │   ├── physical.ts
│   │   │   │   └── cost.ts
│   │   │   └── migrations/
│   │   └── events/
│   │       ├── publishers/
│   │       │   └── inventory-events.publisher.ts
│   │       └── handlers/
│   │           ├── variant-created.handler.ts
│   │           └── variant-deleted.handler.ts
│   └── graphql/
│       └── ...
└── package.json
```

---

## Фаза 6.1: Детальная структура Catalog Service

### Полная структура src/

```
services/catalog/src/
├── api/
│   ├── graphql-admin/
│   │   ├── resolvers/
│   │   │   └── index.ts
│   │   └── schema/
│   │       ├── base.graphql
│   │       ├── product.graphql
│   │       ├── variant.graphql
│   │       ├── category.graphql
│   │       ├── tag.graphql
│   │       ├── options.graphql
│   │       ├── features.graphql
│   │       ├── pricing.graphql
│   │       ├── seo.graphql
│   │       ├── media.graphql
│   │       └── relay.graphql
│   └── graphql-storefront/
│       └── schema/
├── context/
│   └── CatalogContext.ts
├── loaders/
│   ├── Loader.ts
│   ├── ProductLoader.ts
│   ├── VariantLoader.ts
│   ├── CategoryLoader.ts
│   ├── TagLoader.ts
│   ├── OptionLoader.ts
│   └── FeatureLoader.ts
├── repositories/
│   ├── models/
│   │   ├── index.ts
│   │   ├── products.ts
│   │   ├── variants.ts
│   │   ├── categories.ts
│   │   ├── tags.ts
│   │   ├── options.ts
│   │   ├── features.ts
│   │   ├── pricing.ts
│   │   ├── translations.ts
│   │   ├── seo.ts
│   │   └── media.ts
│   ├── product/
│   │   └── ProductRepository.ts
│   ├── variant/
│   │   └── VariantRepository.ts
│   ├── category/
│   │   └── CategoryRepository.ts
│   ├── tag/
│   │   └── TagRepository.ts
│   ├── option/
│   │   └── OptionRepository.ts
│   ├── feature/
│   │   └── FeatureRepository.ts
│   ├── pricing/
│   │   └── PricingRepository.ts
│   ├── translation/
│   │   └── TranslationRepository.ts
│   └── media/
│       └── MediaRepository.ts
├── resolvers/
│   └── admin/
│       ├── CatalogType.ts              # Базовый класс (как InventoryType)
│       ├── QueryResolver.ts
│       ├── MutationResolver.ts
│       ├── ProductResolver.ts
│       ├── VariantResolver.ts
│       ├── CategoryResolver.ts
│       ├── TagResolver.ts
│       ├── OptionResolver.ts
│       ├── OptionValueResolver.ts
│       ├── FeatureResolver.ts
│       ├── FeatureValueResolver.ts
│       ├── ProductSeoResolver.ts
│       ├── VariantPriceResolver.ts
│       ├── ProductConnectionResolver.ts
│       ├── VariantConnectionResolver.ts
│       ├── CategoryConnectionResolver.ts
│       ├── connection/
│       │   └── BaseConnectionResolver.ts
│       ├── interfaces/
│       │   └── index.ts
│       └── validation/
│           └── index.ts
├── scripts/
│   ├── product/
│   │   ├── ProductCreateScript.ts
│   │   ├── ProductDeleteScript.ts
│   │   ├── ProductUpdateScript.ts
│   │   ├── ProductUpdateContentScript.ts
│   │   ├── ProductUpdateMediaScript.ts
│   │   ├── ProductUpdateSeoScript.ts
│   │   └── ProductUpdateStatusScript.ts
│   ├── variant/
│   │   ├── VariantCreateScript.ts
│   │   ├── VariantDeleteScript.ts
│   │   ├── VariantUpdateOptionsScript.ts
│   │   ├── VariantUpdatePricingScript.ts
│   │   └── VariantUpdateMediaScript.ts
│   ├── category/
│   │   ├── CategoryCreateScript.ts
│   │   ├── CategoryUpdateScript.ts
│   │   ├── CategoryDeleteScript.ts
│   │   └── CategoryMoveScript.ts
│   ├── tag/
│   │   ├── TagCreateScript.ts
│   │   ├── TagUpdateScript.ts
│   │   └── TagDeleteScript.ts
│   ├── option/
│   │   ├── OptionCreateScript.ts
│   │   ├── OptionUpdateScript.ts
│   │   ├── OptionDeleteScript.ts
│   │   └── OptionsSyncScript.ts
│   └── feature/
│       ├── FeatureCreateScript.ts
│       ├── FeatureUpdateScript.ts
│       ├── FeatureDeleteScript.ts
│       └── FeaturesSyncScript.ts
├── sagas/
│   └── ProductCreateSaga.ts
├── workflows/
│   ├── ProductUpdateWorkflow.ts
│   └── ProductBulkEditWorkflow.ts
└── index.ts
```

---

## Фаза 6.2: Резолверы Catalog Service

### ProductResolver.ts (переносится из inventory без изменений)

```typescript
import { SubgraphReference } from "@shopana/type-resolver";
import type { Product } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

@SubgraphReference()
export class ProductResolver extends CatalogType<string, Product | null> {
  async $preload() {
    return this.$ctx.loaders.product.load(this.$props);
  }

  id() {
    return this.$props;
  }

  async handle() {
    return this.$get("handle");
  }

  async publishedAt() {
    return this.$get("publishedAt");
  }

  async isPublished() {
    const publishedAt = await this.$get("publishedAt");
    if (!publishedAt) return false;
    return new Date(publishedAt) <= new Date();
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async deletedAt() {
    return this.$get("deletedAt");
  }

  async revision() {
    return this.$get("revision");
  }

  async title() {
    const translation = await this.$ctx.loaders.productTranslation.load(this.$props);
    return translation?.title ?? "";
  }

  async description() {
    const translation = await this.$ctx.loaders.productTranslation.load(this.$props);
    if (!translation) return null;
    return {
      text: translation.descriptionText ?? "",
      html: translation.descriptionHtml ?? "",
      json: translation.descriptionJson ?? {},
    };
  }

  async excerpt() {
    const translation = await this.$ctx.loaders.productTranslation.load(this.$props);
    return translation?.excerpt ?? null;
  }

  async seo() {
    const seoData = await this.$ctx.loaders.productSeo.load(this.$props);
    if (!seoData) return null;
    return new ProductSeoResolver(seoData, this.$ctx);
  }

  variants(args: VariantRelayInput) {
    return new VariantConnectionResolver({ ...args, productId: this.$props }, this.$ctx);
  }

  async options() {
    const ids = await this.$ctx.loaders.productOptionIds.load(this.$props);
    return ids.map((id) => new OptionResolver(id, this.$ctx));
  }

  async features() {
    const ids = await this.$ctx.loaders.productFeatureIds.load(this.$props);
    return ids.map((id) => new FeatureResolver(id, this.$ctx));
  }

  async variantsCount() {
    const variantIds = await this.$ctx.loaders.variantIds.load(this.$props);
    return variantIds.length;
  }

  // ═══════════════════════════════════════════════════════════
  // Новые поля для Category и Tag
  // ═══════════════════════════════════════════════════════════

  async categories() {
    const ids = await this.$ctx.loaders.productCategoryIds.load(this.$props);
    return ids.map((id) => new CategoryResolver(id, this.$ctx));
  }

  async tags() {
    const ids = await this.$ctx.loaders.productTagIds.load(this.$props);
    return ids.map((id) => new TagResolver(id, this.$ctx));
  }
}
```

### VariantResolver.ts (Catalog - без inventory полей)

```typescript
import { SubgraphReference } from "@shopana/type-resolver";
import type { Variant } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

/**
 * Variant resolver в Catalog Service.
 * НЕ содержит inventory-полей (sku, dimensions, weight, cost, stock).
 * Эти поля резолвятся через federation extend в Inventory Service.
 */
@SubgraphReference()
export class VariantResolver extends CatalogType<string, Variant | null> {
  async $preload() {
    return this.$ctx.loaders.variant.load(this.$props);
  }

  id() {
    return this.$props;
  }

  async productId() {
    return this.$get("productId");
  }

  async isDefault() {
    return (await this.$get("isDefault")) ?? false;
  }

  async handle() {
    return (await this.$get("handle")) ?? "";
  }

  // externalSystem и externalId остаются в Catalog
  async externalSystem() {
    return this.$get("externalSystem");
  }

  async externalId() {
    return this.$get("externalId");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async deletedAt() {
    return this.$get("deletedAt");
  }

  async title() {
    const translation = await this.$ctx.loaders.variantTranslation.load(this.$props);
    return translation?.title ?? null;
  }

  // ═══════════════════════════════════════════════════════════
  // Pricing остается в Catalog
  // ═══════════════════════════════════════════════════════════

  async price(): Promise<VariantPrice | null> {
    const prices = await this.$ctx.loaders.variantPricing.load(this.$props);
    let filtered = prices;
    if (this.$ctx.currency) {
      filtered = prices.filter((p) => p.currency === this.$ctx.currency);
    }
    if (filtered.length === 0) return null;
    const current = filtered[0];
    return {
      id: current.id,
      currency: current.currency,
      amountMinor: current.amountMinor,
      compareAtMinor: current.compareAtMinor,
      effectiveFrom: current.effectiveFrom,
      effectiveTo: current.effectiveTo,
      recordedAt: current.recordedAt,
      isCurrent: current.effectiveTo === null,
    };
  }

  async priceHistory(args: PricingCursorInput) {
    const services = this.$ctx.kernel.getServices();
    const ids = await services.repository.pricing.getIdsByVariantId(this.$props, args);
    return ids.map((id: string) => new VariantPriceResolver(id, this.$ctx));
  }

  async selectedOptions(): Promise<SelectedOption[]> {
    const links = await this.$ctx.loaders.variantSelectedOptions.load(this.$props);
    return links
      .filter((link) => link.optionValueId !== null)
      .map((link) => ({
        optionId: link.optionId,
        optionValueId: link.optionValueId!,
      }));
  }

  async media() {
    const mediaItems = await this.$ctx.loaders.variantMedia.load(this.$props);
    return mediaItems.map((m) => ({
      file: { __typename: "File" as const, id: m.fileId },
      sortIndex: m.sortIndex,
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // УДАЛЕНЫ из Catalog (переносятся в Inventory):
  // - sku()
  // - dimensions()
  // - weight()
  // - cost()
  // - costHistory()
  // - stock()
  // - inStock()
  // Эти поля будут резолвиться через federation extend
  // ═══════════════════════════════════════════════════════════
}
```

### CategoryResolver.ts (новый)

```typescript
import { SubgraphReference } from "@shopana/type-resolver";
import type { Category } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

@SubgraphReference()
export class CategoryResolver extends CatalogType<string, Category | null> {
  async $preload() {
    return this.$ctx.loaders.category.load(this.$props);
  }

  id() {
    return this.$props;
  }

  async handle() {
    return this.$get("handle");
  }

  async publishedAt() {
    return this.$get("publishedAt");
  }

  async isPublished() {
    const publishedAt = await this.$get("publishedAt");
    if (!publishedAt) return false;
    return new Date(publishedAt) <= new Date();
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async deletedAt() {
    return this.$get("deletedAt");
  }

  async name() {
    const translation = await this.$ctx.loaders.categoryTranslation.load(this.$props);
    return translation?.name ?? "";
  }

  async description() {
    const translation = await this.$ctx.loaders.categoryTranslation.load(this.$props);
    if (!translation) return null;
    return {
      text: translation.descriptionText ?? "",
      html: translation.descriptionHtml ?? "",
      json: translation.descriptionJson ?? {},
    };
  }

  async parent() {
    const parentId = await this.$get("parentId");
    if (!parentId) return null;
    return new CategoryResolver(parentId, this.$ctx);
  }

  async children() {
    const ids = await this.$ctx.loaders.categoryChildrenIds.load(this.$props);
    return ids.map((id) => new CategoryResolver(id, this.$ctx));
  }

  async ancestors() {
    const ids = await this.$ctx.loaders.categoryAncestorIds.load(this.$props);
    return ids.map((id) => new CategoryResolver(id, this.$ctx));
  }

  async media() {
    const mediaItems = await this.$ctx.loaders.categoryMedia.load(this.$props);
    return mediaItems.map((m) => ({
      __typename: "File" as const,
      id: m.fileId,
    }));
  }

  products(args: ProductRelayInput) {
    return new ProductConnectionResolver(
      { ...args, categoryId: this.$props },
      this.$ctx
    );
  }

  async productsCount() {
    return this.$ctx.loaders.categoryProductsCount.load(this.$props);
  }
}
```

### TagResolver.ts (новый)

```typescript
import { SubgraphReference } from "@shopana/type-resolver";
import type { Tag } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

@SubgraphReference()
export class TagResolver extends CatalogType<string, Tag | null> {
  async $preload() {
    return this.$ctx.loaders.tag.load(this.$props);
  }

  id() {
    return this.$props;
  }

  async handle() {
    return this.$get("handle");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async name() {
    const translation = await this.$ctx.loaders.tagTranslation.load(this.$props);
    return translation?.name ?? this.$get("handle");
  }

  products(args: ProductRelayInput) {
    return new ProductConnectionResolver(
      { ...args, tagId: this.$props },
      this.$ctx
    );
  }

  async productsCount() {
    return this.$ctx.loaders.tagProductsCount.load(this.$props);
  }
}
```

---

## Фаза 6.3: Federation Resolvers (Inventory Service)

### VariantFederationResolver.ts (Inventory extends Variant)

```typescript
import { SubgraphReference } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
import { StockResolver } from "./StockResolver.js";

/**
 * Federation resolver для Variant.
 * Расширяет Variant из Catalog Service полями инвентаря.
 *
 * Catalog Service владеет типом Variant.
 * Inventory Service добавляет поля через @extends.
 */
@SubgraphReference()
export class VariantFederationResolver extends InventoryType<string, null> {
  // Variant ID передается через federation
  // Данные загружаются через InventoryItem

  id() {
    return this.$props; // variantId from federation
  }

  /**
   * Резолвит InventoryItem по variantId.
   * Это основная связь Catalog ↔ Inventory.
   */
  async inventoryItem() {
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
    if (!item) return null;
    return new InventoryItemResolver(item.id, this.$ctx);
  }

  /**
   * SKU переносится в InventoryItem, но доступен на Variant через federation.
   */
  async sku() {
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
    return item?.sku ?? null;
  }

  /**
   * Dimensions из InventoryItem.
   */
  async dimensions() {
    const dims = await this.$ctx.loaders.inventoryItemDimensions.load(this.$props);
    if (!dims) return null;
    return {
      width: dims.wMm,
      length: dims.lMm,
      height: dims.hMm,
    };
  }

  /**
   * Weight из InventoryItem.
   */
  async weight() {
    const w = await this.$ctx.loaders.inventoryItemWeight.load(this.$props);
    if (!w) return null;
    return {
      value: w.weightGr,
    };
  }

  /**
   * Cost из InventoryItem (себестоимость).
   */
  async cost() {
    const costs = await this.$ctx.loaders.inventoryItemCost.load(this.$props);
    let filtered = costs;
    if (this.$ctx.currency) {
      filtered = costs.filter((c) => c.currency === this.$ctx.currency);
    }
    if (filtered.length === 0) return null;
    const current = filtered[0];
    return {
      id: current.id,
      currency: current.currency,
      unitCostMinor: current.unitCostMinor,
      effectiveFrom: current.effectiveFrom,
      effectiveTo: current.effectiveTo,
      recordedAt: current.recordedAt,
      isCurrent: current.effectiveTo === null,
    };
  }

  async costHistory(args: CostCursorInput) {
    const services = this.$ctx.kernel.getServices();
    const ids = await services.repository.cost.getIdsByVariantId(this.$props, args);
    return ids.map((id: string) => new VariantCostResolver(id, this.$ctx));
  }

  /**
   * Stock по всем складам для этого варианта.
   */
  async stock() {
    const stocks = await this.$ctx.loaders.variantStock.load(this.$props);
    return stocks.map((s) => new StockResolver(s.id, this.$ctx));
  }

  /**
   * Проверка наличия на складе.
   */
  async inStock() {
    const stocks = await this.$ctx.loaders.variantStock.load(this.$props);
    return stocks.some((s) => s.quantityOnHand > 0);
  }
}
```

### InventoryItemResolver.ts (новый)

```typescript
import { SubgraphReference } from "@shopana/type-resolver";
import type { InventoryItem } from "../../repositories/models/index.js";
import { InventoryType } from "./InventoryType.js";
import { StockResolver } from "./StockResolver.js";

@SubgraphReference()
export class InventoryItemResolver extends InventoryType<string, InventoryItem | null> {
  async $preload() {
    return this.$ctx.loaders.inventoryItem.load(this.$props);
  }

  id() {
    return this.$props;
  }

  /**
   * Ссылка на Variant в Catalog Service (federation reference).
   */
  async variant() {
    const variantId = await this.$get("variantId");
    return { __typename: "Variant" as const, id: variantId };
  }

  async sku() {
    return this.$get("sku");
  }

  async trackInventory() {
    return (await this.$get("trackInventory")) ?? true;
  }

  async continueSellingWhenOutOfStock() {
    return (await this.$get("continueSellingWhenOutOfStock")) ?? false;
  }

  async dimensions() {
    const dims = await this.$ctx.loaders.inventoryItemDimensions.load(this.$props);
    if (!dims) return null;
    return {
      width: dims.wMm,
      length: dims.lMm,
      height: dims.hMm,
    };
  }

  async weight() {
    const w = await this.$ctx.loaders.inventoryItemWeight.load(this.$props);
    if (!w) return null;
    return { value: w.weightGr };
  }

  async cost() {
    const variantId = await this.$get("variantId");
    const costs = await this.$ctx.loaders.inventoryItemCost.load(variantId);
    if (costs.length === 0) return null;
    const current = costs[0];
    return {
      id: current.id,
      currency: current.currency,
      unitCostMinor: current.unitCostMinor,
      effectiveFrom: current.effectiveFrom,
      effectiveTo: current.effectiveTo,
      recordedAt: current.recordedAt,
      isCurrent: current.effectiveTo === null,
    };
  }

  async costHistory(args: CostCursorInput) {
    const variantId = await this.$get("variantId");
    const services = this.$ctx.kernel.getServices();
    const ids = await services.repository.cost.getIdsByVariantId(variantId, args);
    return ids.map((id: string) => new VariantCostResolver(id, this.$ctx));
  }

  async stock() {
    const variantId = await this.$get("variantId");
    const stocks = await this.$ctx.loaders.variantStock.load(variantId);
    return stocks.map((s) => new StockResolver(s.id, this.$ctx));
  }

  async inStock() {
    const variantId = await this.$get("variantId");
    const stocks = await this.$ctx.loaders.variantStock.load(variantId);
    return stocks.some((s) => s.quantityOnHand > 0);
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
```

---

## Фаза 6.4: Loaders для Catalog Service

### CategoryLoader.ts (новый)

```typescript
import DataLoader from "dataloader";
import type { Category } from "../repositories/models/index.js";

export function createCategoryLoader(repo: CategoryRepository) {
  return new DataLoader<string, Category | null>(async (ids) => {
    const categories = await repo.findByIds([...ids]);
    const map = new Map(categories.map((c) => [c.id, c]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

export function createCategoryChildrenIdsLoader(repo: CategoryRepository) {
  return new DataLoader<string, string[]>(async (parentIds) => {
    const children = await repo.findChildrenByParentIds([...parentIds]);
    const map = new Map<string, string[]>();
    for (const child of children) {
      const list = map.get(child.parentId!) ?? [];
      list.push(child.id);
      map.set(child.parentId!, list);
    }
    return parentIds.map((id) => map.get(id) ?? []);
  });
}

export function createCategoryAncestorIdsLoader(repo: CategoryRepository) {
  return new DataLoader<string, string[]>(async (ids) => {
    // Используем LTREE path для быстрого получения предков
    const results = await repo.findAncestorsByIds([...ids]);
    return ids.map((id) => results.get(id) ?? []);
  });
}

export function createCategoryProductsCountLoader(repo: ProductCategoryRepository) {
  return new DataLoader<string, number>(async (categoryIds) => {
    const counts = await repo.countProductsByCategoryIds([...categoryIds]);
    return categoryIds.map((id) => counts.get(id) ?? 0);
  });
}

export function createCategoryTranslationLoader(
  repo: TranslationRepository,
  locale: string
) {
  return new DataLoader<string, CategoryTranslation | null>(async (ids) => {
    const translations = await repo.findCategoryTranslations([...ids], locale);
    const map = new Map(translations.map((t) => [t.categoryId, t]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

export function createCategoryMediaLoader(repo: MediaRepository) {
  return new DataLoader<string, CategoryMedia[]>(async (categoryIds) => {
    const media = await repo.findCategoryMedia([...categoryIds]);
    const map = new Map<string, CategoryMedia[]>();
    for (const m of media) {
      const list = map.get(m.categoryId) ?? [];
      list.push(m);
      map.set(m.categoryId, list);
    }
    return categoryIds.map((id) =>
      (map.get(id) ?? []).sort((a, b) => a.sortIndex - b.sortIndex)
    );
  });
}
```

### TagLoader.ts (новый)

```typescript
import DataLoader from "dataloader";
import type { Tag } from "../repositories/models/index.js";

export function createTagLoader(repo: TagRepository) {
  return new DataLoader<string, Tag | null>(async (ids) => {
    const tags = await repo.findByIds([...ids]);
    const map = new Map(tags.map((t) => [t.id, t]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

export function createTagTranslationLoader(
  repo: TranslationRepository,
  locale: string
) {
  return new DataLoader<string, TagTranslation | null>(async (ids) => {
    const translations = await repo.findTagTranslations([...ids], locale);
    const map = new Map(translations.map((t) => [t.tagId, t]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

export function createTagProductsCountLoader(repo: ProductTagRepository) {
  return new DataLoader<string, number>(async (tagIds) => {
    const counts = await repo.countProductsByTagIds([...tagIds]);
    return tagIds.map((id) => counts.get(id) ?? 0);
  });
}

export function createProductTagIdsLoader(repo: ProductTagRepository) {
  return new DataLoader<string, string[]>(async (productIds) => {
    const links = await repo.findByProductIds([...productIds]);
    const map = new Map<string, string[]>();
    for (const link of links) {
      const list = map.get(link.productId) ?? [];
      list.push(link.tagId);
      map.set(link.productId, list);
    }
    return productIds.map((id) => map.get(id) ?? []);
  });
}

export function createProductCategoryIdsLoader(repo: ProductCategoryRepository) {
  return new DataLoader<string, string[]>(async (productIds) => {
    const links = await repo.findByProductIds([...productIds]);
    const map = new Map<string, string[]>();
    for (const link of links) {
      const list = map.get(link.productId) ?? [];
      list.push(link.categoryId);
      map.set(link.productId, list);
    }
    return productIds.map((id) => map.get(id) ?? []);
  });
}
```

---

## Фаза 6.5: Loaders для Inventory Service (новые)

### InventoryItemLoader.ts (новый)

```typescript
import DataLoader from "dataloader";
import type { InventoryItem } from "../repositories/models/index.js";

export function createInventoryItemLoader(repo: InventoryItemRepository) {
  return new DataLoader<string, InventoryItem | null>(async (ids) => {
    const items = await repo.findByIds([...ids]);
    const map = new Map(items.map((i) => [i.id, i]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

/**
 * Загрузка InventoryItem по variantId.
 * Ключевой loader для federation - связывает Variant с InventoryItem.
 */
export function createInventoryItemByVariantLoader(repo: InventoryItemRepository) {
  return new DataLoader<string, InventoryItem | null>(async (variantIds) => {
    const items = await repo.findByVariantIds([...variantIds]);
    const map = new Map(items.map((i) => [i.variantId, i]));
    return variantIds.map((id) => map.get(id) ?? null);
  });
}

export function createInventoryItemDimensionsLoader(repo: PhysicalRepository) {
  return new DataLoader<string, ItemDimensions | null>(async (variantIds) => {
    const dims = await repo.findDimensionsByVariantIds([...variantIds]);
    const map = new Map(dims.map((d) => [d.variantId, d]));
    return variantIds.map((id) => map.get(id) ?? null);
  });
}

export function createInventoryItemWeightLoader(repo: PhysicalRepository) {
  return new DataLoader<string, ItemWeight | null>(async (variantIds) => {
    const weights = await repo.findWeightsByVariantIds([...variantIds]);
    const map = new Map(weights.map((w) => [w.variantId, w]));
    return variantIds.map((id) => map.get(id) ?? null);
  });
}

export function createInventoryItemCostLoader(repo: CostRepository) {
  return new DataLoader<string, VariantCost[]>(async (variantIds) => {
    const costs = await repo.findCurrentByVariantIds([...variantIds]);
    const map = new Map<string, VariantCost[]>();
    for (const cost of costs) {
      const list = map.get(cost.variantId) ?? [];
      list.push(cost);
      map.set(cost.variantId, list);
    }
    return variantIds.map((id) => map.get(id) ?? []);
  });
}
```

---

## Фаза 6.6: GraphQL Federation Schema

### Catalog Service - schema.graphql

```graphql
# Catalog Service является владельцем (owner) типов Product и Variant

type Product @key(fields: "id") {
  id: ID!
  # ... все поля как в текущем inventory
}

type Variant @key(fields: "id") {
  id: ID!
  product: Product!
  isDefault: Boolean!
  handle: String!
  externalSystem: String
  externalId: String
  createdAt: DateTime!
  updatedAt: DateTime!
  deletedAt: DateTime
  title: String
  selectedOptions: [SelectedOption!]!
  media: [VariantMediaItem!]!

  # Pricing остается в Catalog
  price: VariantPrice
  priceHistory(first: Int, after: String, last: Int, before: String): VariantPriceConnection!

  # Inventory поля НЕ объявляются здесь - они добавляются через extend в Inventory Service
}

type Category @key(fields: "id") {
  id: ID!
  # ... все поля категории
}

type Tag @key(fields: "id") {
  id: ID!
  # ... все поля тега
}
```

### Inventory Service - schema.graphql

```graphql
# Inventory Service расширяет Variant из Catalog

extend type Variant @key(fields: "id") {
  id: ID! @external

  # Поля добавляемые Inventory Service
  sku: String
  dimensions: VariantDimensions
  weight: VariantWeight
  cost: VariantCost
  costHistory(first: Int, after: String, last: Int, before: String): VariantCostConnection!
  stock: [WarehouseStock!]!
  inStock: Boolean!
  inventoryItem: InventoryItem
}

type InventoryItem @key(fields: "id") {
  id: ID!
  variant: Variant!
  sku: String
  trackInventory: Boolean!
  continueSellingWhenOutOfStock: Boolean!
  dimensions: VariantDimensions
  weight: VariantWeight
  cost: VariantCost
  costHistory(first: Int, after: String, last: Int, before: String): VariantCostConnection!
  stock: [WarehouseStock!]!
  inStock: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Warehouse @key(fields: "id") {
  id: ID!
  # ... все поля склада
}

type WarehouseStock implements Node {
  id: ID!
  warehouse: Warehouse!
  variant: Variant!
  quantityOnHand: Int!
  reservedQty: Int!
  unavailableQty: Int!
  availableQty: Int!  # computed
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

---

## Фаза 7: План выполнения

> **ВАЖНО:** Catalog Service уже создан как полная копия Inventory Service.
> Стратегия: удалить лишнее → переименовать → добавить новое.

### Sprint 1: Очистка Catalog Service (копия inventory уже есть)

**Удалить из Catalog (inventory-related):**
- [ ] Удалить `repositories/warehouse/`
- [ ] Удалить `repositories/stock/`
- [ ] Удалить `repositories/cost/`
- [ ] Удалить `repositories/physical/`
- [ ] Удалить `repositories/models/stock.ts`
- [ ] Удалить `repositories/models/stock-changes.ts`
- [ ] Удалить `repositories/models/cost.ts`
- [ ] Удалить `repositories/models/physical.ts`
- [ ] Удалить `resolvers/admin/WarehouseResolver.ts`
- [ ] Удалить `resolvers/admin/StockResolver.ts`
- [ ] Удалить `scripts/warehouse/`
- [ ] Удалить `loaders/WarehouseLoader.ts`

**Удалить из VariantResolver (переносится в Inventory):**
- [ ] Удалить метод `sku()`
- [ ] Удалить метод `dimensions()`
- [ ] Удалить метод `weight()`
- [ ] Удалить метод `cost()`
- [ ] Удалить метод `costHistory()`
- [ ] Удалить метод `stock()`
- [ ] Удалить метод `inStock()`

**Удалить GraphQL schema:**
- [ ] Удалить `stock.graphql`
- [ ] Удалить `physical.graphql` (или оставить types для federation)

### Sprint 2: Переименование в Catalog Service

**Переименовать:**
- [ ] `InventoryType.ts` → `CatalogType.ts`
- [ ] `InventoryContext.ts` → `CatalogContext.ts`
- [ ] Namespace `inventoryQuery` → `catalogQuery`
- [ ] Namespace `inventoryMutation` → `catalogMutation`
- [ ] Package name в `package.json`
- [ ] DB schema name (если используется)

**Обновить imports во всех файлах:**
- [ ] Заменить `InventoryType` на `CatalogType`
- [ ] Заменить `InventoryContext` на `CatalogContext`

### Sprint 3: Добавить новое в Catalog Service

**Category:**
- [ ] Создать `repositories/models/categories.ts`
- [ ] Создать `repositories/category/CategoryRepository.ts`
- [ ] Создать `resolvers/admin/CategoryResolver.ts`
- [ ] Создать `scripts/category/` (CRUD + Move)
- [ ] Создать `loaders/CategoryLoader.ts`
- [ ] Добавить `category.graphql`
- [ ] Добавить таблицу связи `product_category`

**Tag:**
- [ ] Создать `repositories/models/tags.ts`
- [ ] Создать `repositories/tag/TagRepository.ts`
- [ ] Создать `resolvers/admin/TagResolver.ts`
- [ ] Создать `scripts/tag/` (CRUD)
- [ ] Создать `loaders/TagLoader.ts`
- [ ] Добавить `tag.graphql`
- [ ] Добавить таблицу связи `product_tag`

**Обновить Product:**
- [ ] Добавить `categories()` в ProductResolver
- [ ] Добавить `tags()` в ProductResolver
- [ ] Добавить mutations для связей

### Sprint 4: Очистка Inventory Service

**Удалить из Inventory (catalog-related):**
- [ ] Удалить `repositories/product/`
- [ ] Удалить `repositories/variant/` (кроме связи с InventoryItem)
- [ ] Удалить `repositories/option/`
- [ ] Удалить `repositories/feature/`
- [ ] Удалить `repositories/pricing/`
- [ ] Удалить `repositories/translation/` (кроме warehouse translations)
- [ ] Удалить `repositories/media/`
- [ ] Удалить `repositories/models/products.ts`
- [ ] Удалить `repositories/models/options.ts`
- [ ] Удалить `repositories/models/features.ts`
- [ ] Удалить `repositories/models/pricing.ts`
- [ ] Удалить `repositories/models/translations.ts` (частично)
- [ ] Удалить `repositories/models/seo.ts`
- [ ] Удалить `repositories/models/media.ts`
- [ ] Удалить `resolvers/admin/ProductResolver.ts`
- [ ] Удалить `resolvers/admin/VariantResolver.ts` (заменить на VariantFederationResolver)
- [ ] Удалить `resolvers/admin/OptionResolver.ts`
- [ ] Удалить `resolvers/admin/FeatureResolver.ts`
- [ ] Удалить `scripts/product/`
- [ ] Удалить `scripts/variant/` (кроме inventory-related)
- [ ] Удалить `scripts/option/`
- [ ] Удалить `scripts/feature/`
- [ ] Удалить `loaders/ProductLoader.ts`
- [ ] Удалить `loaders/VariantLoader.ts` (заменить на InventoryItemLoader)
- [ ] Удалить `loaders/OptionLoader.ts`
- [ ] Удалить `loaders/FeatureLoader.ts`

### Sprint 5: Добавить новое в Inventory Service

**InventoryItem:**
- [ ] Создать `repositories/models/inventory-item.ts`
- [ ] Создать `repositories/inventory-item/InventoryItemRepository.ts`
- [ ] Создать `resolvers/admin/InventoryItemResolver.ts`
- [ ] Создать `resolvers/admin/VariantFederationResolver.ts`
- [ ] Создать `loaders/InventoryItemLoader.ts`
- [ ] Добавить `inventory-item.graphql`

**Federation:**
- [ ] Настроить `extend type Variant` в schema
- [ ] Реализовать `__resolveReference` для Variant
- [ ] Настроить Apollo Router / Gateway

### Sprint 6: Интеграция и тестирование

- [ ] Настроить event handlers (Catalog → Inventory)
- [ ] Протестировать federation queries
- [ ] Протестировать mutations в обоих сервисах
- [ ] Миграция данных (если нужно)
- [ ] E2E тесты
