# План admin schema для listing service

## Цель

Вынести admin listing read API из `services/catalog` в `services/listing`.
После миграции listing service становится владельцем listing read contract:

- `Listing`
- `ListingConnection`
- `ListingEdge`
- `listingQuery.listing`
- listing-specific facets, sort, pagination и aggregate payloads

Catalog остается владельцем canonical entity details:

- `Product`
- `Bundle`
- `Facet`
- `FacetValue`
- `Category`
- `Collection`
- `Vendor`
- `Tag`
- `ProductOption`
- `ProductOptionValue`
- `ProductFeature`
- `ProductFeatureValue`

Главное правило контракта:

- listing service возвращает entity references в форме `{ __typename, id }`;
- canonical сущности не получают дублирующие поля в listing schema;
- UI может запросить canonical поля через composed supergraph;
- listing resolver строит только порядок, pagination, counts, агрегаты и
  listing-owned scalars.

## Что переносится из catalog

Текущий catalog admin SDL содержит listing contract в
`services/catalog/src/api/graphql-admin/schema/listing.graphql`:

```graphql
interface Listing implements Node {
  """The Product global ID of the catalog listing item."""
  id: ID!

  """Product discriminator."""
  kind: ProductKind!

  """Whether the listing item is currently published."""
  isPublished: Boolean!

  """The URL-friendly handle."""
  handle: String!

  """Localized title."""
  title: String!

  """Media registered on this listing item."""
  media: [ProductMediaItem!]!

  """Current product price range in the selected currency."""
  priceRange: ProductPriceRange
}

"""A connection to a mixed list of catalog listing items."""
type ListingConnection {
  """A list of edges."""
  edges: [ListingEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The total number of catalog listing items."""
  totalCount: Int!
}

"""An edge in a Listing connection."""
type ListingEdge {
  """The item at the end of the edge."""
  node: Listing!

  """A cursor for use in pagination."""
  cursor: String!
}
```

Эти имена переносятся в listing service, но поля меняются под новую границу
владения:

- `Listing` в listing service содержит только `id`;
- `Product` и `Bundle` подключаются к `Listing` через federation references;
- `ListingConnection` расширяется listing-owned `facets`;
- canonical поля старого `Listing` (`kind`, `isPublished`, `handle`, `title`,
  `media`, `priceRange`) больше не находятся на `Listing`.

`ProductPriceRange` не переносится в listing service. Этот тип используется
canonical полями `Product.priceRange` и `Bundle.priceRange`, поэтому должен
остаться в catalog SDL, но быть вынесен из удаляемого `listing.graphql` catalog
в catalog-owned SDL файл.

## Что удаляется из catalog

Удалить из catalog admin SDL:

- `interface Listing`;
- `type ListingConnection`;
- `type ListingEdge`;
- `Category.listing(...)`;
- `ListingWhereInput`;
- `ListingOrderField`;
- generated `ListingOrderByInput`.

Из `Product` и `Bundle` убрать реализацию `Listing`:

```graphql
# было
type Product implements Node & Listing @key(fields: "id") {
  id: ID!
}

type Bundle implements Node & Listing @key(fields: "id") {
  id: ID!
}

# должно быть
type Product implements Node @key(fields: "id") {
  id: ID!
}

type Bundle implements Node @key(fields: "id") {
  id: ID!
}
```

Удалить catalog resolver/repository слой старого category listing:

- `CategoryResolver.listing`;
- `CategoryListingConnectionResolver`;
- `ResolverRegistry.categoryListingConnection`;
- `CategoryRepository.getCategoryListingConnection`;
- category listing relay query/types, если после удаления они больше нигде не
  используются.

`Category.products(...)` и product-specific category APIs не относятся к этому
переносу и остаются в catalog.

## Federation prerequisite

В listing response federation references нужны только для sellable item nodes:
`Product` и `Bundle`. Оба типа уже объявлены в catalog admin SDL через
`@key(fields: "id")`.

