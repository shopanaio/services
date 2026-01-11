# Pricing Widget API Implementation Plan

## Overview

This document outlines the implementation plan for adding a Pricing Widget API to the Inventory Service. The widget provides aggregated pricing statistics, current price/cost, and price history for product variants.

## Data Structure (Frontend Types)

Based on `admin-next/src/domains/inventory/products/components/pricing/types.ts`:

```typescript
interface ApiVariantPriceHistoryStatistics {
  minPriceMinor: number;
  maxPriceMinor: number;
  avgPriceMinor: number;
  currency: CurrencyCode;
}

interface PricingWidgetPayload {
  currentPrice: ApiVariantPrice | null;
  currentCostPrice: ApiVariantCost | null;
  history: ApiVariantPriceConnection;
  statistics: ApiVariantPriceHistoryStatistics;
}
```

---

## Implementation Steps

### 1. Extend GraphQL Schema

**File:** `services/inventory/src/api/graphql-admin/schema/pricing.graphql`

Add the following types:

```graphql
# ---- Pricing Widget Types ----

"""
Statistics for variant price history over a period.
"""
type VariantPriceHistoryStatistics {
  """Minimum price over the period (minor units)."""
  minPriceMinor: BigInt!
  """Maximum price over the period (minor units)."""
  maxPriceMinor: BigInt!
  """Average price over the period (minor units)."""
  avgPriceMinor: BigInt!
  """Currency code."""
  currency: CurrencyCode!
}

"""
Pricing widget payload with current price, cost, history and statistics.
"""
type PricingWidgetPayload {
  """Current active price."""
  currentPrice: VariantPrice
  """Current active cost."""
  currentCostPrice: VariantCost
  """Price history for the period."""
  history: VariantPriceConnection!
  """Computed statistics for the period."""
  statistics: VariantPriceHistoryStatistics!
}

"""
Input for pricing widget query.
"""
input PricingWidgetInput {
  """The variant ID to get pricing data for."""
  variantId: ID!
  """Currency code to filter by."""
  currency: CurrencyCode!
  """Start of the period (optional, defaults to 30 days ago)."""
  from: DateTime
  """End of the period (optional, defaults to now)."""
  to: DateTime
  """Pagination: first N items."""
  first: Int
  """Pagination: cursor after."""
  after: String
}
```

**File:** `services/inventory/src/api/graphql-admin/schema/base.graphql`

Add to `InventoryQuery` type:

```graphql
type InventoryQuery {
  # ... existing queries ...

  """Get pricing widget data for a variant."""
  pricingWidget(input: PricingWidgetInput!): PricingWidgetPayload!
}
```

---

### 2. Create Repository Method for Statistics

**File:** `services/inventory/src/repositories/pricing/PricingRepository.ts`

Add interface and method:

```typescript
interface PriceHistoryStatistics {
  minPriceMinor: number;
  maxPriceMinor: number;
  avgPriceMinor: number;
  currency: CurrencyCode;
}

interface GetPriceStatisticsInput {
  projectId: string;
  variantId: string;
  currency: CurrencyCode;
  from: Date;
  to: Date;
}

async getPriceStatistics(input: GetPriceStatisticsInput): Promise<PriceHistoryStatistics | null> {
  const result = await this.db
    .select({
      minPriceMinor: sql<number>`MIN(${itemPricing.amountMinor})`,
      maxPriceMinor: sql<number>`MAX(${itemPricing.amountMinor})`,
      avgPriceMinor: sql<number>`AVG(${itemPricing.amountMinor})::bigint`,
    })
    .from(itemPricing)
    .where(
      and(
        eq(itemPricing.projectId, input.projectId),
        eq(itemPricing.variantId, input.variantId),
        eq(itemPricing.currency, input.currency),
        gte(itemPricing.effectiveFrom, input.from),
        lte(itemPricing.effectiveFrom, input.to)
      )
    );

  if (!result[0] || result[0].minPriceMinor === null) {
    return null;
  }

  return {
    ...result[0],
    currency: input.currency,
  };
}
```

---

### 3. Create Pricing Widget Resolver

**New file:** `services/inventory/src/resolvers/admin/PricingWidgetResolver.ts`

