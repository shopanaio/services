# План миграции Products Page на `usePageConfig` и API-фильтры

## Цель

Перевести `admin/src/domains/inventory/products/page/page.tsx` на общий page configuration approach через `usePageConfig`, чтобы Products page использовала один reusable слой для:

- AG Grid sort state;
- grid state persistence;
- search;
- filter-to-GraphQL `where`;
- cursor pagination variables;
- API `orderBy`.

Одновременно нужно заменить текущий набор product filters на фильтры, которые реально поддерживаются Admin GraphQL API.

## Контекст

План выровнен с:

- `knowledge/vault/patterns/admin-graphql-layer.md`;
- `knowledge/vault/packages/drizzle-query/filters.md`;
- `knowledge/vault/patterns/currency-handling.md`;
- текущей products GraphQL integration в `admin/src/domains/inventory/products/graphql`;
- текущим reusable hook `admin/src/hooks/use-page-config.ts`;
- текущей media page, которая уже использует `usePageConfig`.

## Текущий baseline

- Products page уже API-backed и читает `catalogQuery.products`.
- Products page сейчас вручную собирает:
  - `searchValue`;
  - `sortModel`;
  - `useFilters` с custom `productFilterAdapter`;
  - `mapProductSortModelToOrderBy`;
  - `useRelayCursorPagination`;
  - `listQueryVariables`.
- Сортировка AG Grid уже вынесена в reusable `useGridSort`.
- Более высокий reusable hook `usePageConfig` существует, но Products page его не использует.
- `usePageConfig` сейчас используется только Media page, поэтому изменения в нем нужно делать обратно совместимо.

## Доступный API contract

Generated `ApiProductWhereInput` поддерживает больше полей, чем нужно для этой миграции. Для target UX разделять поля, которые реально используются в Products page, и поля, которые просто доступны в generated schema.

Target search/filter subset:

| UI use | API field | Filter type | Usage |
|---|---|---|---|
| Title toolbar search | `name` | `ApiStringFilter` | Только toolbar search через `where.name._containsi`; не добавлять отдельный filter chip. |
| Primary category filter | `primaryCategoryId` | `ApiIdFilter` | Relation/entity filter по category id через `_in`. |
| Brand filter | `vendorId` | `ApiIdFilter` | Relation/entity filter по vendor id через `_in`. |
| Min price filter | `minPriceMinor` | `ApiIntFilter` | Price filter, API value in minor units. |
| Max price filter | `maxPriceMinor` | `ApiIntFilter` | Price filter, API value in minor units. |

Generated поля `handle`, `primaryCategoryName`, и `brandName` не входят в target filter chips для этой миграции:

- `handle` не входит в requested filter set;
- `primaryCategoryName` остается доступным API string filter field, но Products UX должен использовать entity filter через `primaryCategoryId`;
- `brandName` остается available generated API field, но Brand filter должен быть entity/relation filter по `vendorId`, чтобы UI работал с выбранным vendor id, а не со строковым совпадением имени.

Generated `ProductOrderField` сейчас поддерживает:

| UI column | AG Grid `colId` | API order field |
|---|---|---|
| Product | `title` | `ProductOrderField.Name` |
| Min price | `minPriceMinor` | `ProductOrderField.MinPriceMinor` |
| Max price | `maxPriceMinor` | `ProductOrderField.MaxPriceMinor` |
| Category | `primaryCategoryName` | `ProductOrderField.PrimaryCategoryName` |
| Brand | `brand` | `ProductOrderField.BrandName` |

`Stock` не должен фильтроваться и не должен сортироваться. В API нет product-level stock filter/order field для текущей таблицы.

## Target UX contract

| UI control | Target behavior | API mapping | Notes |
|---|---|---|---|
| Title search | Toolbar search only | `where.name._containsi` | UI говорит "title", но generated API filter field сейчас называется `name`. Не добавлять отдельный title filter chip. |
| Primary category | Entity filter | `where.primaryCategoryId._in` | Использовать relation/entity picker для `category`. |
| Min price | Price filter | `where.minPriceMinor` | Значение отправлять в minor units. |
| Max price | Price filter | `where.maxPriceMinor` | Значение отправлять в minor units. |
| Brand | Entity filter | `where.vendorId._in` | Brand должен быть relation/entity filter. В текущей schema brand entity представлена через `Vendor`. |
| Stock | none | none | Не добавлять filter schema entry; колонка остается `sortable: false`. |

