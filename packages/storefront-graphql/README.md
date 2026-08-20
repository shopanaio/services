# @shopana/storefront-graphql

Shared GraphQL foundation for Shopana Storefront API subgraphs.

The package owns only definitions that must be identical in every storefront subgraph:

- custom scalars;
- `Node` and `DisplayableError` interfaces;
- `PageInfo`, `Money`, `Weight`, `Dimensions`, and generic `UserError` value types;
- `CountryCode`.

Reference values are owned by `@shopana/shared-references`:

- `CurrencyCode` comes from `graphql/shared-currency.graphql`;
- `LocaleCode` comes from `graphql/shared-locale.graphql`.
- `WeightUnit` and `DimensionUnit` come from `graphql/shared-units.graphql`.

## Storefront context ownership

- Store and project are resolved from the endpoint or trusted request headers. They are not accepted
  as GraphQL arguments.
- Buyer identity is resolved exclusively from the `Authorization` header. A customer access token is
  not accepted inside a GraphQL operation.
- Locale must be requested through the standard `Accept-Language` header. The gateway normalizes it
  to a supported `LocaleCode`; the selected locale should be returned in the standard
  `Content-Language` response header.
- Country is resolved from the selected store or market and, for cart and checkout operations, from
  the cart's delivery context. It must not be derived from `Accept-Language`.
- Visitor consent belongs to the relevant cart or checkout mutation. Its input is defined by the
  service that owns that mutation, not by this package.

Domain types such as `Product`, `Collection`, `Cart`, `Customer`, and `Shop` remain owned by their
respective services.

Consumers must add all four files to their storefront schema and codegen sources:

```text
packages/storefront-graphql/graphql/foundation.graphql
packages/shared-references/graphql/shared-currency.graphql
packages/shared-references/graphql/shared-locale.graphql
packages/shared-references/graphql/shared-units.graphql
```
