# Product Attributes API Integration Plan

## Goal

Replace the Admin product attributes mock flow with the current Admin GraphQL API.

Product attributes are represented by `ProductFeature` in the Admin API:

- `isGroup: true` means a root-level attribute group.
- `isGroup: false` means an attribute.
- `index: [Int!]!` is the tree position. Root rows use `[0]`, `[1]`; child attributes use `[0, 0]`, `[0, 1]`.
- `values` belongs only to attributes. Groups return an empty `values` array and must not send values in sync input.

The Admin product details UI must read attributes from `ApiProduct.features`. The edit modal must save the complete feature tree through `catalogMutation.productFeaturesSync`.

## Baseline

### Backend API

The catalog Admin GraphQL schema already exposes product feature operations:

- `productFeatureCreate`
- `productFeatureUpdate`
- `productFeatureDelete`
- `productFeaturesSync`

Use `productFeaturesSync` for the first Admin attributes editor integration.

Reasons:

- the current editor works with a complete tree snapshot;
- the resolver decodes global product, feature, and feature value IDs before calling the script;
- the script applies a complete replacement transaction;
- features omitted from `input.features` are deleted;
- values omitted from an attribute `values` list are deleted;
- the active API e2e contract covers the sync path.

Do not use the point mutations for this integration. They remain out of scope.

### Backend Validation Contract

The UI must assume the server is the source of truth and must surface returned `userErrors`.

Client validation should catch the same obvious errors before sync:

- `productId` must be present.
- feature and value names must be non-empty after trimming.
- generated feature and value slugs must satisfy `/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`.
- feature indexes must contain one or two non-negative integer segments.
- groups must be root rows only.
- groups must not send values.
- child rows must have an existing parent group.
- attributes may be root rows or direct children of a group only.
- feature indexes and sibling positions must be unique.
- feature slugs must be unique within the product.
- value indexes and value slugs must be unique within each attribute.
- feature IDs must be unique.
- value IDs must be unique.
- existing feature IDs must belong to the product.
- existing value IDs must belong to the same feature.
- a new feature must not send existing value IDs.
- an existing feature must not change type between group and attribute.

The client cannot fully validate database ownership, so it must still keep the modal open and show server `userErrors`.

### Frontend State

The product module already has generated API types in `admin/src/graphql/types.ts`, including:

- `ApiProductFeature`
- `ApiProductFeatureValue`
- `ApiProductFeatureSyncItemInput`
- `ApiProductFeatureValueSyncInput`
- `ApiProductFeaturesSyncInput`
- `ApiProductFeaturesSyncPayload`

`ProductFeatureFields` already exists and `ProductDetailsFields` already selects `features`.

Current gaps:

- `ProductDetailsCard` still renders attributes from `supplementalData.attributes`.
- `ProductDetailsSupplementalData` still contains product attributes mock data.
- `AttributesSection` accepts `IAttributeRow[]` from the edit modal type boundary.
- `EditAttributesModal` initializes rows with `createMockData()`.
- `IEditAttributesModalPayload` only carries `productId`.
- save only shows `Product attribute updates are not API-backed yet`.
- the values column only displays a comma-separated string and does not map edits back to feature values.
- there is no active Admin UI e2e coverage for the attributes modal.

### Existing E2E Coverage

Keep `e2e/tests/inventory-api/features-sync.spec.ts` as the API contract test.

It covers:

- creating standalone attributes;
- creating grouped attributes;
- updating feature and value names;
- adding values;
- reordering features;
- deleting features by omission;
- deleting all features with an empty list;
- deleting values by omission;
- invalid product and invalid group values errors;
- full structure replacement;
- complex reorder and group moves;
- preserving feature and value IDs on update.

Add Admin UI e2e coverage only after the modal is API-backed.

## Integration Rules

Follow `knowledge/vault/patterns/admin-graphql-layer.md`.

Required rules for this work:

