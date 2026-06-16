# Inventory Service Separation Plan

## Overview

This document outlines the plan to split the current monolithic `inventory` service into three distinct microservices:

1. **Products Service** - Catalog structure, content, physical attributes, and variant definitions
2. **Pricing Service** - Price management and price history
3. **Inventory Service** - Stock management, costs, and warehouse operations

## Current State Analysis

The existing inventory service handles catalog management (products, variants, options, features), pricing, and operational inventory management (stock levels, costs, warehouses). This coupling creates several issues:

- **Scaling challenges**: Product catalog queries, price lookups, and stock updates have different performance characteristics
- **Deployment coupling**: Changes to product structure require redeploying pricing and inventory logic
- **Domain confusion**: Business logic for catalog vs pricing vs inventory is intermingled
- **Team ownership**: Different teams may own product content, pricing strategy, and inventory operations

## Target Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                      API Gateway                                          │
└─────────────────────────────────────────┬────────────────────────────────────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        │                                 │                                 │
        ▼                                 ▼                                 ▼
┌───────────────┐                ┌───────────────┐                ┌───────────────┐
│   Products    │                │    Pricing    │                │   Inventory   │
│   Service     │◄──────────────►│    Service    │◄──────────────►│   Service     │
│               │                │               │                │               │
│ - Products    │                │ - Prices      │                │ - Stock       │
│ - Variants    │                │ - Price       │                │ - Warehouses  │
│ - Options     │                │   History     │                │ - Costs       │
│ - Features    │                │ - Compare-at  │                │ - SKU         │
│ - Dimensions  │                │               │                │               │
│ - Weight      │                │               │                │               │
│ - Media       │                │               │                │               │
└───────┬───────┘                └───────┬───────┘                └───────┬───────┘
        │                                │                                │
        ▼                                ▼                                ▼
   ┌─────────┐                      ┌─────────┐                      ┌─────────┐
   │Products │                      │ Pricing │                      │Inventory│
   │   DB    │                      │   DB    │                      │   DB    │
   └─────────┘                      └─────────┘                      └─────────┘
```

---

## Service Boundaries

### Products Service

**Domain**: Product catalog structure, content, and physical attributes

**Entities**:

| Entity                           | Description                        |
| -------------------------------- | ---------------------------------- |
| `product`                        | Base product with handle, state    |
| `variant`                        | Product variations                 |
| `productOption`                  | Configuration options (Color, Size)|
| `productOptionValue`             | Option values (Red, Blue, Large)   |
| `productOptionSwatch`            | Visual swatches for options        |
| `productOptionVariantLink`       | Variant-to-option-value mappings   |
| `productFeature`                 | Filterable attributes (Brand)      |
| `productFeatureValue`            | Feature values (Nike, Leather)     |
| `itemDimensions`                 | Variant physical dimensions        |
| `itemWeight`                     | Variant weight                     |
| `variantMedia`                   | Media file associations            |
| `productTranslation`             | Product i18n content               |
| `variantTranslation`             | Variant i18n content               |
| `productOptionTranslation`       | Option i18n                        |
| `productOptionValueTranslation`  | Option value i18n                  |
| `productFeatureTranslation`      | Feature i18n                       |
| `productFeatureValueTranslation` | Feature value i18n                 |

**GraphQL Operations**:

```graphql
# Queries
product(id: ID!): Product
products(first: Int, after: String, ...): ProductConnection
variant(id: ID!): Variant
variants(...): VariantConnection

# Mutations
productCreate(input: ProductCreateInput!): ProductPayload
productUpdate(input: ProductUpdateInput!): ProductPayload
productPublish(input: ProductPublishInput!): ProductPayload
productUnpublish(input: ProductUnpublishInput!): ProductPayload
productDelete(input: ProductDeleteInput!): ProductPayload

variantCreate(input: VariantCreateInput!): VariantPayload
variantDelete(input: VariantDeleteInput!): VariantPayload
variantSetMedia(input: VariantSetMediaInput!): VariantPayload
variantSetDimensions(input: VariantSetDimensionsInput!): VariantPayload
variantSetWeight(input: VariantSetWeightInput!): VariantPayload

productOptionCreate(input: OptionCreateInput!): OptionPayload
productOptionUpdate(input: OptionUpdateInput!): OptionPayload
productOptionDelete(input: OptionDeleteInput!): OptionPayload

