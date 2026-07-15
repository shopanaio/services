# Customers Service

Empty service skeleton for the Shopana customers bounded context.

The skeleton mirrors the infrastructure used by Catalog and Listing:

- NestJS module and bootstrap integration;
- handwritten PostgreSQL migrations executed by `node-pg-migrate`;
- Drizzle runtime schema root and transaction-aware repository aggregator;
- request context, kernel, loaders and script entry points;
- class-based Admin GraphQL server, resolver namespaces and codegen.

No customer domain tables, operations or public GraphQL contract are defined
yet. They should be added by follow-up domain work.
