# Plan: Product Create GraphQL Integration

## Goal

Integrate the Admin create product modal with the GraphQL `productCreate` API using the module architecture defined in `knowledge/vault/patterns/admin-graphql-layer.md`.

The integration must create products through `inventoryMutation.productCreate`, upload/select media before submit, send enabled variant handles, handle API `userErrors`, and keep product list/detail screens ready for API-backed data.

## Current State

- A preliminary `PRODUCT_CREATE_MUTATION` exists in `src/domains/inventory/graphql/mutations.ts`.
- A preliminary `useCreateProduct` hook exists in `src/domains/inventory/products/hooks/use-create-product.ts`.
- A preliminary `prepareProductPayload` helper exists and maps modal data into `ApiProductCreateInput`.
- `CreateProductModal` currently calls `useCreateProduct`, but this is not the final integration shape defined by this plan.
- The current implementation still needs to be aligned with the Admin GraphQL layer rules: product-specific GraphQL files, operation types, mappers, normalized error mapping, and documented refresh behavior.
- Product list still uses `@/mocks/products/products-list`.
- Product details still depend on mock-heavy UI models with fields that are not present on `ApiProduct`.
- Category API is not present in the current generated Admin GraphQL types, so category assignment must stay out of product create integration until the API contract exists.

## Target API Contract

Use `ApiProductCreateInput`:

```ts
{
  title: string;
  handle: string;
  description?: ApiDescriptionInput;
  mediaFileIds?: string[];
  options?: Array<{
    name: string;
    slug: string;
    displayType?: string;
    values: Array<{ name: string; slug: string }>;
  }>;
  variants?: Array<{ handle: string }>;
}
```

The create modal sends only the fields collected by the current UI: `title`, `handle`, `description`, `media`, `hasVariants`, `options`, and generated `variants` selection. The payload mapper converts those fields into `ApiProductCreateInput`.

## UI Form To Payload Contract

This contract describes the current create product UI only. It must not include fields from product details mocks or future product editing screens.

### Form State Shape

The modal owns this form state:

```ts
interface CreateProductFormValues {
  title: string;
  handle: string;
  description: OutputData | null;
  media: ApiFile[];
  hasVariants: boolean;
  options: Array<{
    id: string;
    name: string;
    values: Array<{
      value: string;
      slug: string;
    }>;
  }>;
  variants: Array<{
    id: string;
    title: string;
    options: Array<{
      name: string;
      value: string;
      slug: string;
    }>;
    enabled: boolean;
  }>;
}
```

### Field Mapping

| UI section | UI control | Form field | Payload field | Transformation |
|---|---|---|---|---|
| General | Title input | `title` | `title` | Trim/validate in form schema if needed; send as product title. |
| General | Handle input | `handle` | `handle` | Auto-generated from title with `slugify`; manual edits are normalized through `slugify`; send as product handle. |
| General | Description editor | `description` | `description` | Convert EditorJS `OutputData` to `{ text, html, json }` using `renderContent`; send `undefined` when empty or no blocks exist. |
| Media | Entity media gallery | `media` | `mediaFileIds` | Extract `ApiFile.id` in the current gallery order; send `undefined` when empty. |
| Variants | Variants switch | `hasVariants` | none | UI-only switch; controls whether `options` and `variants` are included. |
| Variants | Option title input | `options[].name` | `options[].name` | Send only when variants are enabled and the option has a valid name and values. |
| Variants | Option title input | `options[].name` | `options[].slug` | Generate with `slugify(options[].name)` in the payload mapper. |
| Variants | Option values tags | `options[].values[].value` | `options[].values[].name` | Send tag label as API display name. |
| Variants | Option values tags | `options[].values[].slug` | `options[].values[].slug` | Generated with `slugify(value)` when the tag is created; preserve existing slug for unchanged values. |
| Variants | Generated variant row selection | `variants[].enabled` | controls `variants[]` inclusion | Include only selected/enabled generated variants. |
| Variants | Generated variant id | `variants[].id` | `variants[].handle` | Send the generated variant id as API handle; the id is built from option value slugs, for example `red-s`. |

