# Inventory Events System Design

## Overview

Event system for syncing data from **Inventory Service** to **Listing Service** and **Search Service** via RabbitMQ.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           INVENTORY SERVICE                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     Transaction Scripts                                 │ │
│  │  ProductCreateScript → ProductUpdateScript → VariantSetPricing → ...   │ │
│  └──────────────────────────────────┬──────────────────────────────────────┘ │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Kernel                                          │ │
│  │    executeScript() → commit → buildSnapshot() → broker.emit()           │ │
│  └──────────────────────────────────┬──────────────────────────────────────┘ │
└─────────────────────────────────────┼────────────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │           RabbitMQ                  │
                    │  exchange: shopana.events (topic)   │
                    │  routing: product.sync.requested    │
                    │  durable queues + publisher confirm │
                    └─────────────┬───────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
     ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
     │ Listing Service│  │ Search Service │  │ (Future Svc)   │
     │ PostgreSQL idx │  │   Typesense    │  │                │
     └────────────────┘  └────────────────┘  └────────────────┘
```

---

## Core Design Principles

### 1. Single Event `product.sync.requested`

Instead of multiple events (`product.created`, `product.updated`, `option.added`, `price.changed`, etc.) we use **one event** with a full product data snapshot:

**Why:**
- **Simplicity** — single handler on consumer side
- **Idempotency** — reprocessing is safe (full state, not delta)
- **Ordering** — no dependency on event order
- **Debugging** — easy to reproduce state

### 2. Full State Snapshot, Not Delta

Event contains **full snapshot** of product data, not a change delta:

```typescript
// Good: Full snapshot
{
  productId: "...",
  translations: { uk: {...}, en: {...} },
  features: [...],
  options: [...],
  pricing: { min: 1000, max: 2500 },
  stock: { inStock: true, total: 50 }
}

// Bad: Delta
{
  productId: "...",
  changes: { "pricing.min": { old: 900, new: 1000 } }
}
```

### 3. Post-Commit Emit (No Outbox)

Event is sent **after successful commit** directly to RabbitMQ:

```
┌─────────────────────────────────────────────────┐
│              Kernel.executeScript()             │
│                                                 │
│  1. BEGIN TRANSACTION                           │
│  2. script(params) → returns sync metadata      │
│  3. COMMIT                                      │
│                                                 │
│  4. buildSnapshot(productId)                    │
│  5. broker.emit('product.sync.requested', ...)  │
└─────────────────────────────────────────────────┘
```

**RabbitMQ Guarantees:**
- Publisher confirms — broker acknowledges receipt
- Durable exchange + persistent messages
- Consumer ack — message removed only after processing
- Dead Letter Queue — failed messages are preserved

---

## Event Schema

All types defined in `src/snapshots/types.ts` — single source of truth for:
- RabbitMQ events
- Redis cache
- API responses

### `product.sync.requested`

```typescript
// src/snapshots/types.ts

interface ProductSyncEvent {
  readonly meta: ProductSyncEventMeta;
  readonly projectId: string;
  readonly productId: string;
  readonly trigger: ProductSyncTrigger;
  readonly deleted: boolean;
  readonly snapshot: ProductSnapshot | null;
}

interface ProductSyncEventMeta {
  readonly eventId: string;           // UUID
  readonly eventType: 'product.sync.requested';
  readonly version: '1.0';
  readonly timestamp: string;         // ISO 8601
  readonly source: 'inventory';
}

type ProductSyncTrigger =
  | 'product.created'
  | 'product.updated'
  | 'product.published'
  | 'product.unpublished'
  | 'product.deleted'
  | 'variant.created'
  | 'variant.updated'
  | 'variant.deleted'
  | 'pricing.changed'
  | 'stock.changed'
  | 'option.changed'
  | 'feature.changed'
  | 'translation.changed'
  | 'media.changed'
  | 'manual.resync';