### Brand entity filter contract

Brand filter должен быть `FilterType.Relation` и должен отправлять entity ids в `vendorId._in`, потому что текущая generated schema представляет brand entity через `ApiProduct.vendor` / `ApiVendor`.

Backend Catalog Admin API уже содержит vendors read path:

- `services/catalog/src/api/graphql-admin/schema/base.graphql` exposes `vendor(id: ID!)` and `vendors(...)`;
- `services/catalog/src/api/graphql-admin/schema/product.graphql` defines `Vendor`, `VendorConnection`, and `VendorEdge`;
- `services/catalog/src/resolvers/admin/QueryResolver.ts` implements `vendor` and `vendors`.

Current admin client generated types expose `ApiVendor` through `ApiProduct.vendor`, but `admin/src/graphql/types.ts` does not currently expose `catalogQuery.vendors` / `catalogQuery.vendor` entrypoints. Поэтому Brand filter implementation must include admin GraphQL integration/codegen for vendors before enabling the `vendor` relation filter in Products.

Important schema drift detail:

- `services/catalog/src/api/graphql-admin/schema/base.graphql` already contains `vendor` / `vendors`;
- `services/catalog/src/resolvers/admin/QueryResolver.ts` already implements both read paths;
- current exported federation schema files do not expose those fields yet: `infra/federation/schema/catalog-admin.graphql` and `infra/federation/supergraph-admin.graphql` currently include `type Vendor`, but `CatalogQuery` lacks `vendor` / `vendors`;
- `admin/codegen.ts` reads `../infra/federation/supergraph-admin.graphql`, so Admin codegen alone cannot expose vendors until the Admin federation schema export/composition is refreshed.

Do not degrade Brand to `brandName` string filter. `brandName` can stay available in generated API types, but it is not the target UX for this migration.

## Shared changes

### 1. Ослабить generic constraint в `usePageConfig`

`usePageConfig` сейчас ограничивает `TWhereInput extends Record<string, unknown>`. Generated GraphQL input types вроде `ApiProductWhereInput` могут не проходить это ограничение без кастов.

Изменить constraints на `object`:

```ts
export interface UsePageConfigOptions<
  TData,
  TWhereInput extends object,
  TOrderField extends string,
> { ... }
```

То же сделать в `UsePageConfigReturn`, `usePageConfig` и helper types вроде `FilterTransformer`.

Цель: использовать generated API input types напрямую, без локального `Record<string, unknown>` alias.

### 2. Не ломать Media page

Media page уже использует `usePageConfig` и `CursorPagination`.

При изменениях:

- сохранить текущие returned fields: `first`, `last`, `after`, `before`, `pageSize`, `setPageSize`, `goToNextPage`, `goToPrevPage`, `getRangeStart`, `getRangeEnd`;
- не переименовывать existing public API без отдельной миграции Media page;
- новые helpers добавлять additive.

### 3. Добавить reusable filter transformers

Добавить локально в Products page или в shared hook рядом с `createStartsWithTransformer`:

```ts
createRelationInTransformer(fieldName)
createMinorUnitPriceTransformer(fieldName)
```

Expected behavior:

- relation values должны храниться в `IFilterValue.value` как `string[]` ids и мапиться в `{ [fieldName]: { _in: ids } }`;
- relation transformer поддерживает только `_in`; empty values возвращают `null`; unsupported operators возвращают `null`, если fallback небезопасен;
- relation transformer technically optional when the relation control always returns a clean `string[]`, because `usePageConfig` already handles `FilterOperator.In` + array as `_in`; if added, use it as a guard/normalizer, not as a new behavior layer;
- price transformer is mandatory for Products price filters: current `FilterValueControl` stores numeric input as `[value]`, while default `usePageConfig` scalar conversion would send the array directly to `_eq` / `_gt` / `_gte` / `_lt` / `_lte`;
- price transformer supports only `_eq`, `_gt`, `_gte`, `_lt`, `_lte`;
- price transformer unwraps the first non-empty value, verifies it is finite numeric input, converts user-facing major units to integer minor units, and maps to `{ [fieldName]: { [operator]: minorValue } }`;
- empty or invalid price values return `null`, чтобы filter был пропущен;
- unsupported price operators return `null`, not `undefined`, because default conversion is unsafe for `FilterType.Price` array values.

