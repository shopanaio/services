# Plan: Product API Integration And Raw API Contract Migration

## Goal

Finish the Admin product UI migration from mock-only contracts to the current GraphQL Admin API contract.

The product UI must consume generated GraphQL API shapes directly:

- `ApiProduct`
- `ApiVariant`
- `ApiCategory`
- `ApiTag`
- related nested API types from `@/graphql/types`

The migration must not introduce product output view models such as `ProductListItem`, `ProductDetailsView`, `toProductListItem`, `toProductDetailsView`, or mock-to-API adapters. UI-local row and form models are allowed only inside editor, picker, and modal boundaries where the UI needs editable draft state.

This plan supersedes older product list/create integration plans when they conflict with `knowledge/vault/patterns/admin-graphql-layer.md`.

## Refreshed Repository Baseline

This baseline was refreshed against the current code before updating this plan.

### Generated API Types And Current Schema

`admin/src/graphql/types.ts` is no longer in the stale state described by the previous version of this plan. The current generated Admin frontend types already include:

- `ApiCatalogQuery`
- `ApiCatalogMutation`
- `ApiProduct`
- `ApiProductConnection`
- `ApiVariant`
- `ApiVariantConnection`
- `ApiCategory`
- `ApiCategoryConnection`
- `ApiTag`
- `ApiProductSeo`
- `ApiInventoryItem`
- `ApiProductInventoryWidget`

The current product API is under the catalog namespace:

- list/details queries: `catalogQuery.product`, `catalogQuery.products`
- product mutations: `catalogMutation.productCreate`, `catalogMutation.productUpdate`, `catalogMutation.productDelete`, `catalogMutation.productUpdateStatus`

Do not use `inventoryQuery.products` or `inventoryMutation.productCreate` for product UI integration.

The current `ApiProduct` shape includes `categories`, `tags`, `features`, `seo`, `revision`, `media`, `variants`, and `variantsCount`. The current `ApiVariant` shape includes inventory data through `variant.inventoryItem`; stale flattened variant fields such as `variant.sku`, `variant.stock`, `variant.weight`, `variant.dimensions`, `variant.cost`, and `variant.inStock` must not be used.

`CatalogQuery.products` currently accepts Relay pagination arguments only:

```ts
first?: number;
after?: string;
last?: number;
before?: string;
```

Search, filters, and sorting are not available in the current generated product list query contract. Do not pretend those controls are server-backed until the API adds query arguments for them.

### Existing Product UI State

The product UI is partially migrated:

- `admin/src/mocks/products/api-builders.ts` already builds generated API-shaped mocks.
- `admin/src/mocks/products/data.ts` exports `mockSimpleProduct`, `mockVariableProduct`, `mockDraftProduct`, and `mockArchivedProduct` as `ApiProduct`.
- `admin/src/mocks/products/products-list.ts` exports `mockProductsList: ApiProduct[]` and `mockProductsConnection: ApiProductConnection`.
- `admin/src/mocks/products/categories.ts` exports `mockCategories: ApiCategory[]`.
- `admin/src/domains/inventory/products/hooks/use-products.ts` returns `ApiProduct[]`, but it still imports `mockProductsList` and simulates pagination with local page numbers.
- `admin/src/domains/inventory/products/page/page.tsx` already renders AG Grid rows as `ApiProduct`; it still relies on the mock-backed `useProducts` hook.
- `admin/src/shared/components/entity-picker-modal/configs/product-picker-config.ts` adapts `ApiProduct` to private picker rows, but it still imports `mockProductsList` directly.
- `admin/src/shared/components/entity-picker-modal/configs/category-picker-config.ts` already adapts `ApiCategory`.
- `ProductModal` resolves details through `findMockProductById`, `productDetailsMockData`, and `getMockVariantsTableData`.
- `ProductDetailsCard`, product header/content, product media, category, inventory, shipping, and variants sections mostly consume `ApiProduct`, `ApiVariant`, and `ApiCategory`.
- `EditVariantsModal` correctly accepts `ApiVariant[]` and converts them to modal-local editable rows inside the modal.
- `useCreateProduct` calls `catalogMutation.productCreate`, but product GraphQL documents still live in `admin/src/domains/inventory/graphql` instead of the module-local `products/graphql` layout.