```

### ProductSnapshot (Type Hierarchy)

```
ProductSnapshot
├── translations: Record<locale, ProductTranslationSnapshot>
├── variants: VariantSnapshot[]
│   ├── optionValues: VariantOptionValueSnapshot[]
│   ├── prices: PriceSnapshot[]
│   ├── stock: StockEntrySnapshot[]
│   ├── media: MediaSnapshot[]
│   └── translations: Record<locale, VariantTranslationSnapshot>
├── options: OptionSnapshot[]
│   ├── values: OptionValueSnapshot[]
│   │   ├── swatch: OptionSwatchSnapshot | null
│   │   └── translations: Record<locale, TranslationSnapshot>
│   └── translations: Record<locale, TranslationSnapshot>
├── features: FeatureSnapshot[]
│   ├── values: FeatureValueSnapshot[]
│   │   └── translations: Record<locale, TranslationSnapshot>
│   └── translations: Record<locale, TranslationSnapshot>
├── pricing: AggregatedPricingSnapshot (computed)
└── stock: AggregatedStockSnapshot (computed)
```

```typescript
// Full types in src/snapshots/types.ts

interface ProductSnapshot {
  readonly id: string;
  readonly projectId: string;
  readonly publishedAt: string | null;  // ISO 8601
  readonly createdAt: string;
  readonly updatedAt: string;

  readonly translations: Record<string, ProductTranslationSnapshot>;
  readonly variants: readonly VariantSnapshot[];
  readonly options: readonly OptionSnapshot[];
  readonly features: readonly FeatureSnapshot[];
  readonly pricing: AggregatedPricingSnapshot;
  readonly stock: AggregatedStockSnapshot;
}

interface VariantSnapshot {
  readonly id: string;
  readonly sku: string | null;
  readonly optionValues: readonly VariantOptionValueSnapshot[];
  readonly prices: readonly PriceSnapshot[];
  readonly stock: readonly StockEntrySnapshot[];
  readonly media: readonly MediaSnapshot[];
  readonly translations: Record<string, VariantTranslationSnapshot>;
}

interface AggregatedPricingSnapshot {
  readonly baseCurrency: string;
  readonly minPriceMinor: number | null;
  readonly maxPriceMinor: number | null;
  readonly byCurrency: Record<string, {
    readonly minPriceMinor: number;
    readonly maxPriceMinor: number;
  }>;
}

interface AggregatedStockSnapshot {
  readonly inStock: boolean;
  readonly totalQuantity: number;
  readonly byWarehouse: Record<string, number>;
}
```

### Serialization

```typescript
import {
  serializeSnapshot,
  deserializeSnapshot,
  serializeEvent,
  deserializeEvent,
} from '../snapshots';

// For Redis
const json = serializeSnapshot(snapshot);
const snapshot = deserializeSnapshot(json);

// For RabbitMQ
const eventJson = serializeEvent(event);
const event = deserializeEvent(eventJson);
```

---

## Implementation

### File Structure

```
src/snapshots/
├── types.ts              # All snapshot types + events
├── SnapshotRepository.ts # Building snapshot from DB
└── index.ts              # Exports

src/repositories/
└── Repository.ts         # + snapshot: SnapshotRepository

src/kernel/
└── Kernel.ts             # + emit after commit
```

### 1. SyncRequest — What Script Returns

```typescript
// src/snapshots/types.ts

export interface SyncRequest {
  projectId: string;
  productId: string;
  trigger: ProductSyncTrigger;
  deleted?: boolean;
}

export interface ScriptResultWithSync<T> {
  result: T;
  sync?: SyncRequest;
}
```

### 2. SnapshotRepository — Builds Snapshot

```typescript
// src/snapshots/SnapshotRepository.ts

export class SnapshotRepository {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {}

  /**
   * Build complete product snapshot.
   * Uses batch queries to avoid N+1.
   */
  async buildSnapshot(
    projectId: string,
    productId: string
  ): Promise<ProductSnapshot | null> {
    // 1. Fetch product
    const productRow = await this.fetchProduct(projectId, productId);
    if (!productRow) return null;

    // 2. Parallel fetch all related data
    const [productTranslations, variants, options, features] = await Promise.all([
      this.fetchProductTranslations(productId),
      this.fetchVariantsWithDetails(projectId, productId),
      this.fetchOptionsWithDetails(projectId, productId),
      this.fetchFeaturesWithDetails(projectId, productId),
    ]);

    // 3. Aggregate from variants
    const pricing = this.aggregatePricing(variants);
    const stock = this.aggregateStock(variants);

    return {
      id: productRow.id,
      projectId: productRow.projectId,
      publishedAt: productRow.publishedAt?.toISOString() ?? null,
      createdAt: productRow.createdAt.toISOString(),
      updatedAt: productRow.updatedAt.toISOString(),
      translations: this.mapProductTranslations(productTranslations),
      variants,
      options,
      features,
      pricing,
      stock,
    };
  }

