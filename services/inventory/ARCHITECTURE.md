Below is a **clean, production-grade architectural guide** (in English) for building an **Inventory Service** and a set of **consumer services** (Collections, Search Indexing, Files/Media, Pricing, SEO, etc.) using your preferred stack: **Node.js + Redis Streams/BullMQ + Event-Driven Choreography + Sync Status Aggregation**.

This guide fits perfectly into a microservices ecosystem like Shopana.

---

# 📘 **Architecture Guide: Product Update Event-Driven Sync (Inventory, Collections, Search, Media, Pricing, etc.)**

This document describes the recommended architecture for handling **product update synchronization** across multiple microservices using **event-driven fanout**, **asynchronous background consumers**, and **sync status aggregation**.

The goal:
When the Product Service updates a product, all other domain services (Inventory, Collections, Search, Media, Pricing, SEO, etc.) **react independently**, process changes asynchronously, and report their statuses back to a central aggregator. No saga or orchestration is required.

---

# 🧩 1. High-Level Overview

### When a product is updated:

1. **ProductService** saves changes to its own DB.
2. ProductService publishes an event:

   ```
   product.updated { productId, changes, timestamp }
   ```

3. Each consumer service (Inventory, Collections, Search, Media…) listens to this event via:

   - Redis Streams
   - or BullMQ queues

4. Each service performs **its own update logic**.
5. Each service publishes a **completion** or **failure** event:

   ```
   inventory.product.updated
   inventory.product.update.failed
   search.product.reindexed
   search.product.reindex.failed
   ...
   ```

6. **ProductSyncAggregator** updates the sync status in Redis.
7. **Admin UI** polls `/products/{id}/sync-status` or listens via WebSockets.

No direct calls between services.
No orchestrator.
Pure event choreography.

---

# 🧱 2. Services Involved

### Core publisher:

- **ProductService**

### Consumers:

- **InventoryService**
- **CollectionsService**
- **SearchIndexService**
- **MediaService**
- **PricingService**
- **SEOService**
- (any number of additional domain services)

### Infrastructure:

- **ProductSyncAggregator**
- **Redis** (Streams + Hashes)
- **BullMQ workers (optional)**

---

# 📤 3. ProductService: Publishing Product Updates

When a product is changed:

```ts
await redis.xadd(
  "events:product-updated",
  "*",
  "event",
  JSON.stringify({
    type: "product.updated",
    productId,
    changes,
    timestamp: Date.now(),
  })
);
```

Or using BullMQ:

```ts
await productUpdateQueue.add("product.updated", {
  productId,
  changes,
  timestamp: Date.now(),
});
```

### ProductService must also initialize sync statuses:

```
product:sync:<productId> = {
  inventory: "pending",
  collections: "pending",
  search: "pending",
  media: "pending",
  pricing: "pending",
  seo: "pending"
}
```

This allows the UI to show progress even before consumer updates complete.

---

# ⚙️ 4. InventoryService: Event Consumer

InventoryService subscribes to `product.updated`.

### Worker example (BullMQ):

```ts
new Worker("product-update", async (job) => {
  const { productId, changes } = job.data;

  try {
    await updateInventoryForProduct(productId, changes);

    publishStatusEvent("inventory.product.updated", {
      productId,
      timestamp: Date.now(),
    });
  } catch (err) {
    publishStatusEvent("inventory.product.update.failed", {
      productId,
      error: err.message,
      timestamp: Date.now(),
    });
  }
});
```

### Responsibilities:

- Recalculate stock for variants and options
- Validate SKU consistency
- Recompute availability rules
- Trigger low-stock calculations

No retries inside business logic — retries are handled by BullMQ Redis backoff policies.

---

# 📦 5. CollectionsService: Event Consumer

Collections depend on product attributes:

- category changes
- attributes updates
- tags changes
- availability changes

### Worker logic:

```ts
async function handleProductUpdate(event) {
  try {
    await recalcCollections(event.productId, event.changes);

    publishStatusEvent("collections.product.updated", { ... });

  } catch (err) {
    publishStatusEvent("collections.product.update.failed", { ... });
  }
}
```

### Typical operations:

- Re-evaluate which collections a product belongs to
- Recompute dynamic rules (price ranges, tags, custom filters)

---

# 🔍 6. SearchIndexService: Event Consumer

