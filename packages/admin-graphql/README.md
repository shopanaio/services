# @shopana/admin-graphql

Shared GraphQL foundation for Shopana Admin API subgraphs.

The package owns definitions that must remain identical wherever they are used:

- common custom scalars;
- Relay Node, Connection, and PageInfo;
- DisplayableError;
- Money, Weight, and Dimensions.

CurrencyCode, LocaleCode, WeightUnit, and DimensionUnit remain owned by @shopana/shared-references.

Admin pagination currently uses opaque String cursors because the existing Admin subgraphs already
compose PageInfo.startCursor and endCursor as String. Introducing a distinct Cursor scalar requires
a coordinated platform-wide schema migration.

Consumers add these schema sources:

    packages/admin-graphql/graphql/foundation.graphql
    packages/shared-references/graphql/shared-currency.graphql
    packages/shared-references/graphql/shared-locale.graphql
    packages/shared-references/graphql/shared-units.graphql

The consuming subgraph must import Federation directives, including @shareable, through its own
federation.graphql.
