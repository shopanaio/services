# План admin schema для listing service

## Цель

Вынести admin listing read API в `services/listing` так, чтобы listing service
отвечал только за порядок, pagination, counts и агрегаты листинга, а canonical
данные сущностей продолжали резолвиться из owning subgraph.

Главное правило контракта:

- listing service возвращает entity references в форме `{ id }`;
- `Product`, `Bundle`, `Variant`, `Facet`, `FacetValue` и другие canonical
  сущности не получают дублирующие поля в listing schema;
- UI может запросить поля canonical сущностей через composed supergraph, но
  listing resolver строит только references и listing-owned scalars.

## Границы владения

| Область | Владелец | В listing response |
| --- | --- | --- |
| Порядок товаров, cursors, `totalCount` | listing | native fields |
| Matched variants для variant-level фильтров/сортировки | listing | `Variant { id }` references |
| Facet items, порядок facet values, counts | listing | `Facet { id }`, `FacetValue { id }`, `count` |
| Product, Bundle, Variant details | catalog | federation references |
| Facet labels, uiType, selectionMode, values metadata | catalog | federation references |
| Category, Collection, Vendor, Tag, Option, Feature details | catalog | federation references when exposed |
| Price range и in-stock boolean counts | listing | listing-owned payload внутри `Facet { id }` item |

## Важное условие для federation

В текущем catalog admin SDL `Product`, `Bundle`, `Variant`, `Category`,
`Collection`, `Vendor`, `Tag`, `ProductOption`, `ProductOptionValue`,
`ProductFeature` и `ProductFeatureValue` уже объявлены как federation entities
через `@key(fields: "id")`.

Для финального listing schema нужно дополнительно сделать canonical entities:

```graphql
type Facet implements Node @key(fields: "id") {
  id: ID!
  # остальные поля остаются как сейчас
}

type FacetValue implements Node @key(fields: "id") {
  id: ID!
  # остальные поля остаются как сейчас
}
```

Без `@key` на `Facet` и `FacetValue` listing subgraph не сможет безопасно
возвращать facet references, а gateway не сможет догрузить canonical поля из
catalog.

Catalog admin SDL сейчас уже содержит `Listing`, `ListingConnection` и
`ListingEdge`. Финальное внедрение должно оставить один согласованный контракт:
либо перенести эти listing-типы в listing service, либо вынести их в общий SDL,
либо синхронизировать catalog/listing определения. Два расходящихся определения
`ListingConnection` в composed admin schema недопустимы.

## Контракт admin listing query

`listingQuery.listing` должен быть composition endpoint:

- принимает scope, text query, locale, currency, filters, sort и Relay
  pagination arguments;
- возвращает `ListingConnection`, как catalog service;
- `edges[].node` возвращает `Product` или `Bundle` reference в финальном
  порядке listing engine;
- `edges[].variants` возвращает ordered `Variant` references, если
  variant-level фильтр или сортировка сузили результат до конкретных вариантов;
- `facets[]` возвращает ordered facet items, включая `PRICE` и `IN_STOCK`;
- `facets[].values[]` возвращает ordered facet value references и listing-owned
  `count` для value-based facets (`TAG`, `FEATURE`, `OPTION`);
- `facets[].priceRange` возвращает listing-owned range для `PRICE` facet;
- `facets[].boolean` возвращает listing-owned counts для `IN_STOCK` facet;
- не возвращает `title`, `handle`, `label`, media, product price, variant price
  или другие canonical поля.

Пример клиентского запроса через composed admin supergraph:

```graphql
query AdminListing($scope: ListingScopeInput, $first: Int!) {
  listingQuery {
    listing(scope: $scope, first: $first) {
      edges {
        cursor
        node {
          id
          ... on Product {
            title
          }
          ... on Bundle {
            title
          }
        }
        variants {
          id
          title
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      facets {
        facet {
          id
          label
          facetType
        }
        values {
          value {
            id
            label
          }
          count
          selected
        }
        priceRange {
          minPriceMinor
          maxPriceMinor
          selectedMinPriceMinor
          selectedMaxPriceMinor
          currency
        }
        boolean {
          trueCount
          falseCount
          selected
        }
      }
    }
  }
}
```

В этом запросе listing service возвращает только IDs, порядок и counts. Поля
`title`, `label` и остальные canonical поля догружает catalog subgraph.

## План внедрения

1. Обновить catalog admin SDL:
   - добавить `@key(fields: "id")` на `Facet`;
   - добавить `@key(fields: "id")` на `FacetValue`;
   - не менять поля и resolver behavior этих типов.