### Payload Examples

Simple product without variants:

```ts
{
  title: "Winter Jacket",
  handle: "winter-jacket",
  description: {
    text: "Warm insulated jacket.",
    html: "<p>Warm insulated jacket.</p>",
    json: { blocks: [...] }
  },
  mediaFileIds: ["file_1", "file_2"]
}
```

Product with variants:

```ts
{
  title: "T-Shirt",
  handle: "t-shirt",
  mediaFileIds: ["file_1"],
  options: [
    {
      name: "Color",
      slug: "color",
      values: [
        { name: "Red", slug: "red" },
        { name: "Blue", slug: "blue" }
      ]
    },
    {
      name: "Size",
      slug: "size",
      values: [
        { name: "S", slug: "s" },
        { name: "M", slug: "m" }
      ]
    }
  ],
  variants: [
    { handle: "red-s" },
    { handle: "red-m" },
    { handle: "blue-s" }
  ]
}
```

### Empty And Disabled State Rules

- If `description` is `null` or contains no blocks, omit `description`.
- If `media` is empty, omit `mediaFileIds`.
- If `hasVariants` is `false`, omit both `options` and `variants`; the API is expected to create the default variant.
- If `hasVariants` is `true`, the form must contain at least one valid option and at least one enabled generated variant.
- If an option has no name or no values, validation must fail before submit.
- If a generated variant is not enabled, do not include it in `variants`.

### Product Media Semantics

Product media is stored on variants, not directly on the product. During `productCreate`, `mediaFileIds` are handled by the backend as variant media:

- If the product is created without options and variants, the backend creates a default variant and attaches all `mediaFileIds` to that default variant.
- If the product is created with variants, the backend attaches the same `mediaFileIds` list to every created variant.
- File order is persisted through `variant_media.sortIndex`, so the mapper must preserve the gallery order when sending `mediaFileIds`.
- There is no separate featured or primary media field in the current product create API. If the create UI exposes featured selection, it must be treated as ordering only: the featured file should be placed first in `mediaFileIds`.
- The current create API does not support per-variant media selection. Per-variant media requires a variant media update flow after product creation or a backend contract extension.

### Fields Explicitly Not Sent

The current create UI does not collect these values, so the create payload must not include them:

- publish status;
- SEO title, SEO description, and excerpt;
- categories and primary category;
- tags;
- brand;
- SKU;
- price, compare-at price, and cost;
- inventory quantity, warehouse stock, and stock status;
- weight and dimensions;
- per-variant media, SKU, price, stock, weight, or dimensions.

## Target Product Module Layout

Create or migrate to this structure:

```text
src/domains/inventory/products/
  graphql/
    fragments.ts
    mutations.ts
    operation-types.ts
    index.ts
  hooks/
    use-create-product.ts
    index.ts
  mappers/
    product-create.mapper.ts
    product-errors.mapper.ts
    index.ts
```

Keep `src/domains/inventory/graphql` as a compatibility export while existing imports still depend on it.

## Integration Phases

### 1. Move Product GraphQL Operations Into Product Module

- Create `src/domains/inventory/products/graphql`.
- Move product fragments needed by creation into `products/graphql/fragments.ts`.
- Move `PRODUCT_CREATE_MUTATION` into `products/graphql/mutations.ts`.
- Add `ProductCreateMutationResponse` and `ProductCreateMutationVariables` to `products/graphql/operation-types.ts`.
- Re-export product operations from `products/graphql/index.ts`.
- Re-export from the existing `inventory/graphql/index.ts` temporarily to avoid breaking old imports.

### 2. Move Payload Preparation Into Mappers

