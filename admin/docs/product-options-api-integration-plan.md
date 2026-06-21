# Product Options API Integration Plan

## Goal

Replace the Admin product options mock save flow with the current Admin GraphQL API.

Product options are represented by `ProductOption` in the Admin API:

- `displayType: OptionDisplayType!` controls how values render in the UI.
- Supported display types are `BUTTONS`, `DROPDOWN`, and `SWATCH`.
- `ProductOption.values` contains the selectable values for that option.
- `ProductOptionSwatch` belongs to option values and is relevant only when the option `displayType` is `SWATCH`.
- The output API does not expose option or value indexes. The UI must preserve order from the returned `options` and `values` arrays and generate sync indexes when saving.

The Admin product details UI already reads options from `ApiProduct.options`. The edit modal must stop using mock options and save the complete option snapshot through `catalogMutation.productOptionsSync`.

## Baseline

### Backend API

The catalog Admin GraphQL schema already exposes product option operations:

- `productOptionCreate`
- `productOptionUpdate`
- `productOptionDelete`
- `productOptionsSync`

Use `productOptionsSync` for the first Admin options editor integration.

Reasons:

- the current editor works with a complete list snapshot;
- the resolver decodes global product, option, option value, and swatch file IDs before calling the script;
- the script applies a complete replacement transaction;
- options omitted from `input.options` are deleted;
- values omitted from an option `values` list are deleted;
- setting a value `swatch` to `null` removes the swatch;
- the active API e2e contract covers the sync path.

Do not use the point mutations for this integration. They remain out of scope.

### Backend Validation Contract

The UI must assume the server is the source of truth and must surface returned `userErrors`.

Client validation should catch the same obvious errors before sync:

- `productId` must be present.
- option and value names must be non-empty after trimming.
- generated option and value slugs must satisfy `/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`.
- option indexes must be non-negative integers.
- value indexes must be non-negative integers.
- option indexes must be unique.
- value indexes must be unique within each option.
- option slugs must be unique within the product.
- value slugs must be unique within each option.
- option IDs must be unique.
- value IDs must be unique across the sync input.
- every option must contain at least one value.
- `displayType` must be one of `BUTTONS`, `DROPDOWN`, or `SWATCH`.
- non-swatch display types must not send hidden value swatches.
- `SWATCH` values must send valid swatch input when the UI shows swatch controls.
- `COLOR` swatches must have `colorOne`.
- `GRADIENT` swatches must have `colorOne` and `colorTwo`.
- `IMAGE` swatches must use an existing API file ID; data URLs must not be sent as `fileId`.
- existing option IDs must belong to the product.
- existing value IDs must belong to the same option.
- a new option must not send existing value IDs.

The client cannot fully validate database ownership, so it must still keep the modal open and show server `userErrors`.

### Frontend State

The product module already has generated API types in `admin/src/graphql/types.ts`, including:

- `ApiProductOption`
- `ApiProductOptionValue`
- `ApiProductOptionSwatch`
- `ApiProductOptionSwatchInput`
- `ApiProductOptionSyncItemInput`
- `ApiProductOptionValueSyncInput`
- `ApiProductOptionsSyncInput`
- `ApiProductOptionsSyncPayload`
- `OptionDisplayType`
- `SwatchType`

`ProductOptionFields` already exists and `ProductDetailsFields` already selects `options`.

Current gaps:

- `OptionsSection` renders from `product.options`, but returns `null` when the list is empty.
- `OptionsSection` imports display metadata from the edit modal constants, which leaks modal-only code into display UI.
- `ProductDetailsCard` currently renders the options section only for products where `variantsCount > 1`, so adding the first option from an empty product is not exposed.
- `IEditOptionsModalPayload` only carries optional `productId`.
- `EditOptionsModal` accepts `initialGroups` and defaults to `MOCK_OPTION_GROUPS`.
- save only shows `Product option updates are not API-backed yet`.
- `edit-options-modal.schema.ts` re-exports generated API types and aliases API output types as form state.
- `useEditOptionsForm` stores editable state as `ApiProductOption` and `ApiProductOptionValue` objects.
- new options and values currently use local IDs in the same field that persisted API IDs use.
- `SwatchPicker` image upload currently creates a data URL and stores it like a `fileId`; this is not valid for the API sync input.
- there is no `useSyncProductOptions` hook.
- there are no option sync mappers or option-specific `userErrors` mappers.
- there is no active Admin UI e2e coverage for the options modal.