  // Batch fetchers return Map<id, T[]> for grouping
  private async fetchVariantsWithDetails(...): Promise<VariantSnapshot[]> {
    const variantRows = await this.connection.select()...;
    const variantIds = variantRows.map(v => v.id);

    // Batch fetch all related data
    const [optionLinksMap, pricesMap, stockMap, mediaMap, translationsMap] =
      await Promise.all([
        this.fetchVariantOptionLinks(projectId, variantIds),
        this.fetchVariantPrices(projectId, variantIds),
        this.fetchVariantStock(projectId, variantIds),
        this.fetchVariantMedia(projectId, variantIds),
        this.fetchVariantTranslations(variantIds),
      ]);

    // Build snapshots using maps
    return variantRows.map(v => ({
      id: v.id,
      sku: v.sku,
      optionValues: optionLinksMap.get(v.id) ?? [],
      prices: pricesMap.get(v.id) ?? [],
      stock: stockMap.get(v.id) ?? [],
      media: mediaMap.get(v.id) ?? [],
      translations: translationsMap.get(v.id) ?? {},
    }));
  }

  // Helper for grouping
  private groupBy<T, K extends string>(
    items: T[],
    keyFn: (item: T) => K
  ): Map<K, T[]> {
    const map = new Map<K, T[]>();
    for (const item of items) {
      const key = keyFn(item);
      const existing = map.get(key) ?? [];
      existing.push(item);
      map.set(key, existing);
    }
    return map;
  }
}
```

Full implementation: `src/snapshots/SnapshotRepository.ts`

### 3. Kernel — Emit After Commit

```typescript
// src/kernel/Kernel.ts

export class Kernel extends BaseKernel<InventoryKernelServices> {
  async executeScript<TParams, TResult>(
    script: TransactionScript<TParams, ScriptResultWithSync<TResult>>,
    params: TParams
  ): Promise<TResult> {
    let syncRequest: SyncRequest | undefined;

    // Execute in transaction
    const { result } = await this.txManager.run(async () => {
      const outcome = await script(params, this.services);
      syncRequest = outcome.sync;
      return outcome;
    });

    // After commit — emit event
    if (syncRequest) {
      await this.emitSyncEvent(syncRequest);
    }

    return result;
  }

  private async emitSyncEvent(sync: SyncRequest): Promise<void> {
    try {
      const snapshot = sync.deleted
        ? null
        : await this.repository.snapshot.buildSnapshot(sync.projectId, sync.productId);

      const event: ProductSyncEvent = {
        meta: {
          eventId: randomUUID(),
          eventType: 'product.sync.requested',
          version: '1.0',
          timestamp: new Date().toISOString(),
          source: 'inventory',
        },
        projectId: sync.projectId,
        productId: sync.productId,
        trigger: sync.trigger,
        deleted: sync.deleted ?? false,
        snapshot,
      };

      await this.broker.emit('product.sync.requested', event);
    } catch (error) {
      // Log but don't fail — next update will resync
      this.logger.error({ error, sync }, 'Failed to emit sync event');
    }
  }
}
```

### 4. Transaction Script — Returns Sync Metadata

```typescript
// src/scripts/product/productCreate.ts

export const productCreate: TransactionScript<
  ProductCreateParams,
  ScriptResultWithSync<ProductCreateResult>
> = async (params, services) => {
  const { repository } = services;
  const { projectId, id, translations, features, options } = params;

  // ... existing creation logic ...

  const product = await repository.product.create({
    id,
    projectId,
    publishedAt: null,
  });

  // Create translations, features, options, default variant...
  // ... existing code ...

  return {
    result: { product, userErrors: [] },
    sync: {
      projectId,
      productId: product.id,
      trigger: 'product.created',
    },
  };
};
```

```typescript
// src/scripts/variant/variantSetPricing.ts

export const variantSetPricing: TransactionScript<
  VariantSetPricingParams,
  ScriptResultWithSync<VariantSetPricingResult>