- Import generated API types directly from `@/graphql/types` at the usage site.
- Do not re-export generated API types from module barrels, component barrels, `graphql/index.ts`, `operation-types.ts`, or feature-local `types.ts`.
- Do not create API output view models for `ProductFeature`.
- API-backed display components must accept generated API data directly.
- `AttributesSection` must accept `features: ApiProductFeature[]`, not editor rows.
- UI-local editor rows are allowed only inside the edit modal boundary.
- Mappers may convert `ApiProductFeature[]` to modal-local editor rows and editor rows back to `ApiProductFeaturesSyncInput`.
- Mappers must not perform GraphQL calls.
- Hooks own Apollo calls and normalize returned `userErrors`.
- Components must not inspect raw payload paths like `data.catalogMutation.productFeaturesSync`.
- The mutation freshness strategy must be explicit. For this integration, use the modal payload `onSaved` callback to refetch product details.
- Do not use mocks in new API-backed hooks.

## Target File Layout

Add or update files under the existing product module:

```text
admin/src/domains/inventory/products/
  graphql/
    fragments.ts
    mutations.ts
    operation-types.ts
    index.ts
  hooks/
    use-sync-product-features.ts
    index.ts
  mappers/
    product-features.mapper.ts
    product-feature-errors.mapper.ts
    index.ts
  components/
    attributes-section.tsx
  modals/
    edit-attributes-modal/
      edit-attributes-modal.tsx
      types.ts
      components/
```

Rename `IAttributeRow` to `AttributeEditorRow` unless the implementation cost is higher than the benefit. Whether renamed or not, the type must remain modal-local and must not be used as the API-backed display prop contract.

## GraphQL Changes

### Product Feature Fragment

Keep a focused `ProductFeatureFields` fragment in `products/graphql/fragments.ts`.

Required fields:

```graphql
fragment ProductFeatureFields on ProductFeature {
  id
  name
  slug
  isGroup
  index
  values {
    id
    name
    slug
    index
  }
}
```

Do not add `parent` or `children` for this first pass. Display and editor state derive hierarchy from `index`.

`slug` is still required by the current schema and sync input. If the backend removes feature and value slugs before this UI work lands, regenerate types and update this fragment, mapper, validation, and e2e assertions in the same implementation.

### Sync Mutation

Add `PRODUCT_FEATURES_SYNC_MUTATION` to `products/graphql/mutations.ts`.

Also import `PRODUCT_FEATURE_FRAGMENT` from `./fragments`.

```graphql
mutation ProductFeaturesSync($input: ProductFeaturesSyncInput!) {
  catalogMutation {
    productFeaturesSync(input: $input) {
      product {
        id
        features {
          ...ProductFeatureFields
        }
      }
      features {
        ...ProductFeatureFields
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}
```

Append `${PRODUCT_FEATURE_FRAGMENT}` and `${USER_ERROR_FRAGMENT}` to the document.

Select only the fields needed to refresh the attributes area. Do not request the full product details payload.

### Operation Types

Update `products/graphql/operation-types.ts` with local operation response and variables types built from generated schema types.

Do not re-export generated schema types.

Use a partial product type because the sync mutation selects only `id` and `features`:

```ts
import type {
  ApiCatalogMutation,
  ApiGenericUserError,
  ApiProduct,
  ApiProductFeature,
  ApiProductFeaturesSyncInput,
} from "@/graphql/types";

export type ProductFeaturesSyncProduct = Pick<ApiProduct, "id" | "features"> & {
  features: ApiProductFeature[];
};

export interface ProductFeaturesSyncPayloadData {
  product: ProductFeaturesSyncProduct | null;
  features: ApiProductFeature[];
  userErrors: ApiGenericUserError[];
}

export interface ProductFeaturesSyncMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "productFeaturesSync"> & {
    productFeaturesSync: ProductFeaturesSyncPayloadData;
  };
}

export interface ProductFeaturesSyncMutationVariables {
  input: ApiProductFeaturesSyncInput;
}
```

Export these local operation types from `products/graphql/index.ts`. This is allowed because they are operation-local types, not generated API type re-exports.

## Editor State And Mapper Plan

Create `product-features.mapper.ts`.

### Editor Types

Keep editor row types in `modals/edit-attributes-modal/types.ts`.

Recommended shape:

```ts
export type AttributeEditorRowType = "group" | "attribute";

export interface AttributeEditorValue {
  id: string;
  apiId?: string;
  name: string;
  slug: string;
  sortIndex: number;
}

export interface AttributeEditorRow extends ITreeTableRow {
  id: string;
  apiId?: string;
  apiType?: AttributeEditorRowType;
  type: AttributeEditorRowType;
  name: string;
  slug: string;
  parentId: string | null;
  sortIndex: number;
  level: 0 | 1;
  values: AttributeEditorValue[];
}
```

