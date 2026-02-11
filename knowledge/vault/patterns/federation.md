---
tags:
  - pattern
  - federation
  - graphql
  - apollo
related:
  - "[[patterns/resolver]]"
  - "[[architecture/service-structure]]"
  - "[[packages/shared-graphql-guid/index]]"
---

# Federation Pattern

GraphQL Federation allows services to extend types defined in other services.

## Overview

| Concept | Description |
|---------|-------------|
| Owning Service | Service that defines the type with `@key` |
| Extending Service | Service that adds fields with `extend type` |
| Reference Resolver | `__resolveReference` to load entity by key |
| Global ID | Base64 encoded `{namespace}:{type}:{uuid}` |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Gateway (Router)                      │
│              Composes all subgraphs                      │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Catalog   │  │  Inventory  │  │   Pricing   │
│   Service   │  │   Service   │  │   Service   │
├─────────────┤  ├─────────────┤  ├─────────────┤
│ Variant     │  │ extend      │  │ extend      │
│ @key(id)    │  │ Variant     │  │ Variant     │
│ - title     │  │ - sku       │  │ - price     │
│ - options   │  │ - stock     │  │ - priceList │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Schema Definition

### Owning Service (Catalog)

```graphql
# Catalog service defines the type
type Variant @key(fields: "id") {
  id: ID!
  title: String!
  options: [VariantOption!]!
  product: Product!
}
```

### Extending Service (Inventory)

```graphql
# Inventory service extends the type
extend type Variant @key(fields: "id") {
  id: ID! @external

  """The associated inventory item."""
  inventoryItem: InventoryItem

  """SKU code from inventory."""
  sku: String

  """Physical dimensions."""
  dimensions: VariantDimensions

  """Physical weight."""
  weight: VariantWeight

  """Stock levels across warehouses."""
  stock: [WarehouseStock!]!

  """Whether any stock is available."""
  inStock: Boolean!
}
```

## Federation Resolver

Resolver for extended type:

```typescript
// resolvers/admin/VariantFederationResolver.ts

import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { InventoryType } from "./InventoryType.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
import { StockResolver } from "./StockResolver.js";

/**
 * Federation resolver for Variant type.
 *
 * Extends Variant from Catalog Service with inventory-related fields.
 *
 * Constructor receives decoded UUID (from __resolveReference).
 */
export class VariantFederationResolver extends InventoryType<string, Record<string, never>> {
  /**
   * Encode ID for GraphQL response.
   * Must return same format as Catalog service.
   */
  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Variant);
  }

  /**
   * Get associated InventoryItem.
   */
  async inventoryItem() {
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
    if (!item) return null;
    return new InventoryItemResolver(item.id, this.$ctx);
  }

  /**
   * SKU from InventoryItem.
   */
  async sku() {
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
    return item?.sku ?? null;
  }

  /**
   * Physical dimensions.
   */
  async dimensions() {
    const dims = await this.$ctx.kernel.repository.physical
      .getDimensionsByVariantIds([this.$props]);

    const current = dims[0];
    if (!current) return null;

    return {
      widthMm: current.wMm,
      lengthMm: current.lMm,
      heightMm: current.hMm,
      displayUnit: "mm",
    };
  }

  /**
   * Physical weight.
   */
  async weight() {
    const weights = await this.$ctx.kernel.repository.physical
      .getWeightsByVariantIds([this.$props]);

    const current = weights[0];
    if (!current) return null;

    return {
      weightGrams: current.weightGr,
      displayUnit: "g",
    };
  }

  /**
   * Stock levels across all warehouses.
   */
  async stock() {
    const stocks = await this.$ctx.kernel.repository.stock
      .getByVariantId(this.$props);

    return stocks.map((s) => new StockResolver(s.id, this.$ctx));
  }

  /**
   * Check if any stock is available.
   */
  async inStock() {
    const stocks = await this.$ctx.kernel.repository.stock
      .getByVariantId(this.$props);

    return stocks.some((s) => s.quantityOnHand > 0);
  }
}
```

## Reference Resolution

Wiring the federation resolver:

```typescript
// api/graphql-admin/resolvers/index.ts

import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { VariantFederationResolver } from "../../../resolvers/admin/VariantFederationResolver.js";
import type { ServiceContext } from "../../../context/types.js";

export const resolvers = {
  // Federation reference resolvers
  Variant: {
    __resolveReference: async (
      reference: { id: string },
      context: ServiceContext
    ) => {
      // Decode Global ID to UUID
      const variantId = decodeGlobalIdByType(reference.id, GlobalIdEntity.Variant);

      // Return resolver instance
      return new VariantFederationResolver(variantId, context);
    },
  },
};
```

## Global ID Handling

### Encoding

```typescript
import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";

// In resolver
id() {
  // Returns: "c2hvcGFuYTpWYXJpYW50OjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMg=="
  return encodeGlobalIdByType(this.$props, GlobalIdEntity.Variant);
}
```

### Decoding

```typescript
import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";

// In reference resolver
const uuid = decodeGlobalIdByType(globalId, GlobalIdEntity.Variant);
// Returns: "12345678-1234-1234-1234-123456789012"
```

### Validation

```typescript
import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";

// Throws if type doesn't match
const uuid = decodeGlobalIdByType(globalId, GlobalIdEntity.Variant);

// Without validation (any type)
const uuid = decodeGlobalIdByType(globalId);
```

## Federation Directives

| Directive | Description |
|-----------|-------------|
| `@key` | Defines entity key field(s) |
| `@external` | Field defined in another service |
| `@provides` | Fields provided when resolving reference |
| `@requires` | Fields needed from other service |
| `@shareable` | Field can be resolved by multiple services |

### Example Schema

```graphql
# Owning service
type Product @key(fields: "id") {
  id: ID!
  title: String!
  variants: [Variant!]!
}

# Extending service
extend type Product @key(fields: "id") {
  id: ID! @external

  # New fields added by this service
  totalStock: Int!
  lowStockAlert: Boolean!
}

# Shareable scalar
type VariantDimensions @shareable {
  widthMm: Int!
  heightMm: Int!
  lengthMm: Int!
}
```

## Best Practices

### 1. Always Encode/Decode Global IDs

```typescript
// In resolver - encode for response
id() {
  return encodeGlobalIdByType(this.$props, GlobalIdEntity.Variant);
}

// In reference resolver - decode from request
const uuid = decodeGlobalIdByType(reference.id, GlobalIdEntity.Variant);
```

### 2. Use Loaders for Batch Loading

```typescript
// Good: Use loader
async inventoryItem() {
  return this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
}

// Bad: Direct query per entity
async inventoryItem() {
  return this.$ctx.kernel.repository.inventoryItem.findByVariantId(this.$props);
}
```

### 3. Return Resolver Instances

```typescript
// Good: Return resolver for nested types
async stock() {
  const stocks = await this.$ctx.kernel.repository.stock.getByVariantId(this.$props);
  return stocks.map((s) => new StockResolver(s.id, this.$ctx));
}

// Bad: Return raw data
async stock() {
  return this.$ctx.kernel.repository.stock.getByVariantId(this.$props);
}
```

### 4. Handle Missing Entities

```typescript
async inventoryItem() {
  const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
  if (!item) return null;  // Return null, not throw
  return new InventoryItemResolver(item.id, this.$ctx);
}
```

## Composition

Services are composed using Hive CLI:

```bash
# Export subgraph schemas
shopana schema --action export

# Compose supergraph
shopana schema --action compose

# Or both
shopana schema --action build
```

## File Organization

```
resolvers/
└── admin/
    ├── VariantFederationResolver.ts   # Federation resolver
    ├── ProductFederationResolver.ts   # Federation resolver
    └── ...

api/graphql-admin/
├── schema/
│   └── variant.graphql                # extend type Variant
└── resolvers/
    └── index.ts                       # __resolveReference wiring
```

## See Also

- [[patterns/resolver]] — Resolver patterns
- [[packages/shared-graphql-guid/index]] — Global ID encoding/decoding
- [[packages/shared-graphql-guid/encoding]] — Encoding functions
- [[packages/shared-graphql-guid/decoding]] — Decoding functions
