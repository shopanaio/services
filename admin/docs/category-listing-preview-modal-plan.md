# План: Listing preview modal для категории в Admin UI

## Цель

Добавить в `CategoryDetailsModal` storefront-like preview страницы категории. В секции `Products`
кнопка `Preview` открывает отдельную модалку `ListingPreviewModal`, которая показывает, как
категория будет выглядеть в storefront: заголовок категории, total count, сортировка, фасеты с
counts, сетка продуктов, pagination.

Preview должен грузить данные через `listingQuery.listing` из `listing` service, а не через текущий
`catalogQuery.category.listing`. Текущий `Category.listing` остается для admin-таблицы assigned
products и операций управления категорией.

## Контекст проекта

- Admin frontend: `admin/`.
- Category details modal:
  - `admin/src/domains/inventory/categories/modals/category-modal/category-modal.tsx`
  - `admin/src/domains/inventory/categories/components/category-details-card/category-details-card.tsx`
  - `admin/src/domains/inventory/categories/components/category-details-card/sections/products-section.tsx`
- Modal stack:
  - `admin/src/domains/inventory/categories/modals.ts`
  - `admin/src/domains/modals.tsx`
- Существующая products-секция грузит admin connection через:
  - `admin/src/domains/inventory/categories/graphql/queries.ts`
  - `CATEGORY_PRODUCTS_QUERY`
  - `admin/src/domains/inventory/categories/hooks/use-category-products.ts`
- Новый preview должен использовать listing service contract:
  - `services/listing/src/api/graphql-admin/schema/base.graphql`
  - `services/listing/src/api/graphql-admin/schema/listing.graphql`
  - `services/listing/docs/listing-admin-schema-plan.ru.md`

## Важное ограничение по schema/codegen

В текущем `admin/schema.graphql` найден `Category.listing`, но не найден `listingQuery.listing`. При
реализации сначала нужно убедиться, что admin supergraph/schema уже включает listing service admin
SDL:

```graphql
type Query {
  listingQuery: ListingQuery!
}

type ListingQuery {
  listing(
    first: Int
    after: String
    scope: ListingScopeInput
    query: String
    locale: LocaleCode
    currency: CurrencyCode
    facets: [ListingProductFilter!]
    orderBy: ListingOrderByInput
  ): ListingConnection!
}
```

Если generated types в `admin/src/graphql/types.ts` еще не содержат `ApiListingScopeInput`,
`ApiListingProductFilter`, `ApiListingFacet`, `ApiListingSortBy`, `ApiListingSortDirection`, нужно
сначала обновить composed schema/codegen через project workflow. Не писать временные ad hoc типы
вместо generated API types.

## User flow

1. Пользователь открывает category details modal.
2. В секции `Products` рядом с sort и assign появляется кнопка `Preview`.
3. Нажатие открывает `ListingPreviewModal`.
4. Модалка делает первый запрос:
   - `scope: { kind: CATEGORY, categoryId }`
   - `first: 24`
   - `facets: []`
   - `orderBy`: default sort категории.
5. Пользователь меняет sort, кликает facet values, вводит price range или availability.
6. Модалка повторно запрашивает `listingQuery.listing` с выбранными `facets` и сброшенным cursor.
7. Pagination `Next/Previous` меняет cursor и оставляет sort/facets без изменений.
8. Empty state показывает, что по текущим фильтрам нет продуктов.

## Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Listing preview: Women / Dresses                                      [Esc] │
├──────────────────────────────────────────────────────────────────────────────┤
│ Storefront preview                                                           │
│                                                                              │
│ Women / Dresses                                                              │
│ 128 products                                           Sort: [Newest first v]│
│                                                                              │
│ ┌──────────────────────┐  ┌───────────────────────────────────────────────┐ │
│ │ Filters              │  │ Showing 1-24 of 128                           │ │
│ │                      │  │                                               │ │
│ │ Availability         │  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │ │
│ │ ☑ In stock       96  │  │ │ image  │ │ image  │ │ image  │ │ image  │  │ │
│ │ ☐ Out of stock   32  │  │ ├────────┤ ├────────┤ ├────────┤ ├────────┤  │ │
│ │                      │  │ │ Dress  │ │ Shirt  │ │ Skirt  │ │ Coat   │  │ │
│ │ Price                │  │ │ ₴1,200 │ │ ₴890   │ │ ₴740   │ │ ₴2,400 │  │ │
│ │ [ 500 ] - [ 2500 ]   │  │ │ In stock││ In stock││ Draft   ││ Sold out│ │ │
│ │                      │  │ └────────┘ └────────┘ └────────┘ └────────┘  │ │
│ │ Size                 │  │                                               │ │
│ │ ☐ XS             12  │  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │ │
│ │ ☑ S              34  │  │ │ image  │ │ image  │ │ image  │ │ image  │  │ │
│ │ ☐ M              58  │  │ └────────┘ └────────┘ └────────┘ └────────┘  │ │
│ │ ☐ L              27  │  │                                               │ │
│ │                      │  │              [Prev]  Page 1  [Next]          │ │
│ │ Color                │  └───────────────────────────────────────────────┘ │
│ │ ● Black          18  │                                                    │
│ │ ○ White          15  │                                                    │
│ │ ○ Blue            9  │                                                    │
│ └──────────────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile/narrow modal wireframe