### Existing E2E Coverage

Keep `e2e/tests/inventory-api/options-sync.spec.ts` as the API contract test.

It covers:

- creating simple options with values;
- creating options with swatches;
- updating option names and display types;
- updating value names;
- adding values;
- reordering options;
- updating swatch values;
- deleting options by omission;
- deleting all options with an empty list;
- deleting values by omission;
- removing swatches by sending `swatch: null`;
- invalid product errors;
- duplicate option slugs;
- duplicate option indexes;
- duplicate value slugs within an option;
- options without values;
- invalid existing option IDs;
- invalid new option value references;
- full structure replacement;
- complex reorder with modifications;
- preserving option and value IDs on update;
- all display types.

Add Admin UI e2e coverage only after the modal is API-backed.

## Integration Rules

Follow `knowledge/vault/patterns/admin-graphql-layer.md`.

Required rules for this work:

- Import generated API types directly from `@/graphql/types` at the usage site.
- Do not re-export generated API types from module barrels, component barrels, `graphql/index.ts`, `operation-types.ts`, modal schema files, or feature-local `types.ts`.
- Do not create API output view models for `ProductOption`.
- API-backed display components must accept generated API data directly.
- `OptionsSection` must accept `options: ApiProductOption[]`.
- UI-local editor groups and values are allowed only inside the edit modal boundary.
- Mappers may convert `ApiProductOption[]` to modal-local editor groups and editor groups back to `ApiProductOptionsSyncInput`.
- Mappers must not perform GraphQL calls.
- Hooks own Apollo calls and normalize returned `userErrors`.
- Components must not inspect raw payload paths like `data.catalogMutation.productOptionsSync`.
- The mutation freshness strategy must be explicit. For this integration, use the modal payload `onSaved` callback to refetch product details and variant data.
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
    use-sync-product-options.ts
    index.ts
  mappers/
    product-options.mapper.ts
    product-option-errors.mapper.ts
    index.ts
  components/
    product-details-card/
      sections/
        options-section.tsx
  modals/
    edit-options-modal/
      edit-options-modal.tsx
      types.ts
      edit-options-modal.schema.ts
      edit-options-modal.constants.tsx
      hooks/
        use-edit-options-form.ts
      components/
```

Replace `IOptionGroup` and `IOptionValue` API aliases with modal-local editor types. Whether the old names are temporarily kept or renamed, they must not be generated API type aliases and must not be used as API-backed display prop contracts.

## GraphQL Changes

### Product Option Fragment

Keep focused option fragments in `products/graphql/fragments.ts`.

Required fields:

```graphql
fragment ProductOptionValueFields on ProductOptionValue {
  id
  name
  slug
  swatch {
    id
    swatchType
    colorOne
    colorTwo
    metadata
    file {
      ...FileFields
    }
  }
}

