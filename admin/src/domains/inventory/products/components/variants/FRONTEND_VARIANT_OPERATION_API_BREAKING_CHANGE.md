# Frontend API migration for variant operation contract

## Scope

This document describes only the Admin frontend API changes required after the
backend replaces the old `ProductUpdateInput.variants: [VariantUpdateInput!]`
shape with the approved operation-style breaking change.

Backend schema, backend workflows, generated backend resolver files, changesets,
tests, and backend validation rules are intentionally out of scope here. This
document assumes the backend schema has already been updated and frontend
GraphQL codegen has produced the new generated API types in `@/graphql/types`.

## Breaking change summary

The old frontend contract treated every item in `ApiProductUpdateInput.variants`
as an update for an existing variant:

```ts
type OldVariantsInput = ApiVariantUpdateInput[];
```

After the backend update, every item must be an explicit operation:

```ts
type NewVariantsInput = ApiVariantOperationInput[];
```

Every frontend callsite that writes `operations.variants` must now send
`action`. Backward compatibility with items that omit `action` is not required.

Expected generated types after schema/codegen:

```ts
import type {
  ApiProductUpdateInput,
  ApiVariantOperationAction,
  ApiVariantOperationInput,
} from "@/graphql/types";
```

Expected enum values:

```ts
ApiVariantOperationAction.Create
ApiVariantOperationAction.Update
ApiVariantOperationAction.Delete
```

If codegen emits string literal unions instead of an enum, use the generated
shape directly and keep the sent values as `"CREATE"`, `"UPDATE"`, and
`"DELETE"`.

## Product update input contract

Frontend code must treat `ApiProductUpdateInput.variants` as:

```ts
variants?: ApiVariantOperationInput[] | null;
```

Valid frontend payload examples:

```ts
const updateExistingVariant: ApiVariantOperationInput = {
  action: ApiVariantOperationAction.Update,
  variantId: row.id,
  pricing: {
    currency,
    amountMinor: row.price,
    compareAtMinor: row.compareAtPrice,
  },
};
```

```ts
const createDraftVariant: ApiVariantOperationInput = {
  action: ApiVariantOperationAction.Create,
  clientMutationId: row.clientMutationId,
  options: {
    set: productOptions.map((option) => ({
      optionId: option.id,
      optionValueId: row.selectedOptionValueIds[option.id],
    })),
  },
  media: row.mediaFileIds.length > 0
    ? { fileIds: row.mediaFileIds }
    : undefined,
  weight: row.weight ?? undefined,
  dimensions: hasCompleteDimensions(row)
    ? {
        length: row.length,
        width: row.width,
        height: row.height,
      }
    : undefined,
};
```

DELETE operations are part of the new frontend API contract, even if the first
spreadsheet implementation does not expose delete UI:

```ts
const deleteVariant: ApiVariantOperationInput = {
  action: ApiVariantOperationAction.Delete,
  variantId,
};
```

## Frontend files to migrate

The expected frontend API changes are limited to these product Admin files:

- `admin/src/domains/inventory/products/graphql/operation-types.ts`
- `admin/src/domains/inventory/products/mappers/product-variant-update.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-variant-editor.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-variant-options.mapper.ts`
- `admin/src/domains/inventory/products/modals.ts`
- `admin/src/domains/inventory/products/components/product-details-card/hooks/use-product-modals.ts`
- `admin/src/domains/inventory/products/components/pricing/pricing-block.tsx`
- `admin/src/domains/inventory/products/components/variants/config/types.ts`
- `admin/src/domains/inventory/products/components/variants/edit-variants-modal.tsx`
- `admin/src/domains/inventory/products/components/variants/components/variants-editor-grid.tsx`

Do not introduce feature-local aliases that re-export generated API types from
`@/graphql/types`. Per the Admin GraphQL layer rules, use generated API types
directly at the usage site.

## GraphQL operation types

`ProductUpdateMutationVariables` keeps the same top-level shape:

```ts
export interface ProductUpdateMutationVariables {
  productId: string;
  operations?: ApiProductUpdateInput | null;
  expectedRevision?: number | null;
}
```

No new mutation should be added for spreadsheet variant creation. The frontend
must continue to call only `productUpdate` for the variants spreadsheet save.

