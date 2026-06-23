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

Generated `ApiProductWhereInput` сейчас поддерживает:

| API field | Filter type |
|---|---|
| `name` | `ApiStringFilter` |
| `handle` | `ApiStringFilter` |
| `primaryCategoryId` | `ApiIdFilter` |
| `primaryCategoryName` | `ApiStringFilter` |
| `vendorId` | `ApiIdFilter` |
| `minPriceMinor` | `ApiIntFilter` |
| `maxPriceMinor` | `ApiIntFilter` |

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

Если в admin client нет vendor/brand list query или picker config, это blocker для brand filter implementation. Нужно сначала добавить vendor/brand picker и соответствующий API read path, а не деградировать filter до string input.

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

- relation values приходят как id array и мапятся в `{ [fieldName]: { _in: ids } }`;
- price values приходят из UI и мапятся в numeric minor units;
- empty values возвращают `null`, чтобы filter был пропущен;
- unsupported operators возвращают `undefined`, чтобы default conversion сработал только там, где это безопасно.

Если `FilterType.Price` оставляет input в minor units, явно указать это в UI label/help. Preferred UX: пользователь вводит major units, transformer умножает на 100 и округляет до integer minor units.

### 4. Relation controls для entity filters

`FilterType.Relation` уже есть, но `relationControlRegistry` сейчас не имеет registered controls.

Нужно добавить generic или specific relation control:

- `CategoryRelationControl` для `entity: "category"`;
- `VendorRelationControl` для `entity: "vendor"` как обязательная часть brand entity filter;
- или generic `EntityPickerRelationControl`, который берет `entity`, открывает entity picker modal и отображает выбранные labels.

Important:

- entity keys должны совпадать с registered picker configs. Сейчас category picker registered как `entityType: "category"`, не `"Category"`.
- category picker уже есть: `admin/src/shared/components/entity-picker-modal/configs/category-picker-config.ts`.
- vendor picker сейчас отсутствует, его нужно добавить для brand entity filter.

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
const pageConfig = usePageConfig<
  ApiProduct,
  ApiProductWhereInput,
  ProductOrderField
>({
  gridRef,
  storageKey: "products-grid-state",
  filterSchema,
  sortFieldMapping: {
    title: ProductOrderField.Name,
    minPriceMinor: ProductOrderField.MinPriceMinor,
    maxPriceMinor: ProductOrderField.MaxPriceMinor,
    primaryCategoryName: ProductOrderField.PrimaryCategoryName,
    brand: ProductOrderField.BrandName,
  },
  defaultPageSize: 20,
  buildSearchCondition: (search) => ({
    name: { _containsi: search },
  }),
  filterTransformers: {
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
  },
});
```

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
- no vendor list query/picker was found in admin client.

Decision:

- add module-local vendor/brand picker config and use `vendorId._in`;
- if vendor list API does not exist, add backend/admin API support first;
- do not implement a string Brand filter for this migration.

### Price filters

Available:

- Product API supports `minPriceMinor` and `maxPriceMinor`;
- filter UI has `FilterType.Price`;
- project money convention uses minor units.

Decision: use minor units in API. Preferred UI input is major units with transformer to minor units.

## Implementation phases

### Phase 1: Shared hook compatibility

- Relax `usePageConfig` generic constraints to accept generated GraphQL input types.
- Add reusable relation and minor-unit price transformers if they are useful beyond Products.
- Keep Media page compiling with the old returned fields.

### Phase 2: Relation controls

- Add/register category relation control for filters.
- Confirm selected relation values are stored as IDs.
- Add/register vendor relation control and vendor picker config for Brand.

### Phase 3: Products filter schema

- Replace `filter-schema.ts` with target filters.
- Remove handle/name filter chips.
- Use title toolbar search through `buildSearchCondition`.
- Keep stock out of filter schema.

### Phase 4: Products page migration

- Replace manual page state with `usePageConfig`.
- Build GraphQL query variables from `pageConfig`.
- Wire `FilterWidget`, `AgGridReact`, and pagination to `pageConfig`.
- Keep existing delete/refetch and modal behavior.
- Keep server-side sorting behavior.

### Phase 5: Verification

Do not run `test` or `tsc` per project instruction.

When implementation changes code and a new build is needed, run project build through the approved project workflow.

Manual verification checklist:

- Search by title changes `where.name._containsi` and resets to first page.
- Primary category filter sends `primaryCategoryId._in`.
- Min price filter sends `minPriceMinor` with minor-unit value.
- Max price filter sends `maxPriceMinor` with minor-unit value.
- Brand filter sends `vendorId._in`.
- Sort Product/Min price/Max price/Category/Brand updates `orderBy` and resets to first page.
- Stock column does not show sort affordance and does not appear in filters.
- Pagination still uses `pageInfo.endCursor/startCursor`.
- Grid state persistence still uses `products-grid-state`.
