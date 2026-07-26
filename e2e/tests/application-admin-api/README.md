# Application Admin API e2e

This directory contains executable contract suites for the IAM Admin GraphQL application management
API.

The public password/OAuth runtime contract lives in `e2e/tests/application-auth-password`. These
suites cover the management surface that prepares and changes that runtime state through supported
GraphQL operations:

- applications and auth configuration;
- social provider configuration;
- OAuth client management;
- application user security administration;
- RBAC, ownership, audit, and runtime traceability.

The suites use supported Admin GraphQL operations for setup and mutation, with direct database reads
only for persistence, encryption, audit, and missed-cache invalidation assertions. Each case
verifies `userErrors`, persisted state, authorization behavior, safe audit records, and absence of
cross-application side effects where applicable.
