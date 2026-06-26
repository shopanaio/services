# Variant Option Async Swap Handle Consistency Plan

## Goal

Allow product variant option combinations to be swapped through asynchronous, time-stretched workflows without temporarily breaking business operations, while keeping `variant.handle` unique for active variants.

The target behavior is:

- Active variants keep a database-enforced unique `handle` per product.
- Option combination changes can be staged asynchronously.
- A swap that would temporarily duplicate an option-derived handle is represented as an explicit pending operation, not as an invalid active state.
- Finalization applies the new option links and final handles atomically for a product-scoped operation.

## Current Context

- Variant option links are stored in `catalog.product_option_variant_link`.
- The table primary key is `(variant_id, option_id)`, so one variant can have only one value per option.
- There is no database constraint that directly prevents two variants from having the same option-value combination.
- Duplicate option combinations are effectively prevented by `catalog.variant.handle`.
- `variant.handle` is rebuilt from option value slugs by `VariantUpdateOptionsScript` and `VariantBatchUpdateOptionsScript`.
- `catalog.variant` has the partial unique index:

```ts
uniqueIndex("variant_product_id_handle_key")
  .on(table.productId, table.handle)
  .where(sql`deleted_at IS NULL`)
```

- The current batch script already uses temporary handles to support synchronous swaps inside one backend operation.
- The problem appears when option changes are asynchronous and the swap is stretched across multiple operations or worker steps.

## Design Principle

Do not make the active catalog state temporarily inconsistent.

If a swap is stretched over time, it must be modeled as an operation with state. The active read model should either:

1. Continue serving the old stable variant option links and handles until the operation finalizes.
2. Or explicitly exclude variants in a non-active transition state from handle-based active lookups.

The preferred approach is to keep the active state stable and store pending option changes separately.

## Recommended Architecture

Use a product-scoped pending operation model.

### Active State

Keep the current active tables as the published catalog state:

- `catalog.variant`
- `catalog.product_option_variant_link`

Keep `variant_product_id_handle_key` as a hard database invariant for active variants.

### Pending State

Add a pending operation table for asynchronous option changes.

Example tables:

```sql
CREATE TABLE catalog.variant_option_change_operation (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  product_id uuid NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  error_code text,
  error_message text
);

CREATE TABLE catalog.variant_option_change_operation_item (
  operation_id uuid NOT NULL REFERENCES catalog.variant_option_change_operation(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL,
  option_id uuid NOT NULL,
  option_value_id uuid NOT NULL,
  PRIMARY KEY (operation_id, variant_id, option_id)
);
```

Recommended statuses:

| Status | Meaning |
| --- | --- |
| `pending` | Operation was accepted but not processed yet. |
| `applying` | Worker is applying the operation. |
| `applied` | Operation finalized successfully. |
| `failed` | Operation could not be applied and needs user/system action. |
| `cancelled` | Operation was cancelled before finalization. |

## Finalization Flow

A worker or DBOS workflow finalizes the operation.

1. Load the operation and its items.
2. Acquire a product-scoped lock.
3. Validate that all variants still exist and belong to the product.
4. Validate that all options and values still belong to the product.
5. Validate each variant has at most one value per option.
6. Build the desired option links for every affected variant.
7. Build final handles from the desired links.
8. Detect duplicate final handles inside the operation.
9. Detect conflicts with active variants outside the operation.
10. In one transaction:
    - set temporary unique handles for affected variants;
    - replace option links for affected variants;
    - set final handles;
    - mark operation `applied`.

The active unique index on `(product_id, handle)` remains enabled during the final transaction. If the final state is invalid, the transaction fails and the operation is marked `failed`.

## Product Locking

Use one product-scoped lock during finalization to prevent concurrent operations from racing on the same product.

Options:

- PostgreSQL advisory transaction lock using a stable hash of `product_id`.
- A product operation lock table with `product_id`, `operation_id`, and expiration.
- DBOS workflow-level serialization if the project already has a reliable per-product queue pattern.

The lock should cover the final validation and write transaction.

## API Shape

Do not expose asynchronous swap as a series of independent variant option updates.

Add or adapt an operation-oriented API:

```graphql
input VariantOptionChangeInput {
  variantId: ID!
  links: [VariantOptionLinkInput!]!
}

input ProductVariantOptionsChangeOperationInput {
  variants: [VariantOptionChangeInput!]!
}
```

Possible mutation:

```graphql
productVariantOptionsChangeCreate(
  productId: ID!
  input: ProductVariantOptionsChangeOperationInput!
): ProductVariantOptionsChangeOperationPayload!
```

Payload should return:

- operation id;
- operation status;
- validation errors for immediately detectable issues;
- affected variant ids.

The existing synchronous `productUpdate` batch path can remain for immediate, atomic edits.

## Read Path Behavior

Default catalog reads should return active state only.

Admin reads can optionally include pending operation metadata:

- variant has pending option changes;
- operation status;
- desired option links for preview;
- operation error if failed.

Handle-based reads must remain unambiguous. They should not resolve from pending option links.

## Why Not Drop The Unique Index

Dropping `variant_product_id_handle_key` would allow the temporary duplicate, but it also allows permanent duplicate active handles. That weakens the wrong invariant.

The desired invariant is not "handles may duplicate". The desired invariant is "active handles are unique, and pending operations may temporarily describe a state that is not active yet".

## Alternative: Partial Unique Index By State

An alternative is to add state directly to `catalog.variant`:

```sql
ALTER TABLE catalog.variant
ADD COLUMN option_sync_state text NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX variant_product_id_handle_active_key
ON catalog.variant(product_id, handle)
WHERE deleted_at IS NULL
  AND option_sync_state = 'active';
```

During an asynchronous swap, affected variants move to `reconfiguring`, and the unique index no longer applies to them.

This is more invasive for read paths:

- all active catalog queries must filter `option_sync_state = 'active'`;
- handle lookup must define behavior for reconfiguring variants;
- checkout, pricing, inventory, and storefront flows must know whether reconfiguring variants are sellable.

Use this only if the product needs the active variant rows themselves to enter a transitional state.

## Backend Changes

Recommended implementation steps:

1. Add Drizzle models for operation and operation item tables.
2. Add migrations through the project migration generation flow.
3. Add a repository for creating, reading, and updating variant option change operations.
4. Add a script/workflow to create an operation after immediate validation.
5. Add a finalizer script/workflow that applies an operation under product lock.
6. Reuse `buildVariantHandle` for final handle calculation.
7. Keep temporary handle logic similar to `VariantBatchUpdateOptionsScript`.
8. Make duplicate-handle errors operation-level failures, not partial variant updates.

## Frontend Changes

Admin variant option editing should distinguish two save modes:

- immediate save through existing `productUpdate` when the backend can apply changes atomically;
- asynchronous operation creation when the UI intentionally schedules a staged/sync workflow.

For asynchronous mode:

- submit all affected rows as one operation;
- show operation status after creation;
- do not block UI draft validation only because an intermediate step would duplicate an existing combination;
- still show final-state duplicate errors if the desired final state has duplicate handles.

## Failure Handling

When finalization fails:

- leave active variant state unchanged;
- mark operation `failed`;
- store a stable error code and human-readable message;
- expose the failed operation to Admin;
- allow retry if the failure is transient;
- require user edits if the final desired state is invalid.

Avoid partial application. A failed operation should not leave some variants with new option links and others with old links.

## Open Decisions

- Whether pending operation tables should store only affected variants or the full desired option matrix for the product.
- Whether operations are created by Admin only or also by import/sync integrations.
- Whether pending option changes should be visible in storefront reads. Recommended default: no.
- Whether `variant.handle` remains strictly option-derived after finalization or gains a uniqueness suffix.
- Which project lock mechanism should be standardized for catalog workflows.

## Acceptance Criteria

- Active variants cannot have duplicate `(product_id, handle)` while `deleted_at IS NULL`.
- A time-stretched swap can be accepted as one pending operation.
- The pending operation can describe desired option links that would conflict if applied one variant at a time.
- Finalization applies all affected variants atomically.
- Finalization either succeeds fully or leaves active state unchanged.
- Handle-based reads remain deterministic.
- Existing synchronous batch swap behavior continues to work.