Для narrow viewport внутри модалки preview должен перейти в один столбец. Фасеты не должны занимать
отдельный левый rail; открывать их через drawer/collapse внутри модалки.

```text
┌────────────────────────────────────┐
│ Listing preview              [x]  │
├────────────────────────────────────┤
│ Women / Dresses                    │
│ 128 products                       │
│                                    │
│ [Filters 3] [Sort: Newest first v] │
│                                    │
│ Showing 1-12 of 128                │
│ ┌──────────────┐ ┌──────────────┐  │
│ │ image        │ │ image        │  │
│ │ Dress        │ │ Shirt        │  │
│ │ ₴1,200       │ │ ₴890         │  │
│ │ In stock     │ │ Sold out     │  │
│ └──────────────┘ └──────────────┘  │
│ ┌──────────────┐ ┌──────────────┐  │
│ │ image        │ │ image        │  │
│ └──────────────┘ └──────────────┘  │
│                                    │
│        [Prev] Page 1 [Next]        │
└────────────────────────────────────┘

Filters drawer:
┌────────────────────────────────────┐
│ Filters                       [x]  │
│ Availability                       │
│ ☑ In stock                    96   │
│ ☐ Out of stock                32   │
│ Size                               │
│ ☐ XS                          12   │
│ ☑ S                           34   │
│ [Clear all] [Apply]                │
└────────────────────────────────────┘
```

## Data contract

### Query

Добавить новую операцию в модуль categories, потому preview открывается из category details:

`admin/src/domains/inventory/categories/graphql/queries.ts`

```graphql
query CategoryListingPreview(
  $categoryId: ID!
  $first: Int
  $after: String
  $query: String
  $locale: LocaleCode
  $currency: CurrencyCode
  $facets: [ListingProductFilter!]
  $orderBy: ListingOrderByInput
) {
  listingQuery {
    listing(
      first: $first
      after: $after
      scope: { kind: CATEGORY, categoryId: $categoryId }
      query: $query
      locale: $locale
      currency: $currency
      facets: $facets
      orderBy: $orderBy
    ) {
      edges {
        cursor
        node {
          id
          ... on Product {
            title
            handle
            isPublished
            media {
              sortIndex
              file {
                id
                url
                alt
              }
            }
            priceRange {
              minPrice {
                amount
                currencyCode
              }
              maxPrice {
                amount
                currencyCode
              }
            }
            # Если availability уже есть в canonical Product/Bundle admin schema,
            # добавить его здесь. Если нет, нужен backend contract ниже.
          }
          ... on Bundle {
            title
            handle
            isPublished
            media {
              sortIndex
              file {
                id
                url
                alt
              }
            }
            priceRange {
              minPrice {
                amount
                currencyCode
              }
              maxPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
      facets {
        id
        label
        type
        uiType
        values {
          id
          label
          count
          selected
          input
          swatch {
            id
          }
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

### Availability

Карточка продукта должна показывать availability. Есть два допустимых варианта:

1. Если composed admin schema уже дает product-level availability для listing nodes, использовать
   canonical поле продукта напрямую.
2. Если поля нет, добавить его в backend contract до UI-реализации. Не выводить availability из
   `isPublished`: это разные состояния. Временный fallback допустим только как явное
   `Unknown availability`, а не как fake stock status.

Ожидаемый UI copy:

- `In stock`
- `Low stock`, если backend отдаст threshold/status.
- `Sold out`
- `Unavailable`, если item не sellable.
- `Draft`, если item не published, отдельно от stock.

## Frontend структура

```text
admin/src/domains/inventory/categories/
  graphql/
    queries.ts                         # CATEGORY_LISTING_PREVIEW_QUERY
    operation-types.ts                 # CategoryListingPreviewQueryData/Variables
  hooks/
    use-category-listing-preview.ts    # listingQuery.listing hook
    index.ts
  modals/
    listing-preview-modal/
      listing-preview-modal.tsx
      listing-preview-modal.styles.ts
      listing-preview-facets.tsx
      listing-preview-grid.tsx
      listing-preview-product-card.tsx
      listing-preview-sort.tsx
      listing-preview-pagination.tsx
      types.ts                         # UI-local state only
      index.ts
  components/
    category-details-card/
      sections/products-section.tsx    # adds Preview button prop/callback
      hooks/use-category-modals.ts     # opens preview modal
  modals.ts                            # modal type + payload + hook