Preferred UX: пользователь вводит major units, transformer uses the current fixed two-decimal convention and sends `Math.round(value * 100)` to the API. This matches current product price display, where `formatPrice` formats minor-unit amounts by dividing by 100. Do not reuse raw minor-unit semantics from variant editor inputs for these filter controls.

### 4. Relation controls для entity filters

`FilterType.Relation` уже есть, но `relationControlRegistry` сейчас не имеет registered controls.

Нужно добавить generic или specific relation control:

- `CategoryRelationControl` для `entity: "category"`;
- `VendorRelationControl` для `entity: "vendor"` как обязательная часть brand entity filter;
- или generic `EntityPickerRelationControl`, который берет `entity`, открывает entity picker modal и отображает выбранные labels.

Important:

- entity keys должны совпадать с registered picker configs. Сейчас category picker registered как `entityType: "category"`, не `"Category"`.
- category picker уже есть: `admin/src/shared/components/entity-picker-modal/configs/category-picker-config.ts`.
- vendor picker сейчас отсутствует в admin, его нужно добавить для brand entity filter после подключения vendors query в generated admin GraphQL client.
- relation controls must store only id arrays in `IFilterValue.value`; labels/entities may be cached locally for display, but GraphQL filter transformer input must remain ids.
- if implementing generic `EntityPickerRelationControl`, register it in `relationControlRegistry` for each supported entity key (`"category"`, `"vendor"`) and ensure the registration module is imported during Admin startup.

### 5. Admin vendors GraphQL integration

Перед включением Brand filter в `filterSchema` добавить admin read integration для vendors:

- refresh/export Catalog Admin schema into `infra/federation/schema/catalog-admin.graphql` so `CatalogQuery` contains `vendor(id: ID!)` and `vendors(...)`, and the schema contains `VendorConnection`, `VendorWhereInput`, `VendorOrderByInput`, and `VendorOrderField`;
- compose/refresh `infra/federation/supergraph-admin.graphql` so the same vendor query fields and inputs exist in the actual schema consumed by Admin codegen;
- run Admin GraphQL codegen through the approved Shopana project workflow, not by hand-editing `admin/src/graphql/types.ts`, so generated types contain `catalogQuery.vendors` / `catalogQuery.vendor`, `ApiVendorConnection`, `ApiVendorWhereInput`, `ApiVendorOrderByInput`, and `ApiCatalogQueryVendorsArgs`;
- добавить vendors query operation under admin inventory domain. Если отдельного `vendors` module нет, допустимо держать module-local read path under `admin/src/domains/inventory/products/graphql` только для picker use case;
- добавить `useVendors` hook, который возвращает generated API objects directly according to `knowledge/vault/patterns/admin-graphql-layer.md`;
- добавить `vendor-picker-config.ts` for entity picker with `entityType: "vendor"`, columns `Vendor`/`Name`, pagination, optional search by `name._containsi`, and optional default order by name;
- зарегистрировать vendor picker config in `admin/src/shared/components/entity-picker-modal/register.ts`;
- only after this, enable `{ entity: "vendor", payloadKey: "vendorId" }` in Products filter schema.

This is an implementation dependency, not a backend API blocker.

## Products filter schema target

Файл: `admin/src/domains/inventory/products/page/filter-schema.ts`

Удалить из filter chips:

- `name`, потому что title идет через toolbar search;
- `handle`, потому что он не входит в requested filter set;
- old category string filter по `primaryCategoryName`, потому что нужен entity filter.

Target schema:

```ts
export const filterSchema: IFilterSchema[] = [
  {
    key: "primaryCategory",
    label: "Primary category",
    description: "Filter by primary category",
    type: FilterType.Relation,
    operators: relationOperators,
    payloadKey: "primaryCategoryId",
    entity: "category",
  },
  {
    key: "minPrice",
    label: "Min price",
    description: "Filter by product minimum price",
    type: FilterType.Price,
    operators: priceOperators,
    payloadKey: "minPriceMinor",
  },
  {
    key: "maxPrice",
    label: "Max price",
    description: "Filter by product maximum price",
    type: FilterType.Price,
    operators: priceOperators,
    payloadKey: "maxPriceMinor",
  },
  {
    key: "brand",
    label: "Brand",
    description: "Filter by brand/vendor",
    type: FilterType.Relation,
    operators: relationOperators,
    payloadKey: "vendorId",
    entity: "vendor",
  },
];
```

If implementing incrementally, omit the `brand` schema entry until both dependencies are ready:

- Admin generated GraphQL client exposes `catalogQuery.vendor` / `catalogQuery.vendors`;
- vendor picker config and `relationControlRegistry` entry for `entity: "vendor"` are registered.

## Products page migration

### 1. Replace manual local state

Remove from `page.tsx`:

- `searchValue` state;
- `sortModel` state;
- `useFilters`;
- `productFilterAdapter`;
- `buildStringFilter`;
- `mapProductSortModelToOrderBy`;
- `resetKey`;
- direct `useRelayCursorPagination`;
- direct `useGridState`;
- direct `useGridSort`.

Keep:

- `gridRef`;
- selection state;
- modal stack behavior;
- delete/refetch behavior;
- column definitions.

### 2. Add `usePageConfig`

Target setup:

```ts
const productSortFieldMapping: SortFieldMapping<ProductOrderField> = {
  title: ProductOrderField.Name,
  minPriceMinor: ProductOrderField.MinPriceMinor,
  maxPriceMinor: ProductOrderField.MaxPriceMinor,
  primaryCategoryName: ProductOrderField.PrimaryCategoryName,
  brand: ProductOrderField.BrandName,
};

const buildProductSearchCondition = (
  search: string,
): Partial<ApiProductWhereInput> => ({
  name: { _containsi: search },
});

const productFilterTransformers = {
  primaryCategoryId: createRelationInTransformer<ApiProductWhereInput>(
    "primaryCategoryId",
  ),
  minPriceMinor: createMinorUnitPriceTransformer<ApiProductWhereInput>(
    "minPriceMinor",
  ),
  maxPriceMinor: createMinorUnitPriceTransformer<ApiProductWhereInput>(
    "maxPriceMinor",
  ),
  vendorId: createRelationInTransformer<ApiProductWhereInput>("vendorId"),
};

const pageConfig = usePageConfig<
  ApiProduct,
  ApiProductWhereInput,
  ProductOrderField
>({
  gridRef,
  storageKey: "products-grid-state",
  filterSchema,
  sortFieldMapping: productSortFieldMapping,
  defaultPageSize: 20,
  buildSearchCondition: buildProductSearchCondition,
  filterTransformers: productFilterTransformers,
});
```

Important: keep `sortFieldMapping`, `buildSearchCondition`, and `filterTransformers` as stable references, as shown above. Do not pass them inline from the component render. `usePageConfig` recomputes `where` / `orderBy` from these inputs and resets cursor pagination when they change. Treat this as a hard requirement, not a style preference.

Do not add a string Brand filter. If `vendor` relation picker is not available, implement it before enabling the Brand filter.

### 3. Build query variables from `pageConfig`

```ts
const listQueryVariables = useMemo<ProductsQueryVariables>(
  () => ({
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as ApiProductOrderByInput[] | null,
  }),
  [
    pageConfig.first,
    pageConfig.after,
    pageConfig.last,
    pageConfig.before,
    pageConfig.where,
    pageConfig.orderBy,
  ],
);
```

Longer-term improvement: type `usePageConfig` orderBy return so `OrderByInput<ProductOrderField>[]` is assignable without a cast.

### 4. Replace `FilterWidget`

```tsx
<FilterWidget
  {...pageConfig.filterWidgetProps}
  searchPlaceholder="Search products..."
/>
```

Search placeholder can stay "Search products..." or become "Search by title...". The backend mapping remains `where.name._containsi`.