Facet UI contract в listing service строится как единая Shopify-like форма
`ListingFacet` / `ListingFacetValue`, поэтому `Facet` и `FacetValue` не нужно
экспонировать как federation references для этого endpoint.

При этом listing SDL должен использовать catalog-compatible presentation types:
`FacetUIType` и `FacetSwatch`. Для composition нужно либо вынести эти типы в
shared admin SDL, либо оставить `FacetSwatch` catalog entity с `@key` и
расширить его в listing service как federation reference. Не вводить отдельные
`ListingFacetPresentation`, `ListingFacetSwatch`, `image` поля, если они не
существуют в catalog contract.

## Границы владения

| Область | Владелец | В listing response |
| --- | --- | --- |
| `Listing`, `ListingConnection`, `ListingEdge` | listing | native types |
| Порядок товаров, cursors, `totalCount` | listing | native fields |
| Facet items, порядок facet values, counts | listing | `ListingFacet`, `ListingFacetValue`, `count`, `input` |
| `Product`, `Bundle` details | catalog | federation references |
| Catalog facet metadata | catalog | used by listing index/sync, not exposed as separate listing filter shape |
| Category, Collection, Vendor, Tag, Option, Feature details | catalog | source data for listing facets/scopes |
| Price, vendor и availability facets | listing | same `ListingFacet`/`ListingFacetValue` shape as other facets |
| `Product.priceRange`, `Bundle.priceRange` | catalog | canonical product/bundle fields |

## Global ID mapping

Listing service должен декодировать входные scope global IDs и кодировать
выходные product/bundle references теми же `GlobalIdEntity`, которые использует
catalog.

| GraphQL type | GlobalIdEntity |
| --- | --- |
| `Product` | `Product` |
| `Bundle` | `Product` |
| `Category` | `Category` |
| `Collection` | `Collection` |

Важно: `Bundle` сейчас является sellable item в product domain. Если catalog
использует для bundle id `GlobalIdEntity.Product`, listing service должен
сохранять тот же формат global ID.

## Контракт admin listing query

`listingQuery.listing` становится единственным composition endpoint для admin
listing read API:

- принимает scope, text query, locale, currency, facets, sort и Relay
  pagination arguments;
- возвращает перенесенный `ListingConnection`;
- `edges[].node` возвращает `Product` или `Bundle` reference в финальном
  порядке listing engine;
- `facets[]` возвращает ordered facet items, включая product facets, vendor,
  price и availability;
- все facet types используют одинаковый `ListingFacet` /
  `ListingFacetValue` contract;
- returned facets используют Shopify-like filter flow, но остаются совместимыми
  с catalog presentation model: `id`, `label`, `type`, `uiType`, `values`;
- returned facet values используют Shopify-like `input` flow и catalog swatches:
  `id`, `label`, `count`, `input`, `swatch`;
- клиент применяет facet selection, передавая `values[].input` в массив
  `facets`, как в Shopify filter contract;
- не возвращает `title`, `handle`, `label`, media, product price, variant price
  или другие canonical поля напрямую.

`scope.kind = CATEGORY` заменяет старый `Category.listing(...)` из catalog.
Клиент, которому нужен category listing, должен вызывать:

```graphql
query CategoryListing($categoryId: ID!, $first: Int!) {
  listingQuery {
    listing(
      scope: { kind: CATEGORY, categoryId: $categoryId }
      first: $first
    ) {
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
      }
      totalCount
    }
  }
}
```

## Валидация входа

`ListingScopeInput`:

- `GLOBAL`: `categoryId` и `collectionId` должны отсутствовать;
- `SEARCH`: `categoryId` и `collectionId` должны отсутствовать, `query` должен
  быть непустой строкой;
- `CATEGORY`: `categoryId` обязателен, `collectionId` должен отсутствовать;
- `COLLECTION`: `collectionId` обязателен, `categoryId` должен отсутствовать.

