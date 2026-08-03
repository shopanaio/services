# @shopana/storefront-graphql

Shared Shopify-shaped GraphQL foundation for Shopana Storefront API subgraphs.

The package owns only definitions that must be identical in every storefront
subgraph:

- Shopify custom scalars;
- `Node` and `DisplayableError` interfaces;
- `PageInfo`, `Money`, and generic `UserError` value types;
- Shopify-compatible `CountryCode`;
- `BuyerInput`, `VisitorConsent`, and the `@inContext` directive.

Reference values are owned by `@shopana/shared-references`:

- `CurrencyCode` comes from `graphql/shared-currency.graphql`;
- `LocaleCode` comes from `graphql/shared-locale.graphql` and is used by
  `@inContext(language:)`.

Domain types such as `Product`, `Collection`, `Cart`, `Customer`, and `Shop`
remain owned by their respective services.

The structural SDL and `CountryCode` track Shopify Storefront API version
`2026-07`. Currency and locale values follow Shopana shared references, so this
contract is intentionally Shopify-shaped rather than an exact Shopify schema
copy.

Consumers must add all three files to their storefront schema and codegen
sources:

```text
packages/storefront-graphql/graphql/foundation.graphql
packages/shared-references/graphql/shared-currency.graphql
packages/shared-references/graphql/shared-locale.graphql
```
