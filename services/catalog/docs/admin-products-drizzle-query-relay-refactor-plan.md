# План рефакторинга Admin GraphQL products query на drizzle-query relay

## Цель

Перевести `catalogQuery.products` в Admin GraphQL API на тот же контракт, что и список категорий:

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

`ProductWhereInput`, `ProductOrderField` и `ProductOrderByInput` должны быть generated schema из `@shopana/drizzle-query` на базе product relay query. Резолверы должны только нормализовать raw GraphQL input и возвращать connection resolver. Репозитории должны выполнять relay query через `drizzle-query`, добавлять tenant/soft-delete фильтры внутри repository layer и считать `totalCount` по тем же matching-фильтрам.

План выровнен с:

- `knowledge/vault/packages/drizzle-query/*`;
- `knowledge/vault/patterns/repository.md`;
- `knowledge/vault/patterns/resolver.md`;
- текущей реализацией `CatalogQuery.categories`.

## Текущий baseline

- `services/catalog/src/api/graphql-admin/schema/base.graphql`
  - `catalogQuery.products` принимает только `first/after/last/before`.
- `services/catalog/src/api/graphql-admin/schema/product.graphql`
  - вручную объявляет `ProductOrderByInput` на базе `ProductSortBy`;
  - этот input сейчас фактически используется для PLP/category-products сортировки (`MANUAL`, `NAME`, `NEWEST`, `PRICE`), а не для root product table.
- `services/catalog/scripts/generate-filters.ts`
  - генерирует фильтры и order inputs для `Category`, `CategoryProduct`, `Variant`;
  - не генерирует `ProductWhereInput/ProductOrderByInput`.
- `services/catalog/src/repositories/product/ProductRepository.ts`
  - уже имеет `productRelayQuery`, но query построен только от `product` table;
  - `getConnection(args)` принимает `ProductRelayInput`, но root GraphQL schema не пропускает `where/orderBy`;
  - `totalCount` вызывает `this.count()`, поэтому считает все неудаленные продукты магазина, а не результат текущего `where`.
- `services/catalog/src/resolvers/admin/QueryResolver.ts`
  - `products(args: ProductConnectionInput)` передает args напрямую в `ProductConnectionResolver`;
  - нет нормализации global ID фильтров для product `id` и потенциальных relation IDs.
- `admin/src/domains/inventory/products/graphql/queries.ts`
  - `PRODUCTS_QUERY` не принимает `where/orderBy`;
  - product page пока не может включить server-side filters/sorts поверх Admin API.

## Главный конфликт схемы

Generated drizzle-query input для root products с префиксом `Product` создаст:

```graphql
input ProductWhereInput
enum ProductOrderField
input ProductOrderByInput
```

Но `ProductOrderByInput` уже занят legacy PLP-сортировкой:

```graphql
input ProductOrderByInput {
  field: ProductSortBy!
  direction: SortDirection
}
```

Генератор `@shopana/drizzle-query` не умеет отдельно переименовать только `ProductOrderByInput`, поэтому recommended cutover:

1. Освободить имя `ProductOrderByInput` для generated root products query.
2. Переименовать текущий manual input в `ListingOrderByInput`.
3. Оставить enum `ProductSortBy` для PLP/default sort и category products UI.
4. Обновить `Category.products(orderBy:)`, `CategoryProductConnectionResolver`, admin category-products query/hook/types на `ListingOrderByInput`.

Это сохраняет существующую category-products семантику (`MANUAL/NAME/NEWEST/PRICE`) и позволяет root product table получить generated drizzle-query contract.

## Target backend files

```text
services/catalog/scripts/generate-filters.ts
services/catalog/src/api/graphql-admin/schema/base.graphql
services/catalog/src/api/graphql-admin/schema/product.graphql
services/catalog/src/api/graphql-admin/schema/category.graphql
services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql
services/catalog/src/repositories/product/ProductRepository.ts
services/catalog/src/resolvers/admin/ProductConnectionResolver.ts
services/catalog/src/resolvers/admin/QueryResolver.ts
services/catalog/src/resolvers/admin/filter-normalizers.ts
services/catalog/src/resolvers/admin/generated/types.ts
services/catalog/src/resolvers/admin/generated/schemas.ts
```

Frontend contract files after backend/schema cutover:

```text
admin/schema.graphql
admin/src/graphql/types.ts
admin/src/domains/inventory/products/graphql/queries.ts
admin/src/domains/inventory/products/graphql/operation-types.ts
admin/src/domains/inventory/products/hooks/use-products.ts
admin/src/domains/inventory/products/page/page.tsx
admin/src/domains/inventory/products/page/filter-schema.ts
admin/src/domains/inventory/categories/graphql/queries.ts
admin/src/domains/inventory/categories/graphql/operation-types.ts
admin/src/domains/inventory/categories/hooks/use-category-products.ts
admin/src/domains/inventory/categories/components/category-details-card/sections/products-section.tsx
```

## 1. Разделить root product order input и category-products order input

В `services/catalog/src/api/graphql-admin/schema/product.graphql`:

- оставить `ProductSortBy` и `ProductSortInput`, потому что они используются для collection/category PLP semantics и default sort;
- переименовать ручной order input. Это listing-level sort contract, а не product table order contract:

```graphql
input ListingOrderByInput {
  field: ProductSortBy!
  direction: SortDirection
}
```

В `services/catalog/src/api/graphql-admin/schema/category.graphql`:

```graphql
products(
  first: Int
  after: String
  last: Int
  before: String
  orderBy: [ListingOrderByInput!]
  where: CategoryProductWhereInput
): CategoryProductConnection!
```

Обновить TypeScript resolver-local interface в `CategoryProductConnectionResolver.ts` с `ProductOrderByInput` на `ListingOrderByInput`.

## 2. Создать product query builder для generated filters/sorts

В `ProductRepository.ts` оставить отдельные query builders с явными ролями:

- `productQuery` для simple `getMany/getOne`;
- `productRelayQuery` для `catalogQuery.products` relay list.

Минимальный первый вариант:

```ts
export const productRelayQuery = createRelayQuery(
  createQuery(product).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "product", tieBreaker: "id" },
);
```

Generated root product filters/sorts тогда включают поля product table:

- `id`;
- `handle`;
- `publishedAt`;
- `createdAt`;
- `updatedAt`.

`projectId`, `deletedAt`, `revision` не должны быть публичными filter/order fields.

Если product list должен фильтровать/сортировать по `title`, `category`, `brand`, `inventory`, `variantsCount` в том же релизе, не добавлять это вручную в GraphQL schema. Нужно расширять drizzle-query builder через joins/views и генерировать схему из него:

- `title`: join на `productTranslation` с locale-aware ограничением в repository/query design;
- `category`: join на `productCategory`/`category` или отдельный dedicated list view;
- `brand`: join на feature tables только если есть стабильная бизнес-модель brand feature;
- `inventory`: скорее inventory service/widget boundary, не добавлять в catalog product query без отдельного cross-service решения;
- `variantsCount`: либо materialized/read model, либо отдельный view; не вычислять в resolver для сортировки.

Recommended first cut: root products supports table-level filters/sorts only. UI controls для unsupported полей остаются выключенными или переводятся отдельным follow-up.

## 3. Сгенерировать ProductWhereInput/ProductOrderByInput из drizzle-query

В `services/catalog/scripts/generate-filters.ts`:

1. Импортировать `productRelayQuery`.
2. Добавить генерацию:

```ts
const productWhere = generateWhereInputType(productRelayQuery, "Product", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "revision"],
});

const productOrderBy = generateOrderByInputType(productRelayQuery, "Product", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "revision"],
});
```

3. Добавить секцию `# ---- Product ----` в generated content до `CategoryProduct` или рядом с `Category`.

После запуска generation в `services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql` должны появиться:

```graphql
input ProductWhereInput
enum ProductOrderField
input ProductOrderByInput
```

Не редактировать `__generated__/filters.graphql` вручную.

## 4. Подключить generated Product inputs в root products schema

В `services/catalog/src/api/graphql-admin/schema/base.graphql` расширить `CatalogQuery.products`:

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

`ProductWhereInput` и `ProductOrderByInput` должны существовать только в generated schema file. Не добавлять ручные copies в `product.graphql` или `base.graphql`.

## 5. Нормализовать raw GraphQL input в resolver boundary

В `filter-normalizers.ts` добавить product normalizer по паттерну category/variant:

```ts
export function normalizeProductWhereInput(
  where: ProductRelayInput["where"] | null | undefined,
): ProductRelayInput["where"];
```

Минимальная нормализация:

- рекурсивно пройти `_and`, `_or`, `_not`;
- decode `id` через `GlobalIdEntity.Product`;
- если позже в query появятся relation fields, decode соответствующие ID filters там же.

