# Listing index ingest API

## Цель

Listing service принимает обновления индекса как поток bulk operations,
совместимый по envelope-модели с Elasticsearch/OpenSearch Bulk API: действие,
metadata и document/patch. Это не публичный OpenSearch-compatible endpoint.
Transport остается внутренним Shopana events workflow, поэтому payload
передается JSON-объектом, а не NDJSON.

Catalog service на изменения товара, варианта, категории, цены и stock
публикует события семейства `listing.*`. Базовый контракт события:
`listing.index.bulk`.

## Почему bulk API model

OpenSearch Bulk API использует действие и metadata:

```json
{ "index": { "_index": "products", "_id": "p1", "routing": "store1" } }
{ "title": "Dress" }
{ "delete": { "_index": "products", "_id": "p2", "routing": "store1" } }
```

В Shopana то же самое хранится как typed JSON:

```json
{
  "action": "index",
  "meta": {
    "_index": "listing.product",
    "_id": "product:4f1f...",
    "routing": "store:8c2b..."
  },
  "document": {
    "productId": "4f1f...",
    "kind": "BASE",
    "status": "published",
    "productRevision": 12
  }
}
```

Такой payload можно механически преобразовать в Bulk-like NDJSON envelope для
debug/export, но `listing.*` logical indexes являются Postgres-backed read
model, а не физическими OpenSearch indexes.

## Event contract

Event type: `listing.index.bulk`

Event envelope использует стандартный `DomainEvent` из `@shopana/events`:

```ts
interface ListingIndexBulkEvent
  extends DomainEvent<"listing.index.bulk", ListingIndexBulkPayload> {}
```

Payload:

```ts
interface ListingIndexBulkPayload {
  schemaVersion: "listing.index.bulk.v1";
  storeId: string;
  organizationId: string;
  reason:
    | "product.created"
    | "product.updated"
    | "product.deleted"
    | "variant.created"
    | "variant.updated"
    | "variant.deleted"
    | "category.updated"
    | "stock.updated"
    | "price.updated"
    | "manual.reindex";
  sourceService: "catalog" | "pricing" | "inventory" | "listing";
  aggregate: {
    type: "product" | "variant" | "category" | "store";
    id: string;
    /**
     * Monotonic source aggregate revision. Required for product/variant/category
     * mutations when the source model has a revision column.
     */
    revision?: number;
  };
  operations: ListingBulkOperation[];
}
```

`organizationId` must match `event.context.tenantId`. The listing handler
resolves `storeId` through project service, validates that the store belongs to
that organization, enters listing `ServiceContext` with the resolved store and
derives `project_id` only from that context. Incoming documents must not contain
`projectId`; if they do, validation fails.

Producers must emit `listing.index.bulk` in deferred dispatch mode with a stable
batch key per organization/store. Without deferred dispatch, ordering is not
part of the transport contract and listing must rely entirely on freshness
ledger checks.

## Logical indexes

`_index` is logical, not a physical OpenSearch index. Listing maps it to the
existing repository layer:

All dynamic `_id` components are lower-case where applicable and
percent-encoded with `encodeURIComponent` when the value can contain `:` or `/`
(`field`, `valueKey`, `sortKind`, `locale`, `manualScopeId`).

