# План GraphQL SDL для storefront listing

## Цель

Спроектировать единый GraphQL contract для страницы листинга товаров, который будет использоваться:

- в Storefront UI для category/search/collection/vendor/tag listing страниц;
- в Admin preview для эмуляции storefront category page с тем же кодом UI;
- как основа для фасетной фильтрации, сортировки, поиска и SEO-friendly URL state.

Текущий API уже имеет `Category.listing(...)`, `ListingConnection`, `ListingWhereInput` и `ListingOrderByInput` в admin schema. Этого достаточно для простой выдачи products/bundles, но недостаточно для storefront PLP: клиенту нужны примененные фильтры, доступные фасеты с counts, диапазоны цены, stock/availability state, sort options, breadcrumbs и page metadata в одном query.

## Принципы схемы

1. Listing query должен возвращать не только товары, но и состояние страницы: scope, items, facets, selected filters, sort options, pagination, SEO.
2. Storefront contract должен опираться на публичные handles/slugs, а не заставлять URL использовать внутренние IDs.
3. Admin preview должен использовать тот же response shape, но может передавать `preview` options и видеть draft/unpublished данные.
4. Facet filtering должен быть декларативным: UI отправляет список выбранных facet tokens, а backend решает, какие product/variant fields и индексы они используют.
5. Counts у facet values должны считаться в режиме disjunctive faceting: count для values внутри текущего facet считается с учетом всех остальных фильтров, но без собственного facet filter. Так ведут себя крупные commerce/CMS listing системы, потому что пользователь видит, что добавится при выборе значения.
6. Sorting должен быть enum-based и storefront-friendly, а не прямым expose database fields.
7. Query должен быть пригоден для кеширования: одинаковый input, locale, currency, channel и customer context дают одинаковый listing state.

## Текущая база в проекте

Уже есть:

- `services/catalog/src/api/graphql-admin/schema/listing.graphql` с `Listing`, `ListingConnection`, `ProductPriceRange`;
- `Category.listing(...)` в `services/catalog/src/api/graphql-admin/schema/category.graphql`;
- `ListingWhereInput` и `ListingOrderByInput` в generated filters;
- `Product` и `Bundle`, которые implement `Listing`;
- `facet`, `facet_value`, `facet_group`, `facet_swatch` модели;
- `product_search_index` и listing repositories;
- category manual ordering через `category.lexoRank`;
- price range per currency через `ProductPriceRange`.

Нужно добавить storefront-oriented слой поверх этого, а не заменять существующие admin CRUD/list APIs.

## Предлагаемый top-level query

Для storefront gateway:

```graphql
extend type Query {
  listing(input: StorefrontListingInput!): StorefrontListingPage!
}
```

Для admin gateway:

```graphql
extend type CatalogQuery {
  storefrontListingPreview(input: StorefrontListingInput!): StorefrontListingPage!
}
```

Admin preview использует тот же `StorefrontListingInput` и `StorefrontListingPage`, но resolver применяет `preview` правила доступа.

## Основная SDL

```graphql
input StorefrontListingInput {
  scope: StorefrontListingScopeInput!
  pagination: StorefrontListingPaginationInput
  sort: StorefrontListingSortInput
  filters: StorefrontListingFiltersInput
  search: StorefrontListingSearchInput
  preview: StorefrontListingPreviewInput
}

input StorefrontListingScopeInput {
  type: StorefrontListingScopeType!
  id: ID
  handle: String
}

enum StorefrontListingScopeType {
  ALL
  CATEGORY
  COLLECTION
  SEARCH
  VENDOR
  TAG
}

input StorefrontListingPaginationInput {
  first: Int
  after: String
  last: Int
  before: String
}

input StorefrontListingSortInput {
  key: StorefrontListingSortKey!
  direction: SortDirection
}

enum StorefrontListingSortKey {
  MANUAL
  RELEVANCE
  PRICE
  NEWEST
  NAME
  BEST_SELLING
  DISCOUNT
}

input StorefrontListingSearchInput {
  query: String!
  mode: StorefrontSearchMode = FULL_TEXT
}

enum StorefrontSearchMode {
  FULL_TEXT
  PREFIX
  EXACT
}

input StorefrontListingPreviewInput {
  enabled: Boolean = false
  includeDraft: Boolean = false
  includeUnpublished: Boolean = false
  asOf: DateTime
}
```