> = async (params, services) => {
  const { repository } = services;
  const { projectId, variantId, pricing } = params;

  const variant = await repository.variant.findById(projectId, variantId);
  if (!variant) {
    return {
      result: {
        success: false,
        userErrors: [{ message: 'Variant not found', field: ['variantId'] }],
      },
    };
  }

  await repository.pricing.upsert({
    projectId,
    variantId,
    currency: pricing.currency,
    amountMinor: pricing.amount,
    compareAtMinor: pricing.compareAt,
    effectiveFrom: new Date(),
    effectiveTo: null,
  });

  return {
    result: { success: true, userErrors: [] },
    sync: {
      projectId,
      productId: variant.productId,
      trigger: 'pricing.changed',
    },
  };
};
```

```typescript
// src/scripts/product/productDelete.ts

export const productDelete: TransactionScript<
  ProductDeleteParams,
  ScriptResultWithSync<ProductDeleteResult>
> = async (params, services) => {
  const { repository } = services;
  const { projectId, productId } = params;

  await repository.product.softDelete(projectId, productId);

  return {
    result: { success: true, userErrors: [] },
    sync: {
      projectId,
      productId,
      trigger: 'product.deleted',
      deleted: true,
    },
  };
};
```

---

## Consumer Implementation (Listing Service)

```typescript
// services/listing/src/handlers/ProductSyncHandler.ts

@RabbitSubscribe({
  exchange: 'shopana.events',
  routingKey: 'product.sync.requested',
  queue: 'shopana.events.listing.product.sync',
  queueOptions: {
    durable: true,
    deadLetterExchange: 'shopana.dlx',
    deadLetterRoutingKey: 'events.product.sync',
  },
})
async handleProductSync(event: ProductSyncEvent): Promise<void> {
  this.logger.log({
    eventId: event.meta.eventId,
    productId: event.productId,
    trigger: event.trigger,
  }, 'Processing product sync');

  if (event.deleted || !event.snapshot) {
    await this.indexService.deleteProduct(event.projectId, event.productId);
    return;
  }

  await this.indexService.upsertProduct(
    event.projectId,
    event.productId,
    event.snapshot
  );
}
```

```typescript
// services/listing/src/services/IndexService.ts

export class IndexService {
  async upsertProduct(
    projectId: string,
    productId: string,
    snapshot: ProductSnapshot
  ): Promise<void> {
    const indexRow = {
      project_id: projectId,
      product_id: productId,

      // Price aggregation
      min_price_minor: snapshot.pricing.minPriceMinor,
      max_price_minor: snapshot.pricing.maxPriceMinor,

      // Stock
      in_stock: snapshot.stock.inStock,
      total_stock: snapshot.stock.totalQuantity,

      // Features as "slug:value" pairs
      feature_slugs: snapshot.features.flatMap(f =>
        f.values.map(v => `${f.slug}:${v.slug}`)
      ),

      // Options aggregated from all variants
      option_slugs: this.aggregateOptionSlugs(snapshot),

      // Timestamps
      published_at: snapshot.publishedAt,
      created_at: snapshot.createdAt,
      updated_at: new Date().toISOString(),
    };

    await this.repository.productSearchIndex.upsert(indexRow);
  }

  private aggregateOptionSlugs(snapshot: ProductSnapshot): string[] {
    const slugSet = new Set<string>();

    for (const variant of snapshot.variants) {
      for (const ov of variant.optionValues) {
        slugSet.add(`${ov.optionSlug}:${ov.valueSlug}`);
      }
    }

    return Array.from(slugSet);
  }
}
```

---

## Consumer Implementation (Search Service)

```typescript
// services/search/src/handlers/ProductSyncHandler.ts

@RabbitSubscribe({
  exchange: 'shopana.events',
  routingKey: 'product.sync.requested',
  queue: 'shopana.events.search.product.sync',
  queueOptions: {
    durable: true,
    deadLetterExchange: 'shopana.dlx',
    deadLetterRoutingKey: 'events.product.sync',
  },
})
async handleProductSync(event: ProductSyncEvent): Promise<void> {
  if (event.deleted || !event.snapshot) {
    await this.searchIndex.delete(event.projectId, event.productId);
    return;
  }

  const doc = this.buildSearchDocument(event);
  await this.searchIndex.upsert(event.projectId, doc);
}