fragment ProductOptionFields on ProductOption {
  id
  name
  slug
  displayType
  values {
    ...ProductOptionValueFields
  }
}
```

The schema does not expose option or value indexes. Display and editor state must derive ordering from the `options` and `values` array order returned by the API.

`slug` is still required by the current schema and sync input. If the backend removes option and value slugs before this UI work lands, regenerate types and update this fragment, mapper, validation, and e2e assertions in the same implementation.

### Sync Mutation

Add `PRODUCT_OPTIONS_SYNC_MUTATION` to `products/graphql/mutations.ts`.

Also import `PRODUCT_OPTION_FRAGMENT` from `./fragments`.

```graphql
mutation ProductOptionsSync($input: ProductOptionsSyncInput!) {
  catalogMutation {
    productOptionsSync(input: $input) {
      product {
        id
        options {
          ...ProductOptionFields
        }
      }
      options {
        ...ProductOptionFields
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}
```

Append `${PRODUCT_OPTION_FRAGMENT}` and `${USER_ERROR_FRAGMENT}` to the document.

Select only the fields needed to refresh the options area. Do not request the full product details payload or variants in this mutation. Product details and variants freshness must be handled by the modal payload `onSaved` callback.

### Operation Types

Update `products/graphql/operation-types.ts` with local operation response and variables types built from generated schema types.

Do not re-export generated schema types.

Use a partial product type because the sync mutation selects only `id` and `options`:

```ts
import type {
  ApiCatalogMutation,
  ApiGenericUserError,
  ApiProduct,
  ApiProductOption,
  ApiProductOptionsSyncInput,
} from "@/graphql/types";

export type ProductOptionsSyncProduct = Pick<ApiProduct, "id" | "options"> & {
  options: ApiProductOption[];
};

export interface ProductOptionsSyncPayloadData {
  product: ProductOptionsSyncProduct | null;
  options: ApiProductOption[];
  userErrors: ApiGenericUserError[];
}

export interface ProductOptionsSyncMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "productOptionsSync"> & {
    productOptionsSync: ProductOptionsSyncPayloadData;
  };
}

export interface ProductOptionsSyncMutationVariables {
  input: ApiProductOptionsSyncInput;
}
```

Export these local operation types from `products/graphql/index.ts`. This is allowed because they are operation-local types, not generated API type re-exports.

## Editor State And Mapper Plan

Create `product-options.mapper.ts`.

### Editor Types

Keep editor types in `modals/edit-options-modal/types.ts`.

Recommended shape:

```ts
export interface OptionEditorSwatch {
  swatchType: SwatchType;
  colorOne?: string | null;
  colorTwo?: string | null;
  fileId?: string | null;
  metadata?: unknown;
}

export interface OptionEditorValue {
  id: string;
  apiId?: string;
  apiSwatchId?: string;
  name: string;
  slug: string;
  sortIndex: number;
  swatch: OptionEditorSwatch | null;
}

export interface OptionEditorGroup {
  id: string;
  apiId?: string;
  name: string;
  slug: string;
  displayType: OptionDisplayType;
  sortIndex: number;
  values: OptionEditorValue[];
}
```

Rules:

- `id` is the UI identity.
- `apiId` is the persisted global API ID.
- Existing API options use `id = apiId = option.id`.
- New options use temporary IDs such as `tmp-option-${crypto.randomUUID()}` and no `apiId`.
- Existing values use `id = apiId = value.id`.
- New values use temporary IDs such as `tmp-option-value-${crypto.randomUUID()}` and no `apiId`.
- Sync input sends only `apiId`, never temporary IDs.
- `apiSwatchId` is optional metadata for local tracking only. Sync input cannot preserve a swatch ID because `ProductOptionSwatchInput` has no `id`.
- Modal-local types may reference generated enums such as `OptionDisplayType` and `SwatchType`, but must not re-export them.

### API To Editor Groups

Function:

```ts
apiProductOptionsToOptionEditorGroups(
  options: ApiProductOption[],
): OptionEditorGroup[]
```

Rules:

- Treat API options as the server-valid source of truth.
- Preserve option order from the `options` array.
- Preserve value order from each option `values` array.
- Set each option `sortIndex` from its current array position.
- Set each value `sortIndex` from its current array position.
- Preserve option and value `apiId`.
- Convert output swatches to editor swatches.
- For image swatches, use `swatch.file?.id` as `fileId`.
- Do not create data URL `fileId` values.
- If the output contains swatches for a non-`SWATCH` display type, keep them out of the save set unless the user changes the option back to `SWATCH`.

### Editor Groups To Sync Input

Prefer a builder that returns both the API input and field path metadata for error mapping.

Function:

```ts
interface ProductOptionsSyncDraft {
  input: ApiProductOptionsSyncInput;
  optionGroupsByInputIndex: OptionEditorGroup[];
  valuesByInputPath: Record<string, OptionEditorValue>;
}

buildProductOptionsSyncDraft(input: {
  productId: string;
  groups: OptionEditorGroup[];
}): ProductOptionsSyncDraft
```

Rules:

- Build a complete snapshot for all editor groups.
- Options are sorted by `sortIndex` and receive indexes `0`, `1`, `2`.
- Values are sorted by `sortIndex` within each option and receive indexes `0`, `1`, `2`.
- Send option `id` only when `group.apiId` is present.
- Send value `id` only when `value.apiId` is present.
- Generate option slugs from group names while schema requires slugs.
- Generate value slugs from value names while schema requires slugs.
- Option slugs must be unique across the product. De-duplicate generated slugs with numeric suffixes.
- Value slugs must be unique within the option. De-duplicate generated slugs with numeric suffixes.
- The slug generator must never return an empty string. Use a deterministic fallback such as `option-${position + 1}` or `value-${position + 1}`.
- Preserve existing option and value IDs on update.
- New options and values are created by omitting IDs.
- Deleted options and values are omitted from the complete snapshot.
- Every option must send at least one value.
- For `SWATCH` options, send value swatches from the editor state.
- For non-`SWATCH` options, send `swatch: null` for every value to remove hidden stale swatches.
- Existing image swatches may be preserved only when `fileId` is an existing API file global ID.
- New image swatches require real media upload integration before sync. Do not send data URLs.

Also export a convenience wrapper only if needed:

```ts
optionEditorGroupsToProductOptionsSyncInput(input: {
  productId: string;
  groups: OptionEditorGroup[];
}): ApiProductOptionsSyncInput
```

### Slug Generation

Use the project's existing `slugify` approach from product create or product features as the base implementation.

Required helper behavior:

```ts
toOptionSlug(name: string, fallback: string): string
toOptionValueSlug(name: string, fallback: string): string
toUniqueSlug(slug: string, used: Set<string>): string
```

Rules:

- transliterate names;
- lowercase;
- replace invalid separators with `-`;
- collapse repeated hyphens;
- trim leading and trailing hyphens;
- use fallback when the result is empty;
- ensure the final value matches the backend-compatible slug regex;
- suffix duplicates as `slug-2`, `slug-3`, etc.

### Client Validation

Function:

```ts
validateOptionEditorGroups(input: {
  productId: string;
  groups: OptionEditorGroup[];
}): ApiGenericUserError[]
```

Validation must run before calling `productOptionsSync`.

It must detect:

- missing product ID;
- empty option name;
- empty value name;
- invalid generated option slug;
- invalid generated value slug;
- invalid display type;
- duplicate option row IDs;
- duplicate option API IDs;
- duplicate value row IDs;
- duplicate value API IDs;
- duplicate option sort positions after drag;
- duplicate value sort positions after drag;
- duplicate option slugs;
- duplicate value slugs within an option;
- option without values;
- new option containing a persisted value API ID;
- invalid `COLOR` swatch;
- invalid `GRADIENT` swatch;
- invalid `IMAGE` swatch;
- non-swatch option retaining value swatches in the input draft.

Validation errors must use these server-like field paths:

- `["productId"]`
- `["options", optionIndex, "name"]`
- `["options", optionIndex, "slug"]`
- `["options", optionIndex, "index"]`
- `["options", optionIndex, "displayType"]`
- `["options", optionIndex, "values"]`
- `["options", optionIndex, "values", valueIndex, "name"]`
- `["options", optionIndex, "values", valueIndex, "slug"]`
- `["options", optionIndex, "values", valueIndex, "index"]`
- `["options", optionIndex, "values", valueIndex, "swatch"]`

Server `userErrors` remain authoritative and must still be displayed.

## Hook Plan

Create `use-sync-product-options.ts`.

Target contract:

```ts
interface SyncProductOptionsResult {
  product: ProductOptionsSyncProduct | null;
  options: ApiProductOption[];
  userErrors: ApiGenericUserError[];
}

interface UseSyncProductOptionsReturn {
  syncProductOptions: (
    input: ApiProductOptionsSyncInput,
  ) => Promise<SyncProductOptionsResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

Implementation:

- use `useMutation<ProductOptionsSyncMutationData, ProductOptionsSyncMutationVariables>(PRODUCT_OPTIONS_SYNC_MUTATION)`;
- unwrap `payload.product`, `payload.options`, and `payload.userErrors`;
- return `product: null`, `options: []`, and a normalized `UNEXPECTED_ERROR` user error for unexpected exceptions;
- expose Apollo `loading`, `error`, and `reset`;
- do not expose raw nested payload paths to components;
- do not import mocks;
- do not perform a broad cache write in the first implementation;
- document that freshness is handled by the modal payload `onSaved` callback.

The hook may optionally accept future options for `refetchQueries` or cache updates, but the first integration should keep refresh behavior explicit through `onSaved`.

## UI Integration Plan

### Product Details Read Path

`ProductDetailsCard` already passes `product.options` to `OptionsSection`. Update the surrounding UI so the API-backed edit path is reachable and not tied to mock state.

Required changes:

- update `OptionsSection` props to accept `options: ApiProductOption[]` and `actions?: ReactNode`;
- pass an `EditAction` with `testId="product-options-actions-button"` from `ProductDetailsCard`;
- keep the options section visible when `options.length === 0` and edit actions exist;
- do not hide the only edit entry point solely because `variantsCount <= 1`;
- make the product type gating explicit:
  - render the options section for all products if adding the first option is supported;
  - keep the variants table gated by actual variant data;
- remove the display component dependency on `edit-options-modal.constants.tsx`;
- keep display metadata in the section, a small display helper, or another non-modal shared file;
- keep product details options sourced from `product.options`, not mocks.

`OptionsSection` must not import modal editor group types.

Target props:

```ts
interface OptionsSectionProps {
  options: ApiProductOption[];
  actions?: ReactNode;
}
```

Display rules:

- preserve option order from the `options` array;
- preserve value order from each option `values` array;
- show option display type affordance using `displayType`;
- show value names as tags;
- show swatch previews only for `displayType === OptionDisplayType.Swatch`;
- handle `COLOR`, `GRADIENT`, and `IMAGE` swatches;
- show an empty state for no options instead of returning `null` when an edit action is available;
- keep the section visible when `options.length === 0` if `actions` exists, so users can create the first option.

### Modal Payload

Extend `IEditOptionsModalPayload`:

```ts
interface IEditOptionsModalPayload extends IModalStackPayload {
  productId: string;
  options: ApiProductOption[];
  onSaved?: () => Promise<unknown> | unknown;
}
```

Import `ApiProductOption` directly from `@/graphql/types`.

Update `useProductModals` to pass product options and the refresh callback:

```ts
const handleEditOptions = useCallback(() => {
  openEditOptionsModal({
    productId: product.id,
    options: product.options,
    onSaved: options.onProductRefresh,
  });
}, [
  product.id,
  product.options,
  options.onProductRefresh,
  openEditOptionsModal,
]);
```

Do not omit the refresh callback. Option sync can change product options and product variants, so the product details view must be refetched after a successful save.

### Edit Options Modal

Update `EditOptionsModal`:

- read typed payload from modal stack context;
- require `productId`;
- initialize groups from `payload.options` through `apiProductOptionsToOptionEditorGroups`;
- remove `MOCK_OPTION_GROUPS` import;
- remove or stop using the `initialGroups` mock default for app code;
- replace generated API type aliases in `edit-options-modal.schema.ts` with modal-local editor types or remove the schema file if it no longer owns useful runtime validation;
- keep option and value edits in modal-local state;
- keep `react-hook-form` and `dnd-kit` if they remain compatible with the editor type shape;
- create temporary IDs for new options and values;
- add a new option with a default display type and at least one empty value row;
- preserve option and value IDs according to `apiId` rules;
- preserve existing image swatches only when they have a real `file.id`;
- do not send data URLs as swatch `fileId`;
- hide or disable new image swatch upload until media upload integration provides real file IDs;
- run `validateOptionEditorGroups` before sync;
- build the sync draft with `buildProductOptionsSyncDraft`;
- call `useSyncProductOptions().syncProductOptions(draft.input)`;
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
  const validationErrors = validateOptionEditorGroups({ productId, groups });
  if (validationErrors.length > 0) {
    setUserErrors(validationErrors);
    return;
  }

  const draft = buildProductOptionsSyncDraft({ productId, groups });
  const result = await syncProductOptions(draft.input);

  if (result.userErrors.length > 0) {
    setUserErrors(result.userErrors);
    return;
  }

  await payload.onSaved?.();
  setDirty(false);
  pop();
};
```

### Drag And Ordering Constraints

Keep using `dnd-kit` only if it preserves the required structure.

Required behavior:

- options are a flat sortable list;
- values are sortable only within their own option;
- values must not move across options unless the UI explicitly implements that workflow;
- deleting an option deletes its values from modal state;
- deleting the last value should be blocked or immediately replaced with an empty value row;
- sort indexes are normalized after each drag;
- final sync payload is built from normalized groups and values, not from raw DOM order.

Even if drag guards are present, save must still run `validateOptionEditorGroups`.

## Error Handling Plan

Create `product-option-errors.mapper.ts`.

Minimum required exports:

```ts
formatProductOptionUserError(error: ApiGenericUserError): string
formatProductOptionUserErrors(errors: ApiGenericUserError[]): string[]
```

Optional field-level exports:

```ts
mapProductOptionUserErrorsToEditorErrors(input: {
  errors: ApiGenericUserError[];
  draft: ProductOptionsSyncDraft;
}): ProductOptionEditorErrorMap
```

Minimum first-pass behavior:

- render all client validation and API `userErrors` in a modal-level `Alert`;
- include every error message, not only the first one;
- keep the modal open on errors;
- do not clear dirty state on errors.

Field-level rendering can be added in the same implementation if it is cheap:

- map paths like `["options", "0", "name"]` to `draft.optionGroupsByInputIndex[0]`;
- map paths like `["options", "0", "values", "1", "name"]` through `draft.valuesByInputPath`;
- highlight affected option or value inputs.

Do not inline repeated field path parsing inside React components.

## E2E Plan

Do not replace `e2e/tests/inventory-api/options-sync.spec.ts`.

Add focused Admin UI coverage after the modal is API-backed:

```text
e2e/tests/admin-ui/product-update-options.spec.ts
```

Add stable test IDs needed by the spec:

- `product-options-section`
- `product-options-empty-state`
- `product-options-actions-button`
- `edit-options-modal`
- `edit-options-list`
- `edit-options-add-button`
- `edit-options-option-card`
- `edit-options-option-name-input`
- `edit-options-display-type-trigger`
- `edit-options-add-value-button`
- `edit-options-value-row`
- `edit-options-value-name-input`
- `edit-options-swatch-trigger`
- `submit-edit-options-form-button`
- `edit-options-error-alert`

Recommended scenarios:

- create a product with no options, open details, assert the options empty state is visible, add the first option with values, save, reload, assert it is shown;
- add a `SWATCH` option with color and gradient values, save, reload, assert swatches render;
- edit option names, display types, and value names, save, reload, assert changes persist;
- reorder options and values, save, reload, assert ordering;
- delete a value and delete an option, save, reload, assert removed items are gone;
- submit invalid rows and assert the modal shows errors without closing;
- edit an existing option and value, save, assert option and value IDs are preserved through an API read;
- change a `SWATCH` option to `DROPDOWN`, save, reload, assert swatches are removed or no longer rendered according to the chosen save behavior.

Per project instructions, e2e specs should be run one file at a time only when verification is explicitly needed. Do not run `test` or `tsc` for this planning task.

## Implementation Phases

### Phase 1: GraphQL Operation And Types

- Confirm `ProductOptionFields` has all required fields.
- Confirm `ProductOptionValueFields` selects enough swatch and file data to preserve existing swatches.
- Add `PRODUCT_OPTIONS_SYNC_MUTATION`.
- Add local operation data, payload, product, and variables types.
- Export operation documents and operation-local types from existing product GraphQL barrels.
- Do not re-export generated API types.

### Phase 2: Editor Types And Mappers

- Replace API output form aliases with modal-local `OptionEditorGroup` and `OptionEditorValue`.
- Add API-to-editor mapper.
- Add swatch output-to-input mapper.
- Add sync draft builder.
- Add slug generation helpers.
- Add client validation helpers.
- Add error formatting and optional field path mapping.

### Phase 3: Product Details Read Path

- Change `OptionsSection` to accept `actions?: ReactNode`.
- Keep `OptionsSection` API-backed with `ApiProductOption[]`.
- Move display type metadata out of modal-only constants.
- Keep the section visible with an empty state when edit actions exist.
- Render product details options from `product.options`.
- Make option section gating explicit so the first option can be created when supported.

### Phase 4: Modal API Integration

- Extend options modal payload.
- Pass product options and refresh callback through `useProductModals`.
- Replace mock initialization with API option groups.
- Implement add option and add value with temporary IDs.
- Implement display type and swatch editing against modal-local state.
- Disable or defer new image swatch upload until it can produce real API file IDs.
- Implement validation, sync draft build, and `productOptionsSync` save.
- Keep modal open on validation or API errors.
- Close only after successful sync and refresh callback completion.

### Phase 5: Refresh Strategy

- Use `onSaved` product details refetch for the first implementation.
- Ensure the refresh also updates variant data affected by option sync.
- Do not write brittle manual cache updates for the paginated product details or variants queries in this pass.
- Consider a focused Apollo cache update later only after product details and variants cache behavior is stable.

### Phase 6: Admin UI E2E Coverage

- Keep API e2e as the sync semantics contract.
- Add one focused Admin UI spec for product option editing.
- Run only that one spec when verification is explicitly requested.
- Do not broaden the test run.

## Out Of Scope

- Backend schema changes.
- Adding option or value `index` fields to the output schema.
- Removing `slug` from option contracts.
- Fixing or using `productOptionCreate`, `productOptionUpdate`, or `productOptionDelete`.
- Reworking product variant generation beyond the behavior already provided by option sync.
- Reworking the variants editor.
- Replacing attributes, reviews, bundles, analytics, or other unrelated mock-only islands.
- Reworking the options modal design beyond what is required for API-backed editing.
- New image swatch upload unless a real media upload flow is wired in the same implementation.
- Manual Apollo cache updates for product details or variant pagination.

## Acceptance Criteria

- Product details options render from `product.options`.
- `OptionsSection` accepts generated API data directly and does not import modal editor types.
- `OptionsSection` no longer imports modal-only constants for display metadata.
- Product details exposes an option edit action when the options list is empty and options editing is supported.
- `IEditOptionsModalPayload` carries `productId`, `options`, and `onSaved`.
- `EditOptionsModal` opens with the current product options from payload.
- `EditOptionsModal` no longer imports `MOCK_OPTION_GROUPS`.
- Generated API types are no longer re-exported from `edit-options-modal.schema.ts`.
- Modal form state uses local editor types, not `ApiProductOption` output objects.
- New options and values use temporary local IDs.
- Existing option and value global IDs are stored separately as `apiId`.
- Save calls `catalogMutation.productOptionsSync` with a complete snapshot.
- Existing option and value IDs are preserved on update.
- New options and values are created by omitting IDs.
- Deleted options and values are omitted from the snapshot and removed by the API.
- Option and value indexes are generated from current editor order.
- Slugs are generated, valid, non-empty, and de-duplicated.
- Non-swatch options do not send hidden swatches.
- Existing image swatches are preserved only through real API file IDs.
- Data URLs are never sent as swatch `fileId`.
- Client validation blocks invalid structure before the mutation.
- API `userErrors` are visible and prevent closing the modal.
- Failed saves do not clear dirty state.
- Successful save awaits product refresh, clears dirty state, and closes the modal.
- No generated API types are re-exported through local barrels.
- No API output view model is introduced for product options.
- Admin UI e2e coverage is added for the API-backed options workflow.