Rules:

- `id` is the UI row identity.
- `apiId` is the persisted global API ID.
- Existing API rows use `id = apiId = feature.id`.
- New rows use temporary IDs such as `tmp-feature-${crypto.randomUUID()}` and no `apiId`.
- Existing values use `id = apiId = value.id`.
- New values use temporary IDs such as `tmp-value-${crypto.randomUUID()}` and no `apiId`.
- Sync input sends only `apiId`, never temporary IDs.
- `apiType` is set for persisted rows and used to detect accidental group/attribute type changes before save.

### API To Editor Rows

Function:

```ts
apiProductFeaturesToAttributeEditorRows(
  features: ApiProductFeature[],
): AttributeEditorRow[]
```

Rules:

- Treat API features as the server-valid source of truth.
- Sort features lexicographically by `index`.
- Convert `isGroup: true` to `type: "group"`.
- Convert `isGroup: false` to `type: "attribute"`.
- Root features have `index.length === 1`, `parentId: null`, `level: 0`, and `sortIndex: index[0]`.
- Child attributes have `index.length === 2`, `level: 1`, and `sortIndex: index[1]`.
- Derive child `parentId` by matching `index.slice(0, -1)` to a group row.
- If an unexpected child has no matching parent group, keep the row out of the editable save set and expose a modal-level error. Do not silently remap it to root because the next save would change persisted structure.
- Groups always get `values: []`.
- Attribute values are sorted by `value.index`.
- Values preserve `apiId`.

### Value Text Editing

Provide an explicit parser for comma-separated values.

Function:

```ts
parseAttributeValuesText(input: {
  text: string;
  existingValues: AttributeEditorValue[];
}): AttributeEditorValue[]
```

Rules:

- Split by comma.
- Trim each segment.
- Drop empty segments created by leading, trailing, or repeated commas.
- Preserve existing value IDs by exact normalized name match first.
- For unmatched edited values, preserve the value at the same previous order index to support renames.
- Create temporary IDs for new values.
- Regenerate `sortIndex` from the parsed order.
- Regenerate slugs from value names and de-duplicate slugs within the attribute.

### Editor Rows To Sync Input

Prefer a builder that returns both the API input and field path metadata for error mapping.

Function:

```ts
interface ProductFeaturesSyncDraft {
  input: ApiProductFeaturesSyncInput;
  featureRowsByInputIndex: AttributeEditorRow[];
  valuesByInputPath: Record<string, AttributeEditorValue>;
}

buildProductFeaturesSyncDraft(input: {
  productId: string;
  rows: AttributeEditorRow[];
}): ProductFeaturesSyncDraft
```

Rules:

- Build a complete snapshot for all rows that are valid editor rows.
- Root rows are sorted by `sortIndex` and receive indexes `[0]`, `[1]`, `[2]`.
- Child attributes are sorted by `sortIndex` within their parent group and receive indexes like `[0, 0]`, `[0, 1]`.
- Groups must be root-only.
- Attributes can be root-level or direct children of a group.
- Groups send no `values`.
- Attributes send sorted `values`.
- Send feature `id` only when `row.apiId` is present.
- Send value `id` only when `value.apiId` is present.
- Generate feature slugs from row names while schema requires slugs.
- Generate value slugs from value names while schema requires slugs.
- Feature slugs must be unique across the product. De-duplicate generated slugs with numeric suffixes.
- Value slugs must be unique within the attribute. De-duplicate generated slugs with numeric suffixes.
- The slug generator must never return an empty string. Use a deterministic fallback such as `feature-${position + 1}` or `value-${position + 1}`.
- Preserve existing feature and value IDs on update.
- New attributes, groups, and values are created by omitting IDs.
- Deleted rows and values are omitted from the complete snapshot.

Also export a convenience wrapper only if needed:

```ts
attributeEditorRowsToProductFeaturesSyncInput(input: {
  productId: string;
  rows: AttributeEditorRow[];
}): ApiProductFeaturesSyncInput
```

### Slug Generation

Use the project's existing `slugify` approach from product create as the base implementation.

Required helper behavior:

```ts
toFeatureSlug(name: string, fallback: string): string
toUniqueSlug(slug: string, used: Set<string>): string
```