private buildSearchDocument(event: ProductSyncEvent): SearchDocument {
  const { productId, projectId, snapshot } = event;

  const doc: SearchDocument = {
    id: productId,
    project_id: projectId,
  };

  // Add translations per locale
  for (const [locale, trans] of Object.entries(snapshot!.translations)) {
    doc[`title_${locale}`] = trans.title;
    doc[`description_${locale}`] = trans.descriptionText ?? '';
  }

  return doc;
}
```

---

## Scripts That Must Emit Events

| Script | Trigger | Notes |
|--------|---------|-------|
| `productCreate` | `product.created` | After product + default variant created |
| `productUpdate` | `product.updated` | After any product field update |
| `productPublish` | `product.published` | When `publishedAt` set |
| `productUnpublish` | `product.unpublished` | When `publishedAt` cleared |
| `productDelete` | `product.deleted` | Soft delete, `deleted: true` |
| `variantCreate` | `variant.created` | New variant added |
| `variantSetPricing` | `pricing.changed` | Price update |
| `variantSetStock` | `stock.changed` | Stock update |
| `variantSetSku` | `variant.updated` | SKU change |
| `variantDelete` | `variant.deleted` | Variant removed |
| `optionCreate` | `option.changed` | New option added |
| `optionValueCreate` | `option.changed` | New value added |
| `featureCreate` | `feature.changed` | New feature added |
| `featureValueCreate` | `feature.changed` | New value added |
| `translationUpdate` | `translation.changed` | Text updates |
| `mediaAssign` | `media.changed` | Media updates |

---

## Monitoring & Observability

### Metrics

```typescript
// Event metrics
product_sync_events_emitted_total   // Counter by trigger type
product_sync_events_consumed_total  // Counter by consumer
product_sync_emit_duration_ms       // Histogram: emit latency
product_sync_emit_errors_total      // Counter: failed emits
```

### Dead Letter Queue Handling

```typescript
@RabbitSubscribe({
  exchange: 'shopana.dlx',
  routingKey: 'events.product.sync',
  queue: 'shopana.dlx.product.sync',
})
async handleDeadLetter(
  message: ProductSyncEvent,
  @RabbitPayload() raw: Buffer,
  @RabbitHeader() headers: Record<string, unknown>
): Promise<void> {
  this.logger.error({
    eventId: message.meta.eventId,
    productId: message.productId,
    xDeath: headers['x-death'],
  }, 'Product sync event in DLQ');

  // Store for manual inspection / alerting
  await this.alerting.notify('product-sync-dlq', {
    eventId: message.meta.eventId,
    productId: message.productId,
  });
}
```

---

## Backfill Script

```typescript
// One-time backfill for existing products
export const backfillProductSync: TransactionScript<
  BackfillParams,
  BackfillResult
> = async (params, services) => {
  const { repository } = services;
  const { projectId, batchSize = 100 } = params;

  let offset = 0;
  let processed = 0;

  while (true) {
    const products = await repository.product.findAll(projectId, {
      limit: batchSize,
      offset,
    });

    if (products.length === 0) break;

    for (const product of products) {
      const snapshot = await repository.snapshot.buildSnapshot(projectId, product.id);

      await services.broker.emit('product.sync.requested', {
        meta: {
          eventId: randomUUID(),
          eventType: 'product.sync.requested',
          version: '1.0',
          timestamp: new Date().toISOString(),
          source: 'inventory',
        },
        projectId,
        productId: product.id,
        trigger: 'manual.resync',
        deleted: false,
        snapshot,
      });

      processed++;
    }

    offset += batchSize;
  }

  return { result: { processed } };
};
```

---

## FAQ

### Q: What if emit fails after commit?

**A:** Event is lost, but:
- Next product update will resync everything (full snapshot)
- Can run periodic reconciliation job
- In practice this is extremely rare (microseconds between commit and emit)

### Q: Why full snapshot instead of delta?

**A:**
- **Idempotency**: Reprocessing is safe
- **Simplicity**: Consumer doesn't store state
- **Ordering**: No dependency on event order
- **Debugging**: Easy to reproduce state

### Q: How does consumer know what changed?

**A:** It doesn't need to — just does `UPSERT` of entire snapshot. But can use `trigger` for optimizations:

```typescript
switch (event.trigger) {
  case 'stock.changed':
    // Fast path — update only stock fields
    await db.update({ in_stock, total_stock });
    break;
  default:
    // Full upsert
    await db.upsert(fullRow);
}
```

### Q: How to ensure ordering?

**A:** For a single `productId`:
- RabbitMQ preserves order in queue
- Consumer processes sequentially (prefetch=1 if critical)
- Full snapshot makes ordering less important