productFeatureCreate(input: FeatureCreateInput!): FeaturePayload
productFeatureUpdate(input: FeatureUpdateInput!): FeaturePayload
productFeatureDelete(input: FeatureDeleteInput!): FeaturePayload
```

**Events Published**:

- `product.created`
- `product.updated`
- `product.deleted`
- `product.published`
- `product.unpublished`
- `variant.created`
- `variant.deleted`

---

### Pricing Service

**Domain**: Price management, price history, and compare-at prices

**Entities**:

| Entity        | Description                          |
| ------------- | ------------------------------------ |
| `itemPricing` | Price history with effective dates   |

**GraphQL Operations**:

```graphql
# Queries
variantPrice(variantId: ID!, currency: Currency): VariantPrice
variantPrices(variantIds: [ID!]!, currency: Currency): [VariantPrice!]!
variantPriceHistory(variantId: ID!, currency: Currency, first: Int, after: String): VariantPriceConnection!

# Mutations
variantSetPricing(input: VariantSetPricingInput!): VariantPricePayload
pricingBulkUpdate(input: PricingBulkUpdateInput!): PricingBulkUpdatePayload
```

**Events Published**:

- `pricing.price.changed`

**Events Consumed**:

- `variant.created` - Initialize pricing record (optional)
- `variant.deleted` - Clean up pricing data

---

### Inventory Service

**Domain**: Stock operations, costs, SKU management, and warehouse management

**Entities**:

| Entity                       | Description                          |
| ---------------------------- | ------------------------------------ |
| `warehouse`                  | Physical storage locations           |
| `warehouseStock`             | Quantity per warehouse/variant       |
| `productVariantCostHistory`  | Cost history (internal/operational)  |
| `variantSku`                 | SKU and external system mappings     |
| `warehouseTranslation`       | Warehouse i18n                       |

**GraphQL Operations**:

```graphql
# Queries
warehouse(id: ID!): Warehouse
warehouses(...): WarehouseConnection
variantInventory(variantId: ID!): VariantInventory
stockLevels(warehouseId: ID!, ...): StockConnection

# Mutations
warehouseCreate(input: WarehouseCreateInput!): WarehousePayload
warehouseUpdate(input: WarehouseUpdateInput!): WarehousePayload
warehouseDelete(input: WarehouseDeleteInput!): WarehousePayload

variantSetSku(input: VariantSetSkuInput!): VariantInventoryPayload
variantSetCost(input: VariantSetCostInput!): VariantInventoryPayload
variantSetStock(input: VariantSetStockInput!): VariantInventoryPayload