В `QueryResolver.ts`:

```ts
products(args: ProductConnectionInput) {
  return new ProductConnectionResolver(
    {
      ...args,
      where: normalizeProductWhereInput(args.where),
    },
    this.$ctx,
  );
}
```

`orderBy` не маппить через `ProductSortBy`. Generated `ProductOrderField` значения должны проходить в drizzle-query как field names (`createdAt`, `handle`, etc.).

## 6. Исправить ProductRepository.getConnection

В `ProductRepository.getConnection(args)`:

- repository остается владельцем tenant и soft-delete filters;
- user `where` merge через `_and`;
- default sort совпадает с categories pattern;
- `totalCount` считается через `productRelayQuery.count` с тем же `mergedWhere`;
- `select` должен гарантировать поля для cursor/order, если текущий drizzle-query relay builder этого требует.

Целевой pattern:

```ts
async getConnection(args: ProductRelayInput): Promise<ProductConnectionResult> {
  const { where, orderBy, ...paginationArgs } = args;

  const mergedWhere: ProductRelayInput["where"] = {
    _and: [
      { projectId: { _eq: this.storeId } },
      { deletedAt: { _is: null } },
      ...(where ? [where] : []),
    ],
  };

  const executeInput: ProductRelayInput = {
    ...paginationArgs,
    where: mergedWhere,
    orderBy: orderBy ?? [
      { field: "createdAt", direction: "desc" },
      { field: "id", direction: "desc" },
    ],
  };

  const [result, totalCount] = await Promise.all([
    productRelayQuery.execute(this.connection, executeInput),
    productRelayQuery.count(this.connection, { where: mergedWhere }),
  ]);

  return {
    edges: result.edges.map((edge) => ({
      cursor: edge.cursor,
      nodeId: edge.node.id,
    })),
    pageInfo: result.pageInfo,
    totalCount,
  };
}
```

Do not use `this.count()` for filtered connection count.

## 7. Regenerate service resolver types and admin schema

Required generated artifacts after source schema changes:

- `services/catalog/src/resolvers/admin/generated/types.ts`;
- `services/catalog/src/resolvers/admin/generated/schemas.ts`;
- exported/composed admin schema artifacts consumed by `admin/schema.graphql`;
- `admin/src/graphql/types.ts`.

Use project CLI/codegen/schema generation flow. Do not edit generated TS or generated GraphQL schema files by hand.

Important generation cwd detail:

- `services/catalog/scripts/generate-filters.ts` writes `src/api/graphql-admin/schema/__generated__/filters.graphql` relative to the current working directory.
- Run the filters generation command from `services/catalog/`, or use the project CLI command that sets this cwd internally.
- Do not run the script from repository root unless the command explicitly changes cwd to `services/catalog/`.

Project instruction: do not run `test` or `tsc`. Run `build` only when a new compiled code version is needed.

## 8. Frontend Admin products query cutover

After `admin/src/graphql/types.ts` contains `ApiProductWhereInput`, `ApiProductOrderByInput`, and `ProductOrderField`:

### `products/graphql/queries.ts`

```graphql
query Products(
  $first: Int
  $after: String
  $last: Int
  $before: String
  $where: ProductWhereInput
  $orderBy: [ProductOrderByInput!]
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
      edges { cursor node { ...ProductListFields } }
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      totalCount
    }
  }
}
```

### `products/graphql/operation-types.ts`

Add variables:

```ts
where?: ApiProductWhereInput | null;
orderBy?: ApiProductOrderByInput[] | null;
```

### `use-products.ts`

- extend options with `RelayCursorPaginationVariables`;
- accept `where`, `orderBy`;
- pass them to `PRODUCTS_QUERY`;
- continue using `data ?? previousData`.

### products page sorting/filtering

Initial server-backed controls should only use generated fields:

- search by `handle` via `{ handle: { _containsi: value } }`;
- status filter can map to `publishedAt` only if product semantics are confirmed:
  - published: `{ publishedAt: { _isNot: true } }`;
  - draft: `{ publishedAt: { _is: true } }`;
- sort mappings:
  - `handle -> ProductOrderField.Handle`;
  - `createdAt -> ProductOrderField.CreatedAt`;
  - `updatedAt -> ProductOrderField.UpdatedAt`;
  - `publishedAt -> ProductOrderField.PublishedAt`;

