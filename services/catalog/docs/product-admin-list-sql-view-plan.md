# План: SQL view для Admin products grid

## Цель

Сделать backend projection для `catalogQuery.products`, которая позволяет сортировать и фильтровать поля products grid на уровне SQL, а не через client-side derived values.

Целевой путь интеграции:

```text
Postgres view -> Drizzle view model -> createRelayQuery -> generated GraphQL where/orderBy inputs -> Admin products grid
```

План выровнен с:

- `knowledge/vault/packages/drizzle-query/views.md`;
- `knowledge/vault/packages/drizzle-query/filters.md`;
- `knowledge/vault/packages/drizzle-query/cursor-pagination.md`;
- `knowledge/vault/patterns/admin-graphql-layer.md`;
- текущим `ProductRepository` / `CategoryRepository` relay pattern;
- `services/catalog/docs/admin-products-drizzle-query-relay-refactor-plan.md`.

## Текущий baseline

- Admin products grid показывает колонки:
  - `Product` -> `ApiProduct.title` + thumbnail;
  - `Status` -> derived из `deletedAt` / `isPublished`;
  - `Inventory` -> сумма `variant.inventoryItem.totalAvailable`, отображается через существующие product/variant resolvers и не участвует в SQL sort/filter для этого плана;
  - `Category` -> `primaryCategory.name`;
  - `Brand` -> должен перейти на `ApiProduct.vendor.name`; текущий Admin helper пока читает legacy feature с `slug === "brand"`.
- `catalogQuery.products` сейчас принимает только Relay pagination args.
- `ProductRepository.productRelayQuery` построен от `catalog.product`, поэтому SQL-capable поля ограничены product table.
- `totalCount` в `ProductRepository.getConnection()` сейчас считает все неудаленные продукты магазина, а не matching rows текущего `where`.
- `services/catalog/scripts/generate-filters.ts` генерирует filters/order для `Category`, `CategoryProduct`, `Variant`, но не для root products.

## Target data contract

Новая projection должна покрыть поля, по которым grid должен фильтровать и сортировать:

| Grid поле | View column | Source | Notes |
| --- | --- | --- | --- |
| Product title | `title` | `catalog.product_translation.title` | Locale-aware. View содержит `locale`, repository добавляет `locale = ctx.locale`. |
| Status | `status` | `product.deleted_at`, `product.published_at` | Computed: `archived`, `published`, `draft`. MVP может не включать archived в default list из-за текущего `deletedAt IS NULL`. |
| Category | `primaryCategoryName` | primary `product_category` + `category_translation.name` | Только primary category. |
| Brand | `vendorName` | `catalog.vendor.name` через `product.vendor_id` | Использовать first-class `Vendor`, а не legacy feature convention. |
| Stable cursor | `id` | `product.id` | Tie-breaker для keyset pagination. |
| Tenant/internal | `projectId`, `locale`, `deletedAt` | product/view internals | Не публиковать как filter/order fields, repository добавляет сам. |

Дополнительные полезные columns:

- `handle`;
- `publishedAt`;
- `createdAt`;
- `updatedAt`;
- `primaryCategoryId`;
- `vendorId`.

## Архитектурное решение

### 1. View живет в catalog read model

Создать read projection в `catalog` service, например:

```text
catalog.product_admin_list
```

Причина: root query `catalogQuery.products` возвращает `ProductConnection`, а `ProductResolver` уже живет в catalog. View используется только для выбора product IDs, фильтрации, сортировки и cursor values; сами `Product` nodes продолжают резолвиться через существующие loaders/resolvers.

### 2. View не зависит от inventory schema

`catalog.product_admin_list` должен читать только tables/views внутри `catalog` schema. Inventory/stock данные не входят в projection и не публикуются как generated `where`/`orderBy` поля.

Причина: `catalogQuery.products` принадлежит catalog service, а view не должен связывать catalog migrations с inventory schema. Stock display остается за существующими product/variant resolvers/loaders; SQL сортировка/фильтрация по stock не входит в этот план.

### 3. Locale strategy

View должна быть locale-aware:

- один row на product + product translation locale;
- `ProductRepository` всегда добавляет `locale = this.ctx.locale ?? "uk"`;
- category translation join по той же locale; vendor name берется из `catalog.vendor.name` и не локализуется в текущей модели.

MVP assumption: listable product имеет `product_translation` для текущей locale. Если нужно сохранять продукты без перевода в списке, потребуется отдельная locale fallback projection, потому что обычная SQL view не знает request locale.

## SQL view sketch

Это shape, не финальный migration SQL:

