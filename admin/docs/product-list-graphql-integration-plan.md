# Plan: Product List GraphQL Integration

## Goal

Replace the Admin products list mock data with the GraphQL `inventoryQuery.products` connection using the module architecture defined in `knowledge/vault/patterns/admin-graphql-layer.md`.

The integration must keep the products page API-backed, preserve cursor pagination behavior, provide a stable list view model, support refresh after product creation, and avoid showing mock-only product fields as if they came from the API.

## Current State

- `src/domains/inventory/products/hooks/use-products.ts` imports `mockProductsList` from `@/mocks/products/products-list` and simulates an API delay.
- `src/domains/inventory/products/page/page.tsx` imports `IProductListItem` from mocks and renders mock columns: `name`, `status`, `inventory`, `category`, `brand`, and `image`.
- The products page uses static pagination values: `total={50}`, `rangeStart={1}`, `rangeEnd={20}`, `hasNext={true}`, and `hasPrev={false}`.
- Product sorting currently logs AG Grid sort changes and does not call an API.
- Product filters are based on mock fields and options. The current root `products` GraphQL query accepts Relay pagination arguments only.
- Product row click opens the product modal without passing a product id to an API-backed details flow.
- Product picker configuration still reads from `@/mocks/products/products-list`.
- The create product plan depends on a real `PRODUCTS_QUERY` before list refresh after creation can be implemented with `refetchQueries`.

## Target API Contract

Use `inventoryQuery.products`:

```graphql
query Products($first: Int, $after: String, $last: Int, $before: String) {
  inventoryQuery {
    products(first: $first, after: $after, last: $last, before: $before) {
      edges {
        cursor
        node {
          ...ProductListItemFields
        }
      }
      pageInfo {
        ...ProductPageInfoFields
      }
      totalCount
    }
  }
}
```

Initial list fragment:

```graphql
fragment ProductListItemFields on Product {
  id
  title
  handle
  isPublished
  publishedAt
  createdAt
  updatedAt
  variantsCount
  variants(first: 1) {
    edges {
      node {
        id
        isDefault
        media {
          sortIndex
          file {
            id
            url
            mimeType
            originalName
          }
        }
      }
    }
  }
}
```

`variants(first: 1)` is a temporary thumbnail source. Product media is stored on variants, and `productCreate` attaches product media to the default variant for simple products or to every created variant for variant products. The list mapper must treat the first media item from the first returned variant as a best-effort thumbnail, not as a product-level media field.

If the backend needs deterministic thumbnails for all existing products, add a dedicated API field later, such as `Product.thumbnail`, `Product.defaultVariant`, or an ordered product media projection.

## Target Product Module Layout

Create or converge to this structure:

```text
src/domains/inventory/products/
  graphql/
    fragments.ts
    queries.ts
    mutations.ts
    operation-types.ts
    index.ts
  hooks/
    use-products.ts
    use-create-product.ts
    index.ts
  mappers/
    product-list.mapper.ts
    product-create.mapper.ts
    product-errors.mapper.ts
    index.ts
  page/
    filter-schema.ts
    page.tsx
```

Keep `src/domains/inventory/graphql` only as a compatibility export while existing imports still depend on it.

## Product List View Model

Use an explicit API-backed view model. Do not reuse `IProductListItem` from mocks.

