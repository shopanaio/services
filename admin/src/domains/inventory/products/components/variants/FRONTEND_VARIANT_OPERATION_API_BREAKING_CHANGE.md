# Frontend API migration for variant operation contract

## Scope

This document describes only the Admin frontend API changes required after the
backend replaces the old `ProductUpdateInput.variants: [VariantUpdateInput!]`
shape with the approved operation-style breaking change.

Backend schema, backend workflows, generated backend resolver files, changesets,
tests, and backend validation rules are intentionally out of scope here. This
document assumes the backend schema has already been updated.

Before migrating Admin frontend code, run the frontend GraphQL schema/codegen
step so `@/graphql/types` reflects the backend breaking change. The generated
Admin API types must expose `ApiVariantOperationInput`,
`VariantOperationAction`, `ApiOperationResult.clientMutationId`,
`ApiOperationResult.entityId`, and
`ApiProductUpdateInput.variants?: ApiVariantOperationInput[] | null`.
Do not manually edit generated GraphQL types.

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
  ApiVariantOperationInput,
} from "@/graphql/types";
import { VariantOperationAction } from "@/graphql/types";
```

Expected enum values. The Admin codegen uses `enumPrefix: false`, so generated
enum names are expected to omit the `Api` prefix:

```ts
VariantOperationAction.Create
VariantOperationAction.Update
VariantOperationAction.Delete
```

If codegen emits string literal unions instead of an enum, use the generated
shape directly. If the enum name differs after codegen, use the generated enum
name directly and keep the sent values as `"CREATE"`, `"UPDATE"`, and `"DELETE"`.

## Product update input contract

Frontend code must treat `ApiProductUpdateInput.variants` as:

```ts
variants?: ApiVariantOperationInput[] | null;
```

Valid frontend payload examples:

```ts
const updateExistingVariant: ApiVariantOperationInput = {
  action: VariantOperationAction.Update,
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
  action: VariantOperationAction.Create,
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
  action: VariantOperationAction.Delete,
  variantId,
};
```

## Frontend files to migrate

The expected spreadsheet editor API changes include these product Admin files:

- `admin/src/domains/inventory/products/graphql/mutations.ts`
- `admin/src/domains/inventory/products/graphql/operation-types.ts`
- `admin/src/domains/inventory/products/mappers/product-errors.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-variant-update.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-variant-editor.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-variant-options.mapper.ts`
- `admin/src/domains/inventory/products/modals.ts`
- `admin/src/domains/inventory/products/components/product-details-card/hooks/use-product-modals.ts`
- `admin/src/domains/inventory/products/components/pricing/pricing-block.tsx`
- `admin/src/domains/inventory/products/components/variants/config/types.ts`
- `admin/src/domains/inventory/products/components/variants/edit-variants-modal.tsx`
- `admin/src/domains/inventory/products/components/variants/components/variants-editor-grid.tsx`

The backend breaking change also affects any other Admin frontend flow that
writes to `ProductUpdateInput.variants`, including bulk update inputs. At the
time of writing, inventory bulk editing still builds old `ApiVariantUpdateInput`
items and must be migrated too:

- `admin/src/domains/inventory/inventory/mappers/inventory-variant-edit.mapper.ts`

That mapper must emit `action: UPDATE` variant operation items inside
`ApiProductBulkUpdateInput.products[].operations.variants`; otherwise inventory
bulk save will break after frontend schema/codegen updates.

Do not introduce feature-scoped aliases that re-export generated API types from
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
The `productUpdate` mutation selection must request `clientMutationId` and
`entityId` on every operation result:

```graphql
operationResults {
  applied
  type
  clientMutationId
  entityId
  errors {
    ...UserErrorFields
  }
}
```

Consumers must read `clientMutationId` and `entityId` directly from the
generated `ApiOperationResult` type when they need to associate backend results
with draft rows.

## Editor row model

Add editor lifecycle metadata to variant editor rows:

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

to a structured API that returns enough mutation metadata for the modal to keep
or materialize draft rows after backend validation and partial create failures:

```ts
export interface EditVariantsSaveResult {
  ok: boolean;
  operationResults: ApiOperationResult[];
  userErrors: ApiGenericUserError[];
}