```typescript
import { InventoryType } from "./InventoryType.js";
import { VariantPriceResolver } from "./VariantPriceResolver.js";
import { VariantCostResolver } from "./VariantCostResolver.js";
import type { CurrencyCode } from "./interfaces/index.js";

export interface PricingWidgetInput {
  variantId: string;
  currency: CurrencyCode;
  from?: Date;
  to?: Date;
  first?: number;
  after?: string;
}

export class PricingWidgetResolver extends InventoryType<PricingWidgetInput> {
  private getDateRange() {
    const to = this.$props.to ?? new Date();
    const from = this.$props.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  async currentPrice() {
    const services = this.$ctx.kernel.getServices();
    const price = await services.repository.pricing.getCurrentPrice({
      projectId: this.$ctx.projectId,
      variantId: this.$props.variantId,
      currency: this.$props.currency,
    });

    return price ? new VariantPriceResolver(price.id, this.$ctx) : null;
  }

  async currentCostPrice() {
    const services = this.$ctx.kernel.getServices();
    const cost = await services.repository.cost.getCurrentCost({
      projectId: this.$ctx.projectId,
      variantId: this.$props.variantId,
      currency: this.$props.currency,
    });

    return cost ? new VariantCostResolver(cost.id, this.$ctx) : null;
  }

  async history() {
    const services = this.$ctx.kernel.getServices();
    const { from, to } = this.getDateRange();
    const first = this.$props.first ?? 50;

    const prices = await services.repository.pricing.getPriceHistory({
      projectId: this.$ctx.projectId,
      variantId: this.$props.variantId,
      currency: this.$props.currency,
      from,
      to,
      limit: first + 1,
      after: this.$props.after,
    });

    const hasNextPage = prices.length > first;
    const resultPrices = hasNextPage ? prices.slice(0, first) : prices;

    const edges = resultPrices.map((price) => ({
      node: new VariantPriceResolver(price.id, this.$ctx),
      cursor: Buffer.from(price.id).toString("base64"),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!this.$props.after,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount: resultPrices.length,
    };
  }

  async statistics() {
    const services = this.$ctx.kernel.getServices();
    const { from, to } = this.getDateRange();

    const stats = await services.repository.pricing.getPriceStatistics({
      projectId: this.$ctx.projectId,
      variantId: this.$props.variantId,
      currency: this.$props.currency,
      from,
      to,
    });

    // Return zero statistics if no data
    return stats ?? {
      minPriceMinor: 0,
      maxPriceMinor: 0,
      avgPriceMinor: 0,
      currency: this.$props.currency,
    };
  }
}
```

---

### 4. Integrate into QueryResolver

**File:** `services/inventory/src/resolvers/admin/QueryResolver.ts`

Add import and method:

```typescript
import { PricingWidgetResolver, type PricingWidgetInput } from "./PricingWidgetResolver.js";

export class InventoryQueryResolver extends InventoryType<Record<string, never>> {
  // ... existing methods ...

  /**
   * Get pricing widget data for a variant.
   */
  pricingWidget(args: { input: PricingWidgetInput }) {
    return new PricingWidgetResolver(args.input, this.$ctx);
  }
}
```

---

### 5. Create/Extend DataLoader (Optional Optimization)

**File:** `services/inventory/src/loaders/PricingLoader.ts`

Add batch loaders for optimized data fetching:

```typescript
export const createPricingLoaders = (ctx: Context) => ({
  priceStatisticsByKey: new DataLoader<string, PriceHistoryStatistics | null>(
    async (keys) => {
      // Batch load statistics for multiple variants
      // Key format: `${variantId}:${currency}:${from}:${to}`
    }
  ),

  currentPriceByVariantAndCurrency: new DataLoader<string, ItemPricing | null>(
    async (keys) => {
      // Batch load current prices
      // Key format: `${variantId}:${currency}`
    }
  ),
});
```

---

### 6. Generate TypeScript Types

Run codegen after schema changes:

```bash
pnpm shopana codegen --service inventory
```

---

### 7. Add Tests

**File:** `e2e/tests/inventory-api/pricing-widget.spec.ts`

Test cases:
- Get statistics for a period with existing price history
- Get statistics for a period with no price history (returns zeros)
- Pagination of price history
- Currency filtering
- Default date range (30 days)
- Custom date range

---

## File Structure

```
services/inventory/src/
├── api/graphql-admin/schema/
│   ├── pricing.graphql              # + Widget types
│   └── base.graphql                 # + pricingWidget query
├── repositories/
│   └── pricing/
│       └── PricingRepository.ts     # + getPriceStatistics, getPriceHistory
├── resolvers/admin/
│   ├── PricingWidgetResolver.ts     # NEW
│   ├── QueryResolver.ts             # + pricingWidget method
│   └── index.ts                     # Export new resolver
└── loaders/
    └── PricingLoader.ts             # NEW or extend existing
```

---

## Example Query

```graphql
query GetPricingWidget($input: PricingWidgetInput!) {
  inventoryQuery {
    pricingWidget(input: $input) {
      currentPrice {
        id
        amountMinor
        compareAtMinor
        effectiveFrom
      }
      currentCostPrice {
        id
        unitCostMinor
        effectiveFrom
      }
      history(first: 10) {
        edges {
          node {
            id
            amountMinor
            effectiveFrom
            effectiveTo
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      statistics {
        minPriceMinor
        maxPriceMinor
        avgPriceMinor
        currency
      }
    }
  }
}
```

Variables:
```json
{
  "input": {
    "variantId": "variant-uuid",
    "currency": "USD",
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-12-31T23:59:59Z"
  }
}
```

---

## Dependencies

No new dependencies required. Uses existing:
- Drizzle ORM for database queries
- GraphQL Yoga for API
- Apollo Federation for subgraph composition
