# ProductUpdateWorkflow

`ProductUpdateWorkflow` applies unified product updates for the admin GraphQL
API. It supports product field updates, category/tag assignment operations, and
variant `CREATE` / `UPDATE` / `DELETE` operations in one ordered batch.

## Operation Order

Workflow operations are already decoded and mapped by the resolver. The mapped
order is stable:

1. one `productUpdate` operation, when product-level fields are present;
2. `productCategoryUpdate` operations in request order;
3. `productTagUpdate` operations in request order;
4. variant operations in request order.

Variant operation types:

```ts
type ProductUpdateOperation =
  | { type: "productUpdate"; params: ProductUpdateParams; meta?: ProductUpdateOperationMeta }
  | { type: "productCategoryUpdate"; params: ProductCategoryUpdateParams; meta?: ProductUpdateOperationMeta }
  | { type: "productTagUpdate"; params: ProductTagUpdateParams; meta?: ProductUpdateOperationMeta }
  | { type: "variantCreate"; params: VariantCreateParams; meta?: ProductUpdateOperationMeta }
  | { type: "variantUpdate"; params: VariantUpdateParams; meta?: ProductUpdateOperationMeta }
  | { type: "variantDelete"; params: VariantDeleteParams; meta?: ProductUpdateOperationMeta };
```

`meta.fieldPrefix` carries GraphQL input paths from the resolver, for example
`["operations", "variants", "0"]` or
`["input", "products", "2", "operations", "variants", "0"]`.

## Revision and Validation

When a request contains any variant operation, `expectedRevision` is required.
The workflow validates the variant batch before any write-side effects,
including optimistic revision acquire/increment.

Variant batch flow:

```text
stepPreValidateVariantBatch
stepAcquireRevision
operation steps
workflowEmitEvent
```

If batch validation fails, the workflow returns one `OperationResult` per mapped
operation, does not acquire/increment product revision, does not write data, and
does not emit `productUpdated`.

Validation covers product revision, variant ownership, option/value ownership,
create option completeness, duplicate option combinations, duplicate
`clientMutationId`, media registration, warehouse references, inventory item
presence for existing variant inventory/weight updates, and supported
pricing/inventory/physical values.

## Variant Operations

### variantCreate

Creates a variant row and selected option links transactionally through
`VariantCreateScript`. Additional portions can then apply pricing, inventory,
media, weight, and dimensions. Before applying inventory or weight, the workflow
ensures an inventory item exists through `inventory.createItem`.

Create results include `clientMutationId`. If the variant row was created,
`entityId` is returned even when an additional portion failed.

### variantUpdate

Updates any supported subset of pricing, inventory, media, weight, dimensions,
and options. Option updates are collected and applied through
`VariantBatchUpdateOptionsScript` so swaps and duplicate checks stay
collision-safe.

### variantDelete

Deletes through `VariantDeleteScript` with soft-delete semantics
(`permanent: false`). Product update emits `productUpdated`, not
`variantDeleted`, for this path.

## Result Shape

```ts
interface OperationResult {
  type:
    | "productUpdate"
    | "productCategoryUpdate"
    | "productTagUpdate"
    | "variantCreate"
    | "variantUpdate"
    | "variantDelete";
  applied: boolean;
  clientMutationId?: string;
  entityId?: string;
  errors: UserError[];
}
```

GraphQL encodes `entityId` as a public Variant global ID.

## Event Payload

`productUpdated` uses partial snapshot deltas. Variant changes are keyed by raw
variant id and use the same lifecycle/physical shape as `packages/events`.

```ts
interface VariantChanges {
  lifecycle?: "created" | "updated" | "deleted";
  pricing?: { currency: string; amount: number; compareAt?: number | null };
  inventory?: {
    warehouseId: string;
    onHand: number;
    unavailable: number;
    sku?: string | null;
    unitCostMinor?: number | null;
    costCurrency?: string | null;
  };
  physical?: { width?: number; height?: number; length?: number; weight?: number };
  media?: { fileIds: string[] };
  options?: Array<{ optionId: string; valueId: string }>;
}
```

No event is emitted when variant batch validation fails before revision acquire.