# Batch operations
stockBulkAdjust(input: StockBulkAdjustInput!): StockBulkAdjustPayload
costBulkUpdate(input: CostBulkUpdateInput!): CostBulkUpdatePayload
```

**Events Published**:

- `inventory.stock.changed` (reason: sale, restock, adjustment, return)
- `inventory.cost.changed`
- `inventory.warehouse.created`
- `inventory.warehouse.deleted`

**Events Consumed**:

- `variant.created` - Initialize inventory record
- `variant.deleted` - Clean up inventory data

---

## Data Model Changes

### Products Service Database

```sql
-- Core product tables
CREATE TABLE product (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  handle TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE variant (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE,
  handle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Physical attributes (moved from inventory)
CREATE TABLE item_dimensions (
  variant_id UUID PRIMARY KEY REFERENCES variant(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  w_mm NUMERIC NOT NULL CHECK (w_mm > 0),
  l_mm NUMERIC NOT NULL CHECK (l_mm > 0),
  h_mm NUMERIC NOT NULL CHECK (h_mm > 0),
  display_unit dimension_display_unit_enum DEFAULT 'cm'
);

CREATE TABLE item_weight (
  variant_id UUID PRIMARY KEY REFERENCES variant(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  weight_gr NUMERIC NOT NULL CHECK (weight_gr > 0),
  display_unit weight_display_unit_enum DEFAULT 'kg'
);

-- Options, features, translations, media (same as current)
-- ... (full schema in migration files)
```

### Pricing Service Database

```sql
-- Pricing tables (new service)
CREATE TABLE item_pricing (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  variant_id UUID NOT NULL,  -- External reference to Products service
  currency currency_enum NOT NULL,
  amount_minor INTEGER NOT NULL,
  compare_at_minor INTEGER,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Current prices view
CREATE VIEW variant_prices_current AS
SELECT * FROM item_pricing WHERE effective_to IS NULL;

-- Indexes
CREATE INDEX idx_item_pricing_variant_currency
  ON item_pricing(variant_id, currency)
  WHERE effective_to IS NULL;
```

### Inventory Service Database

```sql
-- Inventory-specific tables
CREATE TABLE warehouse (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE warehouse_stock (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouse(id),
  variant_id UUID NOT NULL,  -- External reference to Products service
  quantity_on_hand INTEGER DEFAULT 0 CHECK (quantity_on_hand >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SKU management
CREATE TABLE variant_sku (
  variant_id UUID PRIMARY KEY,  -- External reference
  project_id UUID NOT NULL,
  sku TEXT,
  external_system TEXT,
  external_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost history (internal operational data)
CREATE TABLE product_variant_cost_history (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  variant_id UUID NOT NULL,  -- External reference
  currency currency_enum NOT NULL,
  unit_cost_minor INTEGER NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## GraphQL Federation

### Products Service Subgraph

```graphql
extend schema
  @link(
    url: "https://specs.apollo.dev/federation/v2.0"
    import: ["@key", "@shareable"]
  )

type Product @key(fields: "id") {
  id: ID!
  handle: String
  publishedAt: DateTime
  isPublished: Boolean!
  title: String
  description: Description
  excerpt: String
  seoTitle: String
  seoDescription: String
  variants(first: Int, after: String): VariantConnection!
  options: [ProductOption!]!
  features: [ProductFeature!]!
  variantsCount: Int!
}

type Variant @key(fields: "id") {
  id: ID!
  product: Product!
  isDefault: Boolean!
  handle: String
  selectedOptions: [SelectedOption!]!
  title: String
  media: [MediaFile!]!
  dimensions: ItemDimensions
  weight: ItemWeight
}

type ItemDimensions {
  widthMm: Float!
  lengthMm: Float!
  heightMm: Float!
  displayUnit: DimensionUnit!
}

type ItemWeight {
  weightGr: Float!
  displayUnit: WeightUnit!
}
```

### Pricing Service Subgraph

```graphql
extend schema
  @link(
    url: "https://specs.apollo.dev/federation/v2.0"
    import: ["@key", "@extends", "@external"]
  )

# Extend Variant from Products service
type Variant @key(fields: "id") @extends {
  id: ID! @external
  price: VariantPrice
  priceHistory(first: Int, after: String): VariantPriceConnection!
}

type VariantPrice @key(fields: "id") {
  id: ID!
  currency: Currency!
  amountMinor: Int!
  compareAtMinor: Int
  effectiveFrom: DateTime!
  effectiveTo: DateTime
  isCurrent: Boolean!
}
```

### Inventory Service Subgraph

```graphql
extend schema
  @link(
    url: "https://specs.apollo.dev/federation/v2.0"
    import: ["@key", "@extends", "@external"]
  )

# Extend Variant from Products service
type Variant @key(fields: "id") @extends {
  id: ID! @external
  sku: String
  cost: VariantCost
  costHistory(first: Int, after: String): VariantCostConnection!
  stock: [WarehouseStock!]!
  inStock: Boolean!
}

type VariantCost {
  id: ID!
  currency: Currency!
  unitCostMinor: Int!
  effectiveFrom: DateTime!
  effectiveTo: DateTime
  isCurrent: Boolean!
}

type Warehouse @key(fields: "id") {
  id: ID!
  code: String!
  name: String
  isDefault: Boolean!
  stock(first: Int, after: String): WarehouseStockConnection!
  variantsCount: Int!
}

type WarehouseStock @key(fields: "id") {
  id: ID!
  warehouse: Warehouse!
  variant: Variant!
  quantityOnHand: Int!
}
```

---

## Migration Strategy

### Phase 1: Preparation (Non-Breaking)

1. **Create service scaffolds**

   - Create Products service from template
   - Create Pricing service from template
   - Set up database connections
   - Configure GraphQL federation

2. **Extract shared types**

   - Move common types to `@shopana/shared-types`
   - Currency enum, DateTime scalar, etc.

3. **Add event publishing to inventory**
   - Publish events for all mutations
   - Ensure idempotent event handlers

### Phase 2: Data Migration

1. **Set up new databases**

   ```bash
   # Create databases
   createdb shopana_products
   createdb shopana_pricing

   # Run migrations
   pnpm --filter products db:migrate
   pnpm --filter pricing db:migrate
   ```

2. **Migrate product data**

   ```sql
   BEGIN;

   -- Copy products
   INSERT INTO products_db.product
   SELECT id, project_id, handle, published_at, created_at, updated_at, deleted_at
   FROM inventory_db.product;

   -- Copy variants
   INSERT INTO products_db.variant
   SELECT id, project_id, product_id, is_default, handle, created_at, updated_at, deleted_at
   FROM inventory_db.variant;

   -- Copy dimensions
   INSERT INTO products_db.item_dimensions
   SELECT variant_id, project_id, w_mm, l_mm, h_mm, display_unit
   FROM inventory_db.item_dimensions;

   -- Copy weight
   INSERT INTO products_db.item_weight
   SELECT variant_id, project_id, weight_gr, display_unit
   FROM inventory_db.item_weight;

   -- Copy options, features, translations, media...

   COMMIT;
   ```

3. **Migrate pricing data**

   ```sql
   BEGIN;

   INSERT INTO pricing_db.item_pricing
   SELECT id, project_id, variant_id, currency, amount_minor, compare_at_minor,
          effective_from, effective_to, recorded_at
   FROM inventory_db.item_pricing;

   COMMIT;
   ```

4. **Prepare inventory data**

   ```sql
   -- Extract SKU to separate table
   INSERT INTO inventory_db.variant_sku (variant_id, project_id, sku, external_system, external_id)
   SELECT id, project_id, sku, external_system, external_id
   FROM inventory_db.variant
   WHERE sku IS NOT NULL OR external_system IS NOT NULL;
   ```

### Phase 3: Dual-Write Period

1. **Enable dual-write mode**

   - Inventory service writes to all three databases
   - New services read from their databases
   - Validate data consistency

2. **Gradual traffic migration**

   - Route read traffic to new services
   - Monitor for errors
   - Compare response consistency

3. **Cutover mutations**
   - Switch mutations to respective services
   - Services consume events from each other
   - Remove dual-write

### Phase 4: Cleanup

1. **Remove migrated tables from inventory database**
2. **Update federation router configuration**
3. **Archive migration scripts**
4. **Update documentation**

---

## Implementation Tasks

### Products Service

- [ ] Create service directory structure
- [ ] Set up Drizzle ORM schema
- [ ] Create database migrations
- [ ] Implement repositories
  - [ ] ProductRepository
  - [ ] VariantRepository
  - [ ] OptionRepository
  - [ ] FeatureRepository
  - [ ] PhysicalRepository (dimensions/weight)
  - [ ] TranslationRepository
  - [ ] MediaRepository
- [ ] Implement transaction scripts
  - [ ] ProductCreateScript
  - [ ] ProductUpdateScript
  - [ ] ProductPublishScript
  - [ ] ProductUnpublishScript
  - [ ] ProductDeleteScript
  - [ ] VariantCreateScript
  - [ ] VariantDeleteScript
  - [ ] VariantSetMediaScript
  - [ ] VariantSetDimensionsScript
  - [ ] VariantSetWeightScript
  - [ ] OptionCreateScript
  - [ ] OptionUpdateScript
  - [ ] OptionDeleteScript
  - [ ] FeatureCreateScript
  - [ ] FeatureUpdateScript
  - [ ] FeatureDeleteScript
- [ ] Implement GraphQL resolvers
- [ ] Set up DataLoaders
- [ ] Configure federation subgraph
- [ ] Add event publishing
- [ ] Write unit tests
- [ ] Write integration tests

### Pricing Service

- [ ] Create service directory structure
- [ ] Set up Drizzle ORM schema
- [ ] Create database migrations
- [ ] Implement repositories
  - [ ] PricingRepository
- [ ] Implement transaction scripts
  - [ ] VariantSetPricingScript
  - [ ] PricingBulkUpdateScript
- [ ] Implement GraphQL resolvers
- [ ] Set up DataLoaders
- [ ] Configure federation subgraph (extends Variant)
- [ ] Add event publishing
- [ ] Add event consumers (variant lifecycle)
- [ ] Write unit tests
- [ ] Write integration tests

### Inventory Service Modifications

- [ ] Remove product/variant/option/feature/pricing/dimensions/weight entities
- [ ] Add variant_sku table
- [ ] Keep cost, stock, warehouse entities
- [ ] Update repositories to use external variant references
- [ ] Add event consumers for variant lifecycle
- [ ] Update GraphQL schema for federation extends
- [ ] Update resolvers
- [ ] Update tests

### Infrastructure

- [ ] Create products database
- [ ] Create pricing database
- [ ] Update docker-compose
- [ ] Update federation router config
- [ ] Set up RabbitMQ exchanges/queues
- [ ] Update CI/CD pipelines
- [ ] Update monitoring/alerting

---

## API Compatibility

### Breaking Changes

None expected. Federation will compose the same public API:

```graphql
# Before (monolithic inventory)
query {
  product(id: "...") {
    title
    variants {
      dimensions { widthMm }
      weight { weightGr }
      price { amountMinor }
      sku
      stock { quantityOnHand }
    }
  }
}

# After (federated products + pricing + inventory)
# Same query, different internal routing
query {
  product(id: "...") {           # → Products service
    title                         # → Products service
    variants {                    # → Products service
      dimensions { widthMm }      # → Products service
      weight { weightGr }         # → Products service
      price { amountMinor }       # → Pricing service (extends)
      sku                         # → Inventory service (extends)
      stock { quantityOnHand }    # → Inventory service (extends)
    }
  }
}
```

### Deprecated Fields

None. All existing fields remain available.

---

## Rollback Plan

If issues occur during migration:

1. **Phase 2 rollback**: Restore from inventory database backup
2. **Phase 3 rollback**:
   - Disable new services routing
   - Re-enable inventory service for all operations
   - Continue dual-write to keep new DBs in sync
3. **Phase 4 rollback**: N/A (no going back after cleanup)

---

## Success Metrics

| Metric                       | Target                       |
| ---------------------------- | ---------------------------- |
| API response time (p99)      | No regression                |
| Error rate                   | < 0.1%                       |
| Data consistency             | 100%                         |
| Federation query performance | < 5% overhead                |
| Deployment frequency         | Independent deploys possible |

---

## Timeline Considerations

This migration should be executed in phases with validation gates between each phase. The dual-write period is critical for ensuring data consistency before cutover.

Key dependencies:

- Products service must be stable before other services
- Pricing service can be developed in parallel with Products
- Event infrastructure must be reliable before removing dual-write
- All consuming services must handle federation before cleanup

---

## Open Questions

1. **SKU ownership**: Should SKU remain in Inventory or move to Products?

   - Current plan: Inventory (operational data for warehouse/fulfillment)
   - Alternative: Products (product identifier)

2. **Default variant creation**: When creating a product, should Products service auto-create a default variant, or should this be an explicit operation?

   - Current plan: Products service creates default variant
   - Alternative: Client explicitly calls variantCreate

3. **Cost visibility**: Should cost data be accessible from Products service queries?

   - Current plan: Only via Inventory service extension (internal data)
   - Alternative: Expose via federation but restrict access by role

4. **Pricing complexity**: What pricing features should the Pricing service support initially?
   - Current plan: Simple price + compare-at per currency
   - Future: Customer tiers, time-based pricing, promotions, A/B testing

---

## Service Responsibility Summary

| Aspect            | Products         | Pricing          | Inventory        |
| ----------------- | ---------------- | ---------------- | ---------------- |
| **Focus**         | Catalog/Content  | Price Management | Stock Operations |
| **Data**          | What the product is | What it costs customer | Operational data |
| **Dimensions**    | ✓                |                  |                  |
| **Weight**        | ✓                |                  |                  |
| **Price**         |                  | ✓                |                  |
| **Compare-at**    |                  | ✓                |                  |
| **Cost**          |                  |                  | ✓ (internal)     |
| **Stock**         |                  |                  | ✓                |
| **SKU**           |                  |                  | ✓                |
| **Warehouse**     |                  |                  | ✓                |

---

## References

- [Current Inventory Service Architecture](../services/inventory/README.md)
- [GraphQL Federation Spec](https://www.apollographql.com/docs/federation/)
- [Event-Driven Architecture Guide](./event-driven-architecture.md)
- [Database Migration Playbook](./database-migration-playbook.md)