2. Добавить файл `services/listing/src/api/graphql-admin/schema/listing.graphql`:
   - объявить reference stubs для canonical entities через
     `extend type ... @key(fields: "id", resolvable: false)`;
   - добавить `extend type ListingQuery` с полем `listing`;
   - добавить inputs, connection, edge и facet result types.

3. Реализовать resolver `ListingQueryResolver.listing`:
   - декодировать входные global IDs через `decodeGlobalIdByType`;
   - валидировать exactly-one semantics для `ListingFilterInput`;
   - валидировать соответствие `ListingScopeInput.kind` и переданных IDs;
   - нормализовать вход под listing repository;
   - не ходить в catalog за деталями сущностей.

4. Маппинг repository result в GraphQL:
   - `productId + kind = BASE` -> `{ __typename: "Product", id }`;
   - `productId + kind = BUNDLE` -> `{ __typename: "Bundle", id }`;
   - `matchedVariantIds[]` -> `[{ __typename: "Variant", id }]`;
   - `facetId` -> `{ __typename: "Facet", id }`;
   - `facetValueId` -> `{ __typename: "FacetValue", id }`;
   - `PRICE` агрегаты -> `ListingFacetItem.priceRange`;
   - `IN_STOCK` агрегаты -> `ListingFacetItem.boolean`;
   - все IDs кодировать через `encodeGlobalIdByType` с правильным
     `GlobalIdEntity`.

5. Сохранить `node`/`nodes` namespace behavior:
   - если listing service не владеет Node entities, оставить их no-op или
     реализовать только для будущих listing-owned entities;
   - canonical product/facet node resolution остается в catalog.

6. Проверить composition:
   - после изменения SDL запустить schema build через shopana-cli;
   - не запускать `test` и `tsc` для этой задачи.

## Финальный SDL

Ниже финальный вариант SDL для listing service admin schema. Он рассчитан на
отдельный файл `services/listing/src/api/graphql-admin/schema/listing.graphql`.
`LocaleCode` и `CurrencyCode` уже подключаются в listing service через
`packages/shared-references/graphql/**/*.graphql`.

