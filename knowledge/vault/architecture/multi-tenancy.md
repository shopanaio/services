---
tags:
  - architecture
  - multi-tenancy
  - security
related:
  - architecture/overview
  - architecture/service-boundaries
---

# Multi-Tenancy

Data isolation and multi-store support in Shopana.

## Overview

Shopana is a multi-tenant platform: single installation serves multiple stores. Each store's data must be completely isolated from others.

## Tenancy Model

```
┌─────────────────────────────────────────────────────────┐
│                    Organization                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Store A   │  │   Store B   │  │   Store C   │     │
│  │  (fashion)  │  │   (tech)    │  │   (food)    │     │
│  │             │  │             │  │             │     │
│  │ - Products  │  │ - Products  │  │ - Products  │     │
│  │ - Orders    │  │ - Orders    │  │ - Orders    │     │
│  │ - Customers │  │ - Customers │  │ - Customers │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**Hierarchy:**
- **Organization** — company/team (e.g., "Acme Corp")
- **Store** — individual store (e.g., "Acme Fashion", "Acme Tech")
- **User** — can belong to organization, access multiple stores based on role

## Store Resolution

Every request must identify the target store:

### Admin API

```http
POST /graphql HTTP/1.1
Host: admin.shopana.io
X-Store-Name: acme-fashion
Authorization: Bearer <token>
```

### Storefront API

```http
POST /graphql HTTP/1.1
Host: acme-fashion.shopana.io
```

Or via header:
```http
POST /graphql HTTP/1.1
Host: storefront.shopana.io
X-Store-Name: acme-fashion
```

### Resolution Flow

```
Request → Gateway → StoreResolver → ServiceContext
                         │
                         ▼
                    ┌─────────┐
                    │  Store  │
                    │  Table  │
                    └─────────┘
```

1. Extract store identifier (subdomain or header)
2. Look up store in database
3. Inject into ServiceContext
4. All subsequent operations use this context

## Data Isolation

### Store-Scoped Entities

Most entities are scoped to a store:

```typescript
// Repository automatically filters by storeId
class ProductRepository {
  async findMany(ctx: ServiceContext) {
    return this.db.product
      .where({ storeId: ctx.store.id })  // Auto-injected
      .findMany();
  }
}
```

**Store-scoped entities:**
- Products, Variants, Categories, Tags
- Orders, Carts, Checkouts
- Inventory, Prices
- Media assets
- App installations

### Global Entities

Some entities are shared across all stores:

**Organization-level:**
- Users (belong to organization)
- Roles and permissions
- Organization settings

**System-level:**
- Countries, regions
- Currencies (definitions)
- Payment/delivery provider configs

### Schema Design

```sql
-- Store-scoped table
CREATE TABLE products (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  title VARCHAR(255) NOT NULL,
  -- ...
);

-- Index for tenant isolation
CREATE INDEX idx_products_store ON products(store_id);

-- Global table (no store_id)
CREATE TABLE currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10)
);
```

## Access Control

### Store Access

Users can only access stores they have permission to:

```typescript
// Middleware checks store access
async function validateStoreAccess(ctx: ServiceContext) {
  const hasAccess = await casbin.enforce(
    ctx.user.id,
    ctx.store.id,
    'read'
  );
  if (!hasAccess) throw new UnauthorizedError();
}
```

### Cross-Store Queries

**Forbidden:** A request for Store A cannot access Store B data.

```typescript
// This would fail - storeId mismatch
await productRepository.findById(
  productIdFromStoreB,
  contextForStoreA  // Will return null or throw
);
```

### Organization-Wide Views

Admin users can see aggregated data across all organization stores:

```graphql
# Organization-level query (special permission required)
query OrganizationStats {
  organization {
    stores {
      name
      orderCount
      revenue
    }
  }
}
```

## Security Considerations

### Defense in Depth

1. **Gateway level** — validate store header/subdomain
2. **Service level** — ServiceContext carries verified store
3. **Repository level** — auto-filter by storeId
4. **Database level** — row-level security (optional)

### Common Vulnerabilities

**IDOR (Insecure Direct Object Reference):**
```typescript
// BAD: Direct ID access without store check
const product = await db.product.findById(input.productId);

// GOOD: Always include store context
const product = await db.product
  .where({ id: input.productId, storeId: ctx.store.id })
  .findFirst();
```

**Mass Assignment:**
```typescript
// BAD: Accepting storeId from input
await db.product.create({ ...input });

// GOOD: Override storeId from context
await db.product.create({
  ...input,
  storeId: ctx.store.id  // Always from context
});
```

## Caching Considerations

All cache keys must include store identifier:

```typescript
// Cache key pattern
const cacheKey = `store:${storeId}:products:${productId}`;

// Or namespace-based
const cache = new Cache({ namespace: `store:${storeId}` });
```

## See Also

- [[architecture/overview]] — High-level architecture
- [[architecture/service-boundaries]] — Service ownership
- [[packages/shared-kernel/kernel]] — ServiceContext implementation