onSave?: (input: {
  existingRows: VariantEditorSaveRow[];
  draftRows: VariantEditorSaveRow[];
  additionalOperations?: ApiProductUpdateInput;
}) => EditVariantsSaveResult | Promise<EditVariantsSaveResult>;
```

Callsites that do not need row-level result handling, such as pricing-only
edits, should still return this shape with the `operationResults` and
`userErrors` returned by `productUpdate`.

`useVariantsEditorStore` owns all mutable `EditVariantsModal` state while the
modal is open. That includes existing-row edits, draft rows, the blank input row,
row-level validation/API errors, save status, dirty state, and column settings.
The modal component should read and dispatch store actions instead of keeping
parallel mutable row state in React refs or component state.

Draft rows are still editor-session lifecycle rows, not API entities. They live in the
zustand store only for the open editor session, use `draft:` ids, and must be
cleared by the same store action that clears existing edits on successful save
or modal close. Blank rows use `blank:` ids, stay in the store as input affordance
state, and are never included in save payloads.

Only column visibility settings may remain in the persisted zustand slice.
Session state such as `existingEdits`, `draftRows`, `blankRow`, `rowErrors`,
`status`, and save results must not be persisted across modal sessions.

The store API should expose enough derived selectors/actions for the modal and
grid to avoid duplicating row assembly logic:

```ts
interface VariantsEditorState {
  existingEdits: Record<string, unknown>;
  draftRows: IVariantEditorRow[];
  blankRow: IVariantEditorRow | null;
  rowErrors: Record<string, string | null>;
  status: "idle" | "saving" | "error";
  hasChanges: () => boolean;
  getCurrentRows: (baseRows: IVariantEditorRow[]) => IVariantEditorRow[];
  getRowsForSave: (baseRows: IVariantEditorRow[]) => {
    existingRows: VariantEditorSaveRow[];
    draftRows: VariantEditorSaveRow[];
  };
  addDraftRow: () => void;
  updateDraftRow: (rowId: string, patch: Partial<IVariantEditorRow>) => void;
  removeDraftRow: (rowId: string) => void;
  materializeDraftRows: (
    results: Array<{
      clientMutationId: string;
      entityId: string;
      applied: boolean;
      errors: ApiGenericUserError[];
    }>,
  ) => void;
  setRowErrors: (errors: Record<string, string | null>) => void;
  resetSession: () => void;
}
```

The exact store type names can follow the existing implementation, but the
ownership boundary is required: all edit-session state belongs to the zustand
store, and `EditVariantsModal` remains an orchestration/rendering component.

`EditVariantsModal` save behavior:

1. Build current rows from base API rows plus store-owned edits, draft rows, and
   blank row state.
2. Split rows by `kind` before building API inputs:
   - existing rows: `kind` missing or `"existing"`;
   - draft rows: `kind === "draft"`;
   - blank rows: `kind === "blank"` and excluded from save payloads.
3. Run frontend validation against existing plus draft rows.
4. If validation fails, show the validation message and keep the modal open.
5. Pass only existing rows to existing-row UPDATE mappers, including
   `variantOptionRowsToProductUpdateInput`.
6. Pass only draft rows to `prepareDraftVariantCreateOperations`.
7. Call `onSave({ existingRows, draftRows, additionalOperations })`.
8. If `onSave` returns `ok: true`, call the store session reset action and close
   the modal.
9. If `onSave` returns `ok: false`, inspect `operationResults` and `userErrors`,
   materialize draft rows that have `variantCreate.entityId`, attach row errors,
   and keep the modal open.
10. If save fails, keep existing edits, draft rows, blank row state, and row
   errors in the store so the user can fix and retry.

The modal must not keep a parallel mutable `rowDataRef` or React state copy for
the current rows. Save must read the current rows from store selectors so the
store is the single owner of open-session editor state.

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
  action: VariantOperationAction.Update,
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
  action: VariantOperationAction.Create,
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

The mapper must receive or internally filter to existing rows only. It must not
convert `kind === "draft"`, `kind === "blank"`, `draft:*`, or `blank:*` rows
into UPDATE operations. Draft option selections are create-operation input and
belong to `prepareDraftVariantCreateOperations`.

```ts
return {
  variants: changedRows.map((row) => ({
    action: VariantOperationAction.Update,
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

The modal save flow should split rows first and call this mapper only with
existing rows:

```ts
const { existingRows, draftRows } = variantsEditorStore.getRowsForSave(baseRows);
const optionOperations = variantOptionRowsToProductUpdateInput(
  existingRows,
  originalExistingRows,
  productOptions,
);
```

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
}): Promise<EditVariantsSaveResult> => {
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

  if (result.errors.length > 0) {
    return {
      ok: false,
      operationResults: result.operationResults,
      userErrors: result.userErrors,
    };
  }

  // existing refresh handling remains here

  return {
    ok: true,
    operationResults: result.operationResults,
    userErrors: result.userErrors,
  };
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

The inventory bulk edit flow must migrate from `ApiVariantUpdateInput[]` to
variant operation inputs as well. Both inventory selection initialization and
inventory row edit saves should send inventory updates as:

```ts
{
  action: VariantOperationAction.Update,
  variantId,
  inventory: {
    warehouseId,
    onHand,
    unavailable,
    sku,
  },
}
```

If codegen emits a different enum name, use the generated enum name directly.

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

Backend can return `applied: false` for a `variantCreate` even when the variant
row was created. In that case `entityId` is present and identifies the created
variant. This happens when `VariantCreateScript` succeeds but a later portion of
the same create operation, such as pricing, inventory, media, weight, or
dimensions, returns errors.

Frontend must treat `variantCreate` results as follows:

- `entityId` present: the draft has been materialized. Use
  `clientMutationId` to find the draft row, replace the `draft:` id with
  `entityId`, change the row to `kind: "existing"`, keep any failed field edits
  and row errors in `useVariantsEditorStore`, and ensure the next Save sends
  `action: UPDATE` for that row instead of another `CREATE`.
- `entityId` absent and `applied: false`: the draft was not created. Keep it as
  `kind: "draft"` with its `clientMutationId` and attach the returned row
  errors.
- `applied: true` with `entityId`: the draft was created successfully. On full
  save success the session reset closes the modal; if another operation failed
  and the modal stays open, materialize the draft the same way as the partial
  failure case so retry does not send a duplicate `CREATE`.

Frontend should prefer `clientMutationId` to attach create errors or
materialization results to draft rows. If `clientMutationId` is absent, fall
back to `userErrors.field` / `operationResults[].errors[].field` paths such as
`["variants", "0", "options"]`.

Row-level API error mapping belongs in a mapper/helper, not inline in the modal.
Extend the product error mapping layer so it can derive row errors from both
`operationResults[].errors` and `userErrors`. Mapping rules:

- for `variantCreate`, use `operationResult.clientMutationId` first;
- when `clientMutationId` is absent, use the variant operation index from the
  error field path to find the submitted draft row;
- for `variantUpdate`, use the submitted operation order, field path variant
  index, or the corresponding submitted row to attach errors to an existing row;
- when a `variantCreate` result contains `entityId`, move the row from
  `kind: "draft"` to `kind: "existing"` before the next retry;
- keep only edits for fields that failed when the backend reports field-specific
  errors; if the result does not identify failed fields, keep the row-level error
  and leave the row dirty so the user can retry without losing input.

On backend validation errors, the modal must remain open and retain draft rows.
On successful save, `useProductModals` should continue to refresh variants via
`loadAllProductVariants(product, { forceNetwork: true })`, refresh product data
through `options.onProductRefresh?.()`, and refetch pricing widgets only when
pricing changed.

## Acceptance criteria

- All frontend writes to `ApiProductUpdateInput.variants` include `action`.
- All frontend writes to
  `ApiProductBulkUpdateInput.products[].operations.variants` include `action`.
- Existing variant edits are sent as `action: UPDATE`.
- Pricing widget variant price edits are sent as `action: UPDATE`.
- Inventory bulk variant edits are sent as `action: UPDATE`.
- New spreadsheet draft variants are sent as `action: CREATE` with
  `clientMutationId`.
- The modal `onSave` API separates `existingRows` and `draftRows`.
- The modal `onSave` result includes `operationResults` and `userErrors` so the
  modal can handle row-level backend results.
- Existing edits, draft rows, blank row state, validation/API row errors, dirty
  state, save status, and column settings are owned by `useVariantsEditorStore`
  for the open editor session.
- Only column visibility settings are persisted; draft rows, blank row state,
  row errors, save status, and edit-session data are not persisted.
- `EditVariantsModal` does not keep current rows in `rowDataRef` or parallel
  component state; save reads rows through store selectors.
- `variantCreate` results with `entityId` materialize the matching draft row in
  `useVariantsEditorStore`, even when `applied` is `false`, so retry saves use
  `action: UPDATE` instead of duplicate `CREATE`.
- Draft and blank rows are cleared through the store session reset action after
  successful save or modal close.
- One Save click sends exactly one `productUpdate` mutation.
- Backend validation errors do not close the modal or discard draft rows.
- There are no `variantCreate` or post-create mutation calls in this flow.