```graphql
# ---- Listing Canonical References ----

extend type Product implements Listing @key(fields: "id", resolvable: false) {
  """The Product global ID owned by Catalog."""
  id: ID! @external
}

extend type Bundle implements Listing @key(fields: "id", resolvable: false) {
  """The Bundle global ID owned by Catalog."""
  id: ID! @external
}

extend type Variant @key(fields: "id", resolvable: false) {
  """The Variant global ID owned by Catalog."""
  id: ID! @external
}

extend type Facet @key(fields: "id", resolvable: false) {
  """The Facet global ID owned by Catalog."""
  id: ID! @external
}

extend type FacetValue @key(fields: "id", resolvable: false) {
  """The FacetValue global ID owned by Catalog."""
  id: ID! @external
}

extend type Category @key(fields: "id", resolvable: false) {
  """The Category global ID owned by Catalog."""
  id: ID! @external
}

extend type Collection @key(fields: "id", resolvable: false) {
  """The Collection global ID owned by Catalog."""
  id: ID! @external
}

extend type Vendor @key(fields: "id", resolvable: false) {
  """The Vendor global ID owned by Catalog."""
  id: ID! @external
}

extend type Tag @key(fields: "id", resolvable: false) {
  """The Tag global ID owned by Catalog."""
  id: ID! @external
}

extend type ProductOption @key(fields: "id", resolvable: false) {
  """The ProductOption global ID owned by Catalog."""
  id: ID! @external
}

extend type ProductOptionValue @key(fields: "id", resolvable: false) {
  """The ProductOptionValue global ID owned by Catalog."""
  id: ID! @external
}

extend type ProductFeature @key(fields: "id", resolvable: false) {
  """The ProductFeature global ID owned by Catalog."""
  id: ID! @external
}

extend type ProductFeatureValue @key(fields: "id", resolvable: false) {
  """The ProductFeatureValue global ID owned by Catalog."""
  id: ID! @external
}

# ---- Listing Query ----

extend type ListingQuery {
  """
  Get ordered listing structure for Admin.

  The Listing service returns listing-owned order, pagination, counts, and
  canonical entity references only. Entity details are resolved by owning
  subgraphs through federation.
  """
  listing(
    first: Int
    after: String
    last: Int
    before: String
    scope: ListingScopeInput
    query: String
    locale: LocaleCode
    currency: CurrencyCode
    filters: [ListingFilterInput!]
    orderBy: ListingOrderByInput
  ): ListingConnection!
}

# ---- Listing Inputs ----

enum ListingScopeKind {
  GLOBAL
  SEARCH
  CATEGORY
  COLLECTION
}

input ListingScopeInput {
  """Scope kind for the listing request."""
  kind: ListingScopeKind!

  """Category global ID. Required when kind is CATEGORY."""
  categoryId: ID

  """Collection global ID. Required when kind is COLLECTION."""
  collectionId: ID
}

input ListingFilterInput {
  """
  Facet filter. Exactly one field of ListingFilterInput must be provided.
  """
  facet: ListingFacetFilterInput

  """
  Vendor filter. Exactly one field of ListingFilterInput must be provided.
  """
  vendor: ListingVendorFilterInput

  """
  Price filter. Exactly one field of ListingFilterInput must be provided.
  """
  price: ListingPriceFilterInput

  """
  Stock filter. Exactly one field of ListingFilterInput must be provided.
  """
  inStock: ListingInStockFilterInput
}

input ListingFacetFilterInput {
  """Facet global ID."""
  facetId: ID!

  """Selected FacetValue global IDs for this facet."""
  valueIds: [ID!]!
}

input ListingVendorFilterInput {
  """Selected Vendor global IDs."""
  vendorIds: [ID!]!
}

input ListingPriceFilterInput {
  """Price Facet global ID."""
  facetId: ID!

  """Minimum variant price amount in minor units."""
  minPriceMinor: BigInt

  """Maximum variant price amount in minor units."""
  maxPriceMinor: BigInt
}

input ListingInStockFilterInput {
  """In-stock Facet global ID."""
  facetId: ID!

  """Whether the listing should be limited by stock availability."""
  value: Boolean!
}

enum ListingSortBy {
  MANUAL
  RELEVANCE
  NEWEST
  CREATED
  NAME
  PRICE
}

enum ListingSortDirection {
  asc
  desc
}

input ListingOrderByInput {
  """Sort key for the listing request."""
  by: ListingSortBy!

  """Sort direction. Ignored for MANUAL and RELEVANCE."""
  direction: ListingSortDirection
}

# ---- Listing Result Types ----

interface Listing implements Node {
  """The Product global ID of the catalog listing item."""
  id: ID!
}

type ListingConnection {
  """A list of edges."""
  edges: [ListingEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The total number of matched sellable items."""
  totalCount: Int!

  """Ordered facet items available for the current listing result."""
  facets: [ListingFacetItem!]!
}

type ListingEdge {
  """The item at the end of the edge."""
  node: Listing!

  """
  Matched variant references in listing order.

  Empty when the current request did not resolve variant-level matches.
  """
  variants: [Variant!]!

  """A cursor for use in pagination."""
  cursor: String!
}

type ListingFacetItem {
  """Facet reference owned by Catalog."""
  facet: Facet!

  """Ordered values for this facet in listing UI order."""
  values: [ListingFacetValue!]!

  """Price range payload for PRICE facets."""
  priceRange: ListingFacetPriceRange

  """Boolean counts payload for IN_STOCK facets."""
  boolean: ListingFacetBoolean
}

type ListingFacetValue {
  """FacetValue reference owned by Catalog."""
  value: FacetValue!

  """Number of matched sellable items for this value."""
  count: Int!

  """Whether this value was selected in the current request."""
  selected: Boolean!
}

type ListingFacetPriceRange {
  """Minimum matched variant price amount in minor units."""
  minPriceMinor: BigInt!

  """Maximum matched variant price amount in minor units."""
  maxPriceMinor: BigInt!

  """Currency code used for the returned price amounts."""
  currency: CurrencyCode!

  """Selected minimum price amount in minor units."""
  selectedMinPriceMinor: BigInt

  """Selected maximum price amount in minor units."""
  selectedMaxPriceMinor: BigInt
}

type ListingFacetBoolean {
  """Number of matched sellable items for true."""
  trueCount: Int!

  """Number of matched sellable items for false."""
  falseCount: Int!

  """Selected boolean value in the current request."""
  selected: Boolean
}
```

## Acceptance criteria

- `listingQuery.listing` не возвращает canonical presentation fields напрямую.
- Product/Bundle/Variant/Facet/FacetValue details доступны через composed
  supergraph selection после federation hydration.
- Порядок `edges`, `edges.variants`, `facets` и `facets.values` полностью
  задается listing service.
- `PRICE` и `IN_STOCK` возвращаются как `ListingFacetItem`, а не как top-level
  поля `ListingConnection`.
- `Facet` и `FacetValue` имеют `@key(fields: "id")` в catalog admin SDL.
- Schema composition проходит после добавления listing SDL.