`ListingProductFilter`:

- ровно одно поле должно быть задано;
- `available` фильтрует availability;
- `price` фильтрует price range;
- `productVendor` фильтрует vendor;
- `tag` фильтрует tags;
- `variantOption` фильтрует option value;
- `productFacet` фильтрует catalog product facet;
- `variantFacet` фильтрует catalog variant/option facet;
- `ListingFacetValue.input` должен возвращать JSON object, совместимый с
  `ListingProductFilter`, чтобы клиент мог напрямую собрать следующий запрос;
- cursor/hash должен учитывать выбранные facets как opaque selection payloads.

Pagination:

- нельзя одновременно передавать `first` и `last`;
- нельзя одновременно передавать `after` и `before`;
- page size должен иметь service-level default и max limit;
- cursor должен декодироваться только listing service.

## План внедрения

1. Обновить catalog admin SDL:
   - вынести `ProductPriceRange` из удаляемого listing SDL в catalog-owned SDL;
   - удалить `interface Listing`;
   - удалить `type ListingConnection`;
   - удалить `type ListingEdge`;
   - удалить `Category.listing(...)`;
   - убрать `& Listing` из `Product` и `Bundle`.

2. Удалить catalog implementation старого listing read API:
   - `CategoryResolver.listing`;
   - `CategoryListingConnectionResolver`;
   - `ResolverRegistry.categoryListingConnection`;
   - `CategoryRepository.getCategoryListingConnection`;
   - category listing relay query/types, если не осталось usage.

3. Убрать generated listing filter inputs из catalog:
   - исключить listing view из генерации catalog filters;
   - после генерации catalog filters убедиться, что в catalog больше нет
     `ListingWhereInput`, `ListingOrderField`, `ListingOrderByInput`.

4. Добавить файл
   `services/listing/src/api/graphql-admin/schema/listing.graphql`:
   - объявить `Product` и `Bundle` reference stubs через
     `extend type ... implements Listing @key(fields: "id", resolvable: false)`;
   - добавить перенесенные `Listing`, `ListingConnection`, `ListingEdge`;
   - добавить `extend type ListingQuery` с полем `listing`;
   - добавить listing-owned inputs и facet result types.

5. Реализовать resolver `ListingQueryResolver.listing`:
   - декодировать входные global IDs через `decodeGlobalIdByType`;
   - валидировать `ListingScopeInput`;
   - валидировать `ListingProductFilter`;
   - нормализовать вход под listing repository;
   - не ходить в catalog за деталями сущностей.

6. Маппинг repository result в GraphQL:
   - `productId + kind = BASE` -> `{ __typename: "Product", id }`;
   - `productId + kind = BUNDLE` -> `{ __typename: "Bundle", id }`;
   - facet metadata, value counts и selected state -> `ListingFacet`;
   - price range, vendor и availability aggregates -> `ListingFacet` с тем же
     `values[].input` contract;
   - все IDs кодировать через `encodeGlobalIdByType` по таблице global ID
     mapping выше.

7. Сохранить `node`/`nodes` namespace behavior:
   - listing service не владеет canonical Node entities;
   - `listingQuery.node` и `listingQuery.nodes` могут остаться no-op до
     появления listing-owned Node entities;
   - canonical product/bundle node resolution остается в catalog.

8. Проверить composition:
   - после изменения SDL запустить schema build через shopana-cli;
   - не запускать `test` и `tsc` для этой задачи.

## Финальный SDL listing service

Файл:
`services/listing/src/api/graphql-admin/schema/listing.graphql`.

`LocaleCode`, `CurrencyCode`, `PageInfo`, `Node` и scalars уже подключаются в
listing service через shared GraphQL references.

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

# ---- Listing Query ----