```sql
CREATE VIEW catalog.product_admin_list AS
SELECT
  p.project_id,
  p.id,
  pt.locale,
  p.handle,
  pt.title,
  CASE
    WHEN p.deleted_at IS NOT NULL THEN 'archived'
    WHEN p.published_at IS NOT NULL AND p.published_at <= now() THEN 'published'
    ELSE 'draft'
  END AS status,
  p.published_at,
  p.created_at,
  p.updated_at,
  p.deleted_at,
  p.revision,
  p.vendor_id,
  v.name AS vendor_name,
  pc.category_id AS primary_category_id,
  c.handle AS primary_category_handle,
  ct.name AS primary_category_name
FROM catalog.product p
JOIN catalog.product_translation pt
  ON pt.project_id = p.project_id
 AND pt.product_id = p.id
LEFT JOIN catalog.vendor v
  ON v.project_id = p.project_id
 AND v.id = p.vendor_id
LEFT JOIN catalog.product_category pc
  ON pc.project_id = p.project_id
 AND pc.product_id = p.id
 AND pc.is_primary = true
LEFT JOIN catalog.category c
  ON c.project_id = p.project_id
 AND c.id = pc.category_id
 AND c.deleted_at IS NULL
LEFT JOIN catalog.category_translation ct
  ON ct.project_id = c.project_id
 AND ct.category_id = c.id
 AND ct.locale = pt.locale;
```

Если Drizzle view builder неудобен для финальной projection, держать SQL в migration, а в Drizzle объявить typed view model, совпадающую с SQL columns.

## Backend implementation plan

### 1. Добавить Drizzle view model

Создать:

```text
services/catalog/src/repositories/models/productAdminList.ts
```

Экспортировать из:

```text
services/catalog/src/repositories/models/index.ts
```

View columns назвать camelCase в Drizzle model:

```ts
productAdminList.id
productAdminList.projectId
productAdminList.locale
productAdminList.title
productAdminList.status
productAdminList.primaryCategoryName
productAdminList.vendorId
productAdminList.vendorName
```

### 2. Создать Relay query на view

В `ProductRepository.ts` оставить `productQuery` для direct entity reads и добавить отдельный list relay query:

```ts
export const productAdminListRelayQuery = createRelayQuery(
  createQuery(productAdminList, {
    id: field(productAdminList.id),
    projectId: field(productAdminList.projectId),
    locale: field(productAdminList.locale),
    handle: field(productAdminList.handle),
    title: field(productAdminList.title),
    status: field(productAdminList.status),
    publishedAt: field(productAdminList.publishedAt),
    createdAt: field(productAdminList.createdAt),
    updatedAt: field(productAdminList.updatedAt),
    deletedAt: field(productAdminList.deletedAt),
    primaryCategoryName: field(productAdminList.primaryCategoryName),
    vendorId: field(productAdminList.vendorId),
    vendorName: field(productAdminList.vendorName),
  })
    .include(["id"])
    .mapWhereField("id", decodeProductGlobalId)
    .maxLimit(100)
    .defaultLimit(20),
  { name: "product", tieBreaker: "id" },
);
```

Repository `getConnection()` должен:

- принимать `ProductAdminListRelayInput`;
- merge internal filters:
  - `projectId = this.storeId`;
  - `locale = this.locale`;
  - `deletedAt IS NULL` для текущего поведения root product list;
- использовать `productAdminListRelayQuery.execute(...)`;
- считать `totalCount` через `productAdminListRelayQuery.count(...)` с тем же `mergedWhere`;
- возвращать `nodeId: edge.node.id`.

Default order:

```ts
orderBy: orderBy ?? [
  { field: "createdAt", direction: "desc" },
  { field: "id", direction: "desc" },
]
```

Если user orderBy задан, добавить `id` как tie-breaker, если его нет в order list.

### 3. Generated GraphQL filters/order

Чтобы не конфликтовать с текущим ручным `ProductOrderByInput` из `product.graphql`, рекомендованный generated prefix для grid projection:

```graphql
ProductListWhereInput
ProductListOrderField
ProductListOrderByInput
```

В `services/catalog/scripts/generate-filters.ts` добавить:

```ts
const productListWhere = generateWhereInputType(
  productAdminListRelayQuery,
  "ProductList",
  {
    includeDescriptions: true,
    excludeFields: [
      "projectId",
      "locale",
      "deletedAt",
      "revision",
      "primaryCategoryId",
      "vendorId",
    ],
  },
);

const productListOrderBy = generateOrderByInputType(
  productAdminListRelayQuery,
  "ProductList",
  {
    includeDescriptions: true,
    excludeFields: [
      "projectId",
      "locale",
      "deletedAt",
      "revision",
      "primaryCategoryId",
      "vendorId",
    ],
  },
);
```

Generated schema file не редактировать руками. После генерации `filters.graphql` должен содержать `ProductListWhereInput` и `ProductListOrderByInput`.

### 4. GraphQL schema

В `services/catalog/src/api/graphql-admin/schema/base.graphql` расширить `catalogQuery.products`:

```graphql
products(
  first: Int
  after: String
  last: Int
  before: String
  where: ProductListWhereInput
  orderBy: [ProductListOrderByInput!]
): ProductConnection!
```

`ProductConnection` и `ProductEdge.node: Product!` не менять.

### 5. Resolver boundary