```

## Hook contract

`useCategoryListingPreview(categoryId, options)`:

- owns Apollo `useQuery`;
- returns unwrapped API data, not UI view models;
- uses generated API types from `@/graphql/types`;
- uses `cache-and-network`;
- skips request until modal is open and `categoryId` exists;
- preserves `previousData` while changing sort/facets so grid does not flash empty.

Suggested return:

```ts
interface UseCategoryListingPreviewReturn {
  items: ApiListing[];
  facets: ApiListingFacet[];
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}
```

If generated `ApiListing` is still the old catalog shape, do not reuse it blindly. Use
operation-derived types based on generated schema types in `operation-types.ts`, according to
`knowledge/vault/patterns/admin-graphql-layer.md`.

## Modal payload

`admin/src/domains/inventory/categories/modals.ts`

```ts
export const CATEGORY_LISTING_PREVIEW_MODAL_TYPE = "category-listing-preview";

export interface ICategoryListingPreviewModalPayload extends IModalStackPayload {
  category: ApiCategory;
}
```

Add module augmentation and hook:

```ts
export const useCategoryListingPreviewModal = createModalStackHook(
  CATEGORY_LISTING_PREVIEW_MODAL_TYPE,
);
```

Register lazy modal in `admin/src/domains/modals.tsx`.

## Products section changes

`ProductsSection` gets a new prop:

```ts
onPreview?: () => void;
```

Header actions become:

```text
[Preview] [Sort icon] [Assign]
```

Button behavior:

- icon: `EyeOutlined`;
- disabled only if category id is missing, not when `productsCount` is 0;
- preview can open for empty categories to show storefront empty state;
- `data-testid="category-products-preview-button"`.

`CategoryDetailsCard` passes `modals.previewListing`.

`useCategoryModals` imports `useCategoryListingPreviewModal` and returns:

```ts
const previewListing = useCallback(() => {
  openListingPreviewModal({ category });
}, [category, openListingPreviewModal]);
```

## Modal UI behavior

### Layout

- Modal width: `min(1180px, calc(100vw - 48px))`.
- Body height: `min(760px, calc(100vh - 160px))`.
- Header: title `Listing preview: {category.name}`.
- Body: unframed storefront preview surface, not card-inside-card.
- Left facets rail on desktop: 240-280px.
- Product grid: responsive CSS grid:
  - desktop: 4 columns;
  - medium: 3 columns;
  - narrow: 2 columns;
  - very narrow: 1 column if needed.

### Header area inside preview

Show:

- breadcrumb-like category path if `ancestors` are loaded in `ApiCategory`;
- category name as storefront title;
- `totalCount` as `{n} products`;
- sort select;
- selected facets summary chips:
  - label: `{facet.label}: {value.label}`;
  - close icon removes that filter;
  - `Clear all` appears when any filter is selected.

### Facets

Render by `ListingFacet.uiType`:

- `CHECKBOX`: multi-select checkbox list with counts.
- `RADIO`: one selected value per facet.
- `DROPDOWN`: select control; counts in option label.
- `RANGE`: price min/max inputs, counts remain visible if service returns values.
- `BOOLEAN`: switch or checkbox row.

Each value displays:

```text
[control] Label                                      count
```

Rules:

- do not hide `count = 0`, but disable value unless it is selected;
- selected value remains clickable to remove;
- use `values[].input` as source of truth for next `facets` request;
- do not reconstruct product/vendor/tag filters manually if `input` exists;
- facet selection resets pagination cursor to first page.

### Sorting

Use listing service enum, not old `ListingOrderField`:

```text
Manual
Relevance
Newest first
Name A to Z
Name Z to A
Price low to high
Price high to low
```

Mapping:

- Manual: `{ by: MANUAL }`
- Relevance: `{ by: RELEVANCE }`
- Newest first: `{ by: NEWEST, direction: desc }`
- Name A to Z: `{ by: NAME, direction: asc }`
- Name Z to A: `{ by: NAME, direction: desc }`
- Price low to high: `{ by: PRICE, direction: asc }`
- Price high to low: `{ by: PRICE, direction: desc }`

Initial sort derives from `category.defaultSort` / `category.defaultSortDirection`, but maps to
listing service sort enum. If mapping is impossible, fallback to `{ by: MANUAL }` and show no
warning.

### Product card

Simple card:

```text
┌────────────────────┐
│ image              │
├────────────────────┤
│ Product title      │
│ ₴1,200             │
│ In stock           │
└────────────────────┘
```

Fields:

- image: first media by `sortIndex`; fallback placeholder icon;
- title: product title, line-clamped to 2 lines;
- price:
  - same min/max: `₴1,200`;
  - range: `₴900 - ₴1,400`;
  - missing: `No price`;
- availability:
  - use canonical availability when available;
  - show draft status as secondary tag if `isPublished === false`;
  - do not add product actions in preview.

### Pagination

Use cursor pagination, not page-number pagination.

State:

- `first = 24` desktop, `first = 12` narrow if desired;
- `after = pageInfo.endCursor` for next;
- keep a local cursor stack for previous page because listing service currently reports
  `hasPreviousPage: false` in resolver;
- reset cursor stack on sort/facet/query/category change.

Display:

```text
Showing 1-24 of 128                 [Previous] [Next]
```

If exact range is hard with cursor stack, use loaded page index:

```text
Page 1 · 24 of 128 loaded
```

Do not claim an exact range if previous-page support is not available from backend.

## State model

UI-local state in `listing-preview-modal/types.ts`:

```ts
interface ListingPreviewState {
  selectedFacetInputs: ApiListingProductFilter[];
  orderBy: ApiListingOrderByInput;
  after: string | null;
  cursorStack: string[];
  query: string;
}
```

Selection helpers:

- `isFacetValueSelected(value)` can rely on `value.selected` from API.
- `toggleFacetValue(value)`:
  - if selected, remove matching `value.input` from `selectedFacetInputs`;
  - if not selected, add `value.input`;
  - for radio facets, replace other inputs from same facet group;
  - reset `after` and `cursorStack`.
- Matching should use stable serialized `input`, preferably deterministic JSON stringification for
  plain GraphQL input objects.

## Loading, empty, error states

- Initial loading: skeleton for facets rail and product grid.
- Refetch while changing controls: keep previous grid, show small spinner near sort/total.
- Empty listing:

```text
No products match this preview
Try removing filters or changing the sort.
```

- Error:
  - Ant `Alert` at top of modal body;
  - keep controls visible if previous data exists;
  - expose `Retry`.

## Accessibility and test ids

Minimum test ids:

- `category-products-preview-button`
- `category-listing-preview-modal`
- `category-listing-preview-sort`
- `category-listing-preview-total-count`
- `category-listing-preview-facet-{facet.id}`
- `category-listing-preview-facet-value-{value.id}`
- `category-listing-preview-clear-filters`
- `category-listing-preview-product-card-{id-or-handle}`
- `category-listing-preview-pagination-next`
- `category-listing-preview-pagination-prev`

Controls need labels:

- sort select label: `Sort products`;
- filters drawer button label: `Open filters`;
- facet controls include `{facet label}: {value label}, {count} products`.

## Implementation plan

### 1. Schema readiness

1. Verify admin generated schema includes `listingQuery.listing`.
2. If missing, update federation/admin schema composition for listing service and run project
   codegen workflow.
3. Confirm generated types include:
   - `ApiListingScopeInput`
   - `ApiListingScopeKind`
   - `ApiListingProductFilter`
   - `ApiListingOrderByInput`
   - `ApiListingSortBy`
   - `ApiListingSortDirection`
   - `ApiListingFacet`
   - `ApiListingFacetValue`
4. Confirm canonical `Product`/`Bundle` fields needed by cards are selectable through listing query
   fragments.
5. Confirm availability field exists or add backend contract before frontend card finalization.

### 2. GraphQL operation

1. Add `CATEGORY_LISTING_PREVIEW_QUERY` in categories `graphql/queries.ts`.
2. Add operation data/variables types in `graphql/operation-types.ts`, derived from generated schema
   types.
3. Export through existing `graphql/index.ts`.
4. Keep old `CATEGORY_PRODUCTS_QUERY` unchanged.

### 3. Query hook

1. Add `hooks/use-category-listing-preview.ts`.
2. Use Apollo `useQuery` or existing relay helper only if it supports extra `facets` data.
3. Return `items`, `facets`, `totalCount`, `pageInfo`, `loading`, `error`, `refetch`.
4. Preserve previous data during refetch.
5. Export from `hooks/index.ts`.

### 4. Modal registration

1. Add modal type and payload in `categories/modals.ts`.
2. Add `useCategoryListingPreviewModal`.
3. Add `modals/listing-preview-modal/index.ts`.
4. Register lazy modal in `admin/src/domains/modals.tsx`.

### 5. Open action from products section

1. Add `onPreview` prop to `ProductsSection`.
2. Add `Preview` button with `EyeOutlined`.
3. Add `previewListing` to `useCategoryModals`.
4. Pass `modals.previewListing` from `CategoryDetailsCard`.

### 6. Build listing preview modal

1. Implement `ListingPreviewModal`.
2. Add local state for sort, facets, cursor stack, optional query.
3. Wire hook variables from state:
   - `categoryId`
   - `first`
   - `after`
   - `facets`
   - `orderBy`
4. Render header, total count, selected filters, sort.
5. Render desktop facets rail and narrow filters drawer/collapse.
6. Render product grid and cards.
7. Render cursor pagination.

### 7. Styling

1. Add `listing-preview-modal.styles.ts` using existing project styling approach.
2. Keep modal preview visually close to storefront but still inside admin:
   - neutral page surface;
   - restrained borders;
   - product images with stable aspect ratio;
   - no nested cards for whole page sections.
3. Ensure text does not overflow product cards or buttons.
4. Ensure fixed card image aspect ratio prevents layout shifts.

### 8. Verification

Project rule: do not run `test` or `tsc` for verification. Run build only when a new code version
needs verification.

Manual checks:

1. Open category details modal.
2. Click `Preview`.
3. Confirm initial loading state.
4. Confirm total count equals listing query result.
5. Confirm facets show counts.
6. Select a facet value:
   - product grid updates;
   - selected count/chip updates;
   - pagination resets.
7. Change sort:
   - order updates;
   - filters remain selected.
8. Click next page:
   - products update;
   - next disabled at end.
9. Clear filters:
   - all selected states disappear;
   - total count returns to unfiltered count.
10. Check empty category and no-match filters.
11. Check narrow viewport layout.

## Acceptance criteria

- `ProductsSection` has a `Preview` button.
- Button opens `ListingPreviewModal` from the category details modal.
- Modal uses `listingQuery.listing` with `scope.kind = CATEGORY`.
- Modal shows:
  - category title/path;
  - total count;
  - storefront-like product grid;
  - simple product cards with image, title, price, availability;
  - sort control;
  - facets with value counts;
  - selected filters and clear all;
  - cursor pagination.
- Facet clicks send `values[].input` back as `facets`.
- Sort uses listing service `ListingOrderByInput`.
- Existing admin products table remains on `Category.listing` or its current replacement and does
  not inherit preview state.
- No API-output UI view models are introduced; components consume generated API-shaped data or
  operation-derived generated types.
- Empty, loading, refetching, and error states are handled.
- Narrow modal layout is usable.

## Open questions

1. Какое canonical поле должно использоваться для product availability в admin GraphQL:
   product-level aggregate availability, selected default variant availability или listing service
   sellable status?
2. Должен ли preview показывать bundles вместе с products? Listing service возвращает mixed
   `Listing` interface (`Product | Bundle`), а user request говорит “продукты”. Если bundles
   возможны в категории, UI должен либо поддержать bundle cards, либо backend/query должен
   ограничить scope до products.
3. Нужен ли search box внутри category preview, или preview должен показывать только category
   browsing без локального search?
4. Нужно ли использовать текущую store locale/currency из admin context явно, или полагаться на
   defaults listing resolver?
5. Нужна ли точная previous-page навигация от backend? Сейчас listing resolver в service возвращает
   `hasPreviousPage: false`, поэтому frontend может сделать только cursor stack для текущей сессии.