extend type ListingQuery {
  """
  Get ordered listing structure for Admin.

  Listing service returns listing-owned order, pagination, counts, aggregates,
  and canonical entity references only. Entity details are resolved by owning
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
    facets: [ListingProductFilter!]
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

input ListingProductFilter {
  """Filter on if the listing item is available."""
  available: Boolean

  """Filter by product price range."""
  price: ListingPriceRangeFilter

  """Filter by product vendor."""
  productVendor: String

  """Filter by product tag."""
  tag: String

  """Filter by variant option."""
  variantOption: ListingVariantOptionFilter

  """Filter by product-level catalog facet value."""
  productFacet: ListingFacetValueFilter

  """Filter by variant-level catalog facet value."""
  variantFacet: ListingFacetValueFilter
}

input ListingPriceRangeFilter {
  """Minimum price amount in minor units."""
  min: BigInt

  """Maximum price amount in minor units."""
  max: BigInt
}

input ListingVariantOptionFilter {
  """Variant option name."""
  name: String!

  """Variant option value."""
  value: String!
}

input ListingFacetValueFilter {
  """Facet stable identifier."""
  facet: String!

  """Facet value stable identifier."""
  value: String!
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
  """The global ID of the catalog listing item."""
  id: ID!
}

"""A connection to a mixed list of catalog listing items."""
type ListingConnection {
  """A list of edges."""
  edges: [ListingEdge!]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The total number of matched sellable items."""
  totalCount: Int!

  """Ordered facet items available for the current listing result."""
  facets: [ListingFacet!]!
}

"""An edge in a Listing connection."""
type ListingEdge {
  """The item at the end of the edge."""
  node: Listing!

  """A cursor for use in pagination."""
  cursor: String!
}

enum ListingFacetType {
  LIST
  BOOLEAN
  PRICE_RANGE
}

type ListingFacet {
  """Stable listing facet ID."""
  id: String!

  """Human-readable facet label."""
  label: String!

  """Facet presentation/selection type."""
  type: ListingFacetType!

  """Catalog-compatible UI type."""
  uiType: FacetUIType!

  """Ordered values for this facet in listing UI order."""
  values: [ListingFacetValue!]!
}

type ListingFacetValue {
  """Stable listing facet value ID."""
  id: String!

  """Human-readable value label."""
  label: String!

  """Number of matched sellable items for this value."""
  count: Int!

  """Whether this value was selected in the current request."""
  selected: Boolean!

  """
  JSON object compatible with ListingProductFilter.
  This keeps product, vendor, price and availability facets on one contract.
  """
  input: JSON!

  """Catalog swatch metadata for facet values that have one."""
  swatch: FacetSwatch
}
```

## Acceptance criteria

- Catalog admin SDL больше не содержит `Listing`, `ListingConnection`,
  `ListingEdge`, `Category.listing`, `ListingWhereInput`, `ListingOrderField`,
  generated `ListingOrderByInput`.
- `Product` и `Bundle` в catalog больше не реализуют `Listing`.
- `ProductPriceRange` остается в catalog и продолжает использоваться
  canonical полями `Product.priceRange` и `Bundle.priceRange`.
- Listing service владеет `Listing`, `ListingConnection`, `ListingEdge`.
- `listingQuery.listing` не возвращает canonical presentation fields напрямую.
- Product/Bundle details доступны через composed
  supergraph selection после federation hydration.
- Порядок `edges`, `facets` и `facets.values` полностью
  задается listing service.
- Product facets, vendor, price и availability возвращаются как
  `ListingFacet`, а не как разные GraphQL shapes.
- Returned `ListingFacet` содержит Shopify-like поля `id`, `label`, `type`,
  `values` и catalog-compatible `uiType`.
- Returned `ListingFacetValue` содержит Shopify-like поля `id`, `label`,
  `count`, `input` и catalog-compatible `swatch`.
- Schema composition проходит после удаления catalog listing SDL и добавления
  listing service SDL.
