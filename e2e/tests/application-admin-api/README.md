# Application Admin API e2e

This directory contains pending contract suites for the IAM Admin GraphQL
application management API.

The public password/OAuth runtime contract lives in
`e2e/tests/application-auth-password`. These suites cover the management
surface that prepares and changes that runtime state through supported GraphQL
operations:

- applications and auth configuration;
- social provider configuration;
- OAuth client management;
- application user security administration;
- RBAC, ownership, audit, and runtime traceability.

All suites are intentionally skipped until fixtures and GraphQL query documents
exist. Each implemented case must verify `userErrors`, persisted state,
authorization behavior, safe audit records, and absence of cross-application
side effects where applicable.