### 5. Replace grid sort/state props

```tsx
<AgGridReact<ApiProduct>
  ...
  initialState={pageConfig.gridStateProps.initialState}
  onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
  onSortChanged={pageConfig.onSortChanged}
/>
```

Keep `defaultColDef.comparator = () => 0`, because sorted order must come from the server via `orderBy`, not client-side resorting of the current page.

### 6. Replace pagination integration

Minimal migration should match current `usePageConfig` consumer style and use `CursorPagination` directly:

```tsx
<CursorPagination
  name="products"
  total={totalCount}
  rangeStart={pageConfig.getRangeStart(products.length)}
  rangeEnd={Math.min(pageConfig.getRangeEnd(products.length), totalCount)}
  pageSize={pageConfig.pageSize}
  pageSizeOptions={pageConfig.pageSizeOptions}
  hasNext={pageInfo?.hasNextPage ?? false}
  hasPrev={pageInfo?.hasPreviousPage ?? false}
  onNext={() => {
    if (pageInfo?.endCursor) {
      pageConfig.goToNextPage(pageInfo.endCursor);
    }
  }}
  onPrev={() => {
    if (pageInfo?.startCursor) {
      pageConfig.goToPrevPage(pageInfo.startCursor);
    }
  }}
  onPageSizeChange={pageConfig.setPageSize}
/>
```

Optional follow-up: refactor `usePageConfig` to use `useRelayCursorPagination` internally and expose a `pagination` object compatible with `RelayCursorPagination`. Do that only after migrating Media page or preserving old fields.

## Product columns after migration

Keep sortable columns:

- Product/title;
- Min price;
- Max price;
- Category;
- Brand.

Keep `Stock`:

- visible if product list still needs it;
- `sortable: false`;
- no filter schema entry;
- no `ProductOrderField` mapping;
- no `ApiProductWhereInput` mapping.

## API gaps and decisions

### Category entity filter

Available enough for first pass:

- Product API supports `primaryCategoryId`;
- category picker config exists;
- relation control registration is missing.

Decision: add relation control support and use `primaryCategoryId._in`.

### Brand entity filter

Partial support:

- Product API supports `vendorId`;
- `ApiProduct.vendor` exists;
- backend Catalog Admin API supports `vendor` / `vendors`;
- exported Admin federation schema currently does not expose `CatalogQuery.vendor` / `CatalogQuery.vendors`, so supergraph/codegen must be refreshed before frontend vendors operations can compile;
- admin generated client currently does not expose `catalogQuery.vendors`;
- no vendor picker config was found in admin client.

Decision:

- refresh/export/compose Admin GraphQL schema, run Admin codegen, add `useVendors`, and add vendor picker config;
- use `vendorId._in` for Brand filter after vendors read path is available in admin client;
- do not implement a string Brand filter for this migration.

### Price filters

Available:

- Product API supports `minPriceMinor` and `maxPriceMinor`;
- filter UI has `FilterType.Price`;
- project money convention uses minor units.

Decision: use minor units in API. Preferred UI input is major units with transformer to minor units.

For Products page filters this transformer is required, because the current filter control stores price input as an array while GraphQL scalar operators expect a number.

## Implementation phases

### Phase 1: Shared hook compatibility

- Relax `usePageConfig` generic constraints to accept generated GraphQL input types.
- Relax helper generic constraints too, including `FilterTransformer` and `createStartsWithTransformer`, so generated input types can be used without `Record<string, unknown>` aliases.
- Add reusable relation and minor-unit price transformers if they are useful beyond Products.
- Make the Products price transformer unwrap `[value]` from `FilterType.Price`, validate finite input, convert major units to minor units with `Math.round(value * 100)`, and avoid unsafe default conversion.
- If adding relation transformer, keep it as a guard/normalizer for id arrays; default `FilterOperator.In` conversion in `usePageConfig` is already safe for clean `string[]` values.
- Keep `sortFieldMapping`, `buildSearchCondition`, and `filterTransformers` stable top-level constants or memoized references for every `usePageConfig` consumer.
- Stabilize the existing Media page `filterTransformers` object or otherwise ensure `usePageConfig` does not reset pagination every render because of inline object identity.
- Keep Media page compiling with the old returned fields.