Generated GraphQL enum values are lowercase field names (`handle`, `createdAt`, etc.), but generated frontend TypeScript enum members follow GraphQL Codegen naming (`Handle`, `CreatedAt`, etc.).

Do not present `title`, `category`, `brand`, `inventory`, or `variantsCount` as server-backed filters/sorts until backend query builder exposes generated fields for them.

Prefer `RelayCursorPagination`/`useRelayCursorPagination` for parity with categories/inventory pages. If keeping `CursorPagination` temporarily, reset cursor history when `where` or `orderBy` changes.

## 9. Category-products frontend compatibility cutover

Because manual PLP order input is renamed:

- `admin/src/domains/inventory/categories/graphql/queries.ts`
  - `$orderBy: [ListingOrderByInput!]`.
- `admin/src/domains/inventory/categories/graphql/operation-types.ts`
  - replace `ApiProductOrderByInput` with generated `ApiListingOrderByInput`.
- `use-category-products.ts` and `products-section.tsx`
  - update TypeScript imports/types only;
  - keep `ProductSortBy.Manual/Name/Newest/Price` behavior.

This is a schema compatibility rename, not a behavioral rewrite.

Runtime mapping in `CategoryRepository.getCategoryProductsConnection()` must remain unchanged:

- `MANUAL` -> `category.lexoRank`;
- `NAME` -> `translation.title`;
- `NEWEST` -> `createdAt`;
- `PRICE` -> `priceRange.minAmountMinor` for ascending and `priceRange.maxAmountMinor` for descending.

## 10. Drift and verification checks

Do not run tests or `tsc`.

Use grep-style checks while implementing:

```sh
rg 'products\\(' services/catalog/src/api/graphql-admin/schema/base.graphql
rg 'input ProductWhereInput|enum ProductOrderField|input ProductOrderByInput' services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql
rg 'input ProductWhereInput|enum ProductOrderField|input ProductOrderByInput' services/catalog/src/api/graphql-admin/schema --glob '!__generated__/filters.graphql'
rg 'ListingOrderByInput|ProductOrderByInput' services/catalog/src/api/graphql-admin/schema services/catalog/src/resolvers/admin admin/src/domains/inventory/categories
rg 'ProductWhereInput|ProductOrderField|ProductOrderByInput' admin/schema.graphql admin/src/graphql/types.ts
```

Expected:

- generated `ProductWhereInput/ProductOrderField/ProductOrderByInput` exist exactly in `__generated__/filters.graphql`;
- no manual `ProductWhereInput` or generated-name `ProductOrderByInput` remains in non-generated catalog schema files;
- category-products uses `ListingOrderByInput`;
- root `CatalogQuery.products` exposes `where/orderBy`;
- generated service/admin TS types reflect the final schema.
- category-products still maps `MANUAL/NAME/NEWEST/PRICE` to the same repository order fields after the input rename.

Build verification:

- Run build only if needed for a new compiled version.
- Do not run `test` or `tsc` per project instructions.

Manual API verification after implementation:

- `catalogQuery.products(first: 20)` returns same list as before;
- `totalCount` equals all matching products for current `where`, not all store products;
- `where: { handle: { _containsi: "..." } }` filters server-side;
- `orderBy: [{ field: createdAt, direction: desc }]` returns stable cursor pages;
- product global IDs in `where.id` are accepted and normalized;
- `Category.products(orderBy: [{ field: NAME, direction: asc }])` still works after input rename.
- category-products `MANUAL/NAME/NEWEST/PRICE` sorting keeps the same runtime behavior after the input rename.

## Acceptance criteria

- `catalogQuery.products` accepts generated `ProductWhereInput` and `[ProductOrderByInput!]`.
- `ProductWhereInput`, `ProductOrderField`, `ProductOrderByInput` are generated from `productRelayQuery`, not manually written.
- Legacy PLP/listing sort input is renamed to `ListingOrderByInput` and category-products behavior is preserved.
- `QueryResolver.products()` normalizes product global ID filters before constructing `ProductConnectionResolver`.
- `ProductRepository.getConnection()` uses `productRelayQuery.execute()` and `productRelayQuery.count()` with the same merged `where`.
- Repository-internal filters keep `projectId = storeId` and `deletedAt is null` out of the public schema.
- Admin frontend can pass `where/orderBy` for supported product fields after schema/codegen refresh.
- Category-products runtime sort mapping for `MANUAL/NAME/NEWEST/PRICE` is unchanged.