## Фильтры input

UI должен уметь отправить как generic facet selections, так и first-class фильтры для цены, availability, stock и vendor. Generic selections нужны для динамических фасетов, first-class inputs нужны для стабильной типизации критичных commerce filters.

```graphql
input StorefrontListingFiltersInput {
  price: StorefrontMoneyRangeFilterInput
  availability: [StorefrontAvailabilityFilter!]
  stock: StorefrontStockFilterInput
  vendors: StorefrontTermsFilterInput
  productKinds: [ProductKind!]
  tags: StorefrontTermsFilterInput
  options: [StorefrontOptionFilterInput!]
  features: [StorefrontFeatureFilterInput!]
  facets: [StorefrontFacetFilterInput!]
}

input StorefrontMoneyRangeFilterInput {
  minAmountMinor: BigInt
  maxAmountMinor: BigInt
  currency: CurrencyCode
}

input StorefrontTermsFilterInput {
  values: [String!]!
  operator: StorefrontTermsOperator = ANY
}

enum StorefrontTermsOperator {
  ANY
  ALL
  NONE
}

input StorefrontOptionFilterInput {
  optionHandle: String!
  values: [String!]!
  operator: StorefrontTermsOperator = ANY
}

input StorefrontFeatureFilterInput {
  featureHandle: String!
  values: [String!]!
  operator: StorefrontTermsOperator = ANY
}

input StorefrontFacetFilterInput {
  facetSlug: String!
  valueSlugs: [String!]!
  operator: StorefrontTermsOperator = ANY
}

input StorefrontStockFilterInput {
  states: [StorefrontStockState!]!
  warehouseIds: [ID!]
}

enum StorefrontAvailabilityFilter {
  AVAILABLE
  UNAVAILABLE
  IN_STOCK
  OUT_OF_STOCK
  BACKORDERABLE
  PREORDER
}

enum StorefrontStockState {
  IN_STOCK
  LOW_STOCK
  OUT_OF_STOCK
  BACKORDERABLE
  NOT_TRACKED
}
```

Правило совместимости: `options`, `features`, `tags`, `vendors`, `availability`, `stock`, `price` должны также возвращаться как facets в response, чтобы UI строился единым renderer'ом.

## Response page

```graphql
type StorefrontListingPage {
  scope: StorefrontListingScope!
  title: String!
  description: RichText
  seo: Seo
  breadcrumbs: [StorefrontBreadcrumb!]!
  sort: StorefrontListingSortState!
  sortOptions: [StorefrontListingSortOption!]!
  appliedFilters: [StorefrontAppliedFilter!]!
  facets: [StorefrontFacet!]!
  items: ListingConnection!
  totalCount: Int!
}

type StorefrontListingScope {
  type: StorefrontListingScopeType!
  id: ID
  handle: String
  category: Category
  collection: Collection
  vendor: Vendor
  tag: Tag
  searchQuery: String
}

type StorefrontBreadcrumb {
  label: String!
  url: String!
}

type StorefrontListingSortState {
  key: StorefrontListingSortKey!
  direction: SortDirection!
}

type StorefrontListingSortOption {
  key: StorefrontListingSortKey!
  direction: SortDirection!
  label: String!
  selected: Boolean!
}

type StorefrontAppliedFilter {
  key: String!
  facetSlug: String
  label: String!
  valueLabel: String!
  valueSlug: String
  removeInput: StorefrontListingFiltersSnapshot!
  removeUrl: String
}

scalar StorefrontListingFiltersSnapshot
```