В `QueryResolver.products()` передавать args в `ProductConnectionResolver`. ID decoding для `where.id` уже лучше держать в `.mapWhereField("id", decodeProductGlobalId)` на query builder, чтобы nested `_and/_or/_not` обрабатывались единообразно.

Если позже публично открыть `primaryCategoryId` или `vendorId`, добавить соответствующие `.mapWhereField(...)` mappers.

### 6. Admin integration

Обновить Admin GraphQL operation:

```graphql
query Products(
  $first: Int
  $after: String
  $last: Int
  $before: String
  $where: ProductListWhereInput
  $orderBy: [ProductListOrderByInput!]
) {
  catalogQuery {
    products(
      first: $first
      after: $after
      last: $last
      before: $before
      where: $where
      orderBy: $orderBy
    ) {
      ...
    }
  }
}
```

`useProducts()` options расширить:

- `where?: ApiProductListWhereInput | null`;
- `orderBy?: ApiProductListOrderByInput[] | null`.

AG Grid sort mapping:

| Grid column | order field |
| --- | --- |
| Product | `title` |
| Status | `status` |
| Category | `primaryCategoryName` |
| Brand | `vendorName` |

FilterWidget mapping:

| UI filter | where field |
| --- | --- |
| `name` | `title` |
| `category` | `primaryCategoryName` |
| `brand` | `vendorName` |
| `status` | `status` |
| toolbar search | `_or` over `title`, `handle`, `primaryCategoryName`, `vendorName` with `_containsi` |

On search/filter/sort change:

- reset cursor history to `[null]`;
- reset page index to `0`;
- refetch with new `where/orderBy`.

Display data should still come from `ApiProduct` fields. Do not introduce a separate API-output view model in Admin.

Admin product fragments must include `vendor { id name }`, and product grid brand display should read `product.vendor?.name`. The legacy feature-based `getProductBrandName()` behavior should not be the source for SQL filter/order because it does not match the first-class catalog brand owner model.

## Index and performance plan

Start with a normal Postgres view. Move to materialized view only if query plans show repeated heavy scans.

Recommended indexes before enabling broad filtering:

- `catalog.product_translation(project_id, locale, product_id)`;
- btree or trigram index for `product_translation.title` if `_containsi` search is enabled at scale;
- `catalog.product_category(project_id, product_id) WHERE is_primary = true`;
- `catalog.category_translation(project_id, locale, category_id)`;
- `catalog.vendor(project_id, id)`;
- btree or trigram index for `vendor.name` if `_containsi` brand search is enabled at scale.

Use `EXPLAIN ANALYZE` on:

- default first page;
- sort by `title`;
- filter by `primaryCategoryName`;
- search `_containsi`.

## Risks and decisions to settle

1. Locale fallback
   - Product without `product_translation` in request locale will not appear in locale-scoped view.
   - If that is unacceptable, build a fallback projection with store default locale.

2. Brand/vendor migration
   - Backend has first-class `Product.vendor`, while current Admin grid helper still derives Brand from a legacy product feature.
   - This plan treats `Vendor` as the SQL filter/order source. Admin display must be moved to `product.vendor?.name` in the same integration, or the UI would show different data than the SQL filter/order fields.

3. Archived status
   - Current root product list filters `deletedAt IS NULL`.
   - `status = archived` will require either removing that default filter or adding an explicit archived list mode.

4. Generated input naming
   - `ProductListWhereInput` avoids conflict with existing manual `ProductOrderByInput`.
   - If the project wants canonical `ProductWhereInput/ProductOrderByInput`, first complete the rename described in `admin-products-drizzle-query-relay-refactor-plan.md`.

5. Inventory/stock sorting
   - Stock data is intentionally excluded because the view is catalog-only.
   - Products grid may display inventory through existing resolvers, but inventory sort/filter must remain disabled or be implemented later through a separate service boundary decision.

## Implementation order

1. Add SQL view/migration and Drizzle view model.
2. Add `productAdminListRelayQuery`.
3. Switch `ProductRepository.getConnection()` to query the view and count through the same query.
4. Generate `ProductListWhereInput/ProductListOrderByInput`.
5. Extend `catalogQuery.products` schema args.
6. Regenerate catalog resolver/schema types.
7. Regenerate Admin GraphQL types.
8. Wire Admin `useProducts()` and products page sort/filter variables for supported catalog fields.
9. Manually verify GraphQL query and products grid behavior.

Per project rule: do not run `test` or `tsc` for verification. When implementation changes code, run build only when a new code version is needed.

## Acceptance criteria

- `catalogQuery.products` accepts generated `where` and `orderBy` for product list fields.
- Sorting by `title`, `primaryCategoryName`, and `vendorName` happens in SQL.
- Filtering/searching those fields happens in SQL.
- Inventory/stock is not exposed in generated product list `where`/`orderBy`.
- Relay pagination remains cursor-based and stable with `id` tie-breaker.
- `totalCount` matches the active filters.
- Product nodes still resolve through existing `ProductResolver`; no Admin API-output view model is introduced.
- Generated GraphQL files are produced by generation, not manually edited.