Rules:

- transliterate names;
- lowercase;
- replace invalid separators with `-`;
- collapse repeated hyphens;
- trim leading and trailing hyphens;
- use fallback when the result is empty;
- ensure the final value matches the backend regex;
- suffix duplicates as `slug-2`, `slug-3`, etc.

### Client Validation

Function:

```ts
validateAttributeEditorRows(input: {
  productId: string;
  rows: AttributeEditorRow[];
}): ApiGenericUserError[]
```

Validation must run before calling `productFeaturesSync`.

It must detect:

- missing product ID;
- empty feature name;
- empty value name;
- invalid generated feature slug;
- invalid generated value slug;
- duplicate feature row IDs;
- duplicate feature API IDs;
- duplicate value IDs;
- duplicate root positions after drag;
- duplicate child positions after drag;
- duplicate feature slugs;
- duplicate value slugs within an attribute;
- group nested under another row;
- group with values;
- attribute nested deeper than one group;
- attribute parent missing;
- attribute parent not a group;
- persisted row type changed from its `apiType`;
- new feature containing a persisted value API ID.

Validation errors must use these server-like field paths:

- `["productId"]`
- `["features", featureIndex, "name"]`
- `["features", featureIndex, "index"]`
- `["features", featureIndex, "values", valueIndex, "name"]`

Server `userErrors` remain authoritative and must still be displayed.

## Hook Plan

Create `use-sync-product-features.ts`.

Target contract:

```ts
interface SyncProductFeaturesResult {
  product: ProductFeaturesSyncProduct | null;
  features: ApiProductFeature[];
  userErrors: ApiGenericUserError[];
}

interface UseSyncProductFeaturesReturn {
  syncProductFeatures: (
    input: ApiProductFeaturesSyncInput,
  ) => Promise<SyncProductFeaturesResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

Implementation:

- use `useMutation<ProductFeaturesSyncMutationData, ProductFeaturesSyncMutationVariables>(PRODUCT_FEATURES_SYNC_MUTATION)`;
- unwrap `payload.product`, `payload.features`, and `payload.userErrors`;
- return `product: null`, `features: []`, and a normalized `UNEXPECTED_ERROR` user error for unexpected exceptions;
- expose Apollo `loading`, `error`, and `reset`;
- do not expose raw nested payload paths to components;
- do not import mocks;
- do not perform a broad cache write in the first implementation;
- document that freshness is handled by the modal payload `onSaved` callback.

The hook may optionally accept future options for `refetchQueries` or cache updates, but the first integration should keep refresh behavior explicit through `onSaved`.

## UI Integration Plan

### Product Details Read Path

Change `ProductDetailsCard` so attributes render from `product.features`, not `supplementalData.attributes`.

Required changes:

- update `AttributesSection` props to `features: ApiProductFeature[]`;
- pass `product.features` to `AttributesSection`;
- remove `supplementalData.attributes` from `ProductDetailsCard`;
- remove `attributes` from `ProductDetailsSupplementalData` and `productDetailsMockData` if no remaining product-details consumer needs it;
- keep `supplementalData` only for remaining mock-only islands such as reviews and bundles.

`AttributesSection` must not import modal editor row types.

Target props:

```ts
interface AttributesSectionProps {
  features: ApiProductFeature[];
  actions?: ReactNode;
}
```

Display rules:

- derive root attributes and groups internally from `features`;
- sort features by `index`;
- sort values by `value.index`;
- show attribute value names as a comma-separated string;
- show `--` when an attribute has no values;
- hide empty group bodies if they have no child attributes;
- keep the section visible when `features.length === 0` if `actions` exists, so users can create the first attribute;
- render an empty state for no attributes instead of returning `null` when an edit action is available.

### Modal Payload

Extend `IEditAttributesModalPayload`:

```ts
interface IEditAttributesModalPayload extends IModalStackPayload {
  productId: string;
  features: ApiProductFeature[];
  onSaved?: () => Promise<unknown> | unknown;
}
```

Import `ApiProductFeature` directly from `@/graphql/types`.

Update `useProductModals` to accept refresh callbacks:

```ts
interface UseProductModalsOptions {
  onProductRefresh?: () => Promise<unknown>;
}

