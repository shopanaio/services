# Storefront listing API contract

## Текущий контракт

Storefront listing read path возвращает полный PLP response всегда:

- ordered page rows for cursor pagination;
- `hasNextPage`;
- `totalCount`;
- facets metadata with value counts;
- `priceRange`;
- `inStockCount`.

Optional aggregate flags не являются частью public contract и не должны
передаваться в `StorefrontListingInput`:

- `includeTotalCount`;
- `includeFacets`;
- `includePriceRange`;
- `includeInStockCount`.

Repository implementation запускает пять independent read branches:

1. page rows + `hasNextPage`;
2. `totalCount`;
3. facets metadata без counts;
4. facet counts;
5. `priceRange` + `inStockCount`.

Partial response запрещен: ошибка любого branch завершает весь listing request.

## GraphQL schema note

На текущем срезе `services/listing` публикует только admin GraphQL namespace и не
имеет storefront GraphQL schema. Когда storefront schema будет добавлена, она
должна отражать этот always-full contract: aggregate include flags не должны
появляться в public input, а `totalCount`, facets, `priceRange` и
`inStockCount` должны быть частью обычного listing response.