| `_index` | `_id` format | Ingest document | Repository target | Delete behavior |
| --- | --- | --- | --- | --- |
| `listing.product` | `product:{productId}` | `ProductIndexDocument` | `productListingIndex` | `delete(productId)` after explicit membership cleanup |
| `listing.product_price` | `product:{productId}:currency:{currency}` | `ProductPriceDocument` | `productListingPriceIndex` | delete one currency row |
| `listing.product_price` | `product:{productId}:prices` | none, delete only | `productListingPriceIndex` | `deleteByProductId(productId)` |
| `listing.variant` | `variant:{variantId}` | `VariantIndexDocument` | `variantListingIndex` | `delete(variantId)` after explicit membership/runtime cleanup |
| `listing.variant_price` | `variant:{variantId}:currency:{currency}` | `VariantPriceDocument` | `variantListingPriceIndex` | delete one currency row |
| `listing.variant_price` | `variant:{variantId}:prices` | none, delete only | `variantListingPriceIndex` | `deleteByVariantId(variantId)` |
| `listing.filter_membership` | `membership:{entityType}:{ownerId}:{field}` | `FilterMembershipDocument` | `listingPostingBitmap` | remove memberships for product/variant owner in one field |
| `listing.filter_membership` | `membership:{entityType}:{ownerId}:memberships` | none, delete only | `listingPostingBitmap` | remove all memberships for product/variant owner |
| `listing.product_sort` | `product:{productId}:sort:{sortKind}:locale:{locale}:currency:{currency}:scope:{manualScopeId}` | `ProductSortDocument` | `listingPostingProductSort` | delete one sort row |
| `listing.product_sort` | `product:{productId}:sorts` | none, delete only | `listingPostingProductSort` | `deleteByProductId(productId)` |
| `listing.variant_runtime_price` | `variant:{variantId}:runtime_price:{currency}` | `RuntimeVariantPriceDocument` | `listingPostingVariantPrice` | delete one runtime row |
| `listing.variant_runtime_price` | `variant:{variantId}:runtime_prices` | none, delete only | `listingPostingVariantPrice` | `deleteByVariantDocId(variantDocId)` after variant lookup |
| `listing.variant_projection_block` | `projection_block:{blockId}` | `ProjectionBlockDocument` (`sourceService: "listing"` only) | `listingPostingVariantProjectionBlock` | delete one block |
| `listing.product_title_bm25` | `product:{productId}:locale:{locale}` | `ProductTitleBm25Document` | `productTitleBm25SearchIndex` | delete one title row |
| `listing.product_title_bm25` | `product:{productId}:titles` | none, delete only | `productTitleBm25SearchIndex` | `deleteByProductId(productId)` |

`product_doc_id` and `variant_doc_id` are listing-owned identifiers. External
services send stable source ids (`productId`, `variantId`); listing allocates or
looks up doc ids before calling repositories. Documents from `catalog`,
`pricing` or `inventory` must not provide `productDocId` / `variantDocId`.
`sourceService: "listing"` may use doc ids only for internal repair/reindex
operations.

`listing.filter_membership` is the external shape for faceted/filterable
membership updates. It does not expose the physical posting bitmap. A producer
sends the next set of value keys for one product/variant and one logical field;
listing resolves the owner doc id and updates its internal bitmap rows.

Internal repair/reindex workflows may still write physical bitmap rows directly
through listing-only `listing.posting_bitmap` operations:

| `_index` | `_id` format | Ingest document | Repository target | Delete behavior |
| --- | --- | --- | --- | --- |
| `listing.posting_bitmap` | `posting:{entityType}:{field}:{valueKey}` | `PostingBitmapDocument` (`sourceService: "listing"` only) | `listingPostingBitmap` | delete one posting bitmap row |

`listing.variant_projection_block` is listing-owned derived state. External
producers must not send projection block documents. For product/variant changes,
listing refreshes affected blocks from current `variant_listing_index`; explicit
`ProjectionBlockDocument` writes are allowed only for internal repair/reindex
workflows with `sourceService: "listing"`.

## Operation model

Supported actions mirror the useful subset of OpenSearch:

```ts
type ListingBulkOperation =
  | { action: "index" | "create"; meta: ListingBulkActionMeta; document: ListingIndexDocument }
  | { action: "update"; meta: ListingBulkActionMeta; doc: Partial<ListingIndexDocument>; doc_as_upsert?: boolean }
  | { action: "delete"; meta: ListingBulkActionMeta };

interface ListingBulkActionMeta {
  _index: ListingLogicalIndex;
  _id: string;
  routing: string;
  freshness?: ListingFreshness;
}

interface ListingFreshness {
  /**
   * Source-side monotonic revision for the row family touched by this operation.
   * Defaults to payload.aggregate.revision when omitted.
   */
  revision?: number;
  /**
   * Source update timestamp used only as diagnostics/tie-breaker. It is not a
   * substitute for revision.
   */
  updatedAt?: string;
}
```

Rules:

1. `index` means full replace/upsert for the target logical document.
2. External producers must use `index`, `update` or `delete`. `create` is
   reserved for `sourceService: "listing"` repair/reindex operations and fails
   if the target logical document already exists.
3. `update` patches only writable fields. `doc_as_upsert` is reserved for
   `sourceService: "listing"` bootstrap/repair operations; external producers
   must send full `index` documents when a row may not exist.
4. `delete` removes one logical document or row family selected by `_id`.
5. `routing` is required for every operation and must be `store:{storeId}`.
6. Listing derives `project_id` from event context/store context and must not
   trust a user-provided project id inside documents.