`StorefrontListingFiltersSnapshot` намеренно scalar/JSON-like snapshot. Он нужен не как основной API input, а как удобный remove token для UI. Основной input остается типизированным через `StorefrontListingFiltersInput`.

## Facet output model

Фасеты лучше моделировать через interface + concrete types. Это дает строгую типизацию для price range, boolean и term facets, но оставляет UI единым.

```graphql
interface StorefrontFacet {
  key: String!
  slug: String!
  label: String!
  type: StorefrontFacetType!
  uiType: StorefrontFacetUIType!
  selectionMode: FacetSelectionMode!
  sortIndex: Int!
  group: StorefrontFacetGroup
  collapsed: Boolean!
  indexable: Boolean!
}

type StorefrontFacetGroup {
  slug: String!
  label: String!
  sortIndex: Int!
}

enum StorefrontFacetType {
  PRICE
  OPTION
  FEATURE
  AVAILABILITY
  STOCK
  VENDOR
  TAG
  CATEGORY
  PRODUCT_KIND
  CUSTOM
}

enum StorefrontFacetUIType {
  CHECKBOX
  RADIO
  DROPDOWN
  SWATCH
  RANGE
  BOOLEAN
}

type StorefrontTermsFacet implements StorefrontFacet {
  key: String!
  slug: String!
  label: String!
  type: StorefrontFacetType!
  uiType: StorefrontFacetUIType!
  selectionMode: FacetSelectionMode!
  sortIndex: Int!
  group: StorefrontFacetGroup
  collapsed: Boolean!
  indexable: Boolean!
  values: [StorefrontFacetValue!]!
  maxValuesVisible: Int!
  valueSort: FacetValueSort!
}

type StorefrontRangeFacet implements StorefrontFacet {
  key: String!
  slug: String!
  label: String!
  type: StorefrontFacetType!
  uiType: StorefrontFacetUIType!
  selectionMode: FacetSelectionMode!
  sortIndex: Int!
  group: StorefrontFacetGroup
  collapsed: Boolean!
  indexable: Boolean!
  range: StorefrontFacetRange!
}

type StorefrontBooleanFacet implements StorefrontFacet {
  key: String!
  slug: String!
  label: String!
  type: StorefrontFacetType!
  uiType: StorefrontFacetUIType!
  selectionMode: FacetSelectionMode!
  sortIndex: Int!
  group: StorefrontFacetGroup
  collapsed: Boolean!
  indexable: Boolean!
  value: StorefrontFacetBooleanValue!
}

type StorefrontFacetValue {
  slug: String!
  label: String!
  count: Int!
  selected: Boolean!
  disabled: Boolean!
  swatch: StorefrontFacetSwatch
  url: String
}

type StorefrontFacetSwatch {
  displayType: SwatchDisplayType!
  colorOne: String
  colorTwo: String
  imageUrl: String
  metadata: JSON
}

type StorefrontFacetRange {
  minAmountMinor: BigInt!
  maxAmountMinor: BigInt!
  selectedMinAmountMinor: BigInt
  selectedMaxAmountMinor: BigInt
  stepAmountMinor: BigInt
  currency: CurrencyCode!
}

type StorefrontFacetBooleanValue {
  selected: Boolean
  trueCount: Int!
  falseCount: Int!
  trueUrl: String
  falseUrl: String
}
```

## Типы фасетов и источники данных

| Facet type | UI | Source | Input |
| --- | --- | --- | --- |
| `PRICE` | range | `product_price_range` / listing price index per currency | `filters.price` |
| `OPTION` | checkbox/radio/swatch | product options and option values | `filters.options` or `filters.facets` |
| `FEATURE` | checkbox/radio/dropdown | product features and values | `filters.features` or `filters.facets` |
| `AVAILABILITY` | checkbox/radio | sellable state from publish + inventory policy + stock | `filters.availability` |
| `STOCK` | checkbox/radio | inventory item tracked state, warehouse stock, backorder policy | `filters.stock` |
| `VENDOR` | checkbox/dropdown | `product.vendorId` and `Vendor.name` | `filters.vendors` |
| `TAG` | checkbox | product tag handles | `filters.tags` |
| `CATEGORY` | checkbox/tree | category assignments and category hierarchy | `filters.facets` |
| `PRODUCT_KIND` | checkbox | `ProductKind` (`BASE`, `BUNDLE`) | `filters.productKinds` |
| `CUSTOM` | checkbox/radio/range | configured `facet` rows and `facet_value_source_handle` | `filters.facets` |