### Phase 2: Admin vendors integration

- Refresh/export Catalog Admin schema into `infra/federation/schema/catalog-admin.graphql` and verify `CatalogQuery.vendor`, `CatalogQuery.vendors`, `VendorConnection`, `VendorWhereInput`, and `VendorOrderByInput` exist there.
- Compose/refresh `infra/federation/supergraph-admin.graphql` and verify the same vendor fields/types exist there, because Admin codegen reads this file.
- Run Admin GraphQL codegen through the approved Shopana workflow and verify `admin/src/graphql/types.ts` exposes `catalogQuery.vendor`, `catalogQuery.vendors`, `ApiVendorConnection`, `ApiVendorWhereInput`, `ApiVendorOrderByInput`, and `ApiCatalogQueryVendorsArgs`.
- Do not hand-edit generated GraphQL types.
- Add vendors query operation and `useVendors` hook.
- Add/register `vendor-picker-config.ts`.
- Keep Brand filter disabled until this phase is complete and Phase 3 registers the vendor relation control.

### Phase 3: Relation controls

- Add/register category relation control for filters.
- Confirm selected relation values are stored as IDs.
- Add/register vendor relation control for Brand using the vendor picker config.
- Keep `IFilterValue.value` for relation filters as `string[]` ids. Relation controls may keep a local label cache for display, but GraphQL transformer input must remain ids.
- If using generic `EntityPickerRelationControl`, register it for concrete entity keys (`"category"` and `"vendor"`) in `relationControlRegistry`; entity picker config registration alone is not enough.
- Confirm relation control registration code is imported during Admin startup before Products page renders.

### Phase 4: Products filter schema

- Replace `filter-schema.ts` with target filters.
- Remove handle/name filter chips.
- Use title toolbar search through `buildSearchCondition`.
- Keep stock out of filter schema.
- Add Brand only after Phase 2 provides vendors read path and vendor picker, and Phase 3 registers a vendor relation control.

### Phase 5: Products page migration

- Replace manual page state with `usePageConfig`.
- Build GraphQL query variables from `pageConfig`.
- Wire `FilterWidget`, `AgGridReact`, and pagination to `pageConfig`.
- Keep existing delete/refetch and modal behavior.
- Keep server-side sorting behavior.
- Use stable references for `sortFieldMapping`, `buildSearchCondition`, and `filterTransformers`.

### Phase 6: Verification

Do not run `test` or `tsc` per project instruction.

When implementation changes code and a new build is needed, run project build through the approved project workflow.

Manual verification checklist:

- Generated/admin schema verification before enabling Brand:
  - `infra/federation/schema/catalog-admin.graphql` contains `CatalogQuery.vendor`, `CatalogQuery.vendors`, `VendorConnection`, `VendorWhereInput`, and `VendorOrderByInput`;
  - `infra/federation/supergraph-admin.graphql` contains the same vendor read path;
  - `admin/src/graphql/types.ts` contains `ApiCatalogQueryVendorsArgs`, `ApiVendorConnection`, `ApiVendorWhereInput`, and `ApiVendorOrderByInput`.
- Search by title changes `where.name._containsi` and resets to first page.
- Primary category filter sends `primaryCategoryId._in`.
- Primary category relation control displays selected category labels but stores/sends category ids.
- Min price filter input `12.34` sends `minPriceMinor` with numeric minor-unit value `1234`, not `[12.34]`.
- Max price filter input `12.34` sends `maxPriceMinor` with numeric minor-unit value `1234`, not `[12.34]`.
- Brand filter sends `vendorId._in`.
- Brand relation control displays selected vendor labels but stores/sends vendor ids.
- Sort Product/Min price/Max price/Category/Brand updates `orderBy` and resets to first page.
- Stock column does not show sort affordance and does not appear in filters.
- Pagination still uses `pageInfo.endCursor/startCursor`.
- Grid state persistence still uses `products-grid-state`.
- Changing unrelated component state on Products or Media page does not reset cursor pagination because `usePageConfig` references are stable.