7. OpenSearch concurrency metadata (`require_alias`, `if_seq_no`,
   `if_primary_term`) is not part of v1. If present, validation fails instead of
   silently ignoring it.
8. `_id` is not just debug metadata. Handler parses it, validates that it
   matches document keys and then calls repository methods by parsed keys.
9. `update` is allowed only for scalar source/debug rows
   (`listing.product`, `listing.variant`, `listing.product_title_bm25`).
   Memberships, prices, sort rows, runtime rows and projection blocks use
   `index`/`delete` or family replacement to avoid partial physical index state.
10. `ProjectionBlockDocument` and `PostingBitmapDocument` are listing-only
    documents. If `sourceService` is not `"listing"`, validation fails.

## Document shapes

Ingest documents intentionally use source identifiers. Repository-only fields
are derived by listing.

```ts
type ProductKind = "BASE" | "BUNDLE";
type ListingStatus = "published" | "draft";
type MembershipEntityType = "product" | "variant";

type UpstreamListingIndexDocument =
  | ProductIndexDocument
  | ProductPriceDocument
  | VariantIndexDocument
  | VariantPriceDocument
  | FilterMembershipDocument
  | ProductSortDocument
  | RuntimeVariantPriceDocument
  | ProductTitleBm25Document;

type InternalListingIndexDocument =
  | PostingBitmapDocument
  | ProjectionBlockDocument;

type ListingIndexDocument =
  | UpstreamListingIndexDocument
  | InternalListingIndexDocument;

interface ProductIndexDocument {
  productId: string;
  kind: ProductKind;
  vendorId?: string | null;
  handle?: string | null;
  status: ListingStatus;
  publishedAt?: string | null;
  productCreatedAt: string;
  productUpdatedAt: string;
  productRevision: number;
  inStock: boolean;
  totalStock: number;
}

interface ProductPriceDocument {
  productId: string;
  currency: string;
  hasPrice: boolean;
  minPriceMinor?: number | null;
  maxPriceMinor?: number | null;
}

interface VariantIndexDocument {
  productId: string;
  variantId: string;
  signatureKey?: string | null;
  inStock: boolean;
  totalStock: number;
}

interface VariantPriceDocument {
  productId: string;
  variantId: string;
  currency: string;
  signatureKey: string;
  hasPrice: boolean;
  priceMinor?: number | null;
}

interface PostingBitmapDocument {
  entityType: MembershipEntityType;
  field: string;
  valueKey: string;
  bitmap: string;
  cardinality: number;
  metadata?: Record<string, unknown>;
}

interface FilterMembershipDocument {
  entityType: MembershipEntityType;
  ownerId: string; // productId for product memberships, variantId for variant memberships
  field: string;
  nextValueKeys: string[];
  valueKeyPrefixes?: string[];
}

interface ProductSortDocument {
  productId: string;
  sortKind: string;
  locale?: string;
  currency?: string;
  manualScopeId?: string;
  boolValue?: boolean | null;
  timestamptzValue?: string | null;
  timestamptzValue2?: string | null;
  bigintValue?: number | null;
  textValue?: string | null;
  numericValue?: string | null;
}

interface RuntimeVariantPriceDocument {
  productId: string;
  variantId: string;
  currency: string;
  priceMinor: number;
}

interface ProjectionBlockDocument {
  blockId: number;
  variantDocFrom: number;
  variantDocTo: number;
  variantBitmap: string;
  productBitmap: string;
  variantCount: number;
  productCount: number;
}

interface ProductTitleBm25Document {
  productId: string;
  locale: string;
  kind: ProductKind;
  status: ListingStatus;
  publishedAt?: string | null;
  productCreatedAt: string;
  productUpdatedAt: string;
  productRevision: number;
  title: string;
}
```

`UpstreamListingIndexDocument` is the only document union that catalog, pricing
and inventory may produce. `InternalListingIndexDocument` intentionally exposes
repository-level fields and is allowed only for listing-owned repair/reindex
workflows.

Validation rules:

- `currency` is ISO 4217 uppercase `AAA`.
- `price` and `in_stock` are virtual facets and must not be sent as
  `listing.filter_membership` fields.
- `collection` is not a writable filter membership field in the current
  repository layer.
- `hasPrice = false` requires nullable price fields to be `null`/absent.
- `hasPrice = true` requires non-null non-negative price fields; product max
  price must be greater than or equal to min price.