Price, availability, stock, vendor, tag and product kind are virtual/system facets. They do not have to be manually created in `facet` table, but they should be returned in the same `StorefrontFacet` list.

Options/features/custom facets can be configured through the existing facet admin model. `facet_value_source_handle.sourceHandle` maps public storefront value slugs to product option/feature/tag/category handles.

## Listing item contract

Existing `Listing` interface can stay, but storefront cards usually need more first-screen fields. Plan:

```graphql
interface Listing implements Node {
  id: ID!
  kind: ProductKind!
  isPublished: Boolean!
  handle: String!
  title: String!
  media: [ProductMediaItem!]!
  priceRange: ProductPriceRange
  storefrontUrl: String!
  vendor: Vendor
  availability: StorefrontListingItemAvailability!
  badges: [StorefrontListingBadge!]!
}

type StorefrontListingItemAvailability {
  available: Boolean!
  stockState: StorefrontStockState!
  reason: StorefrontUnavailableReason
}

enum StorefrontUnavailableReason {
  DRAFT
  UNPUBLISHED
  OUT_OF_STOCK
  NOT_SELLABLE
}

type StorefrontListingBadge {
  key: String!
  label: String!
}
```

Admin schema может расширить текущий `Listing` этими полями позже. Storefront schema должна иметь их сразу, чтобы card UI не делал дополнительные запросы на каждый product.

## Семантика фильтрации

1. `scope` всегда применяется первым: category/collection/search/vendor/tag.
2. Storefront по умолчанию применяет `publishedAt <= now`, `deletedAt is null`, active channel, locale и currency.
3. Admin preview при `preview.enabled = true` может отключить publish filters через `includeDraft` и `includeUnpublished`.
4. `price` фильтрует по пересечению product price range: product проходит, если `maxPrice >= min` и `minPrice <= max`.
5. Option filters обычно variant-aware: product проходит, если есть sellable variant с выбранными option values. Для простого MVP допустимо product-level matching, но в документе contract нужно зафиксировать variant-aware target.
6. Feature filters product-level.
7. `availability: AVAILABLE` означает товар можно купить сейчас или можно продать по backorder policy.
8. `stock: IN_STOCK` означает физический available stock больше 0, не просто `available = true`.
9. Vendor/tag/category filters используют public handles/slugs в storefront input.
10. `operator: ALL` для terms означает, что product должен иметь все выбранные values внутри данного facet.

## Семантика counts

Для каждого facet value:

- `selected = true`, если value есть в текущем input;
- `count` показывает количество listing items, которое получится после выбора value с учетом всех остальных активных фильтров;
- `disabled = true`, если `count = 0` и value не selected;
- selected value не исчезает из response даже при `count = 0`;
- range facet возвращает global bounds для текущего scope + all non-price filters и selected range отдельно.

## Сортировка

Маппинг sort keys:

| Sort key | Без search | С search |
| --- | --- | --- |
| `MANUAL` | category/collection manual rank, fallback `createdAt desc` | fallback `RELEVANCE` |
| `RELEVANCE` | fallback `MANUAL` или `NEWEST` | full-text rank |
| `PRICE` | `minAmountMinor asc` или `maxAmountMinor desc` | same |
| `NEWEST` | `publishedAt desc`, fallback `createdAt desc` | same |
| `NAME` | localized title asc/desc | same |
| `BEST_SELLING` | sales aggregate index | same |
| `DISCOUNT` | discount/compare-at aggregate index | same |