- Move `prepareProductPayload`, `prepareDescription`, `prepareMediaFileIds`, `prepareOptions`, and `prepareVariants` from modal utils into `products/mappers/product-create.mapper.ts`.
- Keep modal-local variant generation utilities in the modal folder because they are UI behavior, not API mapping.
- Export a single `toProductCreateInput(formValues)` mapper that returns `ApiProductCreateInput`.
- Preserve the current behavior: only enabled variants are sent, media sends only file IDs, and empty optional sections become `undefined`.

### 3. Normalize API Error Mapping

- Add `products/mappers/product-errors.mapper.ts`.
- Map API paths like `["input", "title"]`, `["input", "handle"]`, and `["input", "description"]` to `CreateProductFormValues` field names.
- Return unknown field errors as global modal errors.
- Remove inline field-name mapping from `CreateProductModal`.

### 4. Harden `useCreateProduct`

- Import mutation and operation types from `products/graphql`.
- Import payload mapper from `products/mappers`.
- Return a stable result shape:

```ts
{
  product: ApiProduct | null;
  userErrors: ApiGenericUserError[];
}
```

- Keep unexpected runtime errors in `error`.
- Add `reset` if the modal needs to clear runtime error state between submits.
- Define refresh behavior after successful create. First implementation can use `refetchQueries` once a real products list query exists.

### 5. Wire Modal Submit Flow

- `CreateProductModal` keeps only form submit orchestration.
- On submit:
  1. Validate form via `react-hook-form` and Zod.
  2. Call `createProduct(formValues)`.
  3. Map `userErrors` through `product-errors.mapper.ts`.
  4. Set field errors and show one global message when needed.
  5. On success, close the modal and trigger list refresh/navigation according to final UX decision.
- Disable submit while product creation is loading.
- Ensure media upload UI stores only successfully uploaded `ApiFile` objects in form state.

### 6. Prepare Product List Refresh

- Add a real `PRODUCTS_QUERY` before relying on refetch after create.
- Replace `useProducts` mock data with an API-backed hook using Relay connection fields.
- Map `ApiProduct` to a temporary `ProductListItem` view model.
- For fields not present on `ApiProduct`, use documented placeholders or remove columns:
  - `name` -> `title`
  - `status` -> `isPublished ? "published" : "draft"`
  - `inventory` -> not available on `Product`; requires variant stock query or placeholder
  - `category` -> not available until category API exists
  - `brand` -> not available
  - `image` -> not available on `Product`; media currently lives on variants/API-specific media fields

### 7. Defer Unsupported Mock Fields

Do not block product creation on fields that are absent from `ProductCreateInput`:

- categories and primary category
- tags
- price and cost
- inventory quantities
- shipping dimensions and weight, unless variant create/update APIs are added to the flow
- SEO fields, unless the create API adds them or the flow performs a follow-up `productUpdate`

If these fields must be set during creation, the backend contract needs to be extended or the Admin flow must run follow-up mutations after `productCreate`.

### 8. Verification

Per project instructions, do not run tests or `tsc` for this work.

Use these checks during implementation:

- Review generated API types in `src/graphql/types.ts`.
- Run codegen only if the schema changes.
- Run `npm run build` when a new code version needs verification.
- Manually verify the modal submit flow against a running GraphQL endpoint.

## Acceptance Criteria

- Product create GraphQL operation lives under the product module.
- Product create hook no longer depends on domain-level `inventory/graphql` directly.
- Modal form data is converted to `ApiProductCreateInput` through a module mapper.
- API `userErrors` are mapped through a reusable mapper.
- No API-backed hook imports from `@/mocks`.
- Product creation succeeds with title, handle, description, uploaded media IDs, options, and enabled variants.
- Unsupported mock fields are explicitly excluded from the create payload.
- Product list refresh behavior is defined before list UI is switched from mocks.

## Main Risks

- The current Admin GraphQL schema has no category API, so category assignment cannot be integrated yet.
- Product list columns expect fields that `ApiProduct` does not provide directly.
- Media ownership/order semantics depend on how `mediaFileIds` is interpreted by the backend.
- Price, cost, stock, weight, and dimensions belong to variant-related APIs, not the current product create input.
