# Product Variant Options Ag Grid Modal Plan

## Goal

Implement editing of product variant option combinations in the Admin product variant modal using AG Grid and the existing Ant Design dropdown cell pattern from `admin/src/domains/promos/bundles/modals/edit-groups-modal/components/bundle-groups-grid.tsx`.

The client must prevent duplicated variant option combinations before saving, and the feature must persist changes through the Catalog GraphQL API.

## Current Context

- Product option definitions are edited in `admin/src/domains/inventory/products/modals/edit-options-modal/edit-options-modal.tsx`.
- The existing options modal uses dnd-kit and form rows for option groups/values. This plan introduces a grid-based editor for variant option links, not a rewrite of option definition sync unless the UI scope is explicitly expanded.
- Variant grid infrastructure already exists in `admin/src/domains/inventory/products/components/variants/components/variants-editor-grid.tsx`.
- The reusable AG Grid wrapper is `admin/src/shared/components/editor-grid/editor-grid.tsx`.
- The reusable Ant Design dropdown cell renderer is `admin/src/shared/components/editor-grid/cells/dropdown-cell-renderer.tsx`.
- Catalog API types already expose:
  - `ApiProduct.options: ApiProductOption[]`
  - `ApiVariant.selectedOptions: ApiSelectedOption[]`
  - `ApiProductUpdateInput`
  - `ApiVariantUpdateInput`
  - `ApiVariantOptionsOpInput`
  - `catalogMutation.productUpdate`
  - `productOptionsSync` for option definition changes.

## UX Scope

The modal should show a dense editable grid where each row is one product variant and each option is one dropdown column.

Recommended columns:

| Column | Type | Behavior |
| --- | --- | --- |
| Variant | read-only text | Shows current variant title/handle/SKU fallback. Pinned left. |
| One column per product option | Ant Design dropdown cell | Values come from `ApiProductOption.values`; changing a value updates the local draft row. |
| Combination status | read-only text/badge | Shows duplicate/incomplete state only when needed. |

The dropdown interaction should reuse the same pattern as `DropdownCellRenderer`:

- `cellRenderer` renders Ant Design `Dropdown`.
- Options are passed as `{ value: optionValue.id, label: optionValue.name }[]`.
- The renderer calls a row update callback with `rowId` and selected `optionValueId`.
- AG Grid cell padding should be suppressed for dropdown columns, matching the bundles grid pattern.

## Data Model

Add a UI-local draft model near the modal/component, for example:

```ts
interface VariantOptionEditorRow {
  id: string;
  variantId: string;
  title: string;
  selectedOptionValueIds: Record<string, string | null>;
  duplicateKey: string | null;
  validationMessage: string | null;
}
```

Rules:

- Use generated API types directly at API boundaries: `ApiProductOption`, `ApiVariant`, `ApiProductUpdateInput`, `ApiVariantUpdateInput`.
- Keep `VariantOptionEditorRow` as UI-local draft state only.
- Store option selections by `optionId`, not option name, to avoid rename issues.
- Use option/value IDs for validation and mutation input.

## Client Validation

Add validation before save and on each dropdown change.

Validation rules:

1. Every variant row must select exactly one value for every product option.
2. Every selected value must belong to the selected option.
3. No two variant rows may have the same complete option-value combination.
4. Duplicate detection must be order-stable by product option sort order, not by object key iteration.

Combination key algorithm:

```ts
function buildCombinationKey(
  row: VariantOptionEditorRow,
  productOptions: ApiProductOption[],
): string | null {
  const parts: string[] = [];

  for (const option of productOptions) {
    const valueId = row.selectedOptionValueIds[option.id];
    if (!valueId) return null;
    parts.push(`${option.id}:${valueId}`);
  }

  return parts.join("|");
}
```

Duplicate algorithm:

- Build a `Map<string, string[]>` from combination key to variant row IDs.
- Any key with more than one row marks all matching rows as duplicate.
- Block save while duplicates or incomplete rows exist.
- Show one modal-level `Alert` with a short summary and mark affected rows/cells in the grid.

## API Integration

Use the existing unified product update mutation document in `admin/src/domains/inventory/products/graphql/mutations.ts`:

```graphql
mutation ProductUpdate(
  $productId: ID!
  $operations: ProductUpdateInput
  $expectedRevision: Int
) {
  catalogMutation {
    productUpdate(
      productId: $productId
      operations: $operations
      expectedRevision: $expectedRevision
    ) {
      product {
        ...ProductMutationResultFields
      }
      operationResults {
        applied
        type
        errors {
          ...UserErrorFields
        }
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}
```

Do not add a separate variant-options mutation for this modal. All fields changed in the modal must be saved by one `productUpdate` call so variant option changes are processed by the backend batch path and swap scenarios can be handled atomically.

Use the existing hook:

`admin/src/domains/inventory/products/hooks/use-update-product.ts`

Hook call shape:

```ts
updateProduct({
  productId,
  operations: {
    variants: changedRows.map((row) => ({
      variantId: row.variantId,
      options: {
        set: productOptions.map((option) => ({
          optionId: option.id,
          optionValueId: row.selectedOptionValueIds[option.id],
        })),
      },
    })),
  },
  expectedRevision,
}): Promise<{
  product: ApiProduct | null;
  operationResults: ApiOperationResult[];
  userErrors: ApiGenericUserError[];
  errors: ApiGenericUserError[];
}>
```

The modal should consume `loading`, `error`, and `reset` from `useUpdateProduct`. It should display normalized `errors` from the hook, including `operationResults` errors, without closing the modal.

## Save Flow

1. Build rows from modal payload variants and product options.
2. User edits option dropdowns in the AG Grid modal.
3. On save, run client validation.
4. If validation fails, keep the modal open and display row/cell feedback.
5. Convert changed rows into one `ApiProductUpdateInput` with `variants[].options.set`.
6. Save every changed row in a single `updateProduct` / `productUpdate` mutation call.
7. If the API returns `userErrors` or failed `operationResults`, keep the modal open and show the mapped API errors.
8. On success, call modal `onSaved`, clear dirty state, and close the modal.

Do not save changed variants sequentially from this modal. Sequential `variantUpdateOptions` calls can fail valid swap scenarios because each individual variant update rebuilds the variant handle before the other row is updated. The unified `productUpdate` workflow batches variant option updates through the backend batch path.

## Component Changes

Create or update these files:

- `admin/src/domains/inventory/products/modals/edit-variant-options-modal/edit-variant-options-modal.tsx`
- `admin/src/domains/inventory/products/modals/edit-variant-options-modal/components/variant-options-grid.tsx`
- `admin/src/domains/inventory/products/modals/edit-variant-options-modal/types.ts`
- `admin/src/domains/inventory/products/mappers/product-variant-options.mapper.ts`
- `admin/src/domains/inventory/products/modals.ts`

Reuse existing product update files unless the implementation discovers a missing field in the current mutation result:

- `admin/src/domains/inventory/products/hooks/use-update-product.ts`
- `admin/src/domains/inventory/products/graphql/mutations.ts`
- `admin/src/domains/inventory/products/graphql/operation-types.ts`

## Grid Implementation Notes

- Use `EditorGrid<VariantOptionEditorRow>` unless direct `AgGridReact` access is required.
- Build `ColDef<VariantOptionEditorRow>[]` with one dynamic column per `ApiProductOption`.
- For dropdown cells, reuse `DropdownCellRenderer` with `valueField` pointing to a flattened field only if needed. If nested `selectedOptionValueIds[optionId]` makes `valueField` awkward, add a small option-specific wrapper renderer that internally renders Ant Design `Dropdown` with the same behavior and styling as `DropdownCellRenderer`.
- Prefer row updates through a single `updateRowOptionValue(rowId, optionId, optionValueId)` callback.
- Use `getRowClass` or cell class rules for invalid rows.
- Keep row IDs stable as variant IDs.

## Mapping Functions

Add mapper helpers:

- `apiVariantsToVariantOptionRows(variants, productOptions)`
- `validateVariantOptionRows(rows, productOptions)`
- `variantOptionRowsToProductUpdateInput(rows, originalRows, productOptions)`

The update mapper should send:

```ts
{
  variants: changedRows.map((row) => ({
    variantId: row.variantId,
    options: {
      set: productOptions.map((option) => ({
        optionId: option.id,
        optionValueId: row.selectedOptionValueIds[option.id],
      })),
    },
  })),
}
```

Only include rows whose combination changed from the original API state. The mapper may assume rows have already passed validation; it must not emit `null` option value IDs into API input.

## Backend/API Considerations

The client validation is required, but the API should still be treated as authoritative.

`productUpdate` already routes variant option updates through the backend batch workflow, which is designed to handle multiple variant option changes in one operation and allow valid swaps. The API should still return authoritative errors for invalid option/value links and duplicate combinations.

If additional server-side validation is needed, it should live near the existing variant option update workflow/script and return `userErrors` with fields that can be mapped back to `variantId` and `options.set`.

## Verification

Do not run `test` or `tsc` for this task.

When implementation is complete and a new code version is needed, run the project build through the approved project workflow. Validate manually in Admin:

- Open product with existing variants and options.
- Change a variant option value.
- Save and verify the product detail refreshes with updated `selectedOptions`.
- Try creating a duplicate combination and confirm save is blocked client-side.
- Try an incomplete row and confirm save is blocked.
- Verify API `userErrors` are displayed without closing the modal.

## Open Questions

- Should this modal replace the existing option definition modal, or should it be a separate "Edit Variant Options" action from the variants section?
- Should changing option definitions via `productOptionsSync` automatically regenerate variant combinations, or should this grid only relink existing variants?
- Should products with a single default variant and no options be allowed to open this modal, or should the action be hidden?