export const useProductModals = (
  product: ApiProduct,
  options: UseProductModalsOptions = {},
) => {
  // ...
};
```

Then pass the callback from `ProductDetailsCard`:

```ts
const modals = useProductModals(product, { onProductRefresh });
```

`handleEditAttributes` must open the modal with:

- `productId: product.id`;
- `features: product.features`;
- `onSaved: options.onProductRefresh`.

If changing `useProductModals` creates unnecessary churn, `ProductDetailsCard` may open only the attributes modal directly. Do not omit the refresh callback.

### Edit Attributes Modal

Update `EditAttributesModal`:

- read typed payload from modal stack context;
- require `productId`;
- initialize rows from `payload.features` through `apiProductFeaturesToAttributeEditorRows`;
- remove `createMockData()` import;
- keep row edits in modal-local state;
- keep `useTreeTableDragDrop` if it remains compatible with the target tree shape;
- wire the values column with `valueGetter` and `valueSetter` or a dedicated edit handler;
- parse comma-separated value edits with `parseAttributeValuesText`;
- preserve value IDs according to the parser rules;
- create temporary IDs for new rows and values;
- run `validateAttributeEditorRows` before sync;
- build the sync draft with `buildProductFeaturesSyncDraft`;
- call `useSyncProductFeatures().syncProductFeatures(draft.input)`;
- disable submit while saving;
- show client validation errors in the modal;
- show API `userErrors` in the modal;
- keep the modal open on validation errors or API errors;
- do not clear dirty state on failed save;
- after successful save, await `onSaved?.()`;
- after refresh completes, call `setDirty(false)` and close the modal;
- show a success notification only after the mutation succeeds and there are no `userErrors`.

Submit flow:

```ts
const handleSave = async () => {
  const validationErrors = validateAttributeEditorRows({ productId, rows: allRows });
  if (validationErrors.length > 0) {
    setUserErrors(validationErrors);
    return;
  }

  const draft = buildProductFeaturesSyncDraft({ productId, rows: allRows });
  const result = await syncProductFeatures(draft.input);

  if (result.userErrors.length > 0) {
    setUserErrors(result.userErrors);
    return;
  }

  await payload.onSaved?.();
  setDirty(false);
  pop();
};
```

### Drag And Tree Constraints

Keep using `useTreeTableDragDrop` only if it preserves the required structure.

Required behavior:

- groups can only be root rows;
- attributes can be root rows or direct children of a group;
- no nesting deeper than one group;
- deleting a group deletes its child attributes from modal state;
- sort indexes are normalized after each drag;
- final sync payload is built from normalized rows, not from raw visual order;
- invalid drag outcomes are blocked or reverted before save.

Even if drag guards are present, save must still run `validateAttributeEditorRows`.

## Error Handling Plan

Create `product-feature-errors.mapper.ts`.

Minimum required exports:

```ts
formatProductFeatureUserError(error: ApiGenericUserError): string
formatProductFeatureUserErrors(errors: ApiGenericUserError[]): string[]
```

Optional field-level exports:

```ts
mapProductFeatureUserErrorsToEditorErrors(input: {
  errors: ApiGenericUserError[];
  draft: ProductFeaturesSyncDraft;
}): ProductFeatureEditorErrorMap
```

Minimum first-pass behavior:

- render all client validation and API `userErrors` in a modal-level `Alert`;
- include every error message, not only the first one;
- keep the modal open on errors;
- do not clear dirty state on errors.

Field-level rendering can be added in the same implementation if it is cheap:

- map paths like `["features", "0", "name"]` to `draft.featureRowsByInputIndex[0]`;
- map paths like `["features", "0", "values", "1", "name"]` through `draft.valuesByInputPath`;
- highlight affected grid cells.

Do not inline repeated field path parsing inside React components.

## E2E Plan

Do not replace `e2e/tests/inventory-api/features-sync.spec.ts`.

Add focused Admin UI coverage after the modal is API-backed:

```text
e2e/tests/admin-ui/product-update-attributes.spec.ts
```

Add stable test IDs needed by the spec:

- `product-attributes-section`
- `product-attributes-empty-state`
- `product-attributes-actions-button`
- `edit-attributes-modal`
- `edit-attributes-grid`
- `edit-attributes-add-button`
- `edit-attributes-add-attribute-item`
- `edit-attributes-add-group-item`
- `submit-edit-attributes-form-button`
- `edit-attributes-error-alert`

Recommended scenarios:

- create a product with no features, open details, assert the attributes empty state is visible, add the first standalone attribute, save, reload, assert it is shown;
- add a group and child attributes, save, reload, assert grouping and values;
- edit values through the comma-separated editor, save, reload, assert values persist in order;
- reorder root attributes and child attributes, save, reload, assert ordering;
- delete an attribute and delete a group, save, reload, assert removed items are gone;
- submit invalid rows and assert the modal shows errors without closing;
- edit an existing attribute and value, save, assert feature and value IDs are preserved through an API read.

Per project instructions, e2e specs should be run one file at a time only when verification is explicitly needed. Do not run `test` or `tsc` for this planning task.

## Implementation Phases

### Phase 1: GraphQL Operation And Types

- Confirm `ProductFeatureFields` has all required fields.
- Add `PRODUCT_FEATURES_SYNC_MUTATION`.
- Add local operation data, payload, product, and variables types.
- Export operation documents and operation-local types from existing product GraphQL barrels.
- Do not re-export generated API types.

### Phase 2: Editor Types And Mappers

- Rename or constrain `IAttributeRow` to a modal-local `AttributeEditorRow`.
- Add API-to-editor mapper.
- Add value text parser.
- Add sync draft builder.
- Add slug generation helpers.
- Add client validation helpers.
- Add error formatting and optional field path mapping.

### Phase 3: Product Details Read Path

- Change `AttributesSection` to accept `ApiProductFeature[]`.
- Derive display groups internally from API features.
- Keep the section visible with an empty state when edit actions exist.
- Render `ProductDetailsCard` attributes from `product.features`.
- Remove product attributes from `ProductDetailsSupplementalData` usage.
- Keep unrelated mock-only supplemental fields unchanged.

### Phase 4: Modal API Integration

- Extend attributes modal payload.
- Pass product features and refresh callback through `useProductModals`.
- Replace mock initialization with API feature rows.
- Implement add group and add attribute with temporary IDs.
- Implement comma-separated value editing.
- Implement validation, sync draft build, and `productFeaturesSync` save.
- Keep modal open on validation or API errors.
- Close only after successful sync and refresh callback completion.

### Phase 5: Refresh Strategy

- Use `onSaved` product details refetch for the first implementation.
- Do not write brittle manual cache updates for the paginated product details query in this pass.
- Consider a focused Apollo cache update later only after product details cache behavior is stable.

### Phase 6: Admin UI E2E Coverage

- Keep API e2e as the sync semantics contract.
- Add one focused Admin UI spec for product attribute editing.
- Run only that one spec when verification is explicitly requested.
- Do not broaden the test run.

## Out Of Scope

- Backend schema changes.
- Removing `slug` from feature contracts.
- Fixing or using `productFeatureCreate`, `productFeatureUpdate`, or `productFeatureDelete`.
- Replacing reviews, bundles, analytics, or other unrelated mock-only islands.
- Reworking the attributes modal design beyond what is required for API-backed editing.
- Rich value editing UI beyond the comma-separated first pass.
- Manual Apollo cache updates for product details pagination.

## Acceptance Criteria

- Product details attributes render from `product.features`.
- `AttributesSection` accepts generated API data directly and does not import modal editor row types.
- Product details still exposes an edit action when a product has no attributes.
- `ProductDetailsSupplementalData` is no longer used for product attributes.
- `EditAttributesModal` opens with the current product features from payload.
- `EditAttributesModal` no longer imports `createMockData`.
- New rows and values use temporary local IDs.
- Existing feature and value global IDs are stored separately as `apiId`.
- Save calls `catalogMutation.productFeaturesSync` with a complete snapshot.
- Existing feature and value IDs are preserved on update.
- New attributes, groups, and values are created by omitting IDs.
- Deleted rows and values are omitted from the snapshot and removed by the API.
- Groups send no values.
- Slugs are generated, valid, non-empty, and de-duplicated.
- Client validation blocks invalid structure before the mutation.
- API `userErrors` are visible and prevent closing the modal.
- Failed saves do not clear dirty state.
- Successful save awaits product refresh, clears dirty state, and closes the modal.
- No generated API types are re-exported through local barrels.
- No API output view model is introduced for product features.
- Admin UI e2e coverage is added for the API-backed attributes workflow.