```ts
export type ProductListStatus = "published" | "draft";

export interface ProductListItem {
  id: string;
  title: string;
  handle: string | null;
  status: ProductListStatus;
  isPublished: boolean;
  image: {
    id: string;
    url: string;
    alt: string;
    mimeType: string | null;
  } | null;
  variantsCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Field Mapping

| UI field | API source | Rule |
|---|---|---|
| `id` | `Product.id` | Keep the GraphQL global id. |
| `title` | `Product.title` | Replaces mock `name`. |
| `handle` | `Product.handle` | Use `null` when absent. |
| `status` | `Product.isPublished` | `true` maps to `published`, `false` maps to `draft`. |
| `image` | `Product.variants.edges[0].node.media[0].file` | Best-effort thumbnail only. Sort media by `sortIndex` before selecting the first item if the response order is not trusted. |
| `variantsCount` | `Product.variantsCount` | Display instead of mock inventory in the first API-backed list. |
| `publishedAt` | `Product.publishedAt` | Keep as API string; format at display boundary if rendered. |
| `createdAt` | `Product.createdAt` | Keep as API string. |
| `updatedAt` | `Product.updatedAt` | Keep as API string. |

## Fields To Remove Or Defer

The initial API-backed list must not show these mock-only columns as real API data:

- `brand` - not available on the current Admin `ApiProduct` type.
- `category` - backend schema has product categories, but current Admin generated `ApiProduct` type does not expose `categories`; do not wire this column until generated Admin types and query support are aligned.
- `inventory` - product-level inventory aggregate is not available on `Product`; it requires a variant inventory aggregate or a dedicated API field.
- `image` as a direct product field - product media is stored on variants, so the list thumbnail must be documented as a variant-media projection.

Recommended first API-backed columns:

- Product: image thumbnail and title.
- Status: published or draft.
- Variants: `variantsCount`.
- Updated: formatted `updatedAt`.

Optional columns after API support:

- Category: when `Product.categories` is available in Admin generated types and the query can fetch the needed category summary.
- Inventory: when the API exposes product-level stock summary or a cheap variant aggregate.
- Brand: when brand exists as a first-class API field or a documented product feature projection.

## Integration Phases

### 1. Add Product List GraphQL Operations

- Create `src/domains/inventory/products/graphql/fragments.ts` if it does not exist.
- Add `ProductListItemFields`.
- Add a product-local page info fragment such as `ProductPageInfoFields` to avoid depending on media-domain GraphQL files.
- Create `src/domains/inventory/products/graphql/queries.ts`.
- Add `PRODUCTS_QUERY`.
- Create or extend `src/domains/inventory/products/graphql/operation-types.ts`.
- Add `ProductsQueryResponse` and `ProductsQueryVariables` using generated types from `@/graphql/types`.
- Re-export from `src/domains/inventory/products/graphql/index.ts`.

### 2. Add Product List Mapper

- Create `src/domains/inventory/products/mappers/product-list.mapper.ts`.
- Export `ProductListItem` and `toProductListItem(product)`.
- Keep all API-to-UI field decisions in the mapper.
- Derive status from `isPublished`.
- Derive thumbnail from variant media and return `null` when no file is available.
- Do not synthesize brand, category, or inventory placeholders in the mapper.
- Export the mapper from `products/mappers/index.ts`.

### 3. Replace `useProducts`

- Replace mock loading logic with Apollo `useQuery`.
- Import `PRODUCTS_QUERY` and operation types from `products/graphql`.
- Import `toProductListItem` from `products/mappers`.
- Return the Admin GraphQL layer query shape:

```ts
interface UseProductsReturn {
  items: ProductListItem[];
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

- Support Relay pagination variables:

```ts
interface UseProductsOptions {
  first?: number;
  last?: number;
  after?: string | null;
  before?: string | null;
  skip?: boolean;
}
```

- Use `fetchPolicy: "cache-and-network"` and `previousData` to avoid grid flicker during pagination.
- Do not import from `@/mocks` in the hook.

### 4. Wire Products Page To API Data

- Replace `IProductListItem` with `ProductListItem`.
- Replace `data: products` with `items`, `totalCount`, `pageInfo`, and `loading`.
- Pass `loading` to `AgGridReact`.
- Replace static `DataLayout.count` with `totalCount`.
- Replace static `CursorPagination` values with values derived from `pageInfo`, `items.length`, and local page size state.
- Update `getRowId` to use `ProductListItem.id`.
- Update product cell rendering:
  - use `title` instead of mock `name`;
  - render `image.url` when present;
  - render a compact placeholder when `image` is `null`.
- Update status cell rendering to use `ProductListItem.status`.
- Replace mock columns with supported API columns.
- Pass the selected row id when opening product details:

```ts
onRowAction: (product) => pushProductModal({ entityId: product.id, mode: "view" })
```

The product modal can remain mock-backed in this plan, but row actions must pass the real product id so the details integration can use it later.

### 5. Cursor Pagination Behavior

- Use the same cursor behavior as the media page.
- Store `pageSize`, `after`, `before`, and current page index in page state or reuse `usePageConfig` only for pagination/grid state parts that are supported by the products API.
- On next page, call the hook with `{ first: pageSize, after: pageInfo.endCursor, before: null, last: undefined }`.
- On previous page, call the hook with `{ last: pageSize, before: pageInfo.startCursor, after: null, first: undefined }`.
- Reset cursors to the first page when page size changes.
- Display ranges with the same semantics as `CursorPagination`: empty list starts at `0`, otherwise start is based on current page and page size.

### 6. Search, Filters, And Sorting

The current root `products` query accepts only:

```graphql
first
after
last
before
```

Do not wire the existing mock filters to GraphQL in the first API-backed list. They use fields that are not supported by the current products query.

First implementation:

- Remove or hide unsupported product filters from the API-backed list page.
- Disable AG Grid server sorting for product columns unless a column has a confirmed query variable.
- Keep the `filter-schema.ts` file only if a supported product filter contract is added.

Backend/API extension needed for full list controls:

```graphql
products(
  first: Int
  after: String
  last: Int
  before: String
  where: ProductWhereInput
  orderBy: [ProductOrderByInput!]
): ProductConnection!
```

Product sort inputs already exist in the catalog schema, but the root `products` query does not currently expose `where` or `orderBy`.

### 7. Refresh After Product Create

After `PRODUCTS_QUERY` exists, product creation can refresh the API-backed list.

First behavior:

- On successful `productCreate`, close the create modal.
- Stay on the products list.
- Refresh the active products list query.
- Do not automatically open product details until the product details modal is API-backed.

Implementation options:

- Prefer `useCreateProduct` with `refetchQueries: [PRODUCTS_QUERY]` once the query is active and variables are stable enough.
- If active query variables make mutation-level refetch unreliable, pass an explicit `onCreated` callback from `ProductsPage` to `CreateProductModal` and call `refetch()` after success.
- Avoid manual Apollo cache insertion until product pagination, filtering, and sorting contracts are stable.

### 8. Product Picker Follow-Up

`src/shared/components/entity-picker-modal/configs/product-picker-config.ts` still imports product mocks.

Do not block the products page integration on the picker, but plan a follow-up to:

- reuse `useProducts` or create a picker-specific API hook;
- map `ProductListItem` to `IProductPickerEntity`;
- remove mock-only picker fields such as inventory, category, and brand unless API support exists;
- use the same cursor pagination semantics as the products page.

### 9. Verification

Per project instructions, do not run tests or `tsc` for this work.

Use these checks during implementation:

- Review generated API types in `src/graphql/types.ts`.
- Run codegen only if the GraphQL schema changes.
- Run `npm run build` when a new code version needs verification.
- Manually verify the products page against a running GraphQL endpoint.
- Manually verify create-product success refreshes the list after `PRODUCTS_QUERY` is introduced.

## Acceptance Criteria

- `PRODUCTS_QUERY` lives under `src/domains/inventory/products/graphql`.
- `useProducts` uses Apollo and no longer imports from `@/mocks`.
- Products page uses `ProductListItem`, not `IProductListItem`.
- Products page renders only fields backed by the current API contract or explicitly documented mapper projections.
- Cursor pagination uses `pageInfo` and `totalCount` from `inventoryQuery.products`.
- Product list loading and runtime errors come from the query hook.
- Product create success can refresh the active products list query.
- Row click passes the real product id to the product modal payload.
- Mock-only filters, sorting, category, brand, and inventory columns are not presented as API-backed fields.

## Main Risks

- The current root `products` query does not support search, filters, or sorting.
- Product thumbnail is a projection from variant media, not a product-level API field.
- Product inventory requires variant stock aggregation or a dedicated API field.
- Product categories exist in backend schema but are not present on the current Admin generated `ApiProduct` type.
- Product details modal is still mock-heavy, so opening details after create should remain deferred until details are API-backed.
