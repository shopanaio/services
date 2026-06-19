# Plan: Product Raw API Contracts And Mock Data Migration

## Goal

Move the Admin product UI away from legacy mock-only product contracts and make product screens consume raw generated API types directly:

- `ApiProduct`
- `ApiVariant`
- `ApiCategory` after the required Admin frontend codegen synchronization with the current supergraph

The product mock data must be reshaped to match the API response shape so UI components can be developed against the same object structure returned by GraphQL. The migration must not introduce product output mappers such as `toProductListItem`, `toProductDetailsView`, or mock-to-API adapters.

## Required Outcome

- Product list mock data is `ApiProduct[]` or `ApiProductConnection`.
- Product details mock data passes `ApiProduct` into the details UI.
- Variant props use `ApiVariant` and API nested fields directly.
- Category props use generated `ApiCategory` directly after Phase 0 regenerates Admin frontend GraphQL types from the current supergraph.
- By the final migration state, product UI no longer imports legacy contracts from `@/mocks/products/types`, including category contracts.
- Legacy mock fields such as `slug`, `status`, `price`, `gallery`, `weightUnit`, `dimensionUnit`, `isVariableProduct`, and `options[].title` are removed from product component contracts.
- UI formatting can use small display helpers, but these helpers must not produce separate view models.

## Repository Context

Root instructions require all project artifacts to be written in English. This plan follows that requirement.

The knowledge base document `knowledge/vault/patterns/admin-graphql-layer.md` requires Admin UI components to consume generated GraphQL API types directly for API-backed data. This migration follows that pattern by making product mocks and component contracts consume raw API-shaped objects without output mapping.

This plan covers product display/list/detail mocks, product category contracts used by product UI, and product prop contracts. Product create form input can still have a form-to-API-input preparation helper because form state is not an API response object.

## Current State

### Generated API Types And Schema Sync

The current checked-in `admin/src/graphql/types.ts` is stale relative to `infra/federation/supergraph-admin.graphql`.

Currently visible in `admin/src/graphql/types.ts`:

- `ApiProduct`
- `ApiProductConnection`
- `ApiProductEdge`
- `ApiProductOption`
- `ApiProductOptionValue`
- `ApiVariant`
- `ApiVariantConnection`
- `ApiVariantEdge`
- `ApiVariantMediaItem`
- `ApiVariantPrice`
- `ApiVariantCost`
- `ApiVariantWeight`
- `ApiVariantDimensions`
- `ApiPageInfo`
- generated `WeightUnit`
- generated `DimensionUnit`

These currently visible flattened variant inventory types and fields are stale frontend generated output, not the target contract after Phase 0.

Missing from the current checked-in Admin frontend generated types:

- `ApiCategory`
- `ApiCatalogQuery`
- `ApiTag`
- current supergraph product fields such as `categories`, `tags`, `seo`, and `revision`

These are not missing backend API contracts. The current `infra/federation/supergraph-admin.graphql` already exposes:

- `Query.catalogQuery`
- `CatalogQuery.product`
- `CatalogQuery.products`
- `CatalogQuery.category`
- `CatalogQuery.categories`
- `Product.categories`
- `Product.tags`
- `Category`
- `Tag`

Phase 0 must regenerate `admin/src/graphql/types.ts` from the current supergraph before product mock builders and component contracts are updated. All downstream phases must use the regenerated `ApiProduct`, `ApiVariant`, `ApiCategory`, and related types as the source of truth. Do not build new mocks against the stale checked-in generated type shape.

Phase 0 is a hard migration gate, not a preparatory nice-to-have. No product mock, category mock, component prop, modal payload, or picker contract in later phases should be migrated against the currently checked-in stale generated shape. If the regenerated type names differ from the names used in examples below, update the examples and implementation to the exact regenerated names before Phase 1 starts.

### Product List

Current files:

- `admin/src/domains/inventory/products/hooks/use-products.ts`
- `admin/src/domains/inventory/products/page/page.tsx`
- `admin/src/mocks/products/products-list.ts`
- `admin/src/shared/components/entity-picker-modal/configs/product-picker-config.ts`

Current behavior:

- `useProducts` imports `mockProductsList`.
- `mockProductsList` uses `IProductListItem`.
- `product-picker-config.ts` imports `mockProductsList` and `IProductListItem` from `@/mocks/products/products-list`.
- The page renders mock-only fields:
  - `name`
  - `status`
  - `inventory`
  - `category`
  - `brand`
  - `image`
- Pagination values are static.
- Row actions do not pass a real product API id into the product details flow.

### Product Details

Current files:

- `admin/src/domains/inventory/products/modals/product-modal/product-modal.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/product-details-card.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/types.ts`
- `admin/src/mocks/products/data.ts`
- `admin/src/mocks/products/product-details.ts`

Current behavior:

- `ProductModal` selects `mockSimpleProduct` or `mockVariableProduct`.
- `mockSimpleProduct` and `mockVariableProduct` are legacy `IProduct`.
- `ProductDetailsCard` receives `product: IProduct`.
- Supplemental details are passed through `IProductDetailsMockData`.
- `getMockVariantsTableData` already returns API-shaped `ApiVariant[]`.

### Product UI Legacy Contract Usage

The product UI still imports or depends on legacy mock contracts in these areas:

- `ProductInfoHeader`
- `ProductContentTabs`
- `ProductDetailsCard`
- `useProductModals`
- `InventorySection`
- `CategoriesSection`
- `EditCategoriesModal`
- `ProductsPage`
- `useProducts`
- `admin/src/domains/inventory/products/constants.ts`
- product modal payload types in `admin/src/domains/inventory/products/modals.ts`

## Data Not Available Or Derivable From Current API