### Remaining Mock And Legacy Islands

The following remaining mock/legacy areas are expected at this point:

- Product list hook and product picker are mock-backed.
- Product details modal is mock-backed.
- Product details supplemental data remains mock-only for reviews, analytics, bundles, pricing templates, dependency rules, attributes, and aggregate inventory widgets.
- Bulk editor uses `admin/src/mocks/products/bulk-editor.ts` and local mock contracts; it is a separate island unless explicitly included in the product API integration scope.
- `admin/src/mocks/products/types.ts` still exists for legacy and bundle mocks. Do not delete it merely because the product UI migration exists. Delete or shrink it only after all active consumers are migrated.

## Integration Rules

Follow `knowledge/vault/patterns/admin-graphql-layer.md`.

- Components must consume generated API-shaped data directly.
- Generated API types must be imported directly from `@/graphql/types`.
- Module barrels must not re-export generated API types.
- Hooks may unwrap GraphQL root payloads into stable fields such as `products`, `product`, `pageInfo`, and `userErrors`.
- Hooks must not map API output objects into product-specific output view models.
- Mappers may convert form/editor state into API inputs and API `userErrors` into form errors.
- Picker-local `IPickableEntity` rows are allowed only inside picker config boundaries.
- Variant editor rows are allowed only inside the variants editor boundary.
- Do not cast partial GraphQL query results to `ApiProduct` unless the operation selects every field that downstream components read. Either select the required fields in focused fragments or introduce operation-derived result types when operation codegen is available.

## Product Media Semantics

The current API exposes both product media and variant media:

- `Product.media: ProductMediaItem[]`
- `Variant.media: VariantMediaItem[]`

Use `product.media` as the product gallery and product thumbnail source for product list and product details media. Use `variant.media` only for variant-specific UI, such as variant rows and variant media editing.

The first product media item by `sortIndex` is the current product thumbnail display fallback. It is not a separate featured media API field. If the backend later adds explicit featured/thumbnail semantics, update `getProductThumbnailFile` and related UI helpers instead of adding a view model.

## Product Status Semantics

The UI may keep a local `ProductStatus` display union derived from API fields:

- `published` from `product.isPublished === true`
- `draft` from `product.isPublished === false`
- `archived` from `product.deletedAt != null`

This local display union must not reintroduce legacy `EntityStatus` or legacy mock product status fields. Active product lists should exclude soft-deleted products unless the screen intentionally renders deleted products.

## Target Product Module Layout

Converge the product module to:

```text
admin/src/domains/inventory/products/
  graphql/
    fragments.ts
    queries.ts
    mutations.ts
    operation-types.ts
    index.ts
  hooks/
    use-products.ts
    use-product.ts
    use-create-product.ts
    use-update-product.ts
    use-delete-product.ts
    index.ts
  mappers/
    product-create.mapper.ts
    product-errors.mapper.ts
    index.ts
  page/
  modals/
  components/
  utils/
```

`admin/src/domains/inventory/graphql` may remain as a compatibility barrel during migration, but product-specific operation documents should live under `products/graphql`.

## Target GraphQL Operations

### Shared Fragments

Create focused fragments under `products/graphql/fragments.ts`.

Minimum shared fragments:

- `UserErrorFields`
- `FileFields`
- `RichTextFields`
- `ProductMediaItemFields`
- `VariantMediaItemFields`
- `InventoryItemFields`
- `VariantFields`
- `ProductOptionFields`
- `ProductCategoryFields`
- `ProductTagFields`
- `ProductListFields`
- `ProductDetailsFields`

`ProductListFields` must include every field currently read by the product grid and picker:

- `id`
- `title`
- `handle`
- `isPublished`
- `publishedAt`
- `createdAt`
- `updatedAt`
- `deletedAt`
- `revision`
- `variantsCount`
- `media { sortIndex file { ...FileFields } }`
- `categories { id name handle isPublished productsCount media { sortIndex file { ...FileFields } } }`
- `features { id name slug values { id name slug } }`
- enough variant data to derive list stock/price if the list continues to display those columns

`ProductDetailsFields` must include every field read by `ProductDetailsCard` and its descendants:

- all product list fields
- `description`
- `excerpt`
- `seo`
- `tags`
- `options`
- `variants` with `selectedOptions`, `media`, `price`, and `inventoryItem`

If the details screen keeps variant pagination, fetch variants through either a focused product details query with variable variant pagination or a dedicated variant query. Do not pass unrelated mock `getMockVariantsTableData` into API-backed product details.

### Product List Query

Use the current catalog query namespace:

```graphql
query Products($first: Int, $after: String, $last: Int, $before: String) {
  catalogQuery {
    products(first: $first, after: $after, last: $last, before: $before) {
      edges {
        cursor
        node {
          ...ProductListFields
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
}
```

Do not add UI-only `page`, `pageSize`, `search`, `sort`, or `filters` variables to the GraphQL operation until the backend schema exposes those arguments.

### Product Details Query

Use:

```graphql
query ProductDetails($id: ID!, $variantsFirst: Int, $variantsAfter: String) {
  catalogQuery {
    product(id: $id) {
      ...ProductDetailsFields
    }
  }
}
```

If the current schema cannot parameterize nested `variants` through variables in the fragment cleanly, keep the variant connection in the query body and make the fragment cover variant node fields.

### Product Mutations

Move existing product mutation documents from `admin/src/domains/inventory/graphql` into `products/graphql/mutations.ts`:

- `PRODUCT_CREATE_MUTATION`
- `PRODUCT_UPDATE_MUTATION`
- `PRODUCT_DELETE_MUTATION`
- `PRODUCT_UPDATE_STATUS_MUTATION`
- product option and variant media mutations when used by product edit flows

Keep compatibility re-exports from `admin/src/domains/inventory/graphql` until existing imports are migrated.

## Target Hook Contracts

### Product List Hook

`useProducts` should become API-backed:

```ts
interface UseProductsOptions {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  skip?: boolean;
}

interface UseProductsReturn {
  products: ApiProduct[];
  connection: ApiProductConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}
```

The return type may use operation-derived product node types if operation codegen is introduced. It must not use a custom product output view model.

### Product Details Hook

Add `useProduct`:

```ts
interface UseProductOptions {
  id: string | null;
  variantsFirst?: number;
  variantsAfter?: string | null;
  skip?: boolean;
}

interface UseProductReturn {
  product: ApiProduct | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}
```

The hook should unwrap `data.catalogQuery.product` and not expose the raw nested operation path to components.

### Product Create Hook

Keep `CreateProductInput` as a UI form input type. Convert it to `ApiProductCreateInput` in a mapper.

`useCreateProduct` should return:

```ts
interface UseCreateProductReturn {
  createProduct: (input: CreateProductInput) => Promise<{
    product: ApiProduct | null;
    userErrors: ApiGenericUserError[];
  }>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

The hook must declare freshness behavior for product list/detail screens. Use `refetchQueries` for the first API-backed integration unless cache shape is already stable.

## Detailed Migration Phases

### Phase 0: Baseline Verification And Plan Alignment

1. Treat the current generated `admin/src/graphql/types.ts` as the source of truth unless a schema drift is found.
2. Verify that generated types include `ApiCatalogQuery`, `ApiProduct`, `ApiProductConnection`, `ApiVariant`, `ApiCategory`, `ApiTag`, `ApiProductSeo`, and `ApiInventoryItem`.
3. Verify that `ApiProduct` includes `media`, `categories`, `tags`, `features`, `seo`, `revision`, and `variantsCount`.
4. Verify that `ApiVariant` exposes inventory through `inventoryItem`.
5. Do not regenerate `admin/src/graphql/types.ts` unless this verification fails or the supergraph has intentionally changed.
6. If codegen is required, run it through the approved project workflow. Do not hand-edit generated files.

Exit criteria:

- The plan is aligned with the current generated schema.
- Product operations are confirmed to use `catalogQuery` and `catalogMutation`.
- Product media is confirmed to come from `Product.media` for product-level gallery/thumbnail display.

### Phase 1: Create Product-Local GraphQL Module

Files:

- create `admin/src/domains/inventory/products/graphql/fragments.ts`
- create `admin/src/domains/inventory/products/graphql/queries.ts`
- create `admin/src/domains/inventory/products/graphql/mutations.ts`
- create `admin/src/domains/inventory/products/graphql/operation-types.ts`
- create `admin/src/domains/inventory/products/graphql/index.ts`
- update `admin/src/domains/inventory/graphql/*` as compatibility exports only

Steps:

1. Move or duplicate product fragments from `admin/src/domains/inventory/graphql/fragments.ts` into the product module.
2. Add `PRODUCTS_QUERY`.
3. Add `PRODUCT_DETAILS_QUERY`.
4. Move product mutations into product module files.
5. Keep non-product media fragments only if product mutations need them.
6. Build operation response/variable types from generated schema types without re-exporting generated types.
7. Update product hooks to import product operations from `products/graphql`.

Exit criteria:

- New product GraphQL documents live under `products/graphql`.
- `admin/src/domains/inventory/graphql` no longer owns product-specific operation definitions except compatibility re-exports.
- No product operation references `inventoryQuery.products` or `inventoryMutation.productCreate`.

### Phase 2: Replace Mock-Backed Product List

Files:

- `admin/src/domains/inventory/products/hooks/use-products.ts`
- `admin/src/domains/inventory/products/page/page.tsx`
- `admin/src/shared/components/entity-picker-modal/configs/product-picker-config.ts`

Steps:

1. Replace the simulated delay and `mockProductsList` slicing in `useProducts` with Apollo `useQuery(PRODUCTS_QUERY)`.
2. Change hook options from page/pageSize to Relay cursor variables.
3. Return `products` from `connection.edges[].node`.
4. Return `totalCount`, `pageInfo`, `loading`, `error`, and `refetch`.
5. Update `ProductsPage` pagination state to store cursors and range metadata instead of page numbers.
6. Keep AG Grid rows as `ApiProduct`.
7. Keep product thumbnail from `getProductThumbnailFile(product)`, which reads `Product.media`.
8. Keep category and brand columns only if the list query selects the required `categories` and `features` fields.
9. Treat search, filters, and sort as disabled, client-only, or explicitly TODO until the backend exposes query args.
10. Replace the product picker direct `mockProductsList` import with the same API-backed hook or a picker-specific API-backed hook.
11. Keep picker-local `IPickableEntity` rows private to the picker config.
12. Stop generating fake bulk editor IDs from selected API products. Either pass selected `product.id` values through to a future API-backed bulk editor or explicitly keep bulk editor out of this phase.

Exit criteria:

- Product list page does not import `@/mocks/products`.
- Product picker config does not import `@/mocks/products`.
- Product list and picker are API-backed or use an explicitly isolated non-production mock boundary.
- Product list rows remain generated API-shaped product data, not a custom product row model.

### Phase 3: Replace Mock-Backed Product Details

Files:

- `admin/src/domains/inventory/products/hooks/use-product.ts`
- `admin/src/domains/inventory/products/modals/product-modal/product-modal.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/product-details-card.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/types.ts`
- `admin/src/mocks/products/product-details.ts`

Steps:

1. Add `useProduct` backed by `PRODUCT_DETAILS_QUERY`.
2. Update `ProductModal` to fetch the product by `payload.entityId`.
3. Remove `findMockProductById` from `ProductModal`.
4. Replace `getMockVariantsTableData` with variants from the product details query or a dedicated variant query.
5. Keep `productDetailsMockData` only as supplemental data for data not yet exposed by `ApiProduct`.
6. Ensure `ProductDetailsCard` and all descendants read only fields selected by `ProductDetailsFields`.
7. Preserve existing `ProductDetailsCard` root contract as `product: ApiProduct` while the query selects the full data read by descendants.

Exit criteria:

- Details modal opens from a real product id.
- Product details root no longer receives a mock product.
- Supplemental mock data contains only non-product API data.
- No product details component reads fields missing from the product details query.

### Phase 4: Harden Product Create Integration

Files:

- `admin/src/domains/inventory/products/hooks/use-create-product.ts`
- `admin/src/domains/inventory/products/mappers/product-create.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-errors.mapper.ts`
- `admin/src/domains/inventory/products/modals/create-product-modal/*`
- compatibility import sites for `prepareProductPayload`

Steps:

1. Move `prepareProductPayload` out of modal utilities into `products/mappers/product-create.mapper.ts`.
2. Keep form-only types such as `CreateProductInput` or `CreateProductFormValues` because they are not API output objects.
3. Keep current mapping for `title`, `handle`, `description`, `mediaFileIds`, `options`, and enabled `variants`.
4. Do not send fields the current create UI does not collect, such as status, categories, tags, pricing, or inventory.
5. Keep `mediaFileIds` as product media input; the current API exposes product media through `Product.media`.
6. Add a `product-errors.mapper.ts` for mapping `ApiGenericUserError` to form fields.
7. Add `reset` to `useCreateProduct`.
8. Add explicit list freshness behavior, initially through `refetchQueries` for `PRODUCTS_QUERY` or a caller-provided callback.

Exit criteria:

- Product create hook imports operations from `products/graphql`.
- Form-to-API mapping lives in `products/mappers`.
- API user errors are returned to the modal and can be displayed at the form boundary.
- Product list freshness after create is documented and implemented.

### Phase 5: Convert Product Edit Flows To API Mutations

Files:

- `admin/src/domains/inventory/products/components/product-details-card/hooks/use-product-modals.ts`
- edit title, description, media, SEO, options, categories, tags, and variants modals
- product hooks and mutation documents added in Phase 1

Steps:

1. Add focused mutation hooks for product title/handle, content, media, SEO, status, category/tag assignment, and variant updates as API contracts permit.
2. Replace `console.log` save handlers with mutation calls.
3. Use `catalogMutation.productUpdate` for product fields supported by `ApiProductUpdateInput`.
4. Use product media update input `media.fileIds` for product media ordering.
5. Use existing product option and variant media mutations only where the current schema supports the edit flow.
6. Use `inventoryMutation.inventoryItemUpdate` for inventory fields owned by inventory service when editing variant inventory data.
7. Keep modal-local row state inside modals; do not lift editable row view models into product details components.
8. Normalize `userErrors` in hooks or mappers.

Exit criteria:

- Edit flows no longer rely on `console.log` as their save implementation.
- Product update flows use generated API inputs.
- Product details refresh or cache updates are handled by hooks.
- Editable row models stay inside modal/editor boundaries.

### Phase 6: Category, Tag, And Picker Cleanup

Files:

- `admin/src/mocks/products/categories.ts`
- `admin/src/shared/components/entity-picker-modal/configs/category-picker-config.ts`
- `admin/src/shared/components/entity-picker-modal/configs/product-picker-config.ts`
- category and tag edit modals

Steps:

1. Keep `mockCategories: ApiCategory[]` only as temporary picker mock data until category picker is API-backed.
2. Use generated category fields: `name`, `handle`, `isPublished`, `media`, `productsCount`, `parent`, `children`, and `ancestors`.
3. Do not create aliases such as `type ApiCategory = ICategory`.
4. Keep picker-local normalized rows private to picker configs.
5. Consume `product.categories` and `product.tags` directly in product UI.
6. Keep explicit primary category as a UI convention based on `product.categories[0]` until the API exposes first-class primary category semantics.

Exit criteria:

- Product category and tag UI consume generated API types.
- Shared product/category picker configs do not export product/category-specific view models.
- Any remaining category mock data is API-shaped.

### Phase 7: Bulk Editor Boundary Decision

Files:

- `admin/src/domains/inventory/products/page/page.tsx`
- `admin/src/domains/inventory/products/modals/bulk-editor-modal/*`
- `admin/src/mocks/products/bulk-editor.ts`

Steps:

1. Decide whether the product API integration includes bulk editor.
2. If it is included, migrate bulk editor inputs from `IMockProduct` to generated API-shaped products/variants and API-backed update workflows.
3. If it is excluded, isolate it clearly as a demo/mock flow and stop mapping selected `ApiProduct` rows to fake `prod-*` ids in the product page.
4. Keep bulk editor local row models private to the bulk editor boundary.

Exit criteria:

- Product page does not silently translate real selected product ids into unrelated mock ids.
- Bulk editor is either API-backed or explicitly outside the acceptance criteria for product API integration.

### Phase 8: Remove Obsolete Product Mock Contracts From Migrated Surfaces

Files:

- `admin/src/mocks/products/types.ts`
- `admin/src/mocks/products/index.ts`
- remaining imports under migrated product UI and shared picker files

Steps:

1. Remove legacy product mock imports only from migrated product UI surfaces.
2. Do not delete `admin/src/mocks/products/types.ts` while unrelated bundle or legacy mocks still import it.
3. Remove `IProductListItem` if it is no longer used anywhere.
4. Keep generated API-shaped mock builders if they remain useful for Storybook, local fixtures, or non-API development.

Exit criteria:

- API-backed product hooks/pages/modals do not import product mocks.
- Legacy mock types are absent from migrated product UI files.
- Remaining legacy mock types are clearly outside the migrated product API surface.

## File Impact Summary

### New Or Converged Product API Files

- `admin/src/domains/inventory/products/graphql/fragments.ts`
- `admin/src/domains/inventory/products/graphql/queries.ts`
- `admin/src/domains/inventory/products/graphql/mutations.ts`
- `admin/src/domains/inventory/products/graphql/operation-types.ts`
- `admin/src/domains/inventory/products/graphql/index.ts`
- `admin/src/domains/inventory/products/hooks/use-product.ts`
- `admin/src/domains/inventory/products/hooks/use-update-product.ts`
- `admin/src/domains/inventory/products/hooks/use-delete-product.ts`
- `admin/src/domains/inventory/products/mappers/product-create.mapper.ts`
- `admin/src/domains/inventory/products/mappers/product-errors.mapper.ts`

### Must Change For API-Backed List And Details

- `admin/src/domains/inventory/products/hooks/use-products.ts`
- `admin/src/domains/inventory/products/hooks/use-create-product.ts`
- `admin/src/domains/inventory/products/page/page.tsx`
- `admin/src/shared/components/entity-picker-modal/configs/product-picker-config.ts`
- `admin/src/domains/inventory/products/modals/product-modal/product-modal.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/product-details-card.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/types.ts`
- `admin/src/domains/inventory/graphql/fragments.ts`
- `admin/src/domains/inventory/graphql/mutations.ts`
- `admin/src/domains/inventory/graphql/index.ts`

### Already Mostly Aligned

- `admin/src/mocks/products/api-builders.ts`
- `admin/src/mocks/products/data.ts`
- `admin/src/mocks/products/products-list.ts`
- `admin/src/mocks/products/categories.ts`
- `admin/src/domains/inventory/products/utils/api-product-display.ts`
- `admin/src/domains/inventory/products/utils/product-status.ts`
- `admin/src/domains/inventory/products/utils/product-measurements.ts`
- `admin/src/domains/inventory/products/components/product-info-header/*`
- `admin/src/domains/inventory/products/components/product-content-tabs/*`
- `admin/src/domains/inventory/products/components/product-details-card/sections/*`
- `admin/src/domains/inventory/products/components/variants/edit-variants-modal.tsx`

These files may still need small query-field alignment or save-flow updates, but they no longer need a full legacy contract migration.

### Should Not Change In This Migration

- changeset files
- unrelated backend service files
- generated `admin/src/graphql/types.ts` except through approved codegen
- unrelated bundle mock contracts unless Phase 7 explicitly includes bulk editor or bundle surfaces

## Verification Plan

Project instructions say not to run tests or `tsc` for verification.

Allowed verification:

1. Run build when code changes are implemented and a new code version needs validation.
2. Use targeted static searches.
3. Inspect product screens manually after build if a dev server is already running or started through the approved project workflow.

Recommended static checks:

```text
rg "inventoryQuery[^{]*\\{|inventoryMutation[^{]*\\{" admin/src/domains/inventory/products admin/src/domains/inventory/graphql
rg "mockProductsList|findMockProductById|getMockVariantsTableData" admin/src/domains/inventory/products admin/src/shared/components/entity-picker-modal/configs/product-picker-config.ts
rg "@/mocks/products" admin/src/domains/inventory/products/hooks admin/src/domains/inventory/products/page admin/src/domains/inventory/products/modals/product-modal admin/src/shared/components/entity-picker-modal/configs/product-picker-config.ts
rg "ProductListItem|IProductListItem|toProductListItem|toProductDetailsView|mapMockProductToApi|mapApiProductToMockProduct" admin/src/domains/inventory/products admin/src/shared/components/entity-picker-modal admin/src/mocks/products
rg "from [\"']@/mocks/products/types[\"']|from [\"']\\.\\/types[\"']|from [\"']\\.\\.\\/types[\"']" admin/src/domains/inventory/products admin/src/shared/components/entity-picker-modal
rg "variant\\.(sku|stock|weight|dimensions|cost|inStock)" admin/src/domains/inventory/products admin/src/mocks/products --glob '!admin/src/domains/inventory/products/modals/bulk-editor-modal/**'
rg "type ApiCategory = ICategory|type ApiInventoryItem =|interface ApiCategory|interface ApiInventoryItem" admin/src
rg "\\.toLocaleDateString|\\.toLocaleTimeString" admin/src/domains/inventory/products
```

Notes:

- Do not use broad `rg "IProduct"` checks because local interface names such as `IProductInfoHeaderProps` are not legacy mock contracts.
- Do not flag `WeightUnit` or `DimensionUnit` usage by itself. The current generated inventory weight/dimension types include `displayUnit`, so these enums are valid when used with generated API fields.
- Numeric `.toLocaleString()` is acceptable for display formatting. The unsafe pattern is calling date methods directly on API date scalar strings.

## Acceptance Criteria

- Product list is backed by `catalogQuery.products`.
- Product details modal is backed by `catalogQuery.product`.
- Product create uses `catalogMutation.productCreate` through module-local product GraphQL documents.
- Product update/edit flows use generated API inputs and expose `userErrors`.
- Product list, picker, and details consume generated API-shaped data directly.
- Product media display uses `Product.media`.
- Variant UI uses `ApiVariant` and reads inventory through `variant.inventoryItem`.
- Category and tag UI use generated `ApiCategory` and `ApiTag`.
- No product output view model is introduced for API-backed screens.
- API-backed product hooks/pages/modals do not import product mocks.
- Legacy product mock types remain only in explicitly excluded legacy/mock islands.
- Build passes when run according to project rules.

## Open Decisions

1. Should product search/filter/sort be added to `CatalogQuery.products`, or should the first API-backed list ship with pagination only?
2. Should product details fetch all variants up front or use a dedicated paginated variant query for the variants table?
3. Should the product picker share `useProducts` or use a smaller picker-specific `ProductsPicker` query?
4. Is bulk editor part of this product API integration scope, or should it remain a separate mock/demo workflow for now?
5. Does the API need first-class primary category semantics, or is `product.categories[0]` acceptable as a temporary UI convention?