На первом этапе можно реализовать только `MANUAL`, `RELEVANCE`, `PRICE`, `NEWEST`, `NAME`, а остальные возвращать в `sortOptions` только когда есть индекс.

## Пример query для Storefront/Admin preview UI

```graphql
query StorefrontCategoryListing($input: StorefrontListingInput!) {
  listing(input: $input) {
    title
    breadcrumbs {
      label
      url
    }
    sort {
      key
      direction
    }
    sortOptions {
      key
      direction
      label
      selected
    }
    appliedFilters {
      key
      label
      valueLabel
      removeUrl
    }
    facets {
      key
      slug
      label
      type
      uiType
      selectionMode
      ... on StorefrontTermsFacet {
        values {
          slug
          label
          count
          selected
          disabled
          swatch {
            displayType
            colorOne
            colorTwo
            imageUrl
          }
          url
        }
      }
      ... on StorefrontRangeFacet {
        range {
          minAmountMinor
          maxAmountMinor
          selectedMinAmountMinor
          selectedMaxAmountMinor
          currency
        }
      }
    }
    items {
      edges {
        cursor
        node {
          id
          kind
          handle
          title
          storefrontUrl
          media {
            file {
              id
              url
            }
          }
          priceRange {
            minPriceAmount
            maxPriceAmount
            currency
          }
          availability {
            available
            stockState
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
}
```

Для admin preview тот же selection set вызывается через `catalogQuery.storefrontListingPreview(input: $input)`.

## Индексация и backend план

Нужен read model для listing, иначе facet counts будут дорогими:

1. Расширить `product_search_index` или добавить `listing_search_index`.
2. Хранить denormalized поля:
   - `projectId`, `productId`, `kind`, `status`, `publishedAt`;
   - `locale`, `title`, searchable text/rank vector;
   - `currency`, `minAmountMinor`, `maxAmountMinor`, discount fields;
   - `vendorId`, `vendorHandle`, `vendorName`;
   - `categoryIds`, `categoryHandles`, category path handles;
   - `tagHandles`;
   - `optionValueHandles` grouped by option handle;
   - `featureValueHandles` grouped by feature handle;
   - `facetValueSlugs`;
   - `available`, `stockState`, `warehouseStockStates`;
   - `manualRanks` for category/collection ranking.
3. Rebuild/update index from product, variant, price, inventory, category, tag, option, feature and facet changes.
4. Query path:
   - resolve scope;
   - normalize filters;
   - build base candidate set;
   - fetch paginated ids;
   - compute facet counts using same base candidate set;
   - hydrate `Listing` nodes through existing Product/Bundle resolvers.

## Этапы внедрения

1. Добавить SDL для `StorefrontListingInput`, `StorefrontListingPage`, facets и preview query.
2. Сделать resolver skeleton на admin gateway, который переиспользует текущий `Category.listing` для items и возвращает пустые/простые facets.
3. Добавить storefront schema файлы в `services/catalog/src/api/graphql-storefront/schema/listing/`.
4. Реализовать listing index/read model для price/vendor/tag/category/search/availability.
5. Подключить option и feature facets.
6. Подключить custom facets через существующие `facet` tables.
7. Перевести Admin category preview на новый query и держать UI components API-shaped.
8. Перенести тот же UI module в Storefront.

## Важные ограничения

- Не использовать generated `ListingWhereInput` как публичный storefront API. Это внутренний низкоуровневый filter DSL, он раскрывает имена колонок и плохо подходит для SEO URL.
- Не делать отдельный admin-only response model для preview. Admin preview должен использовать тот же `StorefrontListingPage`.
- Не смешивать availability и stock: availability отвечает на вопрос "можно купить", stock отвечает на вопрос "есть физический остаток".
- Не считать counts на клиенте. Counts должны приходить с backend, иначе pagination и filters будут расходиться.
- Не строить facets только из текущей страницы items. Facets должны считаться по всему result set внутри scope.