These values cannot be read or reliably computed after Phase 0 from the regenerated Admin `ApiProduct`, `ApiVariant`, and `ApiCategory` contracts. They must either stay in supplemental mock data, be removed from the raw API-backed UI, or wait for an API/schema addition.

### Product Taxonomy And Classification

- Explicit primary product category.
- Brand as a first-class field or relation.

Product categories, category hierarchy, product tags, and the product-to-tags relation are API-backed in the current supergraph and should be consumed from regenerated Admin frontend types after Phase 0. Do not keep them in supplemental mock data once `ApiCategory` and `ApiTag` are generated.

### Merchandising Relations

- Product groups.
- Bundles/components that include the product.
- Bundle groups.
- Bundle dependency rules.
- Product container/container id relations from the legacy mock model.

### Reviews And Analytics

- Review rating.
- Review count.
- Review breakdown by star value.
- Views.
- Orders.
- Conversion.
- Revenue trends.
- KPI period comparison values.

### Product-Level Inventory Aggregates

- Available for sale.
- On hand total.
- Reserved total.
- Unavailable total.
- Available quantity change over time.
- Low stock SKU count.
- Out of stock SKU count.
- Backorder SKU count.
- Average days in low stock/out of stock/backorder states.
- Inventory alert threshold settings.
- Product-level stock status such as `LOW_STOCK`; variant inventory quantities such as `inventoryItem.totalAvailable` or `inventoryItem.stock` are not enough to derive threshold-based states without threshold settings.

### Shipping And Fulfillment

- `requiresShipping`.
- Any explicit product-level shipping requirement flag.
- Product-level dimensions or weight. The current API exposes physical data at variant level only.

### Media Semantics

- Explicit product-level featured media.
- Explicit product gallery.
- A deterministic product thumbnail field.

The UI may choose first/default variant media by `sortIndex` as a display fallback, but that is not the same as an API-backed featured media value.

### Product Lifecycle State

- Full legacy status enum semantics such as `ARCHIVED`.

The current API exposes `isPublished`, `publishedAt`, and `deletedAt`. It does not expose a full product lifecycle enum matching the legacy mock `EntityStatus`.

## Target API Contracts

### Product List Contract

The list hook should expose raw connection data or raw nodes:

```ts
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

Accepted alternative for an initial mock-only step:

```ts
interface UseProductsReturn {
  products: ApiProduct[];
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

Do not expose `ProductListItem`, `IProductListItem`, or any mapped UI row type.

### Product Details Contract

```ts
interface ProductDetailsCardProps {
  product: ApiProduct;
  supplementalData: ProductDetailsSupplementalData;
  variantsTableData?: {
    variants: ApiVariant[];
    pageInfo: ApiPageInfo;
    totalCount: number;
  };
  onEditSection?: (section: string) => void;
  onVariantsPageChange?: (direction: "next" | "prev") => void;
}
```

`ProductDetailsSupplementalData` is allowed only for data that is not part of `ApiProduct` yet:

- reviews
- bundle references
- pricing templates
- dependency rules
- inventory widget aggregate
- attributes if the API does not expose the exact data
- explicit primary category only if the API does not expose this semantic separately from `product.categories`

### Product Modal Payload Contract

```ts
interface IProductModalPayload extends IModalStackPayload {
  entityId: string;
  mode?: "view" | "edit";
}
```

Do not pass legacy product objects through modal payloads. The modal should resolve or select an `ApiProduct` by id from mock API-shaped data or a future GraphQL hook.

### AI Writer Payload Contract

The AI writer modal should receive the full raw `ApiProduct`, not legacy `IProduct`. It may also receive supplemental attribute labels only for data that is not available from the generated API fields.

```ts
interface IProductAIWriterModalPayload extends IModalStackPayload {
  product: ApiProduct;
  supplementalAttributes?: IAttributeRow[];
  onApply?: (values: {
    description?: RenderedContent;
    excerpt?: RenderedContent;
  }) => void;
}
```

AI context reading rules:

- `productId`: `product.id`
- `title`: `product.title`
- `handle`: `product.handle ?? null`
- `categoryNames`: `product.categories.map((category) => category.name)` after Phase 0
- `attributeLabels`: from `product.features` when the API exposes the needed labels, otherwise from `supplementalAttributes`
- `price`: from the default/first variant `price.amountMinor` and `price.currency`, not `product.price`

Do not read or pass legacy AI writer fields such as `product.primaryCategory`, `product.categories[].title`, `product.attributes`, or `product.price`.

### Product Info Header Props

```ts
interface ProductInfoHeaderProps {
  product: ApiProduct;
  kpiData?: IKPIData;
}
```

Header rendering rules:

- title: `product.title`
- handle/storefront path: `product.handle`
- id chip: `product.id`
- published state: `product.isPublished`
- publish/update date: `product.publishedAt` or `product.updatedAt`
- sku: from default/first variant, not `product.sku`
- revenue fallback: from default/first variant `price.amountMinor`, not `product.price`

### Product Content Props

```ts
interface ProductContentTabsProps {
  product: ApiProduct;
}
```

Rendering rules:

- description HTML: `product.description?.html`
- description JSON: `product.description?.json`
- excerpt: `product.excerpt`
- no legacy `slug` field

### Product Media Props

Preferred raw contract:

```ts
interface MediaSectionProps {
  product: ApiProduct;
  onEdit: () => void;
}
```

Rendering rules:

- Find the default variant from `product.variants.edges`.
- If no default variant exists, use the first variant edge.
- Use `variant.media`.
- Sort media by `sortIndex`.
- Render `media.file` directly.

Do not pass `product.gallery`.

### Product Options Props

```ts
interface OptionsSectionProps {
  options: ApiProductOption[];
  onEdit?: () => void;
}
```

This section already mostly follows raw API types. Keep it that way.

### Variants Table Props

```ts
interface VariantsTableSectionProps {
  variants: ApiVariant[];
  productOptions: ApiProductOption[];
  pageInfo: ApiPageInfo;
  totalCount: number;
  formatPrice: (amountMinor: number) => string;
  onEdit?: () => void;
  onPageChange?: (direction: "next" | "prev") => void;
}
```

Rendering rules:

- title: `variant.title ?? variant.handle`
- sku: `variant.inventoryItem?.sku`
- price: `variant.price?.amountMinor`
- compare-at price: `variant.price?.compareAtMinor`
- cost: `variant.inventoryItem?.unitCost?.amountMinor`
- stock status: from `variant.inventoryItem?.stock` or `variant.inventoryItem?.totalAvailable`, not legacy product-level inventory fields
- weight: `variant.inventoryItem?.weight?.weightGrams` in grams
- dimensions: `variant.inventoryItem?.dimensions` in millimeters (`lengthMm`, `widthMm`, `heightMm`)
- media: `variant.media[].file`
- options: resolve `variant.selectedOptions` ids through `productOptions` for display labels

Do not pass legacy `IProductVariant`.
Do not read stale flattened inventory fields from `ApiVariant`, including `variant.sku`, `variant.stock`, `variant.weight`, `variant.dimensions`, `variant.cost`, or `variant.inStock`.
Do not render raw selected option ids such as `optionId:optionValueId`; `SelectedOption` contains ids only, not display names.

### Inventory Props

Preferred raw contract:

```ts
interface InventorySectionProps {
  product: ApiProduct;
  stats: ProductInventoryWidget;
  onEdit?: () => void;
}
```

Rendering rules:

- Use `product.variants.edges[].node.inventoryItem?.stock` and `product.variants.edges[].node.inventoryItem?.totalAvailable` for variant-level stock data after Phase 0.
- Use `ProductInventoryWidget` only for aggregate mock metrics not available on `ApiProduct`.
- Edit variants modal should receive data derived from `ApiVariant` directly or be changed to accept `ApiVariant[]`.

### Shipping Props

Preferred raw contract:

```ts
interface ShippingSectionProps {
  variant: ApiVariant | null;
  onEdit: () => void;
}
```

Rendering rules:

- weight: `variant.inventoryItem?.weight?.weightGrams`, displayed as grams
- dimensions: `variant.inventoryItem?.dimensions.lengthMm`, `variant.inventoryItem?.dimensions.widthMm`, `variant.inventoryItem?.dimensions.heightMm`, displayed as millimeters
- remove `weightUnit`, `dimensionUnit`, `requiresShipping` from product-level props unless the API adds those fields

### Category Props

Target contract after Phase 0 regenerates Admin frontend types:

```ts
interface CategoriesSectionProps {
  primaryCategory?: ApiCategory | null;
  categories?: ApiCategory[];
}
```

Phase 0 must make generated `ApiCategory` available from `@/graphql/types`.

- Do not create `type ApiCategory = ICategory`.
- Keep `ICategory` only as a temporary category-specific dependency until the category UI files are migrated.
- Category UI must read generated category fields such as `name`, `handle`, `isPublished`, `parent`, `children`, `ancestors`, `media`, and `productsCount`; do not keep legacy `title`, `slug`, or `status` contracts.

## Mock Data Shape

### Product Mock Factory

Replace legacy product factories with API-shaped factories:

```ts
const createMockApiProduct = (params: {
  id: string;
  title: string;
  handle?: string | null;
  isPublished: boolean;
  description?: ApiDescription | null;
  excerpt?: string | null;
  seo?: ApiProductSeo | null;
  variants: ApiVariant[];
  options: ApiProductOption[];
  categories?: ApiCategory[];
  tags?: ApiTag[];
  features?: ApiProductFeature[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  deletedAt?: string | null;
  revision?: number;
}): ApiProduct => ({
  __typename: "Product",
  id: params.id,
  title: params.title,
  handle: params.handle ?? null,
  isPublished: params.isPublished,
  publishedAt: params.publishedAt ?? null,
  description: params.description ?? null,
  excerpt: params.excerpt ?? null,
  seo: params.seo ?? null,
  createdAt: params.createdAt ?? new Date().toISOString(),
  updatedAt: params.updatedAt ?? new Date().toISOString(),
  deletedAt: params.deletedAt ?? null,
  revision: params.revision ?? 1,
  features: params.features ?? [],
  categories: params.categories ?? [],
  tags: params.tags ?? [],
  options: params.options,
  variants: createMockApiVariantConnection(params.variants),
  variantsCount: params.variants.length,
});
```

### Variant Mock Factory

Inventory-specific mock data must be built as `ApiInventoryItem` and attached through `variant.inventoryItem`. Do not put SKU, stock, weight, dimensions, or cost directly on the variant mock.

The concrete inventory type names in this section are illustrative until Phase 0 completes. After codegen, use the exact regenerated names for inventory item, stock, weight, dimensions, and cost types from `@/graphql/types`; do not create aliases such as `type ApiInventoryItem = ...` to preserve these examples.

```ts
const createMockApiInventoryItem = (params: {
  id: string;
  variantId: string;
  sku?: string | null;
  stock?: ApiWarehouseStock[];
  totalAvailable?: number;
  weight?: ApiInventoryItemWeight | null;
  dimensions?: ApiInventoryItemDimensions | null;
  unitCost?: ApiInventoryItemCost | null;
  trackInventory?: boolean;
  continueSellingWhenOutOfStock?: boolean;
}): ApiInventoryItem => ({
  __typename: "InventoryItem",
  id: params.id,
  variantId: params.variantId,
  sku: params.sku ?? null,
  stock: params.stock ?? [],
  totalAvailable: params.totalAvailable ?? 0,
  weight: params.weight ?? null,
  dimensions: params.dimensions ?? null,
  unitCost: params.unitCost ?? null,
  trackInventory: params.trackInventory ?? true,
  continueSellingWhenOutOfStock:
    params.continueSellingWhenOutOfStock ?? false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

```ts
const createMockApiVariant = (params: {
  id: string;
  handle: string;
  title?: string | null;
  isDefault?: boolean;
  price?: ApiVariantPrice | null;
  inventoryItem?: ApiInventoryItem | null;
  media?: ApiVariantMediaItem[];
  selectedOptions?: ApiSelectedOption[];
  product?: ApiProduct;
}): ApiVariant => ({
  __typename: "Variant",
  id: params.id,
  handle: params.handle,
  title: params.title ?? null,
  isDefault: params.isDefault ?? false,
  price: params.price ?? null,
  inventoryItem: params.inventoryItem ?? null,
  media: params.media ?? [],
  selectedOptions: params.selectedOptions ?? [],
  product: params.product ?? ({} as ApiProduct),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
  externalId: null,
  externalSystem: null,
  priceHistory: createEmptyVariantPriceConnection(),
});
```

After creating the product, set each variant `product` reference to the containing `ApiProduct` if needed by the UI. If this creates circular mock objects that are awkward to inspect, keep `product: productRef` minimal but still typed as `ApiProduct`.

### Product Connection Mock

```ts
const createMockApiProductConnection = (
  products: ApiProduct[],
): ApiProductConnection => ({
  __typename: "ProductConnection",
  edges: products.map((product, index) => ({
    __typename: "ProductEdge",
    cursor: `product-cursor-${index}`,
    node: product,
  })),
  pageInfo: {
    __typename: "PageInfo",
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: products.length ? "product-cursor-0" : null,
    endCursor: products.length ? `product-cursor-${products.length - 1}` : null,
  },
  totalCount: products.length,
});
```

### Category Mock Data

Do not convert `mockCategories` to `ApiCategory[]` until Phase 0 regenerates Admin frontend types and `ApiCategory` exists in `@/graphql/types`.

After Phase 0:

- Replace `ICategory` imports in product UI.
- Convert `mockCategories` to `ApiCategory[]`.
- Convert `mockHierarchy` to use `ApiCategory["id"]` keys.
- Update category picker config to consume raw category objects directly.
- Use generated category field names: `name`, `handle`, `isPublished`, `parent`, `children`, `ancestors`, `media`, and `productsCount`.

## Display Helper Rules

Allowed helpers:

- `getDefaultVariant(product: ApiProduct): ApiVariant | null`
- `getProductMediaFiles(product: ApiProduct): ApiFile[]`
- `getProductPublishedStatus(product: ApiProduct): "published" | "draft"`
- `getProductSeo(product: ApiProduct): ApiProductSeo | null`
- `getCategoryDisplayName(category: ApiCategory): string`
- `getSelectedOptionLabels(productOptions: ApiProductOption[], variant: ApiVariant): string[]`
- `getAIWriterAttributeLabels(product: ApiProduct, supplementalAttributes?: IAttributeRow[]): string[]`
- `formatApiDate(value: string | null | undefined): string`
- `formatMinorAmount(value: number | string | bigint | null | undefined): string`
- `formatVariantWeight(weight: NonNullable<ApiVariant["inventoryItem"]>["weight"]): string` after Phase 0, adjusted to the exact regenerated type shape
- `formatVariantDimensions(dimensions: NonNullable<ApiVariant["inventoryItem"]>["dimensions"]): string` after Phase 0, adjusted to the exact regenerated type shape

Connection helpers must tolerate the exact regenerated connection nullability. If generated edges, nodes, or nested fields are nullable, helpers must guard those values at the display boundary instead of tightening the API contract locally.

Not allowed:

- `toProductListItem(product)`
- `toProductDetailsView(product)`
- `mapMockProductToApi(product)`
- `mapApiProductToMockProduct(product)`
- Any helper returning a new object that becomes the component prop contract

Small helpers can return primitives or API nested values. They must not create view models.

## Detailed Migration Phases

### Phase 0: Regenerate Admin GraphQL Types From Current Supergraph

1. Treat the checked-in `admin/src/graphql/types.ts` as stale until this phase completes.
2. Regenerate Admin frontend GraphQL types from `infra/federation/supergraph-admin.graphql` through the approved project codegen workflow.
3. Confirm regenerated `admin/src/graphql/types.ts` includes:
   - `ApiCatalogQuery`
   - `ApiProduct`
   - `ApiProductConnection`
   - `ApiVariant`
   - `ApiVariantConnection`
   - `ApiCategory`
   - `ApiCategoryConnection`
   - `ApiTag`
   - `ApiProductSeo`
4. Confirm regenerated `ApiProduct` exposes the current supergraph product shape:
   - `categories`
   - `tags`
   - `seo`
   - `revision`
5. Confirm regenerated `ApiVariant` exposes the current supergraph variant and inventory shape. The current supergraph places SKU, stock, dimensions, weight, and unit cost under `variant.inventoryItem`; all later phases must use `variant.inventoryItem` instead of stale flattened fields such as `variant.sku`, `variant.stock`, `variant.weight`, `variant.dimensions`, `variant.cost`, or `variant.inStock`.
6. Do not add local fake category, tag, SEO, or inventory API types.
7. Update every mock builder and target contract in this plan to the regenerated type shape before implementing Phase 1.

Exit criteria:

- Product, variant, category, tag, SEO, and catalog query types are generated from the current supergraph.
- The product and variant migration can start from current generated API types, not stale checked-in types.
- Category and tag data are no longer treated as unavailable API data.
- `ApiVariant` no longer exposes stale flattened inventory fields such as `sku`, `stock`, `weight`, `dimensions`, `cost`, or `inStock`; inventory fields are available through `variant.inventoryItem`.
- No local fake API aliases or interfaces are added for category, tag, SEO, or inventory contracts.

Static checks:

```text
rg "export type ApiCatalogQuery|export type ApiCategory|export type ApiCategoryConnection|export type ApiTag|export type ApiProductSeo" admin/src/graphql/types.ts
rg "inventoryItem" admin/src/graphql/types.ts
rg "sku\\?:|stock:|weight\\?:|dimensions\\?:|cost\\?:|inStock:" admin/src/graphql/types.ts
```

The last command must not match fields inside `ApiVariant`; any matches must be verified as non-variant types or removed by the regenerated schema output.

### Phase 1: Add Raw API Product Mock Builders

Files:

- `admin/src/mocks/products/data.ts`
- `admin/src/mocks/products/product-details.ts`
- optionally `admin/src/mocks/products/api-builders.ts`

Steps:

1. Create API-shaped helper builders for:
   - `ApiFile`
   - `ApiDescription`
   - `ApiProductOption`
   - `ApiProductOptionValue`
   - `ApiProductOptionSwatch`
   - `ApiVariantMediaItem`
   - `ApiVariantPrice`
   - `ApiInventoryItem`
   - `ApiInventoryItemCost`
   - `ApiInventoryItemWeight`
   - `ApiInventoryItemDimensions`
   - `ApiVariant`
   - `ApiVariantConnection`
   - `ApiProduct`
   - `ApiProductConnection`
   - `ApiCategory`
   - `ApiTag`
2. Convert `mockSimpleProduct` to `ApiProduct`.
3. Convert `mockVariableProduct` to `ApiProduct`.
4. Convert `mockDraftProduct` to `ApiProduct` with `isPublished: false` and `publishedAt: null`.
5. Do not preserve a legacy `ARCHIVED` product lifecycle state. Either remove `mockArchivedProduct` from product UI mocks, or represent it explicitly as a soft-deleted API product with `deletedAt` set to an ISO string.
6. Exclude soft-deleted products from active list/detail mock flows unless the UI is intentionally rendering a deleted-product state.
7. Keep `getMockVariantsTableData` returning `ApiVariant[]`, but align its variant shape with the new variant builder and put inventory data under `variant.inventoryItem`.
8. Ensure every mock date scalar is an ISO string, not a `Date` object.
9. Ensure money fields use API price/cost objects: sale price under `variant.price`, unit cost under `variant.inventoryItem?.unitCost`, and no product-level `price`, `oldPrice`, or `costPrice`.
10. Ensure media lives under `variant.media`, not `product.featured` or `product.gallery`.

Exit criteria:

- Product mock exports use explicit generated return types or `satisfies ApiProduct` so excess legacy fields are rejected.
- Variant mock exports use explicit generated return types or `satisfies ApiVariant` so excess legacy fields are rejected.
- No product mock object contains legacy-only fields.
- No product mock represents `ARCHIVED` as a lifecycle status; soft deletion is represented only by `deletedAt`.
- Mock builders use exact regenerated API type names from `@/graphql/types`; no local compatibility aliases are introduced to force old example names to compile.

### Phase 2: Replace Product List Mock Contract

Files:

- `admin/src/mocks/products/products-list.ts`
- `admin/src/domains/inventory/products/hooks/use-products.ts`
- `admin/src/domains/inventory/products/page/page.tsx`
- `admin/src/shared/components/entity-picker-modal/configs/product-picker-config.ts`

Steps:

1. Migrate every current `IProductListItem` consumer in this phase, including the shared product picker.
2. Export `mockProductsConnection: ApiProductConnection` or `mockProducts: ApiProduct[]`.
3. Update `useProducts` return shape to expose `products`, `totalCount`, `pageInfo`, `loading`, `error`, and `refetch`.
4. Update `ProductsPage` AG Grid generics to `ApiProduct`.
5. Update product cell renderer:
   - title from `product.title`
   - image from first/default variant media file
   - alt from `file.altText ?? file.originalName ?? product.title`
6. Update status cell renderer:
   - use `product.isPublished`
   - display `Published` or `Draft`
7. Replace inventory column with `variantsCount` for the first raw API migration.
8. Remove `category` and `brand` columns until those fields exist in raw API data.
9. Update `DataLayout.count` to use `totalCount`.
10. Update `CursorPagination` to use `pageInfo` and local page range state.
11. Update row action to pass the real product id:

```ts
onRowAction: (product) => push("product", { entityId: product.id, mode: "view" })
```

12. Update `product-picker-config.ts` to consume API-shaped product mocks directly:
    - remove the `IProductListItem` import;
    - use `ApiProduct` as the source object;
    - derive picker title from `product.title`;
    - derive picker image from default/first variant media;
    - derive picker status from `product.isPublished`;
    - remove picker-only `category` and `brand` fields until the picker intentionally consumes generated category/tag data.
13. Delete `IProductListItem` only after both `ProductsPage` and `product-picker-config.ts` no longer import it. If any shared picker or other non-product-page consumer still imports it, keep the export temporarily and move deletion to Phase 8.

Picker-local presentation types are allowed only at the generic entity picker boundary, where the picker component requires a normalized `IPickableEntity` shape. They must be built inside the picker config from raw `ApiProduct`, must not be exported as product contracts, and must not reintroduce product fields such as `category`, `brand`, `price`, or `inventory`.

Exit criteria:

- Product list renders raw `ApiProduct`.
- Product page does not import `@/mocks/products/products-list` types.
- Shared product picker does not import `IProductListItem` or `@/mocks/products/products-list`.
- No product list row type exists outside generated API types.
- Any picker-local normalized row type is private to the picker config and is not used by product page, product hooks, or product details.

### Phase 3: Replace Product Details Root Contract

Files:

- `admin/src/domains/inventory/products/modals/product-modal/product-modal.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/product-details-card.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/types.ts`

Steps:

1. Change `ProductDetailsCard` prop from `product: IProduct` to `product: ApiProduct`.
2. Rename `IProductDetailsMockData` to `ProductDetailsSupplementalData`.
3. Remove product-shaped fields from supplemental data.
4. Keep only non-product API supplemental data.
5. Change variable product checks from `product.isVariableProduct` to `product.variantsCount > 1`.
6. Pass `product.options` directly to `OptionsSection`.
7. Pass `product.options` to `VariantsTableSection` as `productOptions` so variant selected option ids can be displayed as names.
8. Pass product/variant raw API data into media, inventory, shipping, and variants sections.
9. In `ProductModal`, resolve mock product by `payload.entityId`.
10. Remove `payload.simple` branching after the modal can resolve by id.

Exit criteria:

- `ProductDetailsCard` accepts only `ApiProduct`.
- Details modal can open using a real product id.
- Legacy `IProduct` is not imported in product details root files.

### Phase 4: Update Header And Content Components

Files:

- `admin/src/domains/inventory/products/components/product-info-header/types.ts`
- `admin/src/domains/inventory/products/components/product-info-header/product-info-header.tsx`
- `admin/src/domains/inventory/products/components/product-info-header/utils.ts`
- `admin/src/domains/inventory/products/components/product-content-tabs/product-content-tabs.tsx`

Steps:

1. Replace `IProduct` prop types with `ApiProduct`.
2. Replace `EntityStatus` with `product.isPublished`.
3. Update status helper to accept `ApiProduct` or `boolean`.
4. Replace `product.slug` with `product.handle ?? product.id`.
5. Replace `product.updatedAt.toLocaleDateString(...)` with date formatting for API string scalars.
6. Replace `product.price` revenue fallback with first/default variant price.
7. Replace `product.sku` with first/default variant sku.
8. Keep `description` and `excerpt` reads directly on `ApiProduct`.

Exit criteria:

- Header/content imports no legacy product mock types.
- Header/content render API scalar strings safely.
- Header/content do not call `toLocaleDateString`, `toLocaleString`, or other `Date` methods directly on API scalar strings.

### Phase 5: Update Media, Inventory, Shipping, Options, And Variants Sections

Files:

- `admin/src/domains/inventory/products/components/product-details-card/sections/media-section.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/sections/inventory-section.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/sections/shipping-section.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/sections/options-section.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/sections/variants-table-section.tsx`
- `admin/src/domains/inventory/products/constants.ts`

Steps:

1. Change `MediaSection` to accept `product: ApiProduct` or `media: ApiVariantMediaItem[]`.
2. Prefer `product: ApiProduct` if the section must select default variant media itself.
3. Use `variant.media[].file` directly.
4. Change `InventorySection` to accept `product: ApiProduct`.
5. Use `product.variants.edges[].node.inventoryItem?.stock` and `product.variants.edges[].node.inventoryItem?.totalAvailable` for edit/inventory modal payloads after Phase 0.
6. Change `ShippingSection` to accept `variant: ApiVariant | null`.
7. Remove mock `WeightUnit` and `DimensionUnit`.
8. Use generated units only where the API field actually contains units. For `ApiInventoryItemWeight` and `ApiInventoryItemDimensions`, display stored grams and millimeters from the exact regenerated fields.
9. Keep `OptionsSection` on `ApiProductOption[]`.
10. Change `VariantsTableSection` to accept `productOptions: ApiProductOption[]`.
11. Use `getSelectedOptionLabels(productOptions, variant)` for option display.
12. Remove any rendering that prints raw `variant.selectedOptions` ids directly.
13. Audit `VariantsTableSection` and remove any remaining legacy assumptions.

Exit criteria:

- Product detail sections consume raw API product/variant nested fields.
- Product constants do not import from `@/mocks/products/types`.
- Product-level inventory aggregate widgets use `ProductInventoryWidget` supplemental data only for values unavailable on `ApiProduct`; they are not added to product mocks as product-level API fields.
- Variant table, shipping, and inventory sections do not read stale flattened variant fields such as `variant.sku`, `variant.stock`, `variant.weight`, `variant.dimensions`, `variant.cost`, or `variant.inStock`.

### Phase 6: Update Product Modal Payloads And Edit Flows

Files:

- `admin/src/domains/inventory/products/modals.ts`
- `admin/src/domains/inventory/products/components/product-details-card/hooks/use-product-modals.ts`
- `admin/src/domains/inventory/products/modals/ai-writer-modal/ai-writer-modal.tsx`
- `admin/src/domains/inventory/products/modals/ai-writer-modal/types.ts`
- `admin/src/domains/inventory/products/components/variants/edit-variants-modal.tsx`
- `admin/src/domains/inventory/products/components/variants/*`
- edit title, description, media, SEO, options, categories, tags modals as needed

Subphases:

#### Phase 6a: Modal Payload Boundary

1. Replace `IProduct` payload usages with `ApiProduct` where the modal needs the product object.
2. Prefer passing ids and raw API entities over derived payload objects.
3. Change `useProductModals(product)` to accept `ApiProduct`.
4. Remove product-shaped modal payload fields that duplicate API output data. Keep modal-local input state only inside the target modal.

Exit criteria:

- `admin/src/domains/inventory/products/modals.ts` does not import `IProduct` or other legacy product mock contracts.
- `useProductModals` accepts `ApiProduct`.
- Modal payloads do not pass legacy product objects.

#### Phase 6b: Content, Media, And SEO Edit Flows

1. For title modal:
   - initial title from `product.title`
   - initial handle from `product.handle`
2. For description modal:
   - description from `product.description?.json`
   - excerpt from `product.excerpt`
3. For media modal:
   - choose default/first variant id
   - pass media files from `variant.media`
   - remove `featured`/`gallery` product fields
4. For SEO modal:
   - use `product.title`
   - use `product.handle`
   - use `product.seo?.seoTitle`
   - use `product.seo?.seoDescription`
   - use `product.seo?.ogTitle`
   - use `product.seo?.ogDescription`
   - use `product.seo?.ogImage`

Exit criteria:

- Title, description, media, and SEO edit flows initialize from raw `ApiProduct` or nested raw API fields.
- Media edit flow does not read `product.featured` or `product.gallery`.
- SEO edit flow does not read legacy top-level `seoTitle` or `seoDescription` product fields.

#### Phase 6c: Variants Edit Flow

1. For variants modal:
   - accept `ApiVariant[]` if possible
   - otherwise build modal row data inside the modal from `ApiVariant`, not in product details card

Exit criteria:

- Variant edit modal input is `ApiVariant[]` or modal-local editable row state derived inside the modal.
- Product details root does not build variant editor row view models.
- Variant edit flow reads inventory data through `variant.inventoryItem`.

#### Phase 6d: Category And Tag Edit Flows

1. For categories modal:
   - use generated `ApiCategory` from Phase 0
   - replace `ICategory` with `ApiCategory`
   - read category display values from `name`, `handle`, `isPublished`, and `media`
2. For tags modal:
   - use generated `ApiTag` from Phase 0 where tag API data is available;
   - do not keep tag labels in product supplemental data once `product.tags` is generated.

Exit criteria:

- Category edit flows consume generated `ApiCategory`.
- Tag edit flows consume generated `ApiTag` where product tag data is available.
- Category and tag edit flows do not import legacy product mock contracts.

#### Phase 6e: AI Writer Flow

1. For AI writer modal:
   - replace `IProductAIWriterModalPayload.product: IProduct` with `product: ApiProduct`;
   - optionally pass `supplementalAttributes` when `product.features` does not contain the labels needed for the prompt;
   - derive categories from generated `product.categories[].name`;
   - derive attribute labels from `product.features` or `supplementalAttributes`;
   - derive price from default/first variant `price`, not `product.price`;
   - remove reads of `product.primaryCategory`, `product.categories[].title`, `product.attributes`, and `product.price` from `ai-writer-modal.tsx`.

Exit criteria:

- Product modal contracts do not expose legacy product types.
- Product edit flows consume raw API data where the API contract exists.
- Category edit flows consume generated `ApiCategory` from Phase 0.
- AI writer modal receives `ApiProduct` and does not import legacy `IProduct`.
- Each Phase 6 subphase can be verified independently before starting the next subphase.

### Phase 7: Category Contract Migration

This phase is required for final acceptance. It is not a backend schema-addition phase: the current supergraph already exposes `Category`, `CatalogQuery.category`, `CatalogQuery.categories`, and `Product.categories`. Phase 0 must regenerate Admin frontend types so `ApiCategory` is available here.

Files affected:

- `admin/src/mocks/products/categories.ts`
- `admin/src/domains/inventory/products/components/product-details-card/sections/categories-section.tsx`
- `admin/src/domains/inventory/products/modals/edit-categories-modal/types.ts`
- `admin/src/domains/inventory/products/modals/edit-categories-modal/edit-categories-modal.tsx`
- `admin/src/domains/inventory/products/modals/edit-categories-modal/utils.ts`
- `admin/src/shared/components/entity-picker-modal/mocks/categories-list.ts`
- `admin/src/shared/components/entity-picker-modal/configs/category-picker-config.ts`

Steps:

1. Convert category mocks to `ApiCategory[]`.
2. Update category section props to `ApiCategory`.
3. Update category tree utils to read raw `ApiCategory` fields.
4. Update picker config to use raw `ApiCategory` objects.
5. Replace legacy field reads:
   - `category.title` -> `category.name`
   - `category.slug` -> `category.handle`
   - `category.status` -> `category.isPublished`
   - legacy gallery fields -> `category.media[].file`
6. Use `product.categories` as the assigned category list.
7. Keep any explicit primary-category value in supplemental data only until the API exposes a first-class primary category semantic.
8. Remove remaining `ICategory` imports from product UI.

Exit criteria:

- Product category UI uses generated `ApiCategory`.
- No local product category interface remains in product UI.
- No implementation assumes category API is absent from the supergraph.
- Shared category picker config consumes raw `ApiCategory` data or keeps only picker-local normalized state private to the picker boundary.

### Phase 8: Remove Legacy Product Mock Types

Files:

- `admin/src/mocks/products/types.ts`
- `admin/src/mocks/products/index.ts`
- remaining imports under `admin/src/domains/inventory/products`
- remaining imports under `admin/src/shared/components/entity-picker-modal`

Steps:

1. Search for legacy imports:

```text
IProduct
IProductVariant
IProductListItem
ICategory
IMediaFile
EntityStatus
WeightUnit
DimensionUnit
```

2. Remove legacy exports only after all product-domain and shared picker imports are gone.
3. If other domains still use legacy mocks, leave the file in place but stop exporting product UI contracts from product-domain or shared picker paths.
4. Keep unrelated bundle/category mock contracts untouched unless they are part of this migration.

Exit criteria:

- Product domain and shared entity picker configs do not import product legacy mock contracts.
- Any remaining legacy mock contracts are clearly outside the migrated product UI surface.

## File Impact Summary

### Must Change

This is the minimum known file set. Treat the static searches in the verification plan as authoritative for final scope because legacy product contracts may also appear in picker wrappers, barrels, or modal-specific files not listed here.

- `admin/src/mocks/products/data.ts`
- `admin/src/mocks/products/products-list.ts`
- `admin/src/mocks/products/product-details.ts`
- `admin/src/domains/inventory/products/hooks/use-products.ts`
- `admin/src/domains/inventory/products/page/page.tsx`
- `admin/src/shared/components/entity-picker-modal/configs/product-picker-config.ts`
- `admin/src/domains/inventory/products/modals/product-modal/product-modal.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/product-details-card.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/types.ts`
- `admin/src/domains/inventory/products/components/product-info-header/types.ts`
- `admin/src/domains/inventory/products/components/product-info-header/product-info-header.tsx`
- `admin/src/domains/inventory/products/components/product-info-header/utils.ts`
- `admin/src/domains/inventory/products/components/product-content-tabs/product-content-tabs.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/hooks/use-product-modals.ts`
- `admin/src/domains/inventory/products/modals/ai-writer-modal/ai-writer-modal.tsx`
- `admin/src/domains/inventory/products/modals/ai-writer-modal/types.ts`
- `admin/src/domains/inventory/products/components/product-details-card/sections/media-section.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/sections/inventory-section.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/sections/shipping-section.tsx`
- `admin/src/domains/inventory/products/components/product-details-card/sections/variants-table-section.tsx`
- `admin/src/domains/inventory/products/modals.ts`
- `admin/src/domains/inventory/products/constants.ts`

### Category Contract Phase

- `admin/src/mocks/products/categories.ts`
- `admin/src/domains/inventory/products/components/product-details-card/sections/categories-section.tsx`
- `admin/src/domains/inventory/products/modals/edit-categories-modal/types.ts`
- `admin/src/domains/inventory/products/modals/edit-categories-modal/edit-categories-modal.tsx`
- `admin/src/domains/inventory/products/modals/edit-categories-modal/utils.ts`
- `admin/src/shared/components/entity-picker-modal/configs/category-picker-config.ts`

### Should Not Change In This Migration

- changeset files
- unrelated backend service files
- unrelated product create form validation unless needed for type imports
- generated `admin/src/graphql/types.ts` except through the required Phase 0 codegen synchronization

## Migration Order Recommendation

1. Regenerate Admin frontend GraphQL types from the current supergraph.
2. Update the plan-local target field assumptions to the regenerated `ApiProduct`, `ApiVariant`, `ApiCategory`, and `ApiTag` shape.
3. Add API-shaped product/variant/category/tag mock builders.
4. Convert product mocks to `ApiProduct`.
5. Convert product list hook/page to `ApiProduct`.
6. Convert product details root to `ApiProduct`.
7. Convert header/content/media/inventory/shipping sections.
8. Convert modal payloads and edit flows.
9. Migrate category contracts to generated `ApiCategory`.
10. Remove legacy product mock type imports.

This order keeps the app renderable after each phase and avoids a large ambiguous rewrite.

## Verification Plan

Project instructions say not to run tests or `tsc` for verification.

Allowed verification:

1. Run build when code changes are implemented and a new code version needs validation.
2. Use targeted static searches:

```text
rg "IProduct|IProductVariant|IProductListItem|ICategory|IMediaFile|EntityStatus|WeightUnit|DimensionUnit" admin/src/domains/inventory/products
rg "IProductListItem|@/mocks/products/products-list" admin/src/shared/components/entity-picker-modal
rg "@/mocks/products/types|@/mocks/products/products-list" admin/src/domains/inventory/products
rg "toProductListItem|toProductDetailsView|mapMockProductToApi|mapApiProductToMockProduct" admin/src/domains/inventory/products admin/src/mocks/products
rg "variant\\.(sku|stock|weight|dimensions|cost|inStock)" admin/src/domains/inventory/products admin/src/mocks/products
rg "type ApiCategory = ICategory|type ApiInventoryItem =|interface ApiCategory|interface ApiInventoryItem" admin/src
rg "\\.toLocaleDateString|\\.toLocaleString" admin/src/domains/inventory/products
```

3. Inspect product screens manually after build if a dev server is already running or started through the approved project workflow.

## Acceptance Criteria

- Product list components use `ApiProduct` as row data.
- Product details components use `ApiProduct` as the root product prop.
- Variant sections and modals use `ApiVariant` as the source contract.
- Category product UI uses generated `ApiCategory`.
- Product mocks are API-shaped and no longer require conversion before rendering.
- Category mocks are API-shaped and typed as `ApiCategory[]`.
- No product output mapper is introduced.
- Product UI no longer depends on legacy mock product/category types from `@/mocks/products/types`.
- No stale flattened `ApiVariant` inventory field reads remain in product UI or product mocks.
- No local fake API aliases are introduced for generated category, tag, SEO, or inventory types.
- Build passes when run according to project rules.

## Open Decisions

1. Should `useProducts` return `ApiProductConnection` directly, or unwrap to `ApiProduct[]` while still preserving `pageInfo` and `totalCount`?
2. Should edit variants modal accept raw `ApiVariant[]`, or should it remain an editable grid with local row state while the conversion happens inside the modal boundary?
3. Should product media section choose default variant media or first variant media when no default variant is returned?
4. Should product list keep a temporary thumbnail column based on first/default variant media, or remove media until the API exposes a product thumbnail field?
