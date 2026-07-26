# Apps Admin API e2e

This directory contains pending contract suites for the `services/apps` Admin
GraphQL control plane.

The suites follow the current GraphQL schema and Apps lifecycle implementation:

- bundled App discovery and manifest projection;
- installation queries, filters, ordering, and Relay pagination;
- install, update, configure, suspend, resume, and uninstall lifecycle;
- granted scopes, write-only installation secrets, and manifest snapshots;
- lifecycle idempotency and concurrency;
- Admin RBAC and store isolation;
- runtime capabilities, workflow traceability, failures, and observability.

All suites are intentionally skipped until dedicated GraphQL query documents and
Apps fixtures exist. Each implemented case must verify `userErrors`, durable
installation and lifecycle state, workflow side effects, and absence of changes
in another store. Secret cases must also verify persistence and telemetry
redaction without exposing plaintext values in test output.

The Headless App-owned storefront API is covered separately in
`e2e/tests/headless-admin-api`.
