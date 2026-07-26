# Project Settings Admin API e2e

This directory contains pending contract suites for the `services/project`
Admin GraphQL API.

The suites follow the current Project schema and implementation:

- store discovery, profile projection, creation, and deletion;
- revisioned unified store settings update;
- contact details, address, brand, media references, and social links;
- order processing, regional defaults, and currency formatting;
- language configuration and default locale lifecycle;
- Admin RBAC, organization/store isolation, saga consistency, and
  observability.

All suites are intentionally skipped until dedicated GraphQL query documents
and Project fixtures exist.

Each implemented mutation case must verify `userErrors`, `operationResults`
where applicable, durable Project state, external saga side effects, and
absence of changes in another store or organization.
