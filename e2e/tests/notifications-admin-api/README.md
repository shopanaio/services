# Notifications Admin API e2e

This directory contains pending contract suites for the `services/notifications`
Admin GraphQL API.

The suites follow the current Notifications schema and implementation:

- definition and channel settings;
- effective templates, revisions, validation, and preview;
- staff notification recipients;
- test delivery and idempotency;
- webhook capabilities, subscriptions, signing secret, and SSRF protection;
- Admin RBAC, store isolation, durable audit, error safety, and observability.

All suites are intentionally skipped until dedicated GraphQL query documents,
delivery capture fixtures, and store-scoped Notifications state helpers exist.
Each implemented mutation case must verify `userErrors`, persisted state,
transactional audit, and absence of changes in another store. Delivery cases
must additionally verify the accepted workflow, captured output, idempotency,
and secret/PII redaction.