`ProductUpdateMutationData` must include `operationResults` and `userErrors`.
After backend/codegen update, `ApiOperationResult` may expose
`clientMutationId` and `entityId`; consumers should read those fields directly
from the generated type when they need to associate backend errors with draft
rows.

## Editor row model

Add UI-local lifecycle metadata to variant editor rows:

```ts
export type VariantEditorRowKind = "existing" | "draft" | "blank";

export interface IVariantEditorInput {
  id: string;
  kind?: VariantEditorRowKind;
  clientMutationId?: string;
  // existing fields stay unchanged
}

export interface IVariantEditorRow extends IEditorRowBase {
  kind?: VariantEditorRowKind;
  clientMutationId?: string;
  // existing fields stay unchanged
}
```

Rules:

- missing `kind` means `"existing"`;
- existing rows use the API `variant.id`;
- draft rows use an id with the `draft:` prefix;
- blank row uses an id with the `blank:` prefix;
- `clientMutationId` is required for draft rows and must be sent in the
  matching `CREATE` operation;
- blank rows are never sent to the backend.

`VariantEditorSaveRow` must carry enough data to build both UPDATE and CREATE
operations:

```ts
export interface VariantEditorSaveRow {
  id: string;
  kind?: VariantEditorRowKind;
  clientMutationId?: string;
  selectedOptionValueIds: Record<string, string | null>;
  price: number | null;
  compareAtPrice: number | null;
  weight: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string;
  mediaFileIds: string[];
}
```

## Modal onSave API

`IEditVariantsModalPayload["onSave"]` must change from a positional API:

```ts
onSave?: (
  variants: VariantEditorSaveRow[],
  additionalOperations?: ApiProductUpdateInput,
) => boolean | void | Promise<boolean | void>;
```

to a structured API:

```ts
onSave?: (input: {
  existingRows: VariantEditorSaveRow[];
  draftRows: VariantEditorSaveRow[];
  additionalOperations?: ApiProductUpdateInput;
}) => boolean | void | Promise<boolean | void>;
```

The modal owns draft rows while it is open. Draft rows must not be persisted in
`useVariantsEditorStore`; that store remains responsible for existing row edits
and column settings.

`EditVariantsModal` save behavior:

1. Build current existing rows.
2. Build current draft rows.
3. Run frontend validation.
4. If validation fails, show the validation message and keep the modal open.
5. Call `onSave({ existingRows, draftRows, additionalOperations })`.
6. If `onSave` returns success, clear existing edits, clear draft rows, and
   close the modal.
7. If save fails, keep existing edits and draft rows on screen.

## Mapper API

`prepareChangedVariantUpdateInputs` must stop returning
`ApiVariantUpdateInput[]`. It should return operation inputs for existing rows:

```ts
export interface PrepareChangedVariantUpdateOperationsParams {
  rows: VariantEditorSaveRow[];
  variants: ApiVariant[];
  defaultCurrency: CurrencyCode | null | undefined;
  includePricing?: boolean;
  includeShipping?: boolean;
  includeMedia?: boolean;
}

export function prepareChangedVariantUpdateOperations(
  params: PrepareChangedVariantUpdateOperationsParams,
): ApiVariantOperationInput[];
```

Each returned existing-row item must include:

```ts
{
  action: ApiVariantOperationAction.Update,
  variantId: row.id,
  // changed fields only
}
```

Add a separate mapper for draft rows:

```ts
export interface PrepareDraftVariantCreateOperationsParams {
  rows: VariantEditorSaveRow[];
  productOptions: ApiProductOption[];
  defaultCurrency: CurrencyCode | null | undefined;
  includePricing?: boolean;
  includeShipping?: boolean;
  includeMedia?: boolean;
}

export function prepareDraftVariantCreateOperations(
  params: PrepareDraftVariantCreateOperationsParams,
): ApiVariantOperationInput[];
```

Each returned draft-row item must include:

```ts
{
  action: ApiVariantOperationAction.Create,
  clientMutationId: row.clientMutationId,
  options: {
    set: productOptions.map((option) => ({
      optionId: option.id,
      optionValueId: row.selectedOptionValueIds[option.id],
    })),
  },
  // supported optional fields
}
```

Mapper validation should fail before mutation for missing
`clientMutationId`, incomplete options, invalid numeric fields, or missing store
currency when pricing is sent.

## Option mapper API

`variantOptionRowsToProductUpdateInput` must emit UPDATE operations:

```ts
return {
  variants: changedRows.map((row) => ({
    action: ApiVariantOperationAction.Update,
    variantId: row.id,
    options: {
      set: sortProductOptions(productOptions).map((option) => ({
        optionId: option.id,
        optionValueId: row.selectedOptionValueIds[option.id] as string,
      })),
    },
  })),
};
```

If option edits are later allowed on draft rows, draft option data should be
handled by `prepareDraftVariantCreateOperations`, not by converting draft rows
into UPDATE operations.

## Save orchestration API

`useProductModals` must merge existing-row UPDATE operations, draft-row CREATE
operations, and any additional product operations into one
`ApiProductUpdateInput`.

Target shape:

```ts
onSave: async ({
  existingRows,
  draftRows,
  additionalOperations,
}): Promise<boolean> => {
  const updateOperations = prepareChangedVariantUpdateOperations({
    rows: existingRows,
    variants,
    defaultCurrency: options.defaultCurrency ?? null,
    includePricing: true,
    includeShipping: true,
    includeMedia: true,
  });

  const createOperations = prepareDraftVariantCreateOperations({
    rows: draftRows,
    productOptions: product.options,
    defaultCurrency: options.defaultCurrency ?? null,
    includePricing: true,
    includeShipping: true,
    includeMedia: true,
  });

  const variantOperations = [
    ...updateOperations,
    ...createOperations,
    ...(additionalOperations?.variants ?? []),
  ];

  const operations: ApiProductUpdateInput = {
    ...additionalOperations,
    variants: variantOperations,
  };

  const result = await updateProduct({
    productId: product.id,
    expectedRevision: product.revision,
    operations,
  });

  // existing error and refresh handling remains here
};
```

The variants spreadsheet save flow must not:

- call `catalogMutation.variantCreate`;
- call post-create mutations for pricing, media, shipping, dimensions, or
  weight;
- call more than one GraphQL mutation for one Save click;
- send variant operation items without `action`.

The pricing widget edit-prices flow also uses `EditVariantsModal` and
`prepareChangedVariantUpdateInputs` today. It must migrate to the same
`prepareChangedVariantUpdateOperations` mapper and send pricing-only
`action: UPDATE` operations through `productUpdate`.

## Frontend validation contract

Before calling `productUpdate`, the frontend should validate:

- the total count of existing rows plus draft rows does not exceed the number of
  possible option combinations;
- every draft row has values for all product options;
- every selected option value belongs to the corresponding product option;
- draft rows do not duplicate each other;
- draft rows do not duplicate existing rows;
- existing rows after option edits do not duplicate another row;
- numeric fields are valid whole minor-unit or measurement values;
- media file ids belong to available product media files when the UI has that
  data.

Use `buildCombinationKey` from `product-variant-options.mapper.ts` for
combination duplicate checks. Backend validation remains the source of truth;
frontend validation is only for faster feedback and preserving draft UI state.

## Operation results handling

After backend update, create operation results may include:

```ts
{
  type: "variantCreate",
  applied: boolean,
  clientMutationId?: string | null,
  entityId?: string | null,
  errors: ApiGenericUserError[],
}
```

Frontend should prefer `clientMutationId` to attach create errors to draft rows.
If `clientMutationId` is absent, fall back to `userErrors.field` /
`operationResults[].errors[].field` paths such as `["variants", "0",
"options"]`.

On backend validation errors, the modal must remain open and retain draft rows.
On successful save, `useProductModals` should continue to refresh variants via
`loadAllProductVariants(product, { forceNetwork: true })`, refresh product data
through `options.onProductRefresh?.()`, and refetch pricing widgets only when
pricing changed.

## Acceptance criteria

- All frontend writes to `ApiProductUpdateInput.variants` include `action`.
- Existing variant edits are sent as `action: UPDATE`.
- Pricing widget variant price edits are sent as `action: UPDATE`.
- New spreadsheet draft variants are sent as `action: CREATE` with
  `clientMutationId`.
- The modal `onSave` API separates `existingRows` and `draftRows`.
- Draft rows are local to the modal and are not stored in persisted zustand
  state.
- One Save click sends exactly one `productUpdate` mutation.
- Backend validation errors do not close the modal or discard draft rows.
- There are no `variantCreate` or post-create mutation calls in this flow.