Search must reindex product data when:

- title, description, attributes change
- price changes
- stock updates
- media updates

### Worker:

```ts
async function reindexProduct(productId) {
  try {
    await searchIndex.update(productId);

    publishStatusEvent("search.product.reindexed", {...});

  } catch (err) {
    publishStatusEvent("search.product.reindex.failed", {...});
  }
}
```

Search may take longer — it is normal and UI must reflect “indexing…”.

---

# 🖼 7. MediaService: Event Consumer

Handles:

- image changes
- thumbnails regeneration
- size optimizations
- video metadata

Same event → same status reporting mechanism.

---

# 💰 8. PricingService: Event Consumer

Handles:

- price changes
- compare-at price
- discount calculations
- custom rules

This service often publishes fast, but errors are possible (invalid configuration).

---

# 🔎 9. SEOService: Event Consumer

Handles:

- slug regeneration
- meta tags
- structured data (JSON-LD)
- URL redirects if required

If slug conflict → SEOService reports failure.

---

# 📡 10. Status Publishing Contract

Each service must publish:

### Success:

```json
{
  "service": "inventory",
  "status": "done",
  "productId": "123",
  "timestamp": 1733145444123
}
```

### Failure:

```json
{
  "service": "inventory",
  "status": "failed",
  "error": "SKU not found",
  "productId": "123",
  "timestamp": 1733145444988
}
```

Services do **NOT** retry forever — they use queue retry policies.

---

# 📊 11. ProductSyncAggregator

This service stores and computes product sync state.

### Responsibilities:

1. Listen to all `*.product.updated` and `*.product.update.failed` events.
2. Update Redis:

```
HSET product:sync:<productId> inventory "done"
HSET product:sync:<productId>:timestamps inventory <timestamp>
```

3. Recompute:

- `completed`
- `processing`
- `partial-failure`

4. Notify WebSockets gateway (optional).

### Aggregation logic:

```
if any service = failed → partial-failure
else if all services = done → completed
else → processing
```

---

# 🖥 12. Admin UI (Dashboard)

The UI calls:

```
GET /products/<id>/sync-status
```

Response:

```json
{
  "overallStatus": "processing",
  "services": {
    "inventory": "done",
    "collections": "done",
    "search": "pending",
    "media": "done",
    "seo": "pending"
  }
}
```

UI shows:

- ✓ Inventory updated
- ✓ Collections updated
- ⏳ Search indexing…
- ✓ Media updated
- ⏳ SEO regenerating…

---

# 🚫 13. Why No Saga Here?

Because:

- No cross-service transaction
- No rollback needed
- No atomic all-or-nothing steps
- Failures are acceptable and visible to admin
- Eventual consistency is expected
- Retry policies solve transient errors

Saga is only needed for **orders**, **payments**, **inventory reservation**, **shipping/waybill creation**.

Product sync is **event-driven async processing**, not a transaction.

---

# 🧩 14. Recommended Redis Structures

### Sync statuses:

```
HSET product:sync:123 inventory done
HSET product:sync:123 collections pending
HSET product:sync:123 search retrying
```

### Timestamp tracking:

```
HSET product:sync:123:timestamps inventory 1733145444988
```

### History (optional):

```
LPUSH product:sync:123:history "inventory:retry"
```

---

# 🧪 15. Error Handling Rules

If a service fails:

- Product is still saved
- Other services continue
- Sync status reports a failure
- UI shows it
- Admin can retry manually

If the failure is transient → automatic retries → eventually done.

If a service recovers → last event wins.

---

# 🎯 16. Summary: Final Architecture

### ProductService:

- publishes `product.updated`
- initializes sync statuses

### Each Consumer Service:

- listens to product.updated
- performs async logic
- publishes update/failure status

### ProductSyncAggregator:

- tracks last status per service
- aggregates final status
- updates Redis
- exposes API to UI

### UI:

- shows processing states
- shows partial failures
- shows completed sync

No sagas.
Pure event-driven fanout + status aggregation.

---

# If you want, I can also deliver:

✅ Mermaid diagrams (architecture + event flow)
✅ Folder structure for each service
✅ Interfaces & TypeScript types
✅ Redis Streams vs BullMQ comparison
✅ Ready-to-use code for all services

Just tell me — should I proceed with diagrams or code next?