- `_id`, document ids and `payload.aggregate` must describe the same source
  entity unless an operation explicitly targets a row family.

## Idempotency and ordering

Catalog should emit one event after the source transaction/workflow commits.

Recommended emit call:

```ts
await broker.runWorkflow(
  "events.emit",
  {
    eventType: "listing.index.bulk",
    payload,
    source: "catalog",
    context: {
      tenantId: organizationId,
      userId,
    },
    subject: { type: payload.aggregate.type, id: payload.aggregate.id },
    actor: userId ? { type: "user", id: userId } : { type: "service", id: "catalog" },
    emitKey: `listing:${storeId}:${payload.aggregate.type}:${payload.aggregate.id}:rev:${payload.aggregate.revision ?? "none"}`,
    dispatch: {
      mode: "deferred",
      batchKey: `listing:${organizationId}:${storeId}`,
      aggregateKey: `listing:${storeId}:${payload.aggregate.type}:${payload.aggregate.id}`,
    },
  },
  {
    source: "workflow",
    workflowId: DBOS.workflowID!,
    stepId: "emitListingIndexBulk",
    callId: `${payload.aggregate.type}:${payload.aggregate.id}`,
  }
);
```

Listing handler must be idempotent:

- dedupe by event id at event workflow level;
- treat `index` as a repeatable upsert after freshness checks pass;
- reject external `update doc_as_upsert`; internal `doc_as_upsert` must carry
  enough fields to create the same bootstrap row on every retry;
- ignore stale product/title operations when `productRevision` is lower than the
  stored `product_revision`; if revisions are equal, the operation is idempotent
  only when the normalized incoming row matches the stored row or the same event
  id was already applied;
- allocate `product_doc_id` / `variant_doc_id` only when missing, never reuse
  ids after delete.

Ordering rules:

1. Producers must emit a monotonic `aggregate.revision` for source models that
   have revisioning. Operation-level `meta.freshness.revision` overrides the
   payload revision only for row families whose source revision differs from the
   aggregate revision.
2. Product and title rows use stored `productRevision` for stale checks.
3. Row families without a revision column (`product_price`, `variant_price`,
   filter memberships, sort rows and runtime price rows) require a
   handler-level freshness ledger keyed by
   `storeId + _index + parsed row/family id`.
4. The freshness ledger stores the last accepted `revision`, `eventId`,
   `operationIndex` and optional `updatedAt`. An operation is accepted when its
   revision is greater than the stored revision, ignored when lower, and treated
   as a duplicate when the same revision is paired with the same event id and
   operation index. Same revision with a different event/operation is a
   non-retryable contract error unless the normalized operation is byte-for-byte
   equivalent.
5. Deferred event dispatch is still required to reduce contention and preserve
   producer order, but it is not a substitute for the freshness ledger. The
   events repository claims rows by creation time; the listing batch handler must
   explicitly sort received events by `timestamp`, then `eventId`, before
   applying them.
6. Projection blocks do not accept external freshness. Listing refreshes affected
   blocks after accepted product/variant/runtime changes. Listing-only
   `ProjectionBlockDocument` repair operations use the same ledger key shape as
   other row families.
7. If the ledger is unavailable, the handler must reject non-product row-family
   updates as retryable only when the missing guard is temporary; otherwise it is
   a non-retryable contract error.
8. Delete operations must carry the same freshness guard as writes. A stale
   delete must not remove a newer row.

## Catalog triggers

Catalog emits `listing.index.bulk` for:

| Catalog change | `reason` | Required operations |
| --- | --- | --- |
| product create | `product.created` | `index listing.product`, variants, title rows, prices, filter memberships |
| product update | `product.updated` | `index` changed full rows or `update` narrow rows |
| publish/unpublish | `product.updated` | `update listing.product.status`, title rows, sort rows |
| product delete | `product.deleted` | `delete` product, variants, prices, title rows, filter memberships |
| variant create/update/delete | `variant.*` | variant rows, prices, stock and runtime rows; listing refreshes projection blocks internally |
| category assignment/rank | `category.updated` | affected filter memberships and product sort rows |
| stock change | `stock.updated` | product/variant stock fields and visibility dependent rows |
| price change | `price.updated` | product/variant price rows and runtime price rows |

## Listing handler API

Listing registers:

```ts
@EventHandler("listing.index.bulk", { retry: { maxAttempts: 5 } })
async handleListingIndexBulk(params: {
  event: ListingIndexBulkEvent;
}): Promise<EventHandlerResponse>
```

Optional batch handler:

```ts
@BatchEventHandler("listing.index.bulk", { retry: { maxAttempts: 5 } })
async handleListingIndexBulkBatch(params: {
  events: ListingIndexBulkEvent[];
  payloads: ListingIndexBulkPayload[];
}): Promise<EventBatchHandlerResponse>
```

Batch handler should group by `storeId`, resolve store context once per group,
sort each group by `timestamp` and then `eventId`, then apply each event inside
repository transactions.

Events workflow claims batch records in creation order, but SQL `UPDATE
... RETURNING` result order is not part of the handler contract. The listing
batch handler must not rely on the received array order. Within one event,
operations are applied in array order after validation. Product or variant
bootstrap rows must be applied before dependent price, sort, title, filter
membership or runtime rows.

## Error semantics

Validation errors are non-retryable:

- unknown `_index`;
- invalid schema version;
- `organizationId` does not match event context tenant;
- resolved store does not belong to organization;
- unsupported OpenSearch metadata appears in `meta`;
- malformed `_id` or `_id` does not match document ids;
- document shape does not match `_index`;
- empty operation list for non-delete reasons;
- external producer sends listing-only documents (`PostingBitmapDocument`,
  `ProjectionBlockDocument`) or uses `create`/`doc_as_upsert`;
- freshness ledger detects same revision with a conflicting event/operation.

Infrastructure errors are retryable:

- database errors;
- missing store context caused by temporarily unavailable project service;
- transaction serialization/deadlock errors.

Partial batch failure returns `failedEventIds`; the events workflow can retry
only failed records.

## Example payload

```json
{
  "schemaVersion": "listing.index.bulk.v1",
  "storeId": "8c2b2fd8-0000-4000-8000-000000000001",
  "organizationId": "7a4d2fd8-0000-4000-8000-000000000001",
  "reason": "product.updated",
  "sourceService": "catalog",
  "aggregate": {
    "type": "product",
    "id": "4f1f2fd8-0000-4000-8000-000000000001",
    "revision": 12
  },
  "operations": [
    {
      "action": "index",
      "meta": {
        "_index": "listing.product",
        "_id": "product:4f1f2fd8-0000-4000-8000-000000000001",
        "routing": "store:8c2b2fd8-0000-4000-8000-000000000001"
      },
      "document": {
        "productId": "4f1f2fd8-0000-4000-8000-000000000001",
        "kind": "BASE",
        "handle": "summer-dress",
        "status": "published",
        "publishedAt": "2026-07-04T09:00:00.000Z",
        "productCreatedAt": "2026-07-01T09:00:00.000Z",
        "productUpdatedAt": "2026-07-04T09:00:00.000Z",
        "productRevision": 12,
        "inStock": true,
        "totalStock": 15
      }
    },
    {
      "action": "index",
      "meta": {
        "_index": "listing.product_title_bm25",
        "_id": "product:4f1f2fd8-0000-4000-8000-000000000001:locale:uk",
        "routing": "store:8c2b2fd8-0000-4000-8000-000000000001"
      },
      "document": {
        "productId": "4f1f2fd8-0000-4000-8000-000000000001",
        "locale": "uk",
        "kind": "BASE",
        "status": "published",
        "publishedAt": "2026-07-04T09:00:00.000Z",
        "productCreatedAt": "2026-07-01T09:00:00.000Z",
        "productUpdatedAt": "2026-07-04T09:00:00.000Z",
        "productRevision": 12,
        "title": "Summer dress"
      }
    },
    {
      "action": "index",
      "meta": {
        "_index": "listing.filter_membership",
        "_id": "membership:product:4f1f2fd8-0000-4000-8000-000000000001:facet",
        "routing": "store:8c2b2fd8-0000-4000-8000-000000000001",
        "freshness": { "revision": 12 }
      },
      "document": {
        "entityType": "product",
        "ownerId": "4f1f2fd8-0000-4000-8000-000000000001",
        "field": "facet",
        "nextValueKeys": [
          "tag:11111111-0000-4000-8000-000000000001",
          "feature:22222222-0000-4000-8000-000000000001"
        ],
        "valueKeyPrefixes": ["tag:", "feature:"]
      }
    }
  ]
}
```
